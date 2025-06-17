const produtosContainer = document.getElementById('produtos');
const carrinhoLista = document.getElementById('Carrinho');
const totalSpan = document.getElementById('total');
let carrinho = [];

fetch('produtos.json')
  .then(res => res.json())
  .then(produtos => {
    produtos.forEach(produto => {
      const div = document.createElement('div');
      div.classList.add('produtos');

      div.innerHTML = `
        <img src="${produto.imagem}" alt="${produto.nome}" width="150">
        <h2>${produto.nome}</h2>
        <p>${produto.descricao}</p>
        <span>R$ ${produto.preco.toFixed(2)}</span><br>
        <button class="adicionar" data-id="${produto.id}">Adicionar ao carrinho</button>
      `;

      produtosContainer.appendChild(div)
    });

    
    document.querySelectorAll('.adicionar').forEach(botao => {
      botao.addEventListener('click', () => {
        const id = parseInt(botao.getAttribute('data-id'));
        const produto = produtos.find(p => p.id === id);
        carrinho.push(produto);
        atualizarCarrinho();
      });
    });
  });

function atualizarCarrinho() {
  carrinhoLista.innerHTML = '';
  let total = 0;

  
  carrinho.forEach((produto, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${produto.nome} - R$ ${produto.preco.toFixed(2)}
      <button onclick="removerDoCarrinho(${index})">Remover</button>
    `;
    carrinhoLista.appendChild(li);
    total += produto.preco;
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}
