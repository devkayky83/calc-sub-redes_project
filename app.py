from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import math
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# --- ROTAS DE SERVIDOR ---
@app.route('/')
def index():
    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    elif os.path.exists('pages/calculo.html'):
        return send_from_directory('pages', 'calculo.html')
    else:
        return "Erro: Arquivo index.html não encontrado.", 404

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- FUNÇÕES AUXILIARES ---

def detectar_classe_ip(ip):
    """Detecta a classe do IP (A, B, C, D ou E)"""
    primeiro_octeto = int(ip.split('.')[0])
    
    if 0 <= primeiro_octeto <= 127:
        return 'A', 8
    elif 128 <= primeiro_octeto <= 191:
        return 'B', 16
    elif 192 <= primeiro_octeto <= 223:
        return 'C', 24
    elif 224 <= primeiro_octeto <= 239:
        return 'D', None  # Multicast
    else:
        return 'E', None  # Reservado

def calcular_cidr_por_subredes(num_subredes, cidr_base):
    """Calcula o CIDR necessário baseado no número de sub-redes desejado"""
    if num_subredes <= 0:
        return cidr_base
    
    # Bits necessários para acomodar o número de sub-redes
    bits_necessarios = math.ceil(math.log2(num_subredes))
    
    return cidr_base + bits_necessarios

def mascara_para_cidr(mascara):
    try:
        binario = ''.join([bin(int(x))[2:].zfill(8) for x in mascara.split('.')])
        return binario.count('1')
    except:
        return 0

def cidr_pra_mascara(cidr):
    mascara = (0xffffffff >> (32 - cidr)) << (32 - cidr)
    return '.'.join([str((mascara >> (24 - i * 8)) & 0xff) for i in range(4)])

def cidr_to_zeros(cidr):
    return 32 - cidr

def calcular_tamanho_subrede(cidr):
    return 2 ** cidr_to_zeros(cidr)

def calcular_broadcast(ip_inicial, tamanho_subrede):
    partes_ip = list(map(int, ip_inicial.split('.'))) 
    
    # Distribui o incremento entre os octetos
    incremento = tamanho_subrede - 1
    partes_ip[3] += incremento
    
    # Propaga carry para octetos anteriores
    for i in range(3, 0, -1):
        if partes_ip[i] > 255:
            partes_ip[i-1] += partes_ip[i] // 256
            partes_ip[i] = partes_ip[i] % 256
    
    return '.'.join(map(str, partes_ip))

def calcular_proxima_subrede(ip_atual, tamanho_subrede):
    partes_ip = list(map(int, ip_atual.split('.')))
    partes_ip[3] += tamanho_subrede
    
    for i in range(3, 0, -1):
        if partes_ip[i] > 255:
            partes_ip[i-1] += partes_ip[i] // 256
            partes_ip[i] = partes_ip[i] % 256
    
    return '.'.join(map(str, partes_ip))

def calcular_primeiro_host(ip_inicial):
    partes_ip = list(map(int, ip_inicial.split('.')))
    partes_ip[3] += 1
    
    for i in range(3, 0, -1):
        if partes_ip[i] > 255:
            partes_ip[i-1] += 1
            partes_ip[i] = 0
    
    return '.'.join(map(str, partes_ip))

def calcular_ultimo_host(broadcast):
    partes_ip = list(map(int, broadcast.split('.')))
    partes_ip[3] -= 1
    
    for i in range(3, 0, -1):
        if partes_ip[i] < 0:
            partes_ip[i-1] -= 1
            partes_ip[i] = 255
    
    return '.'.join(map(str, partes_ip))

def numero_total_ips(cidr):
    return 2 ** (32 - cidr)

def numero_hosts_validos(cidr):
    """Retorna apenas os hosts utilizáveis (exclui rede e broadcast)"""
    return (2 ** (32 - cidr)) - 2


@app.route('/calcular-subredes-completo')
def calcular_completo():
    """
    Nova rota unificada que aceita IP + Número de Sub-redes
    Retorna dados para tabela E visualização gráfica
    """
    ip_requisitado = request.args.get('ip')
    num_subredes_param = request.args.get('num_subredes')
    
    if not ip_requisitado or not num_subredes_param:
        return jsonify({'error': 'IP e número de sub-redes são obrigatórios'}), 400
    
    try:
        num_subredes = int(num_subredes_param)
    except ValueError:
        return jsonify({'error': 'Número de sub-redes deve ser um inteiro'}), 400
    
    if num_subredes < 1:
        return jsonify({'error': 'Número de sub-redes deve ser maior que 0'}), 400
    
    
    classe, cidr_base = detectar_classe_ip(ip_requisitado)
    
    if cidr_base is None:
        return jsonify({'error': f'IP classe {classe} não suporta sub-redes (Multicast/Reservado)'}), 400
    
    
    cidr_calculado = calcular_cidr_por_subredes(num_subredes, cidr_base)
    
    if cidr_calculado > 30:
        return jsonify({'error': 'Número de sub-redes muito alto. Use até /30'}), 400
    
    
    mascara = cidr_pra_mascara(cidr_calculado)
    tamanho_subrede = calcular_tamanho_subrede(cidr_calculado)
    hosts_validos = numero_hosts_validos(cidr_calculado)
    total_ips = numero_total_ips(cidr_calculado)
    
    
    tabela_subredes = []
    ip_atual = ip_requisitado
    
    for i in range(num_subredes):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro = calcular_primeiro_host(ip_atual)
        ultimo = calcular_ultimo_host(broadcast)
        
        tabela_subredes.append({
            'numero': i + 1,
            'ip_rede': ip_atual,
            'primeiro_host': primeiro,
            'ultimo_host': ultimo,
            'broadcast': broadcast,
            'mascara': mascara,
            'hosts_validos': hosts_validos
        })
        
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
    
    nodes, edges, groups = gerar_topologia(
        ip_requisitado, 
        cidr_calculado, 
        mascara, 
        num_subredes
    )
    
    return jsonify({
        'info': {
            'ip_base': ip_requisitado,
            'classe': classe,
            'cidr_base': cidr_base,
            'cidr_calculado': cidr_calculado,
            'mascara': mascara,
            'num_subredes': num_subredes,
            'hosts_validos': hosts_validos,
            'total_ips': total_ips
        },
        'tabela': tabela_subredes,
        'topologia': {
            'nodes': nodes,
            'edges': edges,
            'groups': groups
        }
    })


