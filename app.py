from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import math
import os
import re

app = Flask(__name__, static_folder='.')
CORS(app)

# --- ROTAS DE SERVIDOR ---
@app.route('/')
def index():
    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    return "Erro: Arquivo index.html não encontrado.", 404

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- FUNÇÕES AUXILIARES ---

def validar_ip(ip):
    padrao = r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$"
    match = re.match(padrao, ip)
    if not match: return False
    for parte in match.groups():
        if int(parte) < 0 or int(parte) > 255: return False
    return True

def identificar_classe(ip):
    """RF03: Identifica a classe da rede baseada no primeiro octeto"""
    primeiro_octeto = int(ip.split('.')[0])
    if 0 <= primeiro_octeto <= 127:
        return 'A'
    elif 128 <= primeiro_octeto <= 191:
        return 'B'
    elif 192 <= primeiro_octeto <= 223:
        return 'C'
    elif 224 <= primeiro_octeto <= 239:
        return 'D (Multicast)'
    else:
        return 'E (Experimental)'

def converter_mascara_binaria(cidr):
    mascara_int = (0xffffffff >> (32 - cidr)) << (32 - cidr)
    octetos = []
    for i in range(4):
        octeto = (mascara_int >> (24 - i * 8)) & 0xff
        octetos.append(bin(octeto)[2:].zfill(8))
    return '.'.join(octetos)

def cidr_pra_mascara(cidr):
    mascara = (0xffffffff >> (32 - cidr)) << (32 - cidr)
    return '.'.join([str((mascara >> (24 - i * 8)) & 0xff) for i in range(4)])

def cidr_to_zeros(cidr):
    return 32 - cidr

def calcular_tamanho_subrede(cidr):
    return 2 ** cidr_to_zeros(cidr)

def calcular_broadcast(ip_inicial, tamanho_subrede):
    partes_ip = list(map(int, ip_inicial.split('.'))) 
    partes_ip[3] += (tamanho_subrede - 1)
    if partes_ip[3] > 255: partes_ip[3] = 255 
    return '.'.join(map(str, partes_ip))

def calcular_proxima_subrede(ip_atual, tamanho_subrede):
    partes_ip = list(map(int, ip_atual.split('.')))
    partes_ip[3] += tamanho_subrede
    if partes_ip[3] > 255: partes_ip[3] = 0 
    return '.'.join(map(str, partes_ip))

def calcular_primeiro_host(ip_inicial):
    partes_ip = list(map(int, ip_inicial.split('.')))
    partes_ip[3] += 1
    return '.'.join(map(str, partes_ip))

def calcular_ultimo_host(broadcast):
    partes_ip = list(map(int, broadcast.split('.')))
    partes_ip[3] -= 1
    return '.'.join(map(str, partes_ip))

def numero_total_ips(cidr):
    return 2 ** (32 - cidr)

def numero_hosts_validos(cidr):
    return (2 ** (32 - cidr)) - 2

# --- ROTA DE CÁLCULO ---
@app.route('/calcular-subredes')
def calcular():
    ip_base = request.args.get('ip')
    qtd_req = request.args.get('qtd')
    
    if not ip_base or not qtd_req: return jsonify({'error': 'Preencha o IP e a Quantidade.'}), 400
    if not validar_ip(ip_base): return jsonify({'error': 'IP inválido.'}), 400

    try:
        qtd = int(qtd_req)
        if qtd <= 0: return jsonify({'error': 'Quantidade deve ser > 0.'}), 400
        
        bits_necessarios = math.ceil(math.log2(qtd))
        cidr_requisitado = 24 + bits_necessarios
        
        if cidr_requisitado > 30:
            return jsonify({'error': f'Máximo de 64 sub-redes (/30).'}), 400
            
    except ValueError:
        return jsonify({'error': 'Erro numérico.'}), 400

    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    
    # MUDANÇA AQUI: Agora geramos a máscara em DECIMAL
    mascara_decimal = cidr_pra_mascara(cidr_requisitado) 
    
    total_ips = numero_total_ips(cidr_requisitado)
    hosts_validos = numero_hosts_validos(cidr_requisitado)
    classe_rede = identificar_classe(ip_base)
    
    resultado = []
    limite = 256 // tamanho_subrede 
    ip_atual = ip_base

    for i in range(limite):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        
        resultado.append({
            'subrede': i + 1,
            'ip_rede': ip_atual,
            'primeiro_host': calcular_primeiro_host(ip_atual),
            'ultimo_host': calcular_ultimo_host(broadcast),
            'broadcast': broadcast,
            'mascara_decimal': mascara_decimal, # Enviando Decimal
            'total_ips': total_ips,
            'hosts_validos': hosts_validos,
            'classe': classe_rede
        })
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
        
    return jsonify(resultado)

