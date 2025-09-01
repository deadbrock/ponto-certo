# 📊 Módulo Relatórios Importados - Documentação Completa

## 🎯 **Visão Geral**

O módulo `relatorios-importados` é responsável por processar arquivos de ponto exportados manualmente do relógio KP-RE1032 (formato .txt), validar os dados e importá-los para o sistema de ponto digital.

## 📋 **Funcionalidades Implementadas**

### ✅ **1. Import de Arquivos TXT**
- Upload seguro de arquivos `.txt`
- Validação de formato e dados
- Conversão automática de data/hora
- Verificação de colaboradores por PIS
- Inserção de registros de ponto

### ✅ **2. Sistema de Autenticação**
- Middleware JWT obrigatório
- Perfis autorizados: `ADMINISTRADOR`, `RH`, `ADMIN`
- Validação de permissões por endpoint

### ✅ **3. Controle de Duplicatas**
- Hash MD5 de arquivos
- Prevenção de importação duplicada
- Histórico de arquivos processados

### ✅ **4. Relatórios e Estatísticas**
- Listagem de arquivos importados
- Detalhes de processamento
- Estatísticas de sucesso/erro
- Filtros por período e colaborador

## 🗂️ **Estrutura de Banco de Dados**

### **Tabela: `registros_ponto`**
```sql
CREATE TABLE registros_ponto (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id),
    data_hora TIMESTAMP NOT NULL,
    origem VARCHAR(20) DEFAULT 'arquivo_txt',
    status VARCHAR(20) DEFAULT 'importado',
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);
```

### **Tabela: `arquivos_importados`**
```sql
CREATE TABLE arquivos_importados (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500),
    tamanho_arquivo BIGINT,
    tipo_arquivo VARCHAR(50) DEFAULT 'txt',
    id_usuario INTEGER,
    data_upload TIMESTAMP DEFAULT NOW(),
    total_registros INTEGER DEFAULT 0,
    registros_validos INTEGER DEFAULT 0,
    registros_invalidos INTEGER DEFAULT 0,
    status_processamento VARCHAR(30) DEFAULT 'processado',
    detalhes_erros TEXT,
    hash_arquivo VARCHAR(64),
    criado_em TIMESTAMP DEFAULT NOW()
);
```

## 🛣️ **Endpoints da API**

### **POST** `/api/relatorios/importar-txt`
**Descrição**: Importar arquivo TXT do relógio de ponto

**Autenticação**: JWT (ADMINISTRADOR, RH)

**Content-Type**: `multipart/form-data`

**Parâmetros**:
- `arquivo` (file): Arquivo .txt com registros de ponto

**Formato do arquivo**:
```
001234567890 20250806 0800
001234567890 20250806 1730
```

**Resposta de Sucesso (200)**:
```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "dados": {
    "arquivoId": 1,
    "nomeArquivo": "ponto_janeiro.txt",
    "totalRegistros": 100,
    "registrosValidos": 95,
    "registrosInvalidos": 5,
    "percentualSucesso": "95.00",
    "erros": [
      {
        "linha": 23,
        "conteudo": "123456789 20250806 2500",
        "motivo": "Hora inválida: 25"
      }
    ]
  }
}
```

### **GET** `/api/relatorios/arquivos`
**Descrição**: Listar arquivos importados

**Autenticação**: JWT (ADMINISTRADOR, RH)

**Query Parameters**:
- `page` (number): Página (padrão: 1)
- `limit` (number): Itens por página (padrão: 10)

**Resposta**:
```json
{
  "success": true,
  "dados": [...],
  "paginacao": {
    "paginaAtual": 1,
    "totalPaginas": 5,
    "totalRegistros": 50,
    "registrosPorPagina": 10
  }
}
```

### **GET** `/api/relatorios/arquivos/:id`
**Descrição**: Obter detalhes de um arquivo específico

**Autenticação**: JWT (ADMINISTRADOR, RH)

### **GET** `/api/relatorios/registros`
**Descrição**: Listar registros de ponto importados

**Autenticação**: JWT (ADMINISTRADOR, RH)

**Query Parameters**:
- `page`, `limit`: Paginação
- `dataInicio`, `dataFim`: Filtro por período
- `idColaborador`: Filtro por colaborador
- `origem`: Filtro por origem (padrão: arquivo_txt)
- `status`: Filtro por status

### **DELETE** `/api/relatorios/registros/:id`
**Descrição**: Excluir um registro específico

**Autenticação**: JWT (ADMINISTRADOR apenas)

### **GET** `/api/relatorios/estatisticas`
**Descrição**: Obter estatísticas dos relatórios

**Autenticação**: JWT (ADMINISTRADOR, RH)

## 🔧 **Validações Implementadas**

