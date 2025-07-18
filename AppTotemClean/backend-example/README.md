# 🎯 Sistema de Reconhecimento Facial - Ponto Digital

Este é o backend para o sistema de ponto digital com reconhecimento facial usando Flask e face_recognition.

## 📋 Pré-requisitos

- Python 3.7+
- pip (gerenciador de pacotes do Python)
- Webcam ou dispositivo móvel com câmera

## 🚀 Instalação

1. **Instalar dependências:**
```bash
pip install flask flask-cors face-recognition opencv-python pillow numpy requests
```

2. **Verificar instalação:**
```bash
python test_face_api.py --help
```

## 🏃‍♂️ Como Executar

1. **Iniciar o servidor:**
```bash
python flask-server.py
```

O servidor irá iniciar em `http://localhost:8000`

2. **Verificar se está funcionando:**
```bash
python test_face_api.py --health
```

## 📱 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check e status do sistema |
| POST | `/api/face-recognition/` | Reconhecer face em uma imagem |
| POST | `/api/add-person/` | Adicionar nova pessoa ao sistema |
| GET | `/api/list-persons/` | Listar pessoas cadastradas |
| POST | `/api/reset-system/` | Resetar sistema (apagar todas as pessoas) |

## 🧪 Testando o Sistema

### 1. Testar servidor:
```bash
python test_face_api.py --health
```

### 2. Adicionar uma pessoa:
```bash
python test_face_api.py --add "João Silva" foto_joao.jpg
```

### 3. Testar reconhecimento:
```bash
python test_face_api.py --recognize foto_teste.jpg
```

### 4. Listar pessoas cadastradas:
```bash
python test_face_api.py --list
```

### 5. Resetar sistema:
```bash
python test_face_api.py --reset
```

## 📁 Estrutura de Arquivos

```
backend-example/
├── flask-server.py          # Servidor principal
├── test_face_api.py         # Script de teste
├── face_encodings.pkl       # Arquivo com encodings das faces (criado automaticamente)
├── known_faces/             # Diretório com imagens de referência (criado automaticamente)
│   ├── João Silva.jpg
│   └── Maria Santos.jpg
└── README.md               # Esta documentação
```

## 🔧 Configuração do App Mobile

O app React Native está configurado para se conectar em:
- **URL Base:** `http://localhost:8000`
- **Endpoint:** `/api/face-recognition/`

Se precisar alterar, edite o arquivo: `AppTotemClean/src/config/api.ts`

## 💡 Como Funciona

1. **Cadastro de Pessoas:**
   - O sistema recebe uma imagem e extrai as características faciais
   - Salva os "encodings" (características) em um arquivo pickle
   - Armazena a imagem de referência na pasta `known_faces/`

2. **Reconhecimento:**
   - Recebe uma imagem do app mobile
   - Extrai características faciais da imagem
   - Compara com todas as pessoas cadastradas
   - Retorna a pessoa mais similar (se a confiança for >= 40%)

3. **Threshold de Reconhecimento:**
   - Distância máxima: `0.6` (quanto menor, mais restritivo)
   - Confiança mínima: `40%` (1 - 0.6 = 0.4)

## 🎯 Dicas para Melhores Resultados

### Para Cadastro:
- ✅ Use fotos com boa iluminação
- ✅ Face bem visível e frontal
- ✅ Apenas uma pessoa na imagem
- ✅ Resolução mínima de 480x480px
- ❌ Evite óculos escuros ou máscaras
- ❌ Evite sombras no rosto

### Para Reconhecimento:
- ✅ Posicione o rosto no centro da tela
- ✅ Mantenha distância adequada (braço estendido)
- ✅ Aguarde a captura em boa iluminação
- ❌ Evite movimentos bruscos durante a captura

## 🔍 Troubleshooting

### Problema: "No module named 'face_recognition'"
```bash
pip install face_recognition
```

### Problema: "No module named 'cv2'"
```bash
pip install opencv-python
```

### Problema: "Erro ao conectar com servidor"
1. Certifique-se que o servidor está rodando: `python flask-server.py`
2. Verifique se a porta 8000 está livre
3. Teste: `curl http://localhost:8000/`

### Problema: "Nenhuma face detectada"
- Verifique se a imagem tem boa qualidade
- Certifique-se que o rosto está bem visível
- Teste com uma imagem diferente

### Problema: "Pessoa não reconhecida"
- Verifique se a pessoa foi cadastrada: `python test_face_api.py --list`
- Teste o reconhecimento com a mesma foto usada no cadastro
- Considere recadastrar a pessoa com uma foto melhor

## 📊 Logs do Sistema

O servidor mostra logs detalhados:

```
🆕 Adicionando nova pessoa: João Silva
✅ Pessoa 'João Silva' adicionada com sucesso!
🔍 Processando reconhecimento facial...
✅ Pessoa reconhecida: João Silva (confiança: 0.85)
```

## 🔒 Considerações de Segurança

⚠️ **Este é um sistema de desenvolvimento!**

Para produção, considere:
- Autenticação e autorização
- HTTPS/SSL
- Criptografia dos dados
- Rate limiting
- Logs de auditoria
- Backup dos dados

## 🤝 Integração com App Mobile

O app mobile envia imagens no formato:
```json
{
  "image": "base64_encoded_image",
  "timestamp": "2024-06-17T11:30:00.000Z"
}
```

E recebe respostas como:
```json
{
  "success": true,
  "person_name": "João Silva",
  "confidence": 0.85,
  "attendance_recorded": true,
  "message": "Pessoa reconhecida: João Silva"
}
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor
2. Teste com o script `test_face_api.py`
3. Consulte a documentação das bibliotecas:
   - [face_recognition](https://github.com/ageitgey/face_recognition)
   - [Flask](https://flask.palletsprojects.com/) 