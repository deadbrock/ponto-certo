const { Pool } = require('pg');
require('dotenv').config();

// 🚨 SOLUÇÃO EMERGÊNCIA - FORÇAR DATABASE_URL
console.log('🚨 MODO EMERGÊNCIA: Forçando DATABASE_URL do Railway');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:acAshacscvQtOROcjEpuxaiXXUFyJDqC@tramway.proxy.rlwy.net:43129/railway';

console.log('🌐 DATABASE_URL:', DATABASE_URL.replace(/:[^@]*@/, ':***@'));

const dbConfig = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
};

console.log('🔧 Configuração do banco:');
console.log('   Modo: PRODUÇÃO FORÇADA (Railway)');
console.log('   SSL: Ativado');
console.log('   🌎 Timezone: America/Sao_Paulo');

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

// Teste de conexão inicial
(async () => {
  try {
    console.log('🔍 Testando conexão com Railway PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ SUCESSO: Conectado ao Railway PostgreSQL!');
    
    await client.query("SET timezone = 'America/Sao_Paulo'");
    
    const result = await client.query('SELECT NOW() as timestamp, CURRENT_SETTING(\'timezone\') as timezone');
    console.log('🕐 Timestamp:', result.rows[0].timestamp);
    console.log('🌎 Timezone Atual:', result.rows[0].timezone);
    
    client.release();
  } catch (err) {
    console.error('❌ ERRO DE CONEXÃO:', err.message);
    console.error('🔍 Detalhes:', err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
}; 