const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const mainContainer = document.getElementById('main-container');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    mainContainer.classList.toggle('shifted');
    menuToggle.classList.toggle('inside-menu');

    if (sidebar.classList.contains('open')) {
        menuToggle.querySelector('span').textContent = '✖'; 
    } else {
        menuToggle.querySelector('span').textContent = '☰';
    }
})

function carregarPagina(pagina) {
    document.getElementById('content-frame').src = `pages/${pagina}.html`
}