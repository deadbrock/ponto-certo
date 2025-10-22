# 🔧 Instruções para Corrigir Erros 500

## 📋 Diagnóstico

Os erros 500 que estão ocorrendo no frontend são causados por **tabelas faltantes no banco de dados PostgreSQL**.

### Rotas Afetadas:
- ❌ `/api/atestados` → Tabela `atestados` não existe
- ❌ `/api/escalas` → Tabela `escalas` não existe
- ❌ `/api/escalas/feriados` → Tabela `feriados` não existe
- ❌ `/api/configuracoes/dispositivos` → Tabela `dispositivos` não existe
- ❌ `/api/ponto/registros-public` → Possível problema de permissões ou estrutura
- ❌ `/api/dashboard/registros-recentes` → Possível problema de join
- ❌ `/api/analytics/tipos-batida` → Possível problema de dados

---

## 🚀 Solução - Executar Script SQL no Railway

### **Método 1: Pelo Dashboard do Railway (Recomendado)**

1. Acesse https://railway.app
2. Faça login na sua conta
3. Selecione o projeto **ponto-certo-production**
4. Clique no serviço **PostgreSQL**
5. Vá na aba **"Data"** ou **"Query"**
6. Copie e cole todo o conteúdo do arquivo `create_missing_tables.sql`
7. Clique em **"Run"** ou **"Execute"**
8. Aguarde a mensagem de sucesso

### **Método 2: Usando psql (Linha de comando)**

Se você tiver `psql` instalado localmente:

```bash
# 1. Obter a DATABASE_URL do Railway
# (copie da aba Variables do serviço PostgreSQL)

# 2. Executar o script
psql "sua-database-url-aqui" -f backend/create_missing_tables.sql
```

### **Método 3: Usando DBeaver ou pgAdmin**

1. Abra DBeaver ou pgAdmin
2. Conecte ao banco PostgreSQL do Railway usando a `DATABASE_URL`
3. Abra o arquivo `create_missing_tables.sql`
4. Execute o script completo

---

## 📊 Verificação

Após executar o script, você pode verificar se tudo funcionou:

### **Opção 1: Executar o script de verificação Node.js**

No Railway, execute:

```bash
node backend/check_database.js
```

Isso mostrará:
- ✓ Quais tabelas existem
- ✗ Quais tabelas estão faltando
- 📊 Estrutura das tabelas principais
- ⚠️ Diagnóstico dos erros

### **Opção 2: Query SQL Manual**

Execute no banco:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('atestados', 'escalas', 'feriados', 'dispositivos')
ORDER BY table_name;
```

Deve retornar 4 tabelas.

---

## ✅ Resultado Esperado

Após criar as tabelas, o frontend não deve mais apresentar erros 500 nas seguintes páginas:

- ✅ **Atestados** - Lista vazia mas sem erro
- ✅ **Escalas** - Lista vazia mas sem erro
- ✅ **Configurações de Infraestrutura** - Lista de dispositivos vazia
- ✅ **Dashboard** - Registros recentes funcionando
- ✅ **Analytics** - Gráficos funcionando

---

## 🔄 Deploy Automático

Após criar as tabelas, o Railway vai reiniciar automaticamente o backend e aplicar as mudanças. Aguarde alguns segundos e teste novamente no frontend.

---

## 📝 Tabelas Criadas

### 1. **atestados**
Gerencia atestados médicos e justificativas de faltas dos colaboradores.

### 2. **escalas**
Define escalas de trabalho (horários de entrada/saída, intervalos).

### 3. **escalas_colaboradores**
Associa colaboradores às suas respectivas escalas.

### 4. **feriados**
Cadastro de feriados nacionais, estaduais e municipais.

### 5. **dispositivos**
Gerencia totems, tablets e dispositivos de registro de ponto.

---

## 🎯 Dados de Exemplo

O script já insere automaticamente:
- ✓ Todos os feriados nacionais de 2025
- ✓ Uma escala padrão (08:00 às 17:00)

---

## ❓ Suporte

Se encontrar problemas ao executar o script:

1. **Verifique a conexão**: Teste `SELECT NOW();` no banco
2. **Verifique permissões**: O usuário precisa ter permissão de CREATE TABLE
3. **Veja os logs do Railway**: Vá em "Deployments" → "View Logs"
4. **Execute linha por linha**: Se houver erro, execute cada CREATE TABLE separadamente

---

## 🔗 Próximos Passos

Após corrigir os erros 500:

1. ✅ Testar todas as páginas do frontend
2. ✅ Verificar se não há mais erros no console
3. ✅ Criar colaboradores e testar funcionalidades
4. ✅ Configurar escalas para os colaboradores
5. ✅ Registrar alguns atestados de exemplo
6. ✅ Cadastrar dispositivos (totems)

---

**Status das Correções:**
- ✅ CORS configurado e funcionando
- ✅ Login funcionando perfeitamente
- ✅ Rotas 404 corrigidas (suporte e integrações)
- ⏳ Aguardando criação das tabelas no banco
- ⏳ Testes finais das páginas

