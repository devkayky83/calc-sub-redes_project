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
    partes_ip[3] += (tamanho_subrede - 1)
    if partes_ip[3] > 255: partes_ip[3] = 255 # Proteção simples
    return '.'.join(map(str, partes_ip))

def calcular_proxima_subrede(ip_atual, tamanho_subrede):
    partes_ip = list(map(int, ip_atual.split('.')))
    partes_ip[3] += tamanho_subrede
    if partes_ip[3] > 255: partes_ip[3] = 0 # Reinicia se estourar (exemplo didático)
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

@app.route('/calcular-subredes')
def calcular():
    ip_requisitado = request.args.get('ip')
    cidr_param = request.args.get('cidr')
    mascara_param = request.args.get('mascara')
    
    # Tratamento Híbrido (CIDR ou Máscara)
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
        
        # Explicações Didáticas
        bits_host = 32 - cidr_requisitado
        
        expl_rede = f"É o primeiro endereço do bloco. Identifica a sub-rede {i+1}."
        
        expl_broadcast = (
            f"O Broadcast é o último IP da sub-rede.<br>"
            f"Cálculo: IP da Rede + ({tamanho_subrede} - 1)."
        )
        
        expl_primeiro = (
            f"É o primeiro IP utilizável.<br>"
            f"Cálculo: IP da Rede + 1."
        )
        
        expl_ultimo = (
            f"É o último IP utilizável.<br>"
            f"Cálculo: Broadcast - 1."
        )
        
        expl_mascara = (
            f"Máscara /{(cidr_requisitado)} em decimal.<br>"
            f"{cidr_requisitado} bits '1' e {bits_host} bits '0'."
        )
        
        expl_total = (
            f"Um IPv4 tem 32 bits.<br>"
            f"32 - {cidr_requisitado} (rede) = {bits_host} bits host.<br>"
            f"Cálculo: 2^{bits_host} = {total_ips} IPs."
        )

        resultado.append({
            'id': i + 1,
            'ip_rede': {'valor': ip_atual, 'expl': expl_rede},
            'mascara': {'valor': mascara_decimal, 'expl': expl_mascara},
            'primeiro_host': {'valor': primeiro, 'expl': expl_primeiro},
            'ultimo_host': {'valor': ultimo, 'expl': expl_ultimo},
            'broadcast': {'valor': broadcast, 'expl': expl_broadcast},
            'total_ips': {'valor': total_ips, 'expl': expl_total}
        })
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
        
    return jsonify(resultado)


# --- ROTA DE VISUALIZAÇÃO (GRÁFICO) ---
@app.route('/visualizar-subredes')
def visualizar():
    ip_requisitado = request.args.get('ip')
    cidr_param = request.args.get('cidr')
    mascara_param = request.args.get('mascara')
    
    # Tratamento Híbrido também na visualização
    if mascara_param:
        cidr_requisitado = mascara_para_cidr(mascara_param)
    elif cidr_param and cidr_param.count('.') == 3: # Caso venha máscara no campo cidr
         cidr_requisitado = mascara_para_cidr(cidr_param)
    elif cidr_param:
        try:
            cidr_requisitado = int(cidr_param)
        except:
             return jsonify({'error': 'Parâmetros inválidos'}), 400
    else:
        return jsonify({'error': 'Parâmetros obrigatórios.'}), 400
    
    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    mascara = cidr_pra_mascara(cidr_requisitado)
    
    num_subredes = min(8, 256 // tamanho_subrede) if tamanho_subrede > 0 else 0
    
    nodes = []
    edges = []
    groups = []
    
    cores = [
        '#FFE87C', '#FF9ECD', '#7CDDFF', '#7CFF9E',
        '#FFA07A', '#DDA0DD', '#87CEEB', '#98FB98'
    ]
    
    distancia_entre_switches = 400  
    distancia_dispositivos = 200
    
    ip_atual = ip_requisitado
    
    for i in range(num_subredes):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro_host = calcular_primeiro_host(ip_atual)
        num_hosts_validos = numero_hosts_validos(cidr_requisitado)
        
        group_id = f'group-{i}'
        groups.append({
            'id': group_id,
            'color': {'background': cores[i % len(cores)], 'border': cores[i % len(cores)]},
        })
        
        # Posicionar switches na linha horizontal
        switch_id = f'switch-{i}'
        switch_x = (i - (num_subredes - 1) / 2) * distancia_entre_switches
        switch_y = 0  # Todos na mesma linha horizontal
        
        nodes.append({
            'id': switch_id,
            'label': f'Switch {i+1}', 
            'shape': 'image',
            'image': '/assets/pics/network-switch.png',
            'size': 35,
            'x': switch_x, 
            'y': switch_y,
            'fixed': {'x': False, 'y': False},
            'title': f'<b>Sub-rede {i+1}</b><br>Rede: {ip_atual}/{cidr_requisitado}<br>Máscara: {mascara}<br>Broadcast: {broadcast}<br>Hosts disponíveis: {num_hosts_validos}'
        })
        
        # CONECTAR SWITCHES ENTRE SI (linha horizontal)
        # Explicação: Cada switch conecta ao próximo (exceto o último)
        # Isso representa a interligação das sub-redes
        if i < num_subredes - 1:
            edges.append({
                'from': switch_id,
                'to': f'switch-{i+1}',
                'width': 3,
                'dashes': True,
                'length': distancia_entre_switches
            })
        
        # POSICIONAR DISPOSITIVOS ABAIXO DO SWITCH
        # Desenha alguns dispositivos (limite visual de 3)
        num_dispositivos_visual = min(3, num_hosts_validos) 
        if num_dispositivos_visual < 0: 
            num_dispositivos_visual = 0

        for j in range(num_dispositivos_visual):
            device_id = f'device-{i}-{j}'
            device_type = 'PC' if j % 2 == 0 else 'Laptop'
            icon = '/assets/pics/computer.png' if device_type == 'PC' else '/assets/pics/laptop.png'
            
            # Calcula IP do dispositivo
            partes_ip = list(map(int, primeiro_host.split('.')))
            partes_ip[3] += j
            device_ip = '.'.join(map(str, partes_ip))
            
            # Posicionar dispositivos em linha horizontal abaixo do switch
            offset_horizontal = (j - (num_dispositivos_visual - 1) / 2) * 120
            device_x = switch_x + offset_horizontal
            device_y = distancia_dispositivos  # Abaixo do switch
            
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
            
            # Conectar dispositivo ao switch
            edges.append({
                'from': switch_id, 
                'to': device_id, 
                'width': 2,
                'length': distancia_dispositivos
            })
            
        ip_atual = calcular_proxima_subrede(ip_atual, tamanho_subrede)
        
    return jsonify({
        'nodes': nodes,
        'edges': edges,
        'groups': groups,
        'info': {
            'ip_base': ip_requisitado,
            'cidr': cidr_requisitado,
            'mascara': mascara,
            'num_subredes': num_subredes,
            'hosts_por_subrede': numero_hosts_validos(cidr_requisitado)
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)