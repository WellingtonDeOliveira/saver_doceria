const produtosContainer = document.querySelector('.produtos-container');
let produtosCatalogo = [];
let opcoesPascoa = null;

fetch('assets/catalogo.txt')
  .then(response => response.text())
  .then(data => {
    const linhas = data.trim().split('\n');

    produtosCatalogo = linhas
      .slice(1)
      .map(linha => {
        const [img, nome, descricao, valor, categoria, ativo] = linha.split(';');
        return {
          img: (img || '').trim(),
          nome: (nome || '').trim(),
          descricao: (descricao || '').trim(),
          valor: parseFloat((valor || '0').trim()),
          categoria: (categoria || '').trim(),
          ativo: (ativo || '').trim()
        };
      })
      .filter(produto => produto.ativo === 'true');

    produtosCatalogo.forEach((produto, index) => {
      const card = document.createElement('div');
      card.classList.add('produto-card');
      if (produto.categoria === 'pascoa') {
        card.classList.add('categoria-pascoa');
      }
      card.setAttribute('data-categoria', produto.categoria);

      card.innerHTML = `
      <img src="${produto.img}" alt="${produto.nome}">
      <div class="produto-info">
      <h2>${produto.nome}</h2>
      <div class="produto-detalhes">
        <p>${produto.descricao}</p>
        <span class="preco">R$ ${produto.valor.toFixed(2)}</span>
      </div>
      ${produto.categoria === 'pascoa' ? '<span class="badge-pascoa">Páscoa 🐰</span>' : ''}
      <button onclick="handleAdicionar(${index})">Adicionar</button>
      </div>
    `;
      produtosContainer.appendChild(card);
    });
  })
  .catch(error => console.error('Erro ao carregar catálogo:', error));

function handleAdicionar(index) {
  const produto = produtosCatalogo[index];
  if (!produto) return;

  if (produto.nome.toLowerCase().includes('monte seu ovo')) {
    abrirModalPascoa(produto);
    return;
  }

  adicionarAoCarrinho(produto.nome, produto.valor);
}

function carregarOpcoesPascoa() {
  if (opcoesPascoa) {
    return Promise.resolve(opcoesPascoa);
  }

  return fetch('assets/opcoes_pascoa.txt')
    .then(response => response.text())
    .then(data => {
      const linhas = data.trim().split('\n').slice(1);
      const parsed = {};

      linhas.forEach(linha => {
        const [etapa, opcoes] = linha.split(';');
        parsed[etapa.trim()] = opcoes.split(',').map(item => item.trim());
      });

      opcoesPascoa = parsed;
      return parsed;
    });
}

