// Validate PNG checksums and the complete, bounded pixel stream without a paid image service.
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export async function validatePng(
  bytes: Uint8Array,
  width: number,
  height: number,
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 8,
    ended = false,
    hasPalette = false,
    dataEnded = false;
  const compressed: Uint8Array[] = [];
  const depth = bytes[24],
    color = bytes[25],
    interlace = bytes[28];
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const depths: Record<number, number[]> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  if (
    !depths[color]?.includes(depth) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    interlace > 1
  )
    throw new Error("Invalid PNG header");
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset),
      end = offset + length + 12;
    if (
      end > bytes.length ||
      crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)
    )
      throw new Error("Invalid PNG chunk");
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    if (offset === 8 && (type !== "IHDR" || length !== 13))
      throw new Error("Missing PNG header");
    if (offset !== 8 && type === "IHDR") throw new Error("Repeated PNG header");
    if (type === "PLTE") {
      if (compressed.length || !length || length % 3 || length > 768)
        throw new Error("Invalid PNG palette");
      hasPalette = true;
    }
    if (type === "IDAT") {
      if (dataEnded || (color === 3 && !hasPalette))
        throw new Error("Invalid PNG data");
      compressed.push(bytes.slice(offset + 8, end - 4));
    } else if (compressed.length) dataEnded = true;
    offset = end;
    if (type === "IEND") {
      if (length) throw new Error("Invalid PNG end");
      ended = true;
      break;
    }
  }
  if (!ended || offset !== bytes.length || !compressed.length)
    throw new Error("Incomplete PNG");
  // Scanline sizes for ordinary PNG and the seven Adam7 interlace passes.
  const passes =
    interlace === 0
      ? [[0, 0, 1, 1]]
      : [
          [0, 0, 8, 8],
          [4, 0, 8, 8],
          [0, 4, 4, 8],
          [2, 0, 4, 4],
          [0, 2, 2, 4],
          [1, 0, 2, 2],
          [0, 1, 1, 2],
        ];
  const rows: number[] = [];
  for (const [x, y, dx, dy] of passes) {
    const columns = Math.max(0, Math.ceil((width - x) / dx));
    if (!columns) continue;
    const rowBytes = Math.ceil((columns * channels[color] * depth) / 8) + 1;
    for (let row = y; row < height; row += dy) rows.push(rowBytes);
  }
  const expected = rows.reduce((sum, size) => sum + size, 0);
  const inflated = new Uint8Array(expected);
  const input = new Blob(
    compressed.map((chunk) => chunk.buffer as ArrayBuffer),
  ).stream();
  const reader = input
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  let count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (count + value.length > expected)
        throw new Error("PNG pixel data exceeds dimensions");
      inflated.set(value, count);
      count += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (count !== expected) throw new Error("Truncated PNG pixels");
  let position = 0;
  for (const size of rows) {
    if (inflated[position] > 4) throw new Error("Invalid PNG row filter");
    position += size;
  }
}
