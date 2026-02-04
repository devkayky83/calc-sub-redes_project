function carregarTemaIframe() {
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "escuro") {
    document.body.classList.add("dark-mode");
  }
}

window.addEventListener("message", function (event) {
  if (event.data.tipo === "mudanca-tema") {
    if (event.data.temaEscuro) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }
});

carregarTemaIframe();

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const pergunta = item.querySelector(".faq-pergunta");

  pergunta.addEventListener("click", () => {
    item.classList.toggle("active");
  });
});

const searchInput = document.getElementById("search-input");
const categorias = document.querySelectorAll(".categoria");

function destacaTexto(elemento, termo) {
  if (!elemento.dataset.originalHtml) {
    elemento.dataset.originalHtml = elemento.innerHTML;
  }

  if (!termo) {
    elemento.innerHTML = elemento.dataset.originalHtml;
    return;
  }

  const regex = new RegExp(`(${termo})`, "gi");

  elemento.innerHTML = elemento.dataset.originalHtml.replace(
    regex,
    "<mark>$1</mark>"
  );
}

searchInput.addEventListener("input", function () {
  const termoBusca = this.value.toLowerCase().trim();

  if (termoBusca === "") {
    faqItems.forEach((item) => {
      item.classList.remove("hidden");

      const pergunta = item.querySelector(".faq-pergunta span");
      const resposta = item.querySelector(".faq-resposta");
      destacaTexto(pergunta, "");
      destacaTexto(resposta, "");
    });
    categorias.forEach((cat) => cat.classList.remove("hidden"));
    return;
  }

  categorias.forEach((categoria) => {
    const itemsVisiveis = [];
    const items = categoria.querySelectorAll(".faq-item");

    items.forEach((item) => {
      const perguntaElemento = item.querySelector(".faq-pergunta span");
      const respostaElemento = item.querySelector(".faq-resposta");

      const perguntaTexto = perguntaElemento.textContent.toLowerCase();
      const respostaTexto = respostaElemento.textContent.toLowerCase();
      const tags = item.getAttribute("data-tags") || "";

      if (
        perguntaTexto.includes(termoBusca) ||
        respostaTexto.includes(termoBusca) ||
        tags.includes(termoBusca)
      ) {
        item.classList.remove('hidden');
        itemsVisiveis.push(item);

        destacaTexto(perguntaElemento, termoBusca);
        destacaTexto(respostaElemento, termoBusca);
      } else {
        item.classList.add('hidden');
        destacaTexto(perguntaElemento, '');
        destacaTexto(respostaElemento, '');
      }
    });

    if (itemsVisiveis.length === 0) {
      categoria.classList.add("hidden");
    } else {
      categoria.classList.remove("hidden");
    }
  });
});


function abrirTopicoDeLink() {

  const hash = window.location.hash;
  
  if (!hash) return;
  
  const idTopico = hash.substring(1);
  
  const topicoAlvo = document.getElementById(idTopico);
  
  if (topicoAlvo) {

    setTimeout(() => {
      topicoAlvo.classList.add('active');
      
      topicoAlvo.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      topicoAlvo.style.animation = 'destacar-topico 2s ease-in-out';
      
      console.log(`Tópico "${idTopico}" aberto automaticamente!`);
    }, 300);
  } else {
    console.warn(`Tópico com ID "${idTopico}" não encontrado!`);
  }
}

window.addEventListener('DOMContentLoaded', abrirTopicoDeLink);

window.addEventListener('hashchange', abrirTopicoDeLink);