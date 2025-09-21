const produtosContainer = document.querySelector('.produtos-container');

fetch('assets/catalogo.txt')
    .then(response => response.text())
    .then(data => {
        const linhas = data.trim().split('\n');
        linhas.forEach(linha => {
            const [img, nome, descricao, valor, categoria, ativo] = linha.split(';');

            if (ativo.trim() !== 'true') return;

            const card = document.createElement('div');
            card.classList.add('produto-card');
            card.setAttribute('data-categoria', categoria.trim());

            card.innerHTML = `
          <img src="${img.trim()}" alt="${nome.trim()}">
          <div class="produto-info">
            <h2>${nome.trim()}</h2>
            <div class="produto-detalhes">
              <p>${descricao.trim()}</p>
              <span class="preco">R$ ${parseFloat(valor).toFixed(2)}</span>
            </div>
            <button onclick="adicionarAoCarrinho('${nome.trim()}', ${parseFloat(valor)})">Adicionar</button>
          </div>
        `;
            produtosContainer.appendChild(card);
        });
    })
    .catch(error => console.error('Erro ao carregar catálogo:', error));
