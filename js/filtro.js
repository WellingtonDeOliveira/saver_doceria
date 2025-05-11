function filtrarProdutos(categoria) {
    const cards = document.querySelectorAll('.produto-card');
    const botoes = document.querySelectorAll('.filtros-categorias button');

    // Alternar classe "ativo" nos botões
    botoes.forEach(btn => btn.classList.remove('ativo'));

    document
        .querySelector(`.filtros-categorias button[onclick*="${categoria}"]`)
        .classList.add('ativo');

    // Mostrar/ocultar produtos
    cards.forEach(card => {
        const cat = card.getAttribute('data-categoria');
        if (categoria === 'todos' || cat === categoria) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}