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

document.addEventListener("DOMContentLoaded", function() {
    // Verifica se existe um #hash na URL (ex: aprendizado.html#calc-rede)
    if (window.location.hash) {
        const id = window.location.hash.substring(1); // Remove o #
        const elementoAlvo = document.getElementById(id);

        if (elementoAlvo) {
            setTimeout(() => {

                elementoAlvo.scrollIntoView({ behavior: "smooth", block: "center" });

                if (!elementoAlvo.classList.contains("active")) {
                    elementoAlvo.classList.add("active");
                    
                    // Se o seu CSS usa max-height na resposta para animar, precisamos ajustar:
                    const resposta = elementoAlvo.querySelector(".faq-resposta");
                    const icone = elementoAlvo.querySelector(".toggle-icon");
                    
                    if (resposta) {
                        resposta.style.maxHeight = resposta.scrollHeight + "px";
                        resposta.style.padding = "20px"; // Ajuste conforme seu CSS original
                    }
                    if (icone) {
                        icone.textContent = "-";
                    }
                }
                
                
                elementoAlvo.style.transition = "box-shadow 0.5s";
                elementoAlvo.style.boxShadow = "0 0 20px #00ff96";
                setTimeout(() => {
                    elementoAlvo.style.boxShadow = "none";
                }, 1500);

            }, 500);
        }
    }
});