function criarModalPascoa() {
  let modal = document.getElementById('modal-pascoa-overlay');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'modal-pascoa-overlay';
  modal.className = 'modal-pascoa-overlay hidden';
  modal.innerHTML = `
    <div class="modal-pascoa">
    <div class="modal-pascoa-topo">
      <h2>Monte seu Ovo</h2>
      <button id="modal-pascoa-fechar" class="modal-pascoa-fechar" type="button" aria-label="Fechar">&times;</button>
    </div>
    <p id="modal-pascoa-step-title"></p>
    <div id="modal-pascoa-kit-progress" class="modal-pascoa-kit-progress"></div>
    <div id="modal-pascoa-substep-progress" class="modal-pascoa-substep-progress"></div>
    <div id="modal-pascoa-step-content"></div>
    <div class="modal-pascoa-actions">
      <button id="modal-pascoa-voltar" class="modal-pascoa-btn modal-pascoa-btn-secundario" type="button">Voltar</button>
      <button id="modal-pascoa-avancar" class="modal-pascoa-btn modal-pascoa-btn-primario" type="button">Avançar</button>
    </div>
    </div>
  `;

  modal.addEventListener('click', event => {
    if (event.target.id === 'modal-pascoa-overlay') {
      modal.classList.add('hidden');
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function limparLabel(valor) {
  return valor
    .replace('Chocolate ', '')
    .replace('Casca de ', '')
    .replace('Brigadeiro de ', '');
}

function abrirModalPascoa(produto) {
  carregarOpcoesPascoa().then(opcoes => {
    const modal = criarModalPascoa();
    const stepTitle = document.getElementById('modal-pascoa-step-title');
    const kitProgress = document.getElementById('modal-pascoa-kit-progress');
    const substepProgress = document.getElementById('modal-pascoa-substep-progress');
    const stepContent = document.getElementById('modal-pascoa-step-content');
    const btnFechar = document.getElementById('modal-pascoa-fechar');
    const btnVoltar = document.getElementById('modal-pascoa-voltar');
    const btnAvancar = document.getElementById('modal-pascoa-avancar');

    btnFechar.onclick = () => {
      modal.classList.add('hidden');
    };

    const subEtapas = ['casca', 'recheio', 'complementos'];
    const subLabels = {
      casca: 'Casca',
      recheio: 'Recheio',
      complementos: 'Complementos'
    };

    let modeloSelecionado = '';
    let modeloRascunho = '';
    let totalOvos = 0;
    let ovoAtual = 0;
    let subEtapaAtual = 0;
    let escolhasOvos = [];

    const precoPorModelo = {
      '1x50g': 12,
      '4x50g': 40,
      '2x100g': 40,
      '350g': 60,
      '500g': 100
    };

    function getPrecoModelo() {
      return precoPorModelo[modeloSelecionado] || Number(produto.valor) || 0;
    }

    function getLimiteComplementos() {
      if (modeloSelecionado === '1x50g') return 1;
      if (modeloSelecionado === '4x50g') return 1;
      if (modeloSelecionado === '2x100g') return 2;
      return 3;
    }

    function initFluxoPorModelo(modelo) {
      modeloSelecionado = modelo;
      if (modelo === '4x50g') {
        totalOvos = 4;
      } else if (modelo === '2x100g') {
        totalOvos = 2;
      } else {
        totalOvos = 1;
      }

      escolhasOvos = Array.from({ length: totalOvos }, () => ({
        casca: '',
        recheio: '',
        complementos: []
      }));

      ovoAtual = 0;
      subEtapaAtual = 0;
    }

    function renderIndicadorKit() {
      if (totalOvos <= 1) {
        kitProgress.innerHTML = '';
        return;
      }

      kitProgress.innerHTML = `
        <div class="kit-progress-segmentos">
          ${Array.from({ length: totalOvos }, (_, i) => {
            const classe = i < ovoAtual ? 'completo' : i === ovoAtual ? 'ativo' : '';
            return `<span class="kit-segmento ${classe}"></span>`;
          }).join('')}
        </div>
      `;
    }

    function renderIndicadorSubEtapas() {
      if (totalOvos === 0) {
        substepProgress.innerHTML = '';
        return;
      }

      substepProgress.innerHTML = `
        <div class="substep-progress-segmentos">
          ${subEtapas.map((etapa, idx) => {
            const classe = idx < subEtapaAtual ? 'completo' : idx === subEtapaAtual ? 'ativo' : '';
            return `
              <span class="substep-segmento ${classe}">
                <small>${subLabels[etapa]}</small>
              </span>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderEtapa() {
      stepContent.innerHTML = '';

      if (totalOvos === 0) {
        stepTitle.textContent = 'Etapa 1 de 4 - Modelo';
        kitProgress.innerHTML = '';
        substepProgress.innerHTML = '';

        (opcoes.modelo || []).forEach(opcao => {
          const label = document.createElement('label');
          label.className = 'modal-pascoa-opcao';

          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'modelo';
          input.value = opcao;
          input.checked = modeloRascunho === opcao;

          input.addEventListener('change', () => {
            modeloRascunho = opcao;
          });

          label.appendChild(input);
          label.append(` ${opcao}`);
          stepContent.appendChild(label);
        });

        btnVoltar.disabled = true;
        btnAvancar.textContent = 'Próximo';
        return;
      }

      const chave = subEtapas[subEtapaAtual];
      const opcoesEtapa = opcoes[chave] || [];
      const escolhaAtual = escolhasOvos[ovoAtual];
      const limiteComplementos = getLimiteComplementos();

      if (totalOvos > 1) {
        stepTitle.textContent = `Montando Ovo ${ovoAtual + 1} de ${totalOvos} - ${subLabels[chave]}`;
      } else {
        stepTitle.textContent = `Etapa ${subEtapaAtual + 2} de 4 - ${subLabels[chave]}`;
      }

      renderIndicadorKit();
      renderIndicadorSubEtapas();

      if (chave === 'complementos') {
        const helper = document.createElement('p');
        helper.textContent = totalOvos > 1
          ? `Você pode selecionar até ${limiteComplementos} complementos por mini ovo.`
          : `Você pode selecionar até ${limiteComplementos} complementos para este ovo.`;
        stepContent.appendChild(helper);
      }

      opcoesEtapa.forEach(opcao => {
        const label = document.createElement('label');
        label.className = 'modal-pascoa-opcao';

        const input = document.createElement('input');
        input.type = chave === 'complementos' ? 'checkbox' : 'radio';
        input.name = chave;
        input.value = opcao;

        if (chave === 'casca') {
          input.checked = escolhaAtual.casca === opcao;
        } else if (chave === 'recheio') {
          input.checked = escolhaAtual.recheio === opcao;
        } else {
          input.checked = escolhaAtual.complementos.includes(opcao);
        }

        input.addEventListener('change', () => {
          if (chave === 'casca') {
            escolhaAtual.casca = opcao;
            return;
          }

          if (chave === 'recheio') {
            escolhaAtual.recheio = opcao;
            return;
          }

          const marcados = Array.from(
            stepContent.querySelectorAll('input[type="checkbox"]:checked')
          ).map(el => el.value);

          if (marcados.length > limiteComplementos) {
            input.checked = false;
            alert(`Você pode escolher no máximo ${limiteComplementos} complementos.`);
            return;
          }

          escolhaAtual.complementos = marcados;
        });

        label.appendChild(input);
        label.append(` ${opcao}`);
        stepContent.appendChild(label);
      });

      btnVoltar.disabled = false;
      const ultimoPasso = ovoAtual === totalOvos - 1 && subEtapaAtual === subEtapas.length - 1;
      btnAvancar.textContent = ultimoPasso ? 'Finalizar Pedido' : 'Próximo';
    }

    function podeAvancar() {
      if (!modeloSelecionado) return false;

      const chave = subEtapas[subEtapaAtual];
      const escolhaAtual = escolhasOvos[ovoAtual];
      if (!escolhaAtual) return false;

      if (chave === 'casca' && !escolhaAtual.casca) return false;
      if (chave === 'recheio' && !escolhaAtual.recheio) return false;
      return true;
    }

    function formatarMensagemKit() {
      const nomeProduto = totalOvos === 4 ? 'Kit 4x50g' : 'Kit 2x100g';
      let mensagem = `*PRODUTO:* ${nomeProduto}`;

      escolhasOvos.forEach((ovo, index) => {
        const complementoTxt = ovo.complementos.length
          ? `, Complementos: ${ovo.complementos.join(', ')}`
          : '';
        mensagem += ` | *OVO ${index + 1}:* Casca ${limparLabel(ovo.casca)}, Recheio ${limparLabel(ovo.recheio)}${complementoTxt}`;
      });

      return `${mensagem}.`;
    }

    function formatarMensagemUnica() {
      const unico = escolhasOvos[0] || { casca: '', recheio: '', complementos: [] };
      return `*PRODUTO:* Ovo ${modeloSelecionado} | *CASCA:* ${limparLabel(unico.casca)} | *RECHEIO:* ${limparLabel(unico.recheio)} | *COMPLEMENTOS:* ${unico.complementos.join(', ') || 'Sem complementos'}.`;
    }

    btnVoltar.onclick = () => {
      if (totalOvos === 0) {
        return;
      }

      if (subEtapaAtual > 0) {
        subEtapaAtual -= 1;
      } else if (ovoAtual > 0) {
        ovoAtual -= 1;
        subEtapaAtual = subEtapas.length - 1;
      } else {
        modeloSelecionado = '';
        modeloRascunho = '';
        totalOvos = 0;
        escolhasOvos = [];
      }

      renderEtapa();
    };

    btnAvancar.onclick = () => {
      if (totalOvos === 0) {
        const modeloMarcado = stepContent.querySelector('input[name="modelo"]:checked');
        const modeloEscolhido = modeloRascunho || (modeloMarcado ? modeloMarcado.value : '');

        if (!modeloEscolhido) {
          alert('Selecione um modelo para continuar.');
          return;
        }

        initFluxoPorModelo(modeloEscolhido);
        renderEtapa();
        return;
      }

      if (!podeAvancar()) {
        alert('Selecione Casca e Recheio para continuar.');
        return;
      }

      const ultimoPasso = ovoAtual === totalOvos - 1 && subEtapaAtual === subEtapas.length - 1;
      if (!ultimoPasso) {
        if (subEtapaAtual < subEtapas.length - 1) {
          subEtapaAtual += 1;
        } else {
          ovoAtual += 1;
          subEtapaAtual = 0;
        }
        renderEtapa();
        return;
      }

      const mensagemWhats = totalOvos > 1
        ? formatarMensagemKit()
        : formatarMensagemUnica();

      const nomeCarrinho = totalOvos > 1
        ? `Kit ${modeloSelecionado}`
        : `Monte seu Ovo (${modeloSelecionado})`;

      adicionarAoCarrinho(nomeCarrinho, getPrecoModelo(), mensagemWhats);
      modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
    renderEtapa();
  }).catch(() => {
    alert('Não foi possível carregar as opções de Páscoa.');
  });
}
