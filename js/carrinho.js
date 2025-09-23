let carrinho = [];

function adicionarAoCarrinho(nome, preco) {
  const itemExistente = carrinho.find(item => item.nome === nome);
  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({ nome, preco, quantidade: 1 });
  }
  atualizarCarrinho();
  mostrarToast(`${nome} adicionado ao carrinho!`);
}

function removerDoCarrinho(nome) {
  carrinho = carrinho.filter(item => item.nome !== nome);
  atualizarCarrinho();
}

function alterarQuantidade(nome, delta) {
  const item = carrinho.find(i => i.nome === nome);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    removerDoCarrinho(nome);
  } else {
    atualizarCarrinho();
  }
}

function mostrarToast(mensagem) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = mensagem;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function atualizarCarrinho() {
  const lista = document.getElementById('lista-carrinho');
  lista.innerHTML = '';

  let total = 0;

  carrinho.forEach(item => {
    total += item.preco * item.quantidade;

    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>${item.nome}</strong>
        <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; margin-bottom: 10px;">
        <div>
          <button onclick="alterarQuantidade('${item.nome}', -1)">➖</button>
          <span style="margin: 0 0.5rem;">${item.quantidade}</span>
          <button onclick="alterarQuantidade('${item.nome}', 1)">➕</button>
        </div>
        <button onclick="removerDoCarrinho('${item.nome}')" style="color: red;">Remover</button>
      </div>`;
    lista.appendChild(li);
  });

  document.getElementById('quantidade-carrinho').innerText = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  document.getElementById('total-carrinho').innerText = total.toFixed(2);
}

function abrirCarrinho() {
  document.getElementById('carrinho-modal').classList.remove('hidden');
  atualizarCarrinho();
}

function fecharCarrinho() {
  document.getElementById('carrinho-modal').classList.add('hidden');
}

function enviarPedido() {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  const dia = document.getElementById('dia-agendamento').value;
  if (!dia) {
    alert("Por favor, selecione um dia para o agendamento!");
    return;
  }

  let mensagem = "Olá! Gostaria de fazer um pedido:\n\n";
  carrinho.forEach(item => {
    mensagem += `• ${item.nome} (x${item.quantidade}) - R$ ${(item.preco * item.quantidade).toFixed(2)}\n`;
  });
  mensagem += `\nTotal: R$ ${carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0).toFixed(2)}`;
  mensagem += `\n\n Agendamento para: ${dia}`;

  const url = `https://wa.me/5585982213551?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}
