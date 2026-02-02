function carregarTemaIframe() {
    const temaSalvo = localStorage.getItem("tema");
    if (temaSalvo === "escuro") {
        document.body.classList.add("dark-mode");
    }
}
carregarTemaIframe();

// --- VALIDAÇÕES ---
function validarFormatoIP(ip) {
    const partes = ip.split(".");
    if (partes.length !== 4) return false;
    for (let parte of partes) {
        const numero = parseInt(parte);
        if (isNaN(numero) || numero < 0 || numero > 255) return false;
    }
    return true;
}

// --- LÓGICA PRINCIPAL ---
async function calcularSubredes() {
    const ipInput = document.getElementById("ip");
    const qtdInput = document.getElementById("qtd");
    
    const ip = ipInput.value.trim();
    const qtd = qtdInput.value.trim();

    const mensagemErro = document.getElementById("mensagem-erro");
    const containerVisualizacao = document.getElementById("visualizacao-container");
    const tituloTabela = document.getElementById("titulo-tabela-container");

    // Limpa a tela antes de começar
    mensagemErro.style.display = "none";
    if (containerVisualizacao) containerVisualizacao.style.display = "none";
    if (tituloTabela) tituloTabela.style.display = "none";
    document.getElementById("resultado").innerHTML = "";

    // 1. Validações Básicas
    if (!ip || !qtd) {
        mensagemErro.textContent = "Por favor, preencha o IP e a Quantidade.";
        mensagemErro.style.display = "block";
        return;
    }

    if (!validarFormatoIP(ip)) {
        mensagemErro.textContent = "Endereço IP inválido.";
        mensagemErro.style.display = "block";
        return;
    }

    if (parseInt(qtd) <= 0) {
        mensagemErro.textContent = "A quantidade deve ser maior que 0.";
        mensagemErro.style.display = "block";
        return;
    }

    // 2. Requisição ao Python
    try {
        const responseTabela = await fetch(`/calcular-subredes?ip=${ip}&qtd=${qtd}`);
        const dadosTabela = await responseTabela.json();

        if (dadosTabela.error) {
            mensagemErro.textContent = dadosTabela.error;
            mensagemErro.style.display = "block";
            return;
        }

        const responseGrafico = await fetch(`/visualizar-subredes?ip=${ip}&qtd=${qtd}`);
        const dadosGrafico = await responseGrafico.json();

        // 3. Renderiza os resultados
        gerarGrafico(dadosGrafico);
        gerarTabela(dadosTabela);

        if (tituloTabela) tituloTabela.style.display = "block";

    } catch (error) {
        console.error(error);
        mensagemErro.textContent = "Erro ao conectar com o servidor. Verifique se o app.py está rodando.";
        mensagemErro.style.display = "block";
    }
}

// --- GERAÇÃO DA TABELA (Versão Limpa) ---
function gerarTabela(dados) {
    if (!dados || dados.length === 0) return;

    const classe = dados[0].classe || "-";

    let html = `
        <div style="text-align:center; margin-bottom:15px;">
            <span style="background: rgba(0, 255, 150, 0.1); border: 1px solid #00ff96; padding: 8px 15px; border-radius: 5px; color: #fff;">
                Classe da Rede: <strong>${classe}</strong>
            </span>
        </div>
        <table class="result-table" border="1">
            <thead>
                <tr>
                    <th>Sub-rede</th>
                    
                    <th class="th-link" onclick="window.location.href='pages/aprendizado.html#calc-rede'" title="Clique para aprender a calcular">
                        IP da Rede <span style="font-size:0.8em">🔗</span>
                    </th>

                    <th>Primeiro Host</th>
                    <th>Último Host</th>

                    <th class="th-link" onclick="window.location.href='pages/aprendizado.html#calc-broadcast'" title="Clique para aprender a calcular">
                        Broadcast <span style="font-size:0.8em">🔗</span>
                    </th>

                    <th class="th-link" onclick="window.location.href='pages/aprendizado.html#calc-mascara'" title="Clique para aprender a calcular">
                        Máscara (Decimal) <span style="font-size:0.8em">🔗</span>
                    </th>

                    <th class="th-link" onclick="window.location.href='pages/aprendizado.html#calc-hosts'" title="Clique para aprender a calcular">
                        Hosts Válidos <span style="font-size:0.8em">🔗</span>
                    </th>

                    <th>Total de IPs</th>
                </tr>
            </thead>
            <tbody>
    `;

    // ... (o resto da função continua igual: o loop forEach e o fechamento da tabela)
    dados.forEach(item => {
        html += `
            <tr>
                <td>${item.subrede}</td>
                <td>${item.ip_rede}</td>
                <td>${item.primeiro_host}</td>
                <td>${item.ultimo_host}</td>
                <td>${item.broadcast}</td>
                <td>${item.mascara_decimal}</td>
                <td style="font-weight: bold; color: #00ff96;">${item.hosts_validos}</td>
                <td>${item.total_ips}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("resultado").innerHTML = html;
}

// --- GERAÇÃO DO GRÁFICO ---
function gerarGrafico(dados) {
    const container = document.getElementById('mynetwork');
    if (!container) return;

    document.getElementById("visualizacao-container").style.display = "block";

    var data = {
        nodes: new vis.DataSet(dados.nodes),
        edges: new vis.DataSet(dados.edges)
    };

    var options = {
        nodes: {
            shapeProperties: { useBorderWithImage: true },
            borderWidth: 3,
            font: { color: '#000000', face: 'Space Mono', background: '#ffffff', size: 16 },
            shadow: true
        },
        edges: {
            width: 3, shadow: false,
            smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 }
        },
        layout: { hierarchical: false },
        physics: { enabled: false, stabilization: false },
        interaction: { dragNodes: true, zoomView: true, dragView: true }
    };
    
    var network = new vis.Network(container, data, options);
    
    // Zoom inicial para focar no roteador
    network.once("afterDrawing", function() {
        network.fit({
            nodes: ['router-central'],
            scale: 0.8,
            animation: true
        });
    });
}

// Background animado
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('ipFlowBg');
    if(container) {
        for (let i = 0; i < 15; i++) {
            const div = document.createElement('div');
            div.className = 'ip-flutuante';
            container.appendChild(div);
        }
    }
});