def gerar_topologia(ip_base, cidr, mascara, num_subredes):
    """Gera dados da topologia de rede para visualização"""
    
    tamanho_subrede = calcular_tamanho_subrede(cidr)
    num_hosts_validos = numero_hosts_validos(cidr)
    
    num_subredes_visual = min(8, num_subredes)
    
    nodes = []
    edges = []
    groups = []
    
    cores = [
        '#FFE87C', '#FF9ECD', '#7CDDFF', '#7CFF9E',
        '#FFA07A', '#DDA0DD', '#87CEEB', '#98FB98'
    ]
    
    distancia_entre_switches = 400
    distancia_dispositivos = 200
    
    ip_atual = ip_base
    
    for i in range(num_subredes_visual):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro_host = calcular_primeiro_host(ip_atual)
        
        group_id = f'group-{i}'
        groups.append({
            'id': group_id,
            'color': {'background': cores[i % len(cores)], 'border': cores[i % len(cores)]},
        })
        
        # Parte/Switch
        switch_id = f'switch-{i}'
        switch_x = (i - (num_subredes_visual - 1) / 2) * distancia_entre_switches
        switch_y = 0
        
        nodes.append({
            'id': switch_id,
            'label': f'Switch {i+1}',
            'shape': 'image',
            'image': '/assets/pics/network-switch.png',
            'size': 35,
            'x': switch_x,
            'y': switch_y,
            'fixed': {'x': False, 'y': False},
            'title': f'<b>Sub-rede {i+1}</b><br>Rede: {ip_atual}/{cidr}<br>Máscara: {mascara}<br>Broadcast: {broadcast}<br>Hosts válidos: {num_hosts_validos}'
        })
        
        # Conectar switches
        if i < num_subredes_visual - 1:
            edges.append({
                'from': switch_id,
                'to': f'switch-{i+1}',
                'width': 3,
                'dashes': True,
                'length': distancia_entre_switches
            })
        
        
        num_dispositivos_visual = min(3, num_hosts_validos)
        if num_dispositivos_visual < 0:
            num_dispositivos_visual = 0
        
        for j in range(num_dispositivos_visual):
            device_id = f'device-{i}-{j}'
            device_type = 'PC' if j % 2 == 0 else 'Laptop'
            icon = '/assets/pics/computer.png' if device_type == 'PC' else '/assets/pics/laptop.png'
            
            # Calcular IP do dispositivo
            partes_ip = list(map(int, primeiro_host.split('.')))
            partes_ip[3] += j
            
            # Propagar carry se necessário
            for k in range(3, 0, -1):
                if partes_ip[k] > 255:
                    partes_ip[k-1] += partes_ip[k] // 256
                    partes_ip[k] = partes_ip[k] % 256
            
            device_ip = '.'.join(map(str, partes_ip))
            
            offset_horizontal = (j - (num_dispositivos_visual - 1) / 2) * 120
            device_x = switch_x + offset_horizontal
            device_y = distancia_dispositivos
            
            nodes.append({
                'id': device_id,
                'label': f'{device_type}\n{device_ip}',
                'shape': 'image',
                'image': icon,
                'size': 25,
                'x': device_x,
                'y': device_y,
                'group': group_id,
                'title': f'<b>{device_type}</b><br>IP: {device_ip}<br>Gateway: {primeiro_host}'
            })
            
            edges.append({
                'from': switch_id,
                'to': device_id,
                'width': 2,
                'length': distancia_dispositivos
            })
        
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
    
    return nodes, edges, groups


@app.route('/calcular-subredes')
def calcular():
    ip_requisitado = request.args.get('ip')
    cidr_param = request.args.get('cidr')
    mascara_param = request.args.get('mascara')
    
    if mascara_param:
        cidr_requisitado = mascara_para_cidr(mascara_param)
    elif cidr_param:
        try:
            cidr_requisitado = int(cidr_param)
        except:
            return jsonify({'error': 'CIDR inválido'}), 400
    else:
        return jsonify({'error': 'Forneça CIDR ou Máscara'}), 400

    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    mascara_decimal = cidr_pra_mascara(cidr_requisitado)
    total_ips = numero_total_ips(cidr_requisitado)
    
    resultado = []
    
    if tamanho_subrede > 0:
        limite = 256 // tamanho_subrede
    else:
        limite = 0
    
    ip_atual = ip_requisitado

    for i in range(limite):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro = calcular_primeiro_host(ip_atual)
        ultimo = calcular_ultimo_host(broadcast)
        
        bits_host = 32 - cidr_requisitado
        
        resultado.append({
            'id': i + 1,
            'ip_rede': {'valor': ip_atual},
            'mascara': {'valor': mascara_decimal},
            'primeiro_host': {'valor': primeiro},
            'ultimo_host': {'valor': ultimo},
            'broadcast': {'valor': broadcast},
            'total_ips': {'valor': total_ips}
        })
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
        
    return jsonify(resultado)


if __name__ == '__main__':
    app.run(debug=True, port=5000)