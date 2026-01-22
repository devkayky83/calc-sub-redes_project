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

function mostrarErro(mensagem) {
    const mensagemErro = document.getElementById('mensagem-erro');
    mensagemErro.textContent = mensagem;
    mensagemErro.style.display = 'block';
    
    setTimeout(() => {
        mensagemErro.style.display = 'none';
    }, 5000);
}

function validarIP(ip) {
    const regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!regex.test(ip)) return false;
    
    const partes = ip.split('.');
    return partes.every(parte => {
        const num = parseInt(parte);
        return num >= 0 && num <= 255;
    });
}

function validarMascara(mascara) {
    const partes = mascara.split(".");
    if (partes.length !== 4) return false;
    for (let parte of partes) {
        const num = parseInt(parte);
        if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
}

function validarCIDR(cidr) {
    const num = parseInt(cidr);
    return !isNaN(num) && num >= 0 && num <= 32;
}

function mostrarErroCidrCritico(cidr, mensagemErro) {
    mensagemErro.innerHTML = `<strong>⚠️ CIDR /${cidr} não permite hosts utilizáveis.</strong>`;
    mensagemErro.style.display = "block";
}

async function gerarVisualizacao() {
    const ipInput = document.getElementById('ip').value.trim();
    const cidrInput = document.getElementById('cidr').value.trim();
    const mensagemErro = document.getElementById('mensagem-erro');
    const loading = document.getElementById('loading');
    const infoPanel = document.getElementById('info-panel');
    
    mensagemErro.style.display = 'none';
    
    // VALIDAÇÃO INICIAL
    if (!ipInput || !cidrInput) {
        mostrarErro('⚠️ Por favor, preencha o IP e o CIDR/Máscara');
        return;
    }

    if (!validarIP(ipInput)) {
        mostrarErro('⚠️ IP inválido! Use o formato: 192.168.1.0');
        return;
    }


    let urlParam = "";
    let isMascara = cidrInput.includes('.');

    if (isMascara) {
        
        if (!validarMascara(cidrInput)) {
            mostrarErro('⚠️ Máscara de sub-rede inválida. Use formato: 255.255.255.0');
            return;
        }
        
        if (cidrInput === "255.255.255.255") {
            mostrarErroCidrCritico(32, mensagemErro);
            return;
        }
        if (cidrInput === "255.255.255.254") {
            mostrarErroCidrCritico(31, mensagemErro);
            return;
        }
        
        urlParam = `&mascara=${cidrInput}`;

    } else {
        
        if (!validarCIDR(cidrInput)) {
            mostrarErro('⚠️ CIDR inválido. Use valores entre 0 e 32');
            return;
        }
        
        const cidrInt = parseInt(cidrInput);
        
        if (cidrInt === 31 || cidrInt === 32) {
            mostrarErroCidrCritico(cidrInt, mensagemErro);
            return;
        }

        if (cidrInt < 8) {
            mostrarErro('⚠️ Este sistema calcula de /8 até /30');
            return;
        }

        if (cidrInt > 30) {
            mostrarErro('⚠️ O CIDR deve estar entre 8 e 30 para visualização');
            return;
        }
        
        urlParam = `cidr=${cidrInput}`;
    }

    loading.classList.add('active');
    infoPanel.classList.remove('active');

    try {
        const url = `http://localhost:5000/visualizar-subredes?ip=${ipInput}&${urlParam}`;
        console.log('📡 Requisição para:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao buscar dados do servidor');
        }

        const data = await response.json();
        console.log('✅ Dados recebidos:', data);

        // Delay artificial para mostrar a animação do loading
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        loading.classList.remove('active');
        
        mostrarInformacoes(data.info);
        renderizarRede(data);

    } catch (error) {
        loading.classList.remove('active');
        mostrarErro('❌ Erro ao gerar visualização: ' + error.message);
        console.error('❌ Erro completo:', error);
    }
}

function mostrarInformacoes(info) {
    const infoPanel = document.getElementById('info-panel');
    const infoGrid = document.getElementById('info-grid');
    
    infoGrid.innerHTML = `
        <div class="info-item">
            <label>IP Base:</label>
            <value>${info.ip_base}</value>
        </div>
        <div class="info-item">
            <label>CIDR:</label>
            <value>/${info.cidr}</value>
        </div>
        <div class="info-item">
            <label>Máscara de Sub-rede:</label>
            <value>${info.mascara}</value>
        </div>
        <div class="info-item">
            <label>Total de Sub-redes:</label>
            <value>${info.num_subredes}</value>
        </div>
        <div class="info-item">
            <label>Hosts por Sub-rede:</label>
            <value>${info.hosts_por_subrede}</value>
        </div>
    `;
    
    infoPanel.classList.add('active');
}

