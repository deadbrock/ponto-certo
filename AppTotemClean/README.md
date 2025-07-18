# 📱 Ponto Certo FG - Sistema de Ponto com Reconhecimento Facial

Sistema de ponto digital com reconhecimento facial desenvolvido em React Native CLI 0.73.

## 🏗️ Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **App Mobile** | React Native CLI 0.73 |
| **Camera** | react-native-camera |
| **Captura rosto** | react-native-camera + envio para API |
| **Reconhecimento facial** | Backend Python + face_recognition |
| **API Backend** | Django REST Framework |
| **Banco de Dados** | PostgreSQL (Google Cloud SQL) |
| **Armazenamento** | Google Cloud Storage (fotos) |

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- React Native CLI
- Android Studio (para Android)
- JDK 17
- Android SDK

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Android

Certifique-se de que as seguintes permissões estão no `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 3. Configurar API Backend

Edite o arquivo `src/config/api.ts` e configure a URL do seu backend:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://seu-backend.herokuapp.com', // Sua URL de produção
  // ou
  BASE_URL: 'http://10.0.2.2:8000', // Para emulador Android (localhost)
  // ou  
  BASE_URL: 'http://192.168.1.100:8000', // Para dispositivo físico (IP da máquina)
};
```

### 4. Executar o projeto

```bash
# Iniciar Metro bundler
npm start

# Em outro terminal, executar no Android
npm run android
```

## 📋 Funcionalidades

### ✅ Implementadas

- [x] Interface de câmera frontal
- [x] Captura de foto com guia visual
- [x] Permissões de câmera automáticas
- [x] Envio de imagem em base64 para API
- [x] Feedback visual durante processamento
- [x] Tratamento de erros
- [x] Configuração centralizada da API

### 🔄 Próximas implementações

- [ ] Armazenamento local de dados offline
- [ ] Sincronização automática quando online
- [ ] Histórico de pontos registrados
- [ ] Configurações do usuário
- [ ] Notificações push
- [ ] Modo escuro/claro

## 🔧 Configuração do Backend

O app espera que o backend Django tenha os seguintes endpoints:

### POST `/api/face-recognition/`

**Request:**
```json
{
  "image": "base64_encoded_image",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "person_name": "João Silva",
  "person_id": 123,
  "confidence": 0.95,
  "attendance_recorded": true
}
```

**Response (Erro):**
```json
{
  "success": false,
  "error": "Pessoa não reconhecida",
  "confidence": 0.45
}
```

## 📱 Como usar o App

1. **Abrir o app** - A câmera frontal será ativada automaticamente
2. **Posicionar o rosto** - Alinhe seu rosto dentro do círculo verde
3. **Capturar foto** - Toque no botão "CAPTURAR"
4. **Aguardar processamento** - O app enviará a foto para o backend
5. **Ver resultado** - Uma mensagem informará se o reconhecimento foi bem-sucedido

## 🛠️ Desenvolvimento

### Estrutura do projeto

```
PontoCertoFG/
├── src/
│   └── config/
│       └── api.ts          # Configurações da API
├── android/                # Configurações Android
├── App.tsx                 # Componente principal
└── package.json           # Dependências
```

### Scripts disponíveis

```bash
npm start          # Iniciar Metro bundler
npm run android    # Executar no Android
npm run ios        # Executar no iOS
npm test           # Executar testes
npm run lint       # Verificar código
```

### Debugging

Para debug no dispositivo físico:

1. Ative o modo desenvolvedor no Android
2. Ative a depuração USB
3. Execute: `adb devices` para verificar conexão
4. Execute: `npm run android`

Para debug no emulador:

1. Abra o Android Studio
2. Inicie um emulador
3. Execute: `npm run android`

## 🔒 Segurança

- As imagens são enviadas em base64 via HTTPS
- Permissões de câmera são solicitadas dinamicamente
- Não há armazenamento permanente de imagens no dispositivo
- Timeout de 30 segundos para requisições da API

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique se todas as dependências estão instaladas
2. Confirme se o backend está rodando e acessível
3. Verifique as permissões do dispositivo
4. Consulte os logs do Metro bundler para erros

## 🔄 Atualizações

### Versão 1.0.0
- Implementação inicial
- Captura de foto com câmera frontal
- Integração com API Django
- Interface de usuário básica
