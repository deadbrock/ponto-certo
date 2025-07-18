#!/usr/bin/env python3
"""
Script de teste para as APIs de reconhecimento facial
Use este script para testar o sistema antes de usar o app mobile

Uso:
    python test_face_api.py --help
"""

import requests
import base64
import json
import argparse
import os
from datetime import datetime

BASE_URL = "http://localhost:8000"

def encode_image(image_path):
    """Converter imagem para base64"""
    try:
        with open(image_path, 'rb') as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return encoded_string
    except Exception as e:
        print(f"❌ Erro ao codificar imagem: {e}")
        return None

def test_health():
    """Testar se o servidor está funcionando"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Servidor funcionando!")
            print(f"   - Faces conhecidas: {data['known_faces_count']}")
            print(f"   - Pessoas: {data['known_faces']}")
            return True
        else:
            print(f"❌ Servidor com problema: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        print("   Certifique-se que o servidor está rodando: python flask-server.py")
        return False

def add_person(name, image_path):
    """Adicionar pessoa ao sistema"""
    print(f"🆕 Adicionando pessoa: {name}")
    
    # Verificar se arquivo existe
    if not os.path.exists(image_path):
        print(f"❌ Arquivo não encontrado: {image_path}")
        return False
    
    # Codificar imagem
    image_base64 = encode_image(image_path)
    if not image_base64:
        return False
    
    # Fazer requisição
    try:
        data = {
            "name": name,
            "image": image_base64
        }
        
        response = requests.post(f"{BASE_URL}/api/add-person/", json=data)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ {result['message']}")
            print(f"   Total de pessoas: {result['total_known_faces']}")
            return True
        else:
            print(f"❌ Erro: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def recognize_face(image_path):
    """Testar reconhecimento facial"""
    print(f"🔍 Testando reconhecimento com: {image_path}")
    
    # Verificar se arquivo existe
    if not os.path.exists(image_path):
        print(f"❌ Arquivo não encontrado: {image_path}")
        return False
    
    # Codificar imagem
    image_base64 = encode_image(image_path)
    if not image_base64:
        return False
    
    # Fazer requisição
    try:
        data = {
            "image": image_base64,
            "timestamp": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/face-recognition/", json=data)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ Pessoa reconhecida: {result['person_name']}")
            print(f"   Confiança: {result['confidence']:.3f}")
            return True
        else:
            print(f"❌ {result['error']}")
            if 'confidence' in result:
                print(f"   Confiança: {result['confidence']:.3f}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def list_persons():
    """Listar pessoas cadastradas"""
    try:
        response = requests.get(f"{BASE_URL}/api/list-persons/")
        result = response.json()
        
        if response.status_code == 200:
            print(f"👥 Pessoas cadastradas ({result['total_count']}):")
            for i, name in enumerate(result['known_faces'], 1):
                print(f"   {i}. {name}")
            return True
        else:
            print(f"❌ Erro ao listar pessoas")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def reset_system():
    """Resetar sistema (apagar todas as pessoas)"""
    confirm = input("⚠️  Tem certeza que deseja apagar todas as pessoas? (sim/não): ")
    if confirm.lower() in ['sim', 's', 'yes', 'y']:
        try:
            response = requests.post(f"{BASE_URL}/api/reset-system/")
            result = response.json()
            
            if response.status_code == 200:
                print(f"✅ {result['message']}")
                return True
            else:
                print(f"❌ Erro ao resetar sistema")
                return False
                
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            return False
    else:
        print("❌ Operação cancelada")
        return False

def main():
    parser = argparse.ArgumentParser(description='Script de teste para APIs de reconhecimento facial')
    parser.add_argument('--health', action='store_true', help='Testar se servidor está funcionando')
    parser.add_argument('--add', nargs=2, metavar=('NOME', 'IMAGEM'), help='Adicionar pessoa (nome e caminho da imagem)')
    parser.add_argument('--recognize', metavar='IMAGEM', help='Testar reconhecimento (caminho da imagem)')
    parser.add_argument('--list', action='store_true', help='Listar pessoas cadastradas')
    parser.add_argument('--reset', action='store_true', help='Resetar sistema (apagar todas as pessoas)')
    
    args = parser.parse_args()
    
    if args.health:
        test_health()
    elif args.add:
        name, image_path = args.add
        add_person(name, image_path)
    elif args.recognize:
        recognize_face(args.recognize)
    elif args.list:
        list_persons()
    elif args.reset:
        reset_system()
    else:
        print("🤖 Script de teste para reconhecimento facial")
        print("\nUso:")
        print("  python test_face_api.py --health                    # Testar servidor")
        print("  python test_face_api.py --add 'João' foto.jpg       # Adicionar pessoa")
        print("  python test_face_api.py --recognize foto.jpg        # Testar reconhecimento")
        print("  python test_face_api.py --list                      # Listar pessoas")
        print("  python test_face_api.py --reset                     # Resetar sistema")
        print("\nExemplos:")
        print("  python test_face_api.py --add 'Maria Silva' maria.jpg")
        print("  python test_face_api.py --recognize teste.jpg")

if __name__ == '__main__':
    main() 