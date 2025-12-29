from flask import Flask, request, jsonify
from flask_cors import CORS
import math

app = Flask(__name__)
CORS(app)

def cidr_to_zeros(cidr):
    return 32 - cidr

def calcular_tamanho_subrede(cidr):
    zeros = cidr_to_zeros(cidr)
    return 2 ** zeros

def calcular_broadcast(ip_inicial, tamanho_subrede):
   tamanho_subrede -= 1
   partes_ip = list(map(int, ip_inicial.split('.'))) 
   partes_ip[3] += tamanho_subrede
   return '.'.join(map(str, partes_ip))

def calcular_proxima_subrede(ip_atual, tamanho_subrede):
    partes_ip = list(map(int, ip_atual.split('.')))
    partes_ip[3] += tamanho_subrede
    return '.'.join(map(str, partes_ip))

def calcular_primeiro_host(ip_inicial):
    partes_ip = list(map(int, ip_inicial.split('.')))
    partes_ip[3] += 1
    return '.'.join(map(str, partes_ip))

def calcular_ultimo_host(broadcast):
    partes_ip = list(map(int, broadcast.split('.')))
    partes_ip[3] -= 1
    return '.'.join(map(str, partes_ip))

def numero_total_hosts(cidr):
    zeros = cidr_to_zeros(cidr)
    return (2 ** zeros) - 2

def cidr_pra_mascara(cidr):
    """Converte CIDR para máscara de sub-rede"""
    mascara = (0xffffffff >> (32 - cidr)) << (32 - cidr)
    return '.'.join([str((mascara >> (24 - i * 8)) & 0xff) for i in range(4)])
    
@app.route('/calcular-subredes')

def calcular():
    ip_requisitado = request.args.get('ip')
    cidr_requisitado = int(request.args.get('cidr'))
    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    resultado = []
    
    for i in range(256 // tamanho_subrede):
        broadcast = calcular_broadcast(ip_requisitado, tamanho_subrede)
        resultado.append({
            'subrede': f"({ip_requisitado}/{cidr_requisitado})",
            'broadcast': broadcast,
            'primeiro_host': calcular_primeiro_host(ip_requisitado),
            'ultimo_host': calcular_ultimo_host(broadcast),
            'numero_total_hosts': numero_total_hosts(cidr_requisitado),
            'gateway_padrao': calcular_primeiro_host(ip_requisitado)
        })
        ip_requisitado = calcular_proxima_subrede(ip_requisitado, tamanho_subrede)
    return jsonify(resultado)

@app.route('/visualizar-subredes')
def visualizar():
    """
    Endpoint para gerar dados de visualização da topologia de rede
    """
    ip_requisitado = request.args.get('ip')
    cidr_requisitado = int(request.args.get('cidr'))
    
    if not ip_requisitado or not cidr_requisitado:
        return jsonify({'error': 'Parâmetros ip e cidr são obrigatórios.'}), 400
    
    try:
        cidr_requisitado = int(cidr_requisitado)
    except ValueError:
        return jsonify({'error': 'CIDR inválido.'}), 400

    tamanho_subrede = calcular_tamanho_subrede(cidr_requisitado)
    mascara = cidr_pra_mascara(cidr_requisitado)
    
    num_subredes = min(8, 256 // tamanho_subrede)
    
    nodes = []
    edges = []
    groups = []
    
    cores = [
        '#FFE87C', '#FF9ECD', '#7CDDFF', '#7CFF9E',
        '#FFA07A', '#DDA0DD', '#87CEEB', '#98FB98'
    ]
    
    nodes.append({
        'id': 'router-central',
        'label': 'Roteador\nPrincipal',
        'shape': 'image',
        'image': '../assets/pics/router.png',
        'size': 45,
        'x': 0,
        'y': 0,
        'fixed': {'x': True, 'y': True},
        'physics': False
    })
    
    raio_switches = 350
    distancia_dispositivos = 150
    
    ip_atual = ip_requisitado
    
    for i in range(num_subredes):
        broadcast = calcular_broadcast(ip_atual, tamanho_subrede)
        primeiro_host = calcular_primeiro_host(ip_atual)
        ultimo_host = calcular_ultimo_host(broadcast)
        num_hosts = numero_total_hosts(cidr_requisitado)
        
        subnet_id = f'subnet-{i}'
        group_id = f'group-{i}'
        
        groups.append({
            'id': group_id,
            'color': {'background': cores[i % len(cores)], 'border': cores[i % len(cores)]},
        })
        
        angulo = (i / num_subredes) * 2 * math.pi
        
        switch_x = raio_switches * math.cos(angulo)
        switch_y = raio_switches * math.sin(angulo)
        
        switch_id = f'switch-{i}'
        
        nodes.append({
            'id': switch_id,
            'label': f'Switch {i+1}\n{ip_atual}',
            'shape': 'image',
            'image': '../assets/pics/network-switch.png',
            'size': 35,
            'x': switch_x,
            'y': switch_y,
            'title': f'<b>Sub-rede {chr(65+i)}</b><br>Rede: {ip_atual}/{cidr_requisitado}<br>Máscara: {mascara}<br>Broadcast: {broadcast}<br>Hosts: {num_hosts}'
        })
        
        edges.append({
            'from': 'router-central',
            'to': switch_id,
            'width': 3,
            'dashes': True,
            'lenght': raio_switches
        })
        
        num_dispositivos = min(3, num_hosts)
        
        for j in range(num_dispositivos):
            device_id = f'device-{i}-{j}'
            device_type = 'PC' if j % 2 == 0 else 'Laptop'
            icon = '../assets/pics/computer.png' if device_type == 'PC' else '../assets/pics/laptop.png'
            
            # Calcula ip do dispositivo
            partes_ip = list(map(int, primeiro_host.split('.')))
            partes_ip[3] += j
            device_ip = '.'.join(map(str, partes_ip))
            
            offset_horizontal = (j - (num_dispositivos - 1) / 2) * 100
            raio_dispositivo = raio_switches + distancia_dispositivos
            
            device_x = raio_dispositivo * math.cos(angulo) + offset_horizontal * math.sin(angulo)
            device_y = raio_dispositivo * math.sin(angulo) - offset_horizontal * math.cos(angulo)
            
            nodes.append({
                'id': device_id,
                'label': f'{device_type}-{i+1}.{j+1}\n{device_ip}',
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
                'lenght': distancia_dispositivos
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
            'hosts_por_subrede': numero_total_hosts(cidr_requisitado)
        }
    })
        

if __name__ == '__main__':
    app.run(debug=True)