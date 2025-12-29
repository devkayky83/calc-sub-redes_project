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

async function calcularSubredes() {
  const ip = document.getElementById("ip").value;
  const cidr = document.getElementById("cidr").value;

  if (!ip || !cidr) {
    const mensagemErro = document.getElementById("mensagem-erro");
    mensagemErro.textContent = "Por favor, preencha todos os campos.";
    mensagemErro.style.display = "block";
    return;
  }

  if (!validarIP(ip)) {
    const mensagemErro = document.getElementById("mensagem-erro");
    mensagemErro.textContent =
      "Endereço IP inválido. Por favor, inserir um IP válido.";
    mensagemErro.style.display = "block";
    return;
  }

  if (!validarCIDR(cidr)) {
    const mensagemErro = document.getElementById("mensagem-erro");
    mensagemErro.textContent =
      "CIDR inválido. Por favor, inserir um CIDR válido.";
    mensagemErro.style.display = "block";
    return;
  }

  if (cidr === "31" || cidr === "32") {
    const mensagemErro = document.getElementById("mensagem-erro");

    if (cidr === "32") {
      mensagemErro.innerHTML = `
        <strong>⚠️ /32 não é adequado para cálculo de sub-redes</strong><br></br>
        <strong>O que é /32?</strong> Identifica um ÚNICO host específico (não uma rede).<br><br>
        <strong>Usado para:</strong> Regras de firewall, rotas específicas, ACLs.<br><br>
        <strong>Não possui:</strong> Endereço de rede, broadcast ou hosts utilizáveis.<br><br>
        💡 <em>Para calcular sub-redes, use /30 ou menor (mais hosts).</em>
        `;
    } else {
      mensagemErro.innerHTML = `
        <strong>⚠️ /31 é um caso especial (RFC 3021)</strong><br><br>
        <strong>O que é /31?</strong> Usado exclusivamente para links ponto-a-ponto entre roteadores.<br><br>
        <strong>Características:</strong> Apenas 2 IPs (sem rede/broadcast reservados).<br><br>
        <strong>Não aplicável:</strong> Para redes de hosts comuns.<br><br>
        💡 <em>Para sub-redes normais, use /30 (2 hosts) ou menor.</em>
        `;
    }

    mensagemErro.style.display = "block";
    return;
  }

  if (parseInt(cidr) < 24) {
    const mensagemErro = document.getElementById("mensagem-erro");
    mensagemErro.innerHTML = `
      <strong>⚠️ Este sistema calcula sub-redes de /24 até /30</strong><br><br>
      <strong>Por que /24 é o mínimo?</strong> Nosso sistema trabalha com divisões dentro do último octeto (256 endereços).<br><br>
      <strong>Redes menores que /24:</strong> Usadas em cenários de grande escala (provedores, datacenters) e requerem cálculos mais complexos.<br><br>
      <strong>Exemplos práticos:</strong><br>
      • /24 = 254 hosts (pequenas empresas)<br>
      • /27 = 30 hosts (departamentos)<br>
      • /30 = 2 hosts (links entre roteadores)<br><br>
      💡 <em>Para aprendizado de sub-redes, /24 a /30 cobre 95% dos casos reais!</em>
    `;
    mensagemErro.style.display = "block";
    return;
  }

  document.getElementById("mensagem-erro").style.display = "none";

  const resposta = await fetch(
    `http://127.0.0.1:5000/calcular-subredes?ip=${ip}&cidr=${cidr}`
  );
  const dados = await resposta.json();

  const totalSubredes = dados.length;
  const hostsPorSubrede = dados[0].numero_total_hosts;
  const totalHosts = totalSubredes * hostsPorSubrede;

  const cardsHTML = `
                <div class="cards-container">
                    <div class="card">
                        <h3>Total de Sub-Redes</h3>
                        <p class="card-valor" id="valor-subredes">0</p>
                    </div>
                    <div class="card">
                        <h3>Hosts Utilizáveis</h3>
                        <p class="card-valor" id="valor-hosts-unitarios">0</p>
                    </div>
                    <div class="card">
                        <h3>Total de Hosts</h3>
                        <p class="card-valor" id="valor-total-hosts">0</p>
                    </div>
                </div>
            `;
  document.getElementById("cards-resumo").innerHTML = cardsHTML;
  document.getElementById("cards-resumo").style.display = "block";

  setTimeout(() => {
    animarContador(document.getElementById("valor-subredes"), totalSubredes);
    animarContador(
      document.getElementById("valor-hosts-unitarios"),
      hostsPorSubrede
    );
    animarContador(document.getElementById("valor-total-hosts"), totalHosts);
  }, 100);

  function validarIP(ip) {
    const partes = ip.split(".");
    if (partes.length !== 4) return false;

    for (let parte of partes) {
      const numero = parseInt(parte);
      if (isNaN(numero) || numero < 0 || numero > 255) {
        return false;
      }
    }
    return true;
  }

  function validarCIDR(cidr) {
    const numero = parseInt(cidr);

    if (isNaN(numero) || numero < 0 || numero > 32) {
      return false;
    }
    return true;
  }

  function animarContador(elemento, valorFinal, duracao = 1000) {
    let inicio = 0;
    const incremento = valorFinal / (duracao / 16);

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

  let tabela = `
                <table class="result-table" border="1">
                    <thead>
                        <tr>
                            <th>Sub-rede</th>
                            <th>Broadcast</th>
                            <th>Primeiro Host</th>
                            <th>Último Host</th>
                            <th>Número Total de Hosts</th>
                            <th>Gateway padrão</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

  for (let subrede of dados) {
    tabela += `
                    <tr>
                        <td>${subrede.subrede}</td>
                        <td>${subrede.broadcast}</td>
                        <td>${subrede.primeiro_host}</td>
                        <td>${subrede.ultimo_host}</td>
                        <td>${subrede.numero_total_hosts}</td>
                        <td>${subrede.gateway_padrao}</td>
                    </tr>
                `;
  }
  tabela += `
                    </tbody>
                </table>
            `;
  document.getElementById("resultado").innerHTML = tabela;
}

function IPFlowBackground() {
  const container = document.getElementById('ipFlowBg');
  const ips = [
    '192.168.1.0', '10.0.0.0', '172.16.0.0', '192.168.0.0',
    '10.10.10.0', '172.31.255.0', '192.168.100.0', '10.0.1.0',
    '172.16.10.0', '192.168.50.0', '10.20.30.0', '172.20.0.0'
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