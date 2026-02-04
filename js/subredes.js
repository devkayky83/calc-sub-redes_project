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

let network = null;

function validarIP(ip) {
  const partes = ip.split(".");
  if (partes.length !== 4) return false;
  for (let parte of partes) {
    const numero = parseInt(parte);
    if (isNaN(numero) || numero < 0 || numero > 255) return false;
  }
  return true;
}

function calcularLimitesSubredes(ip) {
  const primeiroOcteto = parseInt(ip.split(".")[0]);

  let classe, cidrBase, maxSubredes;

  if (primeiroOcteto >= 0 && primeiroOcteto <= 127) {
    classe = "A";
    cidrBase = 8;
    maxSubredes = 4194304;
  } else if (primeiroOcteto >= 128 && primeiroOcteto <= 191) {
    classe = "B";
    cidrBase = 16;
    maxSubredes = 16384;
  } else if (primeiroOcteto >= 192 && primeiroOcteto <= 223) {
    classe = "C";
    cidrBase = 24;
    maxSubredes = 64;
  } else {
    // Classe D (Multicast) ou E (Reservado)
    return null;
  }

  return { classe, cidrBase, maxSubredes };
}

function mostrarErro(mensagem) {
  const mensagemErro = document.getElementById("mensagem-erro");
  mensagemErro.innerHTML = mensagem;
  mensagemErro.style.display = "block";

  setTimeout(() => {
    mensagemErro.style.display = "none";
  }, 5000);
}

async function calcularEVisualizar() {
  const ip = document.getElementById("ip").value.trim();
  const numSubredes = document.getElementById("num-subredes").value.trim();

  const mensagemErro = document.getElementById("mensagem-erro");
  const loading = document.getElementById("loading");
  const infoPanel = document.getElementById("info-panel");
  const tabelaContainer = document.getElementById("tabela-container");

  mensagemErro.style.display = "none";
  infoPanel.classList.remove("active");
  tabelaContainer.classList.remove("active");


  if (!ip || !numSubredes) {
    mostrarErro("⚠️ Por favor, preencha o IP e o número de sub-redes");
    return;
  }

  
  if (!validarIP(ip)) {
    mostrarErro("⚠️ IP inválido! Use o formato: 192.168.1.0");
    return;
  }


  const numSubredesInt = parseInt(numSubredes);
  if (isNaN(numSubredesInt) || numSubredesInt < 2) {
    mostrarErro("⚠️ Número de sub-redes deve ser no mínimo 2");
    return;
  }

  const limites = calcularLimitesSubredes(ip);

  if (!limites) {
    mostrarErro(
      "⚠️ IP Classe D (Multicast) ou E (Reservado) não suporta sub-redes",
    );
    return;
  }

  // Máximo de sub-redes baseado na classe
  if (numSubredesInt > limites.maxSubredes) {
    mostrarErro(
      `⚠️ Número de sub-redes muito alto!<br>` +
        `<strong>Classe ${limites.classe}</strong> suporta no máximo <strong>${limites.maxSubredes.toLocaleString("pt-BR")}</strong> sub-redes<br>` +
        `(CIDR máximo: /30 = 2 hosts por sub-rede)`,
    );
    return;
  }

  // Avisar se vai gerar sub-redes muito pequenas
  const bitsNecessarios = Math.ceil(Math.log2(numSubredesInt));
  const cidrFinal = limites.cidrBase + bitsNecessarios;
  const hostsValidos = Math.pow(2, 32 - cidrFinal) - 2;

  if (hostsValidos < 2) {
    mostrarErro(
      `⚠️ Esta configuração geraria sub-redes sem hosts válidos!<br>` +
        `CIDR calculado: /${cidrFinal} (${hostsValidos + 2} IPs totais)`,
    );
    return;
  }


  // PROCESSAMENTO 
  loading.classList.add("active");
  ocultarElementos();

  try {
    const url = `/calcular-subredes-completo?ip=${ip}&num_subredes=${numSubredesInt}`;
    console.log("📡 Requisição:", url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao buscar dados do servidor");
    }

    const data = await response.json();
    console.log("Dados recebidos:", data);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    loading.classList.remove("active");

    mostrarInformacoes(data.info);
    renderizarTopologia(data.topologia);
    gerarTabela(data.tabela);

    mostrarElementos();
  } catch (error) {
    loading.classList.remove("active");
    mostrarErro("Erro ao gerar visualização: " + error.message);
    console.error("Erro:", error);
  }
}

