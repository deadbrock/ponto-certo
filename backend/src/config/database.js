const { Pool } = require('pg');
require('dotenv').config();

// Configuração segura para produção/desenvolvimento
// Prioriza variáveis de ambiente e evita credenciais hardcoded
function buildConnectionStringFromEnv() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const dbName = process.env.DB_NAME || process.env.DB_DATABASE;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (host && port && dbName && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }
  return null;
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.RAILWAY_DATABASE_URL ||
  buildConnectionStringFromEnv();

if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL não definida. Configure as variáveis do banco (ou RAILWAY_DATABASE_URL).');
}

// Habilita SSL em produção (Railway/Cloud) e desabilita localmente
const shouldUseSSL = (() => {
  if (process.env.PGSSLMODE === 'require') return true;
  if (process.env.NODE_ENV === 'production') return true;
  if (DATABASE_URL && /\.railway\.app|proxy\.rlwy\.net/.test(DATABASE_URL)) return true;
  return false;
})();

const redacted = DATABASE_URL ? DATABASE_URL.replace(/:[^:@]*@/, ':***@') : 'N/D';
console.log('🔗 DATABASE_URL:', redacted);
console.log('🔒 SSL habilitado:', shouldUseSSL);

const dbConfig = {
  connectionString: DATABASE_URL,
  ssl: shouldUseSSL
    ? { rejectUnauthorized: false, require: true }
    : undefined,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  min: parseInt(process.env.PG_POOL_MIN || '1', 10),
};

const pool = new Pool(dbConfig);

pool.on('connect', async (client) => {
  console.log('✅ Banco de dados conectado com sucesso!');
  try {
    await client.query("SET timezone = 'America/Sao_Paulo'");
    console.log('🌎 Timezone configurado para America/Sao_Paulo');
  } catch (err) {
    console.warn('⚠️ Aviso: Não foi possível configurar timezone:', err.message);
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro de conexão com o banco:', err.message);
});

// Teste de conexão inicial ROBUSTO
(async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`🔍 Testando conexão com o banco... (tentativa ${6 - retries})`);
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as timestamp');
      console.log('✅ Conectado ao PostgreSQL. Timestamp:', result.rows[0].timestamp);
      await client.query("SET timezone = 'America/Sao_Paulo'");
      client.release();
      break;
    } catch (err) {
      retries--;
      console.error(`❌ Falha ao conectar: ${err.message} (restantes: ${retries})`);
      if (retries > 0) await new Promise(r => setTimeout(r, 3000));
    }
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
}; 