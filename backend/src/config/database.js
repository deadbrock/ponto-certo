const { Pool } = require('pg');
require('dotenv').config();

// Priorizar DATABASE_URL em produção (Railway)
let dbConfig;

if (process.env.DATABASE_URL) {
  // Produção - usar DATABASE_URL do Railway
  console.log('🌐 Usando DATABASE_URL (Railway):', process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@'));
  
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
} else {
  // Desenvolvimento - usar variáveis individuais
  console.log('🏠 Usando configuração local (desenvolvimento)');
  
  dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'ponto_digital_fg',
    password: process.env.DB_PASSWORD || 'superman19',
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
}

console.log('🔧 Configuração do banco:');
if (process.env.DATABASE_URL) {
  console.log('   Modo: PRODUÇÃO (Railway)');
  console.log('   URL: [DATABASE_URL configurada]');
} else {
  console.log('   Modo: DESENVOLVIMENTO');
  console.log('   Host:', dbConfig.host);
  console.log('   Database:', dbConfig.database);
  console.log('   User:', dbConfig.user);
}
console.log('   SSL:', dbConfig.ssl);
console.log('   🌎 Timezone: America/Sao_Paulo');

// Teste de conexão imediato
console.log('🔍 Testando conexão com o banco...');

const pool = new Pool(dbConfig);

pool.on('connect', async (client) => {
  console.log('✅ Banco de dados conectado com sucesso!');
  
  // Configurar timezone para cada conexão
  try {
    await client.query("SET timezone = 'America/Sao_Paulo'");
    console.log('🌎 Timezone configurado para America/Sao_Paulo');
  } catch (err) {
    console.warn('⚠️ Aviso: Não foi possível configurar timezone:', err.message);
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro de conexão com o banco:', err.message);
  console.error('🔍 Detalhes completos:', err);
});

// Função para obter timestamp brasileiro
const getBrazilianTimestamp = () => {
  return "NOW() AT TIME ZONE 'America/Sao_Paulo'";
};

// Função para obter data atual brasileira como string
const getCurrentBrazilianTime = () => {
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return brazilTime;
};

// Teste de conexão inicial com verificação de timezone
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Teste de conexão inicial: SUCESSO!');
    
    // Configurar timezone na conexão de teste
    await client.query("SET timezone = 'America/Sao_Paulo'");
    
    // Testar timestamps
    const result = await client.query(`
      SELECT 
        NOW() as timestamp_local,
        NOW() AT TIME ZONE 'UTC' as timestamp_utc,
        CURRENT_SETTING('timezone') as timezone_atual
    `);
    
    console.log('✅ Query de teste executada com sucesso!');
    console.log('🕐 Timestamp Local:', result.rows[0].timestamp_local);
    console.log('🌍 Timestamp UTC:', result.rows[0].timestamp_utc);
    console.log('🌎 Timezone Atual:', result.rows[0].timezone_atual);
    
    client.release();
  } catch (err) {
    console.error('❌ Teste de conexão inicial: FALHOU!');
    console.error('📋 Erro detalhado:', {
      message: err.message,
      code: err.code,
      severity: err.severity,
      detail: err.detail
    });
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
  getBrazilianTimestamp,
  getCurrentBrazilianTime
}; 