const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

function aplicarTema(temaEscuro) {
    if (temaEscuro) {
        body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
}

function salvarTema(temaEscuro) {
    localStorage.setItem('tema', temaEscuro ? 'escuro' : 'claro');
}

function carregarTemaSalvo(){
    const temaSalvo = localStorage.getItem('tema');
    const temaEscuro = temaSalvo === 'escuro';
    aplicarTema(temaEscuro);
}

themeToggle.addEventListener('change', function() {
    const temaEscuro = this.checked;
    aplicarTema(temaEscuro);
    salvarTema(temaEscuro);

    notificarIframe(temaEscuro);
})

function notificarIframe(temaEscuro) {
    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage ({
            tipo: 'mudanca-tema',
            temaEscuro: temaEscuro
        }, '*');
    }
}

carregarTemaSalvo();