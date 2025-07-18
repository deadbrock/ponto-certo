# 🚀 Instruções de Setup Completo - Ponto Certo FG

## 📋 Checklist de Configuração

### ✅ 1. Ambiente de Desenvolvimento

- [ ] Node.js 18+ instalado
- [ ] React Native CLI instalado (`npm install -g react-native-cli`)
- [ ] Android Studio instalado e configurado
- [ ] JDK 17 instalado
- [ ] Android SDK configurado
- [ ] Emulador Android ou dispositivo físico conectado

### ✅ 2. Configuração do App Mobile

```bash
# 1. Instalar dependências
cd PontoCertoFG
npm install

# 2. Verificar se o Android está configurado
npx react-native doctor

# 3. Configurar URL da API
# Editar src/config/api.ts com a URL do seu backend
```

### ✅ 3. Configuração do Backend Django

```bash
# 1. Criar ambiente virtual Python
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# 2. Instalar dependências
pip install -r backend-example/requirements.txt

# 3. Configurar banco PostgreSQL
# Criar banco de dados 'ponto_digital'

# 4. Configurar variáveis de ambiente
# Criar arquivo .env com:
DATABASE_URL=postgresql://user:password@localhost:5432/ponto_digital
SECRET_KEY=your-secret-key
DEBUG=True

# 5. Executar migrações
python manage.py makemigrations
python manage.py migrate

# 6. Criar superusuário
python manage.py createsuperuser

# 7. Executar servidor
python manage.py runserver 0.0.0.0:8000
```

### ✅ 4. Configuração do Google Cloud

```bash
# 1. Criar projeto no Google Cloud Console
# 2. Ativar APIs necessárias:
#    - Cloud Storage API
#    - Cloud SQL API

# 3. Criar bucket no Cloud Storage
gsutil mb gs://your-bucket-name

# 4. Configurar credenciais
# Baixar arquivo JSON de credenciais
# Definir variável de ambiente:
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
```

### ✅ 5. Configuração do Banco PostgreSQL

```sql
-- Conectar ao PostgreSQL
psql -U postgres

-- Criar banco de dados
CREATE DATABASE ponto_digital;

-- Criar usuário
CREATE USER ponto_user WITH PASSWORD 'sua_senha';

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE ponto_digital TO ponto_user;
```

## 🔧 Configurações Específicas

### URLs para diferentes ambientes:

**Desenvolvimento Local (Emulador):**
```typescript
BASE_URL: 'http://10.0.2.2:8000'
```

**Desenvolvimento Local (Dispositivo Físico):**
```typescript
BASE_URL: 'http://192.168.1.100:8000'  // IP da sua máquina
```

**Produção:**
```typescript
BASE_URL: 'https://seu-backend.herokuapp.com'
```

### Descobrir IP da máquina:

**Windows:**
```cmd
ipconfig
```

**Linux/Mac:**
```bash
ifconfig
```

## 🧪 Testando a Integração

### 1. Testar Backend

```bash
# Testar se a API está respondendo
curl -X POST http://localhost:8000/api/face-recognition/ \
  -H "Content-Type: application/json" \
  -d '{"image": "test", "timestamp": "2024-01-15T10:30:00.000Z"}'
```

### 2. Testar App Mobile

```bash
# Executar no Android
npm run android

# Verificar logs
npx react-native log-android
```

## 🐛 Troubleshooting

### Problemas Comuns:

**1. Erro de permissão da câmera:**
- Verificar se as permissões estão no AndroidManifest.xml
- Testar em dispositivo físico (emulador pode ter limitações)

**2. Erro de conexão com API:**
- Verificar se o backend está rodando
- Confirmar URL correta no arquivo api.ts
- Verificar firewall/antivírus

**3. Erro de build Android:**
```bash
# Limpar cache
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**4. Erro de dependências:**
```bash
# Reinstalar node_modules
rm -rf node_modules
npm install
```

## 📱 Testando em Dispositivo Físico

### Android:

1. Ativar "Opções do desenvolvedor"
2. Ativar "Depuração USB"
3. Conectar via USB
4. Executar: `adb devices`
5. Executar: `npm run android`

### Configurar IP para dispositivo físico:

1. Descobrir IP da máquina: `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
2. Atualizar `src/config/api.ts` com o IP correto
3. Certificar que o firewall permite conexões na porta 8000

## 🔒 Configurações de Segurança

### Para Produção:

1. **Django:**
   - `DEBUG = False`
   - Configurar `ALLOWED_HOSTS`
   - Usar HTTPS
   - Configurar CORS adequadamente

2. **App Mobile:**
   - Usar URLs HTTPS
   - Implementar certificado SSL pinning
   - Ofuscar código em produção

## 📊 Monitoramento

### Logs importantes:

**Backend Django:**
```bash
tail -f logs/django.log
```

**App Mobile:**
```bash
npx react-native log-android
```

**Banco de dados:**
```sql
SELECT * FROM attendance ORDER BY created_at DESC LIMIT 10;
``` 