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

// --- FUNÇÕES DE VALIDAÇÃO ---

function validarIP(ip) {
    const partes = ip.split(".");
    if (partes.length !== 4) return false;
    for (let parte of partes) {
        const numero = parseInt(parte);
        if (isNaN(numero) || numero < 0 || numero > 255) return false;
    }
    return true;
}

function validarCIDR(valor) {
    // Aceita números de 0 a 32
    const numero = parseInt(valor);
    return !isNaN(numero) && numero >= 0 && numero <= 32;
}

function validarMascara(mascara) {
    // Validação simples de formato de máscara x.x.x.x
    const partes = mascara.split(".");
    if (partes.length !== 4) return false;
    for (let parte of partes) {
        const num = parseInt(parte);
        if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
}

function mostrarErroCidrCritico(cidr, elementoErro) {
    if (cidr === 32) {
        elementoErro.innerHTML = `
        <strong>⚠️ /32 (255.255.255.255) não serve para sub-redes</strong><br>
        <strong>Problema:</strong> Identifica um ÚNICO host. Não tem Rede nem Broadcast.<br>
        💡 <em>Use /30 (final .252) ou menor.</em>`;
    } else {
        elementoErro.innerHTML = `
        <strong>⚠️ /31 (255.255.255.254) é para ponto-a-ponto</strong><br>
        <strong>Problema:</strong> Não possui endereços de Rede e Broadcast padrão.<br>
        💡 <em>Use /30 (final .252) ou menor.</em>`;
    }
    elementoErro.style.display = "block";
}

async function calcularSubredes() {
    const ip = document.getElementById("ip").value;
    let entradaCidr = document.getElementById("cidr").value.trim();
    entradaCidr = entradaCidr.replace('/', ''); // Remove a barra se houver

    const mensagemErro = document.getElementById("mensagem-erro");
    mensagemErro.style.display = "none";

    // 1. Validação simples
    if (!ip || !entradaCidr) {
        mensagemErro.textContent = "Por favor, preencha todos os campos.";
        mensagemErro.style.display = "block";
        return;
    }

    if (!validarIP(ip)) {
        mensagemErro.textContent = "Endereço IP inválido.";
        mensagemErro.style.display = "block";
        return;
    }

    let urlParam = "";
    let isMascara = entradaCidr.includes('.');

    if (isMascara) {
        // --- AQUI ESTÁ A PROTEÇÃO NOVA PARA MÁSCARA ---
        if (!validarMascara(entradaCidr)) {
            mensagemErro.textContent = "Máscara de sub-rede inválida.";
            mensagemErro.style.display = "block";
            return;
        }
        // Se digitou a máscara proibida /32
        if (entradaCidr === "255.255.255.255") {
            mostrarErroCidrCritico(32, mensagemErro);
            return;
        }
        // Se digitou a máscara proibida /31
        if (entradaCidr === "255.255.255.254") {
            mostrarErroCidrCritico(31, mensagemErro);
            return;
        }
        urlParam = `&mascara=${entradaCidr}`;

    } else {
        // Validação para quando digita número (CIDR)
        if (!validarCIDR(entradaCidr)) {
            mensagemErro.textContent = "CIDR inválido (use entre 0 e 32).";
            mensagemErro.style.display = "block";
            return;
        }
        
        const cidrInt = parseInt(entradaCidr);
        
        // Proteção para CIDR proibido
        if (cidrInt === 31 || cidrInt === 32) {
             mostrarErroCidrCritico(cidrInt, mensagemErro);
             return;
        }

        if (cidrInt < 24) {
            mensagemErro.innerHTML = `<strong>⚠️ Este sistema calcula de /24 até /30</strong>`;
            mensagemErro.style.display = "block";
            return;
        }
        
        urlParam = `&cidr=${entradaCidr}`;
    }

    // Chamada para a API
    try {
        const response = await fetch(`/calcular-subredes?ip=${ip}${urlParam}`);
        if (!response.ok) throw new Error('Falha na resposta da rede');
        const dados = await response.json();

        if (dados.error) {
            mensagemErro.textContent = dados.error;
            mensagemErro.style.display = "block";
            return;
        }
        gerarCardsETabela(dados);
    } catch (error) {
        console.error(error);
        mensagemErro.textContent = "Erro ao conectar com o servidor.";
        mensagemErro.style.display = "block";
    }
}

function gerarCardsETabela(dados) {
    // Se não houver dados, para tudo
    if (dados.length === 0) return;

    const totalSubredes = dados.length;
    const totalIpsPorSubrede = dados[0].total_ips.valor; 
    const hostsValidosPorSubrede = totalIpsPorSubrede - 2;

    // --- CARDS ---
    const cardsHTML = `
        <div class="cards-container">
            <div class="card">
                <h3>Total de Sub-Redes</h3>
                <p class="card-valor" id="valor-subredes">0</p>
            </div>
            <div class="card">
                <h3>Total de Hosts <span style="font-size:0.6em">(Válidos)</span></h3>
                <p class="card-valor" id="valor-hosts-validos">0</p>
            </div>
            <div class="card">
                <h3>Total de IPs <span style="font-size:0.6em">(Rede + Bcast + Hosts)</span></h3>
                <p class="card-valor" id="valor-total-ips">0</p>
            </div>
        </div>
    `;
    
    document.getElementById("cards-resumo").innerHTML = cardsHTML;
    document.getElementById("cards-resumo").style.display = "block";

    setTimeout(() => {
        animarContador(document.getElementById("valor-subredes"), totalSubredes);
        animarContador(document.getElementById("valor-hosts-validos"), hostsValidosPorSubrede);
        animarContador(document.getElementById("valor-total-ips"), totalIpsPorSubrede);
    }, 100);

    // --- TABELA COM TOOLTIPS MÁGICOS ---
    let tabela = `
        <table class="result-table" border="1">
            <thead>
                <tr>
                    <th>Sub-rede</th>
                    <th>IP da Rede</th>
                    <th>Máscara</th>
                    <th>Primeiro Host</th>
                    <th>Último Host</th>
                    <th>Broadcast</th>
                    <th>Total de IPs</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Função auxiliar para criar a célula com tooltip
    const criarCelula = (dado) => {
        // Se o dado for simples (como o ID), retorna só o valor
        if (!dado.expl) return `<td>${dado}</td>`;
        
        // Se tiver explicação, cria a estrutura do tooltip
        return `
            <td>
                ${dado.valor}
                <span class="tooltip-text">
                    <strong>Como calcular:</strong><br>
                    ${dado.expl}
                </span>
            </td>
        `;
    };

    for (let item of dados) {
        tabela += `<tr>`;
        tabela += `<td>${item.id}</td>`; // ID não precisa de tooltip
        tabela += criarCelula(item.ip_rede);
        tabela += criarCelula(item.mascara);
        tabela += criarCelula(item.primeiro_host);
        tabela += criarCelula(item.ultimo_host);
        tabela += criarCelula(item.broadcast);
        tabela += criarCelula(item.total_ips);
        tabela += `</tr>`;
    }

    tabela += `</tbody></table>`;
    document.getElementById("resultado").innerHTML = tabela;
}

function animarContador(elemento, valorFinal, duracao = 1000) {
    let inicio = 0;
    const incremento = valorFinal / (duracao / 16);
    if (valorFinal === 0) { elemento.textContent = 0; return; }

    const intervalo = setInterval(() => {
        inicio += incremento;
        if (inicio >= valorFinal) {
            elemento.textContent = valorFinal;
            clearInterval(intervalo);
        } else {
            elemento.textContent = Math.floor(inicio);
        }
    }, 16);
}

// Fundo Animado (Mantido original)
function IPFlowBackground() {
    const container = document.getElementById('ipFlowBg');
    if(!container) return;
    
    const ips = [
        '192.168.1.0', '10.0.0.0', '172.16.0.0', '192.168.0.0',
        '10.10.10.0', '172.31.255.0', '192.168.100.0', '10.0.1.0'
    ];
    const cidrs = [24, 25, 26, 27, 28, 29, 30];

    for (let i = 0; i < 15; i++) {
        const elementoIP = document.createElement('div');
        elementoIP.className = 'ip-flutuante';
        const ipAleatorio = ips[Math.floor(Math.random() * ips.length)];
        const cidrAleatorio = cidrs[Math.floor(Math.random() * cidrs.length)];
        elementoIP.textContent = `${ipAleatorio}/${cidrAleatorio}`;
        elementoIP.style.top = (Math.random() * 80 + 10) + '%';
        elementoIP.style.animationDuration = (15 + Math.random() * 10) + 's';
        elementoIP.style.animationDelay = Math.random() * 8 + 's';
        container.appendChild(elementoIP);
    }
}

document.addEventListener('DOMContentLoaded', IPFlowBackground);