function renderizarRede(data) {
    const container = document.getElementById('network-canvas');
    
    const nodes = new vis.DataSet(data.nodes);
    const edges = new vis.DataSet(data.edges);
    
    const groups = {};
    data.groups.forEach(group => {
        groups[group.id] = {
            color: group.color
        };
    });
    
    // CONFIGURAÇÕES OTIMIZADAS DE FÍSICA
    const options = {
        nodes: {
            font: {
                size: 14,
                color: '#ffffff',
                face: 'Space Grotesk, Arial',
                background: 'rgba(0,0,0,0.8)',
                strokeWidth: 0
            },
            borderWidth: 2,
            borderWidthSelected: 4,
            shapeProperties: {
                useBorderWithImage: true
            },
            shadow: {
                enabled: true,
                color: 'rgba(0,217,255,0.3)',
                size: 10,
                x: 0,
                y: 0
            },
            chosen: {
                label: false
            }
        },
        edges: {
            color: {
                color: '#00d9ff',
                highlight: '#00ffc8',
                hover: '#00ffc8'
            },
            smooth: {
                enabled: true,
                type: 'continuous',
                roundness: 0.5
            },
            shadow: {
                enabled: true,
                color: 'rgba(0,217,255,0.2)',
                size: 5,
                x: 0,
                y: 0
            }
        },
        groups: groups,
        
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -15,
                centralGravity: 0.001,
                springLength: 200,
                springConstant: 0.01,
                damping: 0.4,
                avoidOverlap: 0.2
            },
            stabilization: {
                enabled: true,
                iterations: 200,
                updateInterval: 25,
                fit: true
            },
            minVelocity: 2,
            maxVelocity: 10
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
                bindToWindow: false
            }
        },

        configure: {
            enabled: false
        },

        layout: {
            randomSeed: undefined,
            improvedLayout: true
        }
    };
    
    const networkData = {
        nodes: nodes,
        edges: edges
    };
    
    if (network) {
        network.destroy();
    }
    
    network = new vis.Network(container, networkData, options);

    // TOOLTIP CUSTOMIZADO
    network.on("hoverNode", function(params) {
        const nodeId = params.node;
        const node = nodes.get(nodeId);
        
        if (node && node.title) {
            let tooltip = document.getElementById('custom-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'custom-tooltip';
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
            tooltip.style.display = 'block';
            tooltip.style.left = params.event.pageX + 10 + 'px';
            tooltip.style.top = params.event.pageY + 10 + 'px';
        }
    });
    
    network.on("blurNode", function() {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
    
    container.addEventListener('mousemove', function(e) {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
        }
    });
    
    // Eventos de interação
    network.on('hoverNode', function(params) {
        container.style.cursor = 'pointer';
    });
    
    network.on('blurNode', function(params) {
        container.style.cursor = 'default';
    });
    
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.get(nodeId);
            console.log('📍 Dispositivo selecionado:', node);
        }
    });
    
    // Reduz física após estabilização
    network.once('stabilizationIterationsDone', function() {
        console.log('✅ Estabilização completa!');
        network.setOptions({
            physics: {
                enabled: true,
                stabilization: false,
                forceAtlas2Based: {
                    gravitationalConstant: -10,
                    centralGravity: 0.0001,
                    springConstant: 0.005,
                    damping: 0.9
                }
            }
        });
    });
    
    // Animação de entrada
    network.fit({
        animation: {
            duration: 1000,
            easingFunction: 'easeInOutQuad'
        }
    });
    
    console.log('🎨 Visualização criada com sucesso!');
    console.log('📊 Total de nós:', nodes.length);
    console.log('🔗 Total de conexões:', edges.length);
}

// Permitir Enter para gerar visualização
document.addEventListener('DOMContentLoaded', function() {
    const ipInput = document.getElementById('ip');
    const cidrInput = document.getElementById('cidr');
    
    if (ipInput) {
        ipInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') gerarVisualizacao();
        });
    }
    
    if (cidrInput) {
        cidrInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') gerarVisualizacao();
        });
    }
});