function mostrarInformacoes(info) {
  const infoPanel = document.getElementById("info-panel");
  const infoGrid = document.getElementById("info-grid");

  infoGrid.innerHTML = `
        <div class="info-item">
            <label>IP Base:</label>
            <value>${info.ip_base}</value>
        </div>
        <div class="info-item coluna-com-ajuda">
            <label>Classe:</label>
            <value>${info.classe}</value><br>
            <a href="aprendizado.html#classe-ip" class="balao-ajuda">
                <span class="icone-ajuda">❓</span>
                <span class="texto-ajuda">O que é?</span>
            </a>
        </div>
        <div class="info-item">
            <label>CIDR Calculado:</label>
            <value>/${info.cidr_calculado}</value>
        </div>
        <div class="info-item coluna-com-ajuda">
            <label>Máscara de Sub-rede:</label>
            <value>${info.mascara}</value><br>
            <a href="aprendizado.html#calculo-mascara-subrede" class="balao-ajuda">
                <span class="icone-ajuda">❓</span> 
                <span class="texto-ajuda">Como calcular?</span>
            </a>
        </div>
        <div class="info-item coluna-com-ajuda">
            <label>Hosts Válidos (cada):</label>
            <value>${info.hosts_validos}</value><br>
            <a href="aprendizado.html#componentes-redes" class="balao-ajuda">
                <span class="icone-ajuda">❓</span> 
                <span class="texto-ajuda">Como calcular?</span>
            </a>
        </div>
    `;

  infoPanel.classList.add("active");
}

