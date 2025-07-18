#!/usr/bin/env python3
"""
Script de teste para a API de reconhecimento facial
Testa as funcionalidades básicas do sistema de ponto digital
"""

import requests
import json
import os
from io import BytesIO

# Configurações da API
API_BASE_URL = "http://localhost:3333/api/face"

def criar_imagem_teste():
    """Cria uma imagem de teste simples em memória"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Criar uma imagem simples de teste
        img = Image.new('RGB', (200, 200), color='lightblue')
        draw = ImageDraw.Draw(img)
        
        # Desenhar um rosto simples
        draw.ellipse([50, 50, 150, 150], fill='yellow', outline='black')  # Rosto
        draw.ellipse([70, 80, 90, 100], fill='black')  # Olho esquerdo
        draw.ellipse([110, 80, 130, 100], fill='black')  # Olho direito
        draw.arc([80, 110, 120, 130], 0, 180, fill='black', width=3)  # Sorriso
        
        # Salvar em bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        return img_bytes
    except ImportError:
        print("⚠️  PIL não disponível. Criando arquivo de teste vazio.")
        return BytesIO(b"fake_image_data")

def test_list_persons():
    """Testa a listagem de pessoas"""
    print("\n🔍 Testando listagem de pessoas...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/list-persons")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Pessoas cadastradas: {data.get('total', 0)}")
            
            if data.get('persons'):
                for person in data['persons']:
                    print(f"   - {person['name']} (CPF: {person['cpf']})")
            else:
                print("   Nenhuma pessoa cadastrada ainda.")
        else:
            print(f"❌ Erro: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor.")
        print("   Certifique-se de que o backend está rodando em http://localhost:3333")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

def test_add_person():
    """Testa o cadastro de uma nova pessoa"""
    print("\n➕ Testando cadastro de pessoa...")
    
    try:
        # Dados da pessoa de teste
        person_data = {
            'name': 'João Silva Teste',
            'cpf': '12345678901'
        }
        
        # Criar imagem de teste
        image_file = criar_imagem_teste()
        
        files = {
            'image': ('test_face.jpg', image_file, 'image/jpeg')
        }
        
        response = requests.post(
            f"{API_BASE_URL}/add-person",
            data=person_data,
            files=files
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Pessoa cadastrada: {data.get('message')}")
            if data.get('person'):
                person = data['person']
                print(f"   ID: {person['id']}")
                print(f"   Nome: {person['name']}")
                print(f"   CPF: {person['cpf']}")
        else:
            data = response.json()
            print(f"❌ Erro: {data.get('message', 'Erro desconhecido')}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor.")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

def test_face_recognition():
    """Testa o reconhecimento facial"""
    print("\n👤 Testando reconhecimento facial...")
    
    try:
        # Criar imagem de teste
        image_file = criar_imagem_teste()
        
        files = {
            'image': ('test_recognition.jpg', image_file, 'image/jpeg')
        }
        
        response = requests.post(
            f"{API_BASE_URL}/face-recognition",
            files=files
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Processamento concluído: {data.get('message')}")
            
            if data.get('recognized'):
                person = data.get('person', {})
                print(f"   Pessoa reconhecida: {person.get('name', 'N/A')}")
                print(f"   Confiança: {data.get('confidence', 0):.2%}")
            else:
                print(f"   Pessoa não reconhecida")
                print(f"   Confiança: {data.get('confidence', 0):.2%}")
        else:
            data = response.json()
            print(f"❌ Erro: {data.get('message', 'Erro desconhecido')}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor.")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

def test_reset_system():
    """Testa o reset do sistema"""
    print("\n🔄 Testando reset do sistema...")
    
    try:
        response = requests.post(f"{API_BASE_URL}/reset-system")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {data.get('message')}")
        else:
            data = response.json()
            print(f"❌ Erro: {data.get('message', 'Erro desconhecido')}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor.")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

def main():
    """Função principal que executa todos os testes"""
    print("🧪 TESTE DA API DE RECONHECIMENTO FACIAL")
    print("=" * 50)
    
    # Testar listagem inicial
    test_list_persons()
    
    # Testar cadastro de pessoa
    test_add_person()
    
    # Testar listagem após cadastro
    test_list_persons()
    
    # Testar reconhecimento facial
    test_face_recognition()
    
    # Testar reset (comentado para não apagar dados de teste)
    # test_reset_system()
    
    print("\n" + "=" * 50)
    print("🏁 Testes concluídos!")
    print("\n💡 Dicas:")
    print("   - Para resetar o sistema: descomente test_reset_system()")
    print("   - Para testes com imagens reais: substitua criar_imagem_teste()")
    print("   - Backend deve estar rodando em http://localhost:3333")

if __name__ == "__main__":
    main() 