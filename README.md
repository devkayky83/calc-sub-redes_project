# PROJETO - CALC SUB-REDES

**Sistema de Cálculo e Aprendizado de Sub-redes**
Desenvolvido em **Python** em conjunto com o Framework **Flask**

---

## Sobre o Projeto

O Calc Sub-redes tem como objetivo auxiliar e ajudar tanto iniciantes quanto veteranos na área de redes, oferecendo uma aplicação simples e de facil entendimento.

A ferramenta web permite que os usuários calculem quantas sub-redes um ip pode fornecer atráves do próprio número junto ao CIDR, entender e aprender desde conceitos básicos de redes a explicações, cálculos e clássificação de uma sub-rede na aba de aprendizado, e ver a topologia gráfica completa de uma sub-rede, podendo explorar e entender seus elementos como Roteadores, switchs e hosts.

---

## Funcionalidades - Status: Em desenvolvimento

- ✅ Cálculo de Sub-redes através do ip e CIDR
- ✅ Aba de Aprendizado para estudo e aprendizado referente a área de redes e sub-redes
- ✅ Aba de Visualização gráfica topológica

---

## Tecnologias Utilizadas

- **Python 3.10+**
- **Flask 3.1**
- **JavaScript**
- **HTML, CSS**

---

## Como Executar o Projeto Localmente

### Pré-requisitos

- Python 3.10 ou superior
- Pip (gerenciador de pacotes)
- Git (opcional, para clonar o repositório)

### Passo a passo

```bash
# Crie um ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instale as dependências
pip install -r requirements.txt

# Inicie o app
python app.py