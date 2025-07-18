# Backend - Sistema de Ponto Digital

Backend desenvolvido em Node.js com Express para o sistema de controle de ponto digital com reconhecimento facial.

## 🚀 Funcionalidades

### Autenticação
- Login de colaboradores
- Validação de CPF e senha
- Geração de tokens JWT

### Controle de Ponto
- Registro de entrada/saída
- Armazenamento de coordenadas GPS
- Histórico de registros

### Reconhecimento Facial
- Cadastro de faces de colaboradores
- Reconhecimento facial para registro de ponto
- Sistema de simulação para demonstração
- Upload e processamento de imagens

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── api/
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js
│   │   └── routes/
│   │       ├── authRoutes.js
│   │       ├── pontoRoutes.js
│   │       └── faceRoutes.js
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── pontoController.js
│   │   └── faceController.js
│   ├── models/
│   │   ├── colaboradorModel.js
│   │   └── registroPontoModel.js
│   ├── data/
│   │   └── persons.json (gerado automaticamente)
│   ├── uploads/
│   │   └── faces/ (gerado automaticamente)
│   └── index.js
├── .env
├── package.json
├── test_face_api.py
└── README.md
```

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Multer** - Upload de arquivos
- **bcrypt** - Hash de senhas
- **jsonwebtoken** - Autenticação JWT
- **cors** - Cross-Origin Resource Sharing

## ⚙️ Configuração

### 1. Pré-requisitos

- Node.js (versão 18 ou superior)
- PostgreSQL (versão 12 ou superior)
- npm ou yarn

### 2. Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Entre no diretório do backend
cd backend

# Instale as dependências
npm install
```

### 3. Configuração do Banco de Dados

Execute o script SQL para criar as tabelas:

```sql
-- Criar banco de dados
CREATE DATABASE ponto_digital;

-- Usar o banco
\c ponto_digital;

-- Criar tabelas (ver database.sql na raiz do projeto)
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações do Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=ponto_digital
DB_USER=postgres
DB_PASSWORD=sua_senha

# Configurações do Servidor
PORT=3333

# Chave secreta para JWT
JWT_SECRET=sua_chave_secreta_jwt

# Ambiente
NODE_ENV=development
```

### 5. Executar o Servidor

```bash
# Modo desenvolvimento (com nodemon)
npm start

# Modo produção
node src/index.js
```

O servidor estará disponível em `http://localhost:3333`

## 📚 API Endpoints

### Autenticação

#### `POST /api/auth/login`
Login de colaborador

**Request Body:**
```json
{
  "cpf": "12345678900",
  "senha": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "colaborador": {
    "id": 1,
    "nome": "João Silva",
    "cpf": "12345678900"
  }
}
```

### Controle de Ponto

#### `POST /api/ponto/registrar`
Registrar ponto do colaborador

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

#### `GET /api/ponto/historico/:colaborador_id`
Obter histórico de pontos

### Reconhecimento Facial

#### `POST /api/face/face-recognition`
Reconhecer face para registro de ponto

**Request:** 
- Multipart form-data
- Campo: `image` (arquivo de imagem)

**Response:**
```json
{
  "success": true,
  "recognized": true,
  "person": {
    "id": "1",
    "name": "João Silva",
    "cpf": "12345678900"
  },
  "confidence": 0.95,
  "message": "Pessoa reconhecida: João Silva"
}
```

#### `POST /api/face/add-person`
Cadastrar nova pessoa

**Request:**
- Multipart form-data
- Campos: `name`, `cpf`, `image` (arquivo)

#### `GET /api/face/list-persons`
Listar pessoas cadastradas

#### `POST /api/face/reset-system`
Resetar sistema de reconhecimento

## 🧪 Testes

### Teste Automatizado

Execute o script Python para testar a API:

```bash
python test_face_api.py
```

**Pré-requisitos para testes:**
```bash
pip install requests pillow
```

### Teste Manual

1. **Health Check:**
   ```bash
   curl http://localhost:3333/
   ```

2. **Teste do Banco:**
   ```bash
   curl http://localhost:3333/db-test
   ```

3. **Listar Pessoas:**
   ```bash
   curl http://localhost:3333/api/face/list-persons
   ```

## 📝 Notas de Desenvolvimento

### Sistema de Reconhecimento Facial

O sistema atual utiliza uma **simulação** de reconhecimento facial para demonstração. Em produção, você pode integrar com:

- **OpenCV + face_recognition** (Python)
- **Face-api.js** (JavaScript)
- **Amazon Rekognition** (AWS)
- **Google Cloud Vision** (GCP)
- **Azure Face API** (Microsoft)

### Segurança

- Senhas são hasheadas com bcrypt
- Autenticação via JWT
- CORS configurado para desenvolvimento
- Upload de arquivos limitado e validado

### Performance

- Arquivos de imagem são removidos após processamento
- Cache de pessoas registradas em JSON
- Conexão pooling com PostgreSQL

## 🐛 Troubleshooting

### Erro de Conexão com Banco
1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no `.env`
3. Teste a conexão: `curl http://localhost:3333/db-test`

### Erro de Upload de Imagem
1. Verifique permissões da pasta `uploads/`
2. Confirme o limite de tamanho no Express
3. Verifique o formato da imagem (JPEG/PNG)

### Erro de Canvas (Windows)
Se encontrar erros relacionados ao canvas/node-gyp:
1. As dependências problemáticas foram removidas
2. O sistema usa simulação de reconhecimento
3. Para reconhecimento real, use APIs externas

## 🔄 Integração com o App

O backend está configurado para funcionar com o app React Native:

- **URL Base:** `http://localhost:3333` (desenvolvimento)
- **Endpoints compatíveis** com a estrutura esperada pelo app
- **Upload de imagens** via multipart/form-data
- **Respostas JSON** padronizadas

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os logs do servidor
2. Execute os testes automatizados
3. Consulte a documentação da API
4. Verifique a configuração do banco de dados

---

**Status:** ✅ Funcionando  
**Versão:** 1.0.0  
**Última atualização:** 2024 