function renderizarTopologia(topologia) {
  const container = document.getElementById("network-canvas");

  const nodes = new vis.DataSet(topologia.nodes);
  const edges = new vis.DataSet(topologia.edges);

  const groups = {};
  topologia.groups.forEach((group) => {
    groups[group.id] = {
      color: group.color,
    };
  });

  const options = {
    nodes: {
      font: {
        size: 14,
        color: "#ffffff",
        face: "Space Grotesk, Arial",
        background: "rgba(0,0,0,0.8)",
        strokeWidth: 0,
      },
      borderWidth: 2,
      borderWidthSelected: 4,
      shapeProperties: {
        useBorderWithImage: true,
      },
      shadow: {
        enabled: true,
        color: "rgba(0,217,255,0.3)",
        size: 10,
        x: 0,
        y: 0,
      },
      chosen: {
        label: false,
      },
    },
    edges: {
      color: {
        color: "#00d9ff",
        highlight: "#00ffc8",
        hover: "#00ffc8",
      },
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.5,
      },
      shadow: {
        enabled: true,
        color: "rgba(0,217,255,0.2)",
        size: 5,
        x: 0,
        y: 0,
      },
    },
    groups: groups,
    physics: {
      enabled: true,
      solver: "forceAtlas2Based",
      forceAtlas2Based: {
        gravitationalConstant: -15,
        centralGravity: 0.001,
        springLength: 200,
        springConstant: 0.01,
        damping: 0.4,
        avoidOverlap: 0.2,
      },
      stabilization: {
        enabled: true,
        iterations: 200,
        updateInterval: 25,
        fit: true,
      },
      minVelocity: 2,
      maxVelocity: 10,
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true,
      dragView: true,
      dragNodes: true,
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false,
      navigationButtons: true,
      keyboard: {
        enabled: true,
        bindToWindow: false,
      },
    },
    configure: {
      enabled: false,
    },
    layout: {
      randomSeed: undefined,
      improvedLayout: true,
    },
  };

  const networkData = {
    nodes: nodes,
    edges: edges,
  };

  if (network) {
    network.destroy();
  }

  network = new vis.Network(container, networkData, options);

  network.on("hoverNode", function (params) {
    const nodeId = params.node;
    const node = nodes.get(nodeId);

    if (node && node.title) {
      let tooltip = document.getElementById("custom-tooltip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "custom-tooltip";
        tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #00d9ff;
                    border-radius: 8px;
                    padding: 10px 15px;
                    color: white;
                    font-family: 'Space Grotesk', Arial, sans-serif;
                    font-size: 13px;
                    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.4);
                    pointer-events: none;
                    z-index: 9999;
                    display: none;
                `;
        document.body.appendChild(tooltip);
      }

      tooltip.innerHTML = node.title;
      tooltip.style.display = "block";
      tooltip.style.left = params.event.pageX + 10 + "px";
      tooltip.style.top = params.event.pageY + 10 + "px";
    }
  });

  network.on("blurNode", function () {
    const tooltip = document.getElementById("custom-tooltip");
    if (tooltip) {
      tooltip.style.display = "none";
    }
  });

  container.addEventListener("mousemove", function (e) {
    const tooltip = document.getElementById("custom-tooltip");
    if (tooltip && tooltip.style.display === "block") {
      tooltip.style.left = e.pageX + 10 + "px";
      tooltip.style.top = e.pageY + 10 + "px";
    }
  });

  network.on("hoverNode", function () {
    container.style.cursor = "pointer";
  });

  network.on("blurNode", function () {
    container.style.cursor = "default";
  });

  network.once("stabilizationIterationsDone", function () {
    console.log("Topologia estabilizada");
    network.setOptions({
      physics: {
        enabled: true,
        stabilization: false,
        forceAtlas2Based: {
          gravitationalConstant: -10,
          centralGravity: 0.0001,
          springConstant: 0.005,
          damping: 0.9,
        },
      },
    });
  });

  network.fit({
    animation: {
      duration: 1000,
      easingFunction: "easeInOutQuad",
    },
  });
}

function gerarTabela(dados) {
  const tbody = document.getElementById("tabela-body");
  tbody.innerHTML = "";

  for (let subrede of dados) {
    const row = `
            <tr>
                <td>${subrede.numero}</td>
                <td>${subrede.ip_rede}</td>
                <td>${subrede.primeiro_host}</td>
                <td>${subrede.ultimo_host}</td>
                <td>${subrede.broadcast}</td>
            </tr>
        `;
    tbody.innerHTML += row;
  }

  document.getElementById("tabela-container").classList.add("active");
}

function ocultarElementos() {
  document.getElementById("divider-topologia").style.display = "none";
  document.getElementById("title-topologia").style.display = "none";
  document.getElementById("legenda").style.display = "none";
  document.getElementById("instrucoes").style.display = "none";
  document.getElementById("divider-tabela").style.display = "none";
}

function mostrarElementos() {
  document.getElementById("divider-topologia").style.display = "block";
  document.getElementById("title-topologia").style.display = "block";
  document.getElementById("legenda").style.display = "flex";
  document.getElementById("instrucoes").style.display = "block";
  document.getElementById("divider-tabela").style.display = "block";
}

function IPFlowBackground() {
  const container = document.getElementById("ipFlowBg");
  if (!container) return;

  const ips = [
    "192.168.1.0",
    "10.0.0.0",
    "172.16.0.0",
    "192.168.0.0",
    "10.10.10.0",
    "172.31.255.0",
    "192.168.100.0",
    "10.0.1.0",
  ];
  const cidrs = [24, 25, 26, 27, 28, 29, 30];

  for (let i = 0; i < 15; i++) {
    const elementoIP = document.createElement("div");
    elementoIP.className = "ip-flutuante";
    const ipAleatorio = ips[Math.floor(Math.random() * ips.length)];
    const cidrAleatorio = cidrs[Math.floor(Math.random() * cidrs.length)];
    elementoIP.textContent = `${ipAleatorio}/${cidrAleatorio}`;
    elementoIP.style.top = Math.random() * 80 + 10 + "%";
    elementoIP.style.animationDuration = 15 + Math.random() * 10 + "s";
    elementoIP.style.animationDelay = Math.random() * 8 + "s";
    container.appendChild(elementoIP);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  IPFlowBackground();

  const ipInput = document.getElementById("ip");
  const numSubredesInput = document.getElementById("num-subredes");

  if (ipInput) {
    ipInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") calcularEVisualizar();
    });
  }

  if (numSubredesInput) {
    numSubredesInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") calcularEVisualizar();
    });
  }
});
