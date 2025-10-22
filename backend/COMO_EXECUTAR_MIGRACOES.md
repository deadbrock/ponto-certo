# 🚀 Como Executar as Migrações do Banco de Dados

Como o Railway não tem editor de queries web, vou te mostrar **3 formas fáceis** de executar as migrações:

---

## ✅ **OPÇÃO 1: Via Railway CLI (Mais Fácil)** 

### Passo 1: Instalar Railway CLI

```bash
# Windows (PowerShell como Administrador)
iwr https://railway.app/install.ps1 | iex

# Ou usando npm
npm install -g @railway/cli
```

### Passo 2: Fazer Login

```bash
railway login
```

### Passo 3: Conectar ao Projeto

```bash
cd C:\Users\user\Documents\ponto_digital\backend
railway link
# Selecione: ponto-certo-production
```

### Passo 4: Executar o Script de Migração

```bash
railway run node migrate_database.js
```

**Pronto!** ✅ As migrações serão aplicadas automaticamente.

---

## ✅ **OPÇÃO 2: Executar Localmente Conectando ao Railway**

### Passo 1: Pegar a DATABASE_URL

1. Vá no Railway → PostgreSQL
2. Clique na aba **"Variables"** ou **"Connect"**
3. Copie a **DATABASE_URL** completa

### Passo 2: Criar arquivo .env no backend

Crie o arquivo `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:senha@host.railway.app:5432/railway
DATABASE_SSL=true
```

### Passo 3: Executar o Script

```bash
cd C:\Users\user\Documents\ponto_digital\backend
node migrate_database.js
```

---

## ✅ **OPÇÃO 3: Executar Direto no Railway (Deploy Automático)**

### Modificar o package.json

Adicione um script de migração:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "migrate": "node migrate_database.js"
  }
}
```

### No Railway:

1. Vá em **"Settings"** do serviço backend
2. Em **"Deploy"** → **"Custom Start Command"**
3. Coloque: `npm run migrate && npm start`
4. Salve e aguarde o redeploy

Isso executará as migrações automaticamente antes de iniciar o servidor!

---

## ✅ **OPÇÃO 4: Usar psql (Se tiver instalado)**

Se você tem o PostgreSQL instalado localmente:

```bash
# Pegar a DATABASE_URL do Railway primeiro
psql "postgresql://postgres:senha@host.railway.app:5432/railway?sslmode=require" -f create_missing_tables.sql
```

---

## 🎯 **QUAL OPÇÃO ESCOLHER?**

| Opção | Facilidade | Recomendação |
|-------|-----------|--------------|
| Opção 1 (Railway CLI) | ⭐⭐⭐⭐⭐ | **Mais Recomendada** |
| Opção 2 (Local) | ⭐⭐⭐⭐ | Boa alternativa |
| Opção 3 (Auto) | ⭐⭐⭐ | Melhor para longo prazo |
| Opção 4 (psql) | ⭐⭐ | Se já tem instalado |

---

## 📊 **O Que Vai Acontecer?**

Ao executar o script, você verá:

```
🚀 Iniciando migrações do banco de dados...

📝 PARTE 1: Corrigindo tabela registros_ponto...
  ✅ Coluna tipo_registro adicionada
  ✅ Coluna tablet_name adicionada
  ✅ Coluna tablet_location adicionada
  ✅ Índices criados

📝 PARTE 2: Criando novas tabelas...
  ✅ 50 comandos executados
  ✓ 5 já existiam

🔍 VERIFICAÇÃO FINAL:

📊 Colunas em registros_ponto:
  ✓ tablet_location (character varying)
  ✓ tablet_name (character varying)
  ✓ tipo_registro (character varying)

📋 Novas tabelas criadas:
  ✓ alert_escalations
  ✓ atestados
  ✓ dispositivos
  ✓ escalas
  ✓ escalas_colaboradores
  ✓ feriados
  ✓ security_alerts

📈 RESUMO DO BANCO:
  Total de registros: 150
  Total de colaboradores: 10
  Total de feriados: 12
  Total de escalas: 1

✅ MIGRAÇÕES CONCLUÍDAS COM SUCESSO!

🎉 O backend está pronto para uso!
```

---

## ❓ **Problemas Comuns**

### ⚠️ "Error: connect ECONNREFUSED"
→ Verifique se a DATABASE_URL está correta

### ⚠️ "permission denied"
→ Verifique se o usuário do banco tem permissão de CREATE TABLE

### ⚠️ "already exists"
→ Ignore! Significa que a tabela/coluna já foi criada

---

## 🎉 **Após Executar**

1. ✅ Todos os erros 500 serão resolvidos
2. ✅ Frontend funcionará sem erros
3. ✅ Todas as páginas carregarão corretamente
4. ✅ Sistema pronto para cadastrar dados

---

## 🔗 **Links Úteis**

- Railway CLI: https://docs.railway.app/develop/cli
- Documentação PostgreSQL: https://www.postgresql.org/docs/

---

**Dúvidas?** Me avise qual opção você escolheu e eu te ajudo! 🚀