# --- ROTA DE VISUALIZAÇÃO  ---
@app.route('/visualizar-subredes')
def visualizar():
    ip_requisitado = request.args.get('ip')
    qtd_req = request.args.get('qtd')
    
    if not ip_requisitado or not qtd_req: return jsonify({'error': 'Erro param.'}), 400
    try:
        qtd = int(qtd_req)
        cidr_requisitado = 24 + math.ceil(math.log2(qtd))
        if cidr_requisitado > 30: cidr_requisitado = 30
    except: return jsonify({'error': 'Erro qtd'}), 400
    
    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    num_subredes = min(8, 256 // tamanho_subrede) if tamanho_subrede > 0 else 0
    
    nodes = []
    edges = []
    cores = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A8', '#33FFF5', '#F5FF33', '#FF8C33']
    
    nodes.append({
        'id': 'router-central', 'label': 'Roteador', 'shape': 'image',
        'image': 'assets/pics/router.png', 'size': 70, 'x': 0, 'y': 0,
        'fixed': {'x': True, 'y': True}, 'physics': False,
        'color': {'background': '#ffffff', 'border': '#000000'}
    })
    
    raio_switch = 450
    raio_dispositivo = 250
    ip_atual = ip_requisitado
    
    for i in range(num_subredes):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro_host = calcular_primeiro_host(ip_atual)
        cor = cores[i % len(cores)]
        
        ang = (i / num_subredes) * 2 * math.pi
        sx = raio_switch * math.cos(ang)
        sy = raio_switch * math.sin(ang)
        
        sid = f'switch-{i}'
        nodes.append({'id': sid, 'label': f'Sub {i+1}', 'shape': 'image', 'image': 'assets/pics/network-switch.png', 'size': 50, 'x': sx, 'y': sy, 'color': {'background': cor, 'border': '#000000'}})
        edges.append({'from': 'router-central', 'to': sid, 'width': 3, 'dashes': True, 'color': cor})
        
        num_visuais = min(3, (2**(32-cidr_requisitado))-2)
        for j in range(num_visuais):
            did = f'dev-{i}-{j}'
            partes = list(map(int, primeiro_host.split('.')))
            partes[3] += j
            ip_dev = '.'.join(map(str, partes))
            
            offset = (j - (num_visuais-1)/2) * 0.5
            ang_f = ang + offset
            dx = sx + (raio_dispositivo * math.cos(ang_f))
            dy = sy + (raio_dispositivo * math.sin(ang_f))
            
            nodes.append({'id': did, 'label': f'PC\n{ip_dev}', 'shape': 'image', 'image': 'assets/pics/computer.png', 'size': 40, 'x': dx, 'y': dy, 'color': {'background': cor, 'border': '#000000'}})
            edges.append({'from': sid, 'to': did, 'width': 3, 'color': cor})
            
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)

    return jsonify({'nodes': nodes, 'edges': edges})

if __name__ == '__main__':
    app.run(debug=True, port=5000)