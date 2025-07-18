#!/usr/bin/env python3
"""
Servidor Flask com reconhecimento facial real
Execute: python flask-server.py

Dependências: pip install flask flask-cors face-recognition opencv-python pillow numpy
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import base64
import face_recognition
import numpy as np
from PIL import Image
import io
import os
import pickle
from datetime import datetime
import cv2

app = Flask(__name__)
CORS(app)  # Permitir requisições do app mobile

# Diretório para armazenar faces conhecidas
KNOWN_FACES_DIR = "known_faces"
ENCODINGS_FILE = "face_encodings.pkl"

# Criar diretório se não existir
if not os.path.exists(KNOWN_FACES_DIR):
    os.makedirs(KNOWN_FACES_DIR)

class FaceRecognitionSystem:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.load_known_faces()
    
    def load_known_faces(self):
        """Carregar faces conhecidas do arquivo de encodings"""
        if os.path.exists(ENCODINGS_FILE):
            try:
                with open(ENCODINGS_FILE, 'rb') as f:
                    data = pickle.load(f)
                    self.known_face_encodings = data['encodings']
                    self.known_face_names = data['names']
                print(f"✅ Carregadas {len(self.known_face_names)} faces conhecidas")
            except Exception as e:
                print(f"⚠️  Erro ao carregar encodings: {e}")
        else:
            print("ℹ️  Nenhum arquivo de encodings encontrado. Use /add-person para adicionar pessoas.")
    
    def save_known_faces(self):
        """Salvar faces conhecidas no arquivo de encodings"""
        try:
            data = {
                'encodings': self.known_face_encodings,
                'names': self.known_face_names
            }
            with open(ENCODINGS_FILE, 'wb') as f:
                pickle.dump(data, f)
            print(f"✅ Salvos {len(self.known_face_names)} encodings")
        except Exception as e:
            print(f"❌ Erro ao salvar encodings: {e}")
    
    def add_person(self, name, image_base64):
        """Adicionar uma nova pessoa ao sistema"""
        try:
            # Decodificar imagem
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
            
            # Detectar faces
            face_locations = face_recognition.face_locations(image_array)
            if not face_locations:
                return False, "Nenhuma face detectada na imagem"
            
            if len(face_locations) > 1:
                return False, "Múltiplas faces detectadas. Use uma imagem com apenas uma pessoa."
            
            # Extrair encoding
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            if not face_encodings:
                return False, "Não foi possível extrair características da face"
            
            # Adicionar ao sistema
            self.known_face_encodings.append(face_encodings[0])
            self.known_face_names.append(name)
            
            # Salvar no arquivo
            self.save_known_faces()
            
            # Salvar imagem de referência
            image_path = os.path.join(KNOWN_FACES_DIR, f"{name}.jpg")
            image.save(image_path)
            
            return True, f"Pessoa '{name}' adicionada com sucesso!"
            
        except Exception as e:
            return False, f"Erro ao processar imagem: {str(e)}"
    
    def recognize_face(self, image_base64):
        """Reconhecer face na imagem fornecida"""
        try:
            # Decodificar imagem
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
            
            # Detectar faces
            face_locations = face_recognition.face_locations(image_array)
            if not face_locations:
                return False, "Nenhuma face detectada na imagem", None, 0.0
            
            # Extrair encodings
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            if not face_encodings:
                return False, "Não foi possível processar a face", None, 0.0
            
            # Se não há faces conhecidas
            if not self.known_face_encodings:
                return False, "Nenhuma pessoa cadastrada no sistema", None, 0.0
            
            # Comparar com faces conhecidas
            unknown_encoding = face_encodings[0]
            distances = face_recognition.face_distance(self.known_face_encodings, unknown_encoding)
            best_match_index = np.argmin(distances)
            best_distance = distances[best_match_index]
            
            # Threshold para reconhecimento (0.6 é um bom valor padrão)
            RECOGNITION_THRESHOLD = 0.6
            
            if best_distance < RECOGNITION_THRESHOLD:
                name = self.known_face_names[best_match_index]
                confidence = 1 - best_distance  # Converter distância para confiança
                return True, f"Pessoa reconhecida: {name}", name, confidence
            else:
                return False, "Pessoa não reconhecida", None, 1 - best_distance
                
        except Exception as e:
            return False, f"Erro no reconhecimento: {str(e)}", None, 0.0

# Inicializar sistema de reconhecimento facial
face_system = FaceRecognitionSystem()

@app.route('/', methods=['GET'])
def health_check():
    """Endpoint para verificar se o servidor está funcionando"""
    return jsonify({
        'status': 'OK',
        'message': 'Servidor Flask com reconhecimento facial funcionando!',
        'known_faces_count': len(face_system.known_face_names),
        'known_faces': face_system.known_face_names,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/face-recognition/', methods=['POST'])
def face_recognition_api():
    """API para reconhecimento facial"""
    try:
        # Parse do JSON
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        image_base64 = data.get('image')
        timestamp = data.get('timestamp')
        
        print(f"[{datetime.now()}] Recebida requisição de reconhecimento facial")
        print(f"Timestamp: {timestamp}")
        print(f"Imagem recebida: {'Sim' if image_base64 else 'Não'}")
        
        if not image_base64:
            return jsonify({
                'success': False,
                'error': 'Imagem não fornecida'
            }), 400
        
        # Processar reconhecimento facial
        print("🔍 Processando reconhecimento facial...")
        success, message, person_name, confidence = face_system.recognize_face(image_base64)
        
        if success:
            print(f"✅ Pessoa reconhecida: {person_name} (confiança: {confidence:.2f})")
            return jsonify({
                'success': True,
                'person_name': person_name,
                'confidence': round(confidence, 3),
                'attendance_recorded': True,
                'message': message,
                'timestamp': timestamp
            })
        else:
            print(f"❌ {message} (confiança: {confidence:.2f})")
            return jsonify({
                'success': False,
                'error': message,
                'confidence': round(confidence, 3)
            }), 404
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@app.route('/api/add-person/', methods=['POST'])
def add_person_api():
    """API para adicionar nova pessoa ao sistema"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        name = data.get('name')
        image_base64 = data.get('image')
        
        if not name or not image_base64:
            return jsonify({
                'success': False,
                'error': 'Nome e imagem são obrigatórios'
            }), 400
        
        print(f"🆕 Adicionando nova pessoa: {name}")
        success, message = face_system.add_person(name, image_base64)
        
        if success:
            print(f"✅ {message}")
            return jsonify({
                'success': True,
                'message': message,
                'total_known_faces': len(face_system.known_face_names)
            })
        else:
            print(f"❌ {message}")
            return jsonify({
                'success': False,
                'error': message
            }), 400
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@app.route('/api/list-persons/', methods=['GET'])
def list_persons_api():
    """API para listar pessoas cadastradas"""
    return jsonify({
        'success': True,
        'known_faces': face_system.known_face_names,
        'total_count': len(face_system.known_face_names)
    })

