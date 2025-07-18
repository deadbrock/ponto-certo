#!/usr/bin/env python3
"""
Servidor Django simples para teste do reconhecimento facial
Execute: python simple-server.py
"""

import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import base64
from datetime import datetime

# Configuração mínima do Django-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
if not settings.configured:
    settings.configure(
        DEBUG=True,
        SECRET_KEY='django-insecure-test-key-for-development-only',
        ROOT_URLCONF=__name__,
        ALLOWED_HOSTS=['*'],
        MIDDLEWARE=[
            'django.middleware.security.SecurityMiddleware',
            'django.middleware.common.CommonMiddleware',
            'django.middleware.clickjacking.XFrameOptionsMiddleware',
        ],
        INSTALLED_APPS=[
            'django.contrib.contenttypes',
            'django.contrib.auth',
        ],
        USE_TZ=True,
    )

django.setup()

@csrf_exempt
@require_http_methods(["POST"])
def face_recognition_api(request):
    """
    API simples para reconhecimento facial
    """
    try:
        # Parse do JSON
        data = json.loads(request.body)
        image_base64 = data.get('image')
        timestamp = data.get('timestamp')
        
        print(f"[{datetime.now()}] Recebida requisição de reconhecimento facial")
        print(f"Timestamp: {timestamp}")
        print(f"Imagem recebida: {'Sim' if image_base64 else 'Não'}")
        
        if not image_base64:
            return JsonResponse({
                'success': False,
                'error': 'Imagem não fornecida'
            }, status=400)
        
        # Simular processamento de reconhecimento facial
        # Em produção, aqui você faria o reconhecimento real
        print("Simulando reconhecimento facial...")
        
        # Simular pessoa reconhecida (para teste)
        return JsonResponse({
            'success': True,
            'person_name': 'Usuário Teste',
            'person_id': 1,
            'confidence': 0.95,
            'attendance_recorded': True,
            'message': 'Ponto registrado com sucesso!'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'JSON inválido'
        }, status=400)
    except Exception as e:
        print(f"Erro: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@csrf_exempt
def health_check(request):
    """
    Endpoint para verificar se o servidor está funcionando
    """
    return JsonResponse({
        'status': 'OK',
        'message': 'Servidor Django funcionando!',
        'timestamp': datetime.now().isoformat()
    })

# URLs
urlpatterns = [
    path('api/face-recognition/', face_recognition_api, name='face-recognition'),
    path('health/', health_check, name='health-check'),
    path('', health_check, name='root'),
]

if __name__ == '__main__':
    print("🚀 Iniciando servidor Django simples...")
    print("📱 Endpoint de reconhecimento facial: http://localhost:8000/api/face-recognition/")
    print("🔍 Health check: http://localhost:8000/health/")
    print("⚡ Para parar o servidor: Ctrl+C")
    print("-" * 60)
    
    # Executar servidor
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', __name__)
    execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000']) 