### **Formato de Linha**
- **PIS**: 10-11 dígitos numéricos
- **Data**: AAAAMMDD (ex: 20250806)
- **Hora**: HHMM (ex: 0800, 1730)

### **Validações de Dados**
- **Ano**: Entre 2020-2030
- **Mês**: 1-12
- **Dia**: 1-31
- **Hora**: 0-23
- **Minuto**: 0-59

### **Validações de Negócio**
- PIS deve existir na tabela `colaboradores`
- Arquivo não pode ser duplicado (hash MD5)
- Tamanho máximo: 10MB

## 📁 **Estrutura de Arquivos**

```
backend/
├── src/
│   ├── controllers/
│   │   └── relatoriosController.js     # Controller principal
│   ├── api/routes/
│   │   └── relatoriosRoutes.js         # Rotas e middlewares
│   └── uploads/
│       └── txts/                       # Arquivos importados
├── sql/
│   └── criar_tabelas_relatorios.sql    # Script de criação
├── teste_exemplo_ponto.txt             # Arquivo de exemplo
└── MODULO-RELATORIOS-IMPORTADOS.md     # Esta documentação
```

## 🚀 **Como Usar**

### **1. Preparar Arquivo TXT**
Exporte os dados do relógio KP-RE1032 no formato:
```
PIS DATA HORA
12345678901 20250118 0800
12345678901 20250118 1200
```

### **2. Fazer Upload via API**
```bash
curl -X POST http://localhost:3333/api/relatorios/importar-txt \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "arquivo=@ponto_janeiro.txt"
```

### **3. Verificar Resultados**
```bash
curl -X GET "http://localhost:3333/api/relatorios/arquivos" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🔒 **Segurança**

### **Autenticação JWT**
- Token obrigatório em todos os endpoints
- Validação de perfil por operação
- Logs de auditoria automáticos

### **Validação de Arquivos**
- Apenas arquivos .txt permitidos
- Limite de tamanho (10MB)
- Validação de content-type

### **Controle de Acesso**
- **ADMINISTRADOR**: Acesso total
- **RH**: Import e consulta
- **Outros perfis**: Sem acesso

## 📊 **Logs e Monitoramento**

### **Logs Detalhados**
```
🔄 Iniciando importação de arquivo TXT de ponto...
📁 Arquivo recebido: ponto_janeiro.txt
📊 Tamanho: 15420 bytes
🔒 Hash: a1b2c3d4e5f6...
📄 Total de linhas no arquivo: 150
🔍 Processando linha 1: 12345678901 20250118 0800
✅ Registro inserido linha 1: João Silva - 2025-01-18T08:00:00
🎉 Importação concluída!
```

### **Métricas de Performance**
- Tempo de processamento por arquivo
- Taxa de sucesso por importação
- Estatísticas de erros mais comuns

## 🐛 **Troubleshooting**

### **Erros Comuns**

**1. "PIS não encontrado"**
- Verificar se colaborador existe na base
- Confirmar formato do PIS (10-11 dígitos)

**2. "Data inválida"**
- Formato deve ser AAAAMMDD
- Verificar valores de mês/dia

**3. "Arquivo já importado"**
- Sistema detectou hash duplicado
- Verificar se arquivo já foi processado

**4. "Acesso negado"**
- Verificar token JWT
- Confirmar perfil do usuário (ADMIN/RH)

### **Comandos de Debug**

```bash
# Verificar tabelas
node -e "const db = require('./src/config/database'); 
db.query('SELECT COUNT(*) FROM registros_ponto WHERE origem = \'arquivo_txt\'')
  .then(r => console.log('Registros importados:', r.rows[0].count));"

# Verificar arquivos processados
node -e "const db = require('./src/config/database'); 
db.query('SELECT nome_arquivo, registros_validos, registros_invalidos FROM arquivos_importados ORDER BY data_upload DESC LIMIT 5')
  .then(r => console.table(r.rows));"
```

## 📈 **Melhorias Futuras**

### **Versão 1.1**
- [ ] Validação avançada de turnos
- [ ] Integração com sistema de escalas
- [ ] Notificações por email de importação

### **Versão 1.2**
- [ ] Import automático via FTP/SFTP
- [ ] Interface web para upload
- [ ] Relatórios visuais de importação

### **Versão 1.3**
- [ ] Suporte a outros formatos (CSV, Excel)
- [ ] Validação biométrica opcional
- [ ] Integração com outros relógios de ponto

---

## 🎉 **Status do Módulo**

✅ **DESENVOLVIMENTO COMPLETO**
- Todas as funcionalidades implementadas
- Testes básicos realizados
- Documentação completa
- Pronto para produção

---

**📅 Data**: Janeiro 2025  
**👤 Desenvolvedor**: Assistant AI  
**🏷️ Versão**: 1.0.0  
**📊 Status**: ✅ Concluído