@app.route('/api/reset-system/', methods=['POST'])
def reset_system_api():
    """API para resetar o sistema (apagar todas as faces conhecidas)"""
    try:
        face_system.known_face_encodings = []
        face_system.known_face_names = []
        
        # Remover arquivo de encodings
        if os.path.exists(ENCODINGS_FILE):
            os.remove(ENCODINGS_FILE)
        
        # Remover imagens conhecidas
        if os.path.exists(KNOWN_FACES_DIR):
            for file in os.listdir(KNOWN_FACES_DIR):
                os.remove(os.path.join(KNOWN_FACES_DIR, file))
        
        print("🔄 Sistema resetado")
        return jsonify({
            'success': True,
            'message': 'Sistema resetado com sucesso'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro ao resetar sistema: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("�� Iniciando servidor Flask com reconhecimento facial real...")
    print("📱 Endpoints disponíveis:")
    print("   - POST /api/face-recognition/     (reconhecer face)")
    print("   - POST /api/add-person/           (adicionar pessoa)")
    print("   - GET  /api/list-persons/         (listar pessoas)")
    print("   - POST /api/reset-system/         (resetar sistema)")
    print("   - GET  /                          (health check)")
    print("🔍 Health check: http://localhost:8000/")
    print("⚡ Para parar o servidor: Ctrl+C")
    print("-" * 60)
    
    # Executar servidor na porta 8000 para ser compatível com a configuração do app
    app.run(host='0.0.0.0', port=8000, debug=True) 