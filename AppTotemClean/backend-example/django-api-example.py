# backend-example/django-api-example.py
# Exemplo de implementação do backend Django para o Ponto Certo FG

"""
INSTALAÇÃO DAS DEPENDÊNCIAS:

pip install django
pip install djangorestframework
pip install face-recognition
pip install opencv-python
pip install pillow
pip install google-cloud-storage
pip install psycopg2-binary
"""

# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.files.base import ContentFile
import face_recognition
import numpy as np
import base64
import cv2
from PIL import Image
import io
import json
from datetime import datetime
from .models import Person, Attendance
from .serializers import AttendanceSerializer

class FaceRecognitionAPIView(APIView):
    """
    API para reconhecimento facial
    POST /api/face-recognition/
    """
    
    def post(self, request):
        try:
            # Receber dados do app
            image_base64 = request.data.get('image')
            timestamp = request.data.get('timestamp')
            
            if not image_base64:
                return Response({
                    'success': False,
                    'error': 'Imagem não fornecida'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Decodificar imagem base64
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Converter para array numpy (formato do face_recognition)
            image_array = np.array(image)
            
            # Detectar faces na imagem
            face_locations = face_recognition.face_locations(image_array)
            
            if not face_locations:
                return Response({
                    'success': False,
                    'error': 'Nenhuma face detectada na imagem'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extrair encodings da face
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if not face_encodings:
                return Response({
                    'success': False,
                    'error': 'Não foi possível processar a face'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Comparar com faces conhecidas no banco de dados
            unknown_encoding = face_encodings[0]
            best_match = self.find_best_match(unknown_encoding)
            
            if best_match:
                # Registrar ponto
                attendance = self.register_attendance(best_match, timestamp)
                
                return Response({
                    'success': True,
                    'person_name': best_match.name,
                    'person_id': best_match.id,
                    'confidence': best_match.confidence,
                    'attendance_recorded': True,
                    'attendance_id': attendance.id
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Pessoa não reconhecida',
                    'confidence': 0.0
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def find_best_match(self, unknown_encoding):
        """
        Encontrar a melhor correspondência no banco de dados
        """
        persons = Person.objects.filter(is_active=True)
        best_match = None
        best_distance = float('inf')
        
        for person in persons:
            if person.face_encoding:
                # Decodificar encoding salvo no banco
                known_encoding = np.frombuffer(person.face_encoding, dtype=np.float64)
                
                # Calcular distância
                distance = face_recognition.face_distance([known_encoding], unknown_encoding)[0]
                
                # Threshold de 0.6 (ajuste conforme necessário)
                if distance < 0.6 and distance < best_distance:
                    best_distance = distance
                    best_match = person
                    best_match.confidence = 1 - distance  # Converter para confiança
        
        return best_match
    
    def register_attendance(self, person, timestamp):
        """
        Registrar ponto no banco de dados
        """
        attendance = Attendance.objects.create(
            person=person,
            timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
            method='face_recognition'
        )
        return attendance


# models.py
from django.db import models
from django.contrib.auth.models import User

class Person(models.Model):
    """
    Modelo para pessoas cadastradas no sistema
    """
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True)
    face_encoding = models.BinaryField(null=True, blank=True)  # Encoding da face
    photo = models.ImageField(upload_to='faces/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.employee_id})"


class Attendance(models.Model):
    """
    Modelo para registros de ponto
    """
    METHODS = [
        ('face_recognition', 'Reconhecimento Facial'),
        ('manual', 'Manual'),
        ('card', 'Cartão'),
    ]
    
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    method = models.CharField(max_length=20, choices=METHODS, default='face_recognition')
    confidence = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.person.name} - {self.timestamp}"


# serializers.py
from rest_framework import serializers
from .models import Person, Attendance

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'name', 'employee_id', 'email', 'is_active']

class AttendanceSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'person', 'timestamp', 'method', 'confidence', 'created_at']


# urls.py
from django.urls import path
from .views import FaceRecognitionAPIView

urlpatterns = [
    path('api/face-recognition/', FaceRecognitionAPIView.as_view(), name='face-recognition'),
]


# settings.py (configurações adicionais)
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',  # Para permitir requisições do app mobile
    'your_app_name',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configurações CORS para permitir o app mobile
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = True  # Apenas para desenvolvimento

# Configurações do banco PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ponto_digital',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Configurações do Google Cloud Storage
DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
GS_BUCKET_NAME = 'your-bucket-name'
GS_PROJECT_ID = 'your-project-id' 