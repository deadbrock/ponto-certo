const { Pool } = require('pg');
require('dotenv').config();

// 🚀 CONFIGURAÇÃO FORÇADA PARA RAILWAY - VERSÃO DEFINITIVA
console.log('🚀 INICIANDO - Configuração forçada para Railway PostgreSQL');

// URL do Railway PostgreSQL (HARDCODED para garantir funcionamento)
const RAILWAY_DATABASE_URL = 'postgresql://postgres:acAshacscvQtOROcjEpuxaiXXUFyJDqC@tramway.proxy.rlwy.net:43129/railway';

// Usar DATABASE_URL do ambiente OU forçar a URL do Railway
const DATABASE_URL = process.env.DATABASE_URL || RAILWAY_DATABASE_URL;

console.log('🔧 Configuração do banco:');
console.log('   User: postgres');
console.log('   Host: tramway.proxy.rlwy.net');
console.log('   Database: railway');
console.log('   Password: [DEFINIDA]');
console.log('   Port: 43129');
console.log('   SSL: true');
console.log('   🌎 Timezone: America/Sao_Paulo');

// Configuração FORÇADA para Railway
const dbConfig = {
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        require: true
    },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    min: 1,
    acquireTimeoutMillis: 15000,
    createTimeoutMillis: 15000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
};

console.log('🔗 DATABASE_URL configurada:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

const pool = new Pool(dbConfig);

// Eventos do pool
pool.on('connect', async (client) => {
    console.log('✅ SUCESSO: Cliente conectado ao Railway PostgreSQL!');
    try {
        await client.query("SET timezone = 'America/Sao_Paulo'");
        console.log('🌎 Timezone configurado para America/Sao_Paulo');
    } catch (err) {
        console.warn('⚠️ Aviso timezone:', err.message);
    }
});

pool.on('error', (err) => {
    console.error('❌ Erro na pool de conexões:', err.message);
    console.error('🔍 Código do erro:', err.code);
    console.error('🔍 Detalhes:', err.detail);
});

pool.on('acquire', () => {
    console.log('🔗 Conexão adquirida do pool');
});

pool.on('release', () => {
    console.log('🔄 Conexão retornada ao pool');
});

// Teste de conexão inicial ROBUSTO
(async () => {
    let retries = 5;
    
    while (retries > 0) {
        try {
            console.log(`🔍 Testando conexão com o banco... (tentativa ${6 - retries})`);
            
            const client = await pool.connect();
            console.log('✅ CONEXÃO ESTABELECIDA com Railway PostgreSQL!');
            
            // Testar query básica
            const result = await client.query('SELECT NOW() as timestamp, version() as pg_version');
            console.log('🕐 Timestamp atual:', result.rows[0].timestamp);
            console.log('🐘 PostgreSQL Version:', result.rows[0].pg_version);
            
            // Configurar timezone
            await client.query("SET timezone = 'America/Sao_Paulo'");
            
            // Testar timezone
            const tzResult = await client.query("SELECT CURRENT_SETTING('timezone') as timezone");
            console.log('🌎 Timezone configurado:', tzResult.rows[0].timezone);
            
            client.release();
            console.log('🎉 TESTE DE CONEXÃO: SUCESSO TOTAL!');
            break;
            
        } catch (err) {
            retries--;
            console.error(`❌ Teste de conexão inicial: FALHOU! (tentativas restantes: ${retries})`);
            console.error('📋 Erro detalhado:', {
                message: err.message,
                code: err.code,
                severity: err.severity,
                detail: err.detail
            });
            
            if (retries > 0) {
                console.log('⏳ Aguardando 3 segundos antes da próxima tentativa...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.error('🚨 FALHA CRÍTICA: Não foi possível conectar ao banco após 5 tentativas!');
                console.error('🔧 Verifique:');
                console.error('   1. Se o serviço PostgreSQL está rodando no Railway');
                console.error('   2. Se as credenciais estão corretas');
                console.error('   3. Se a URL de conexão está correta');
                console.error('   4. Se há bloqueios de firewall');
            }
        }
    }
})();

// Função de query com retry automático
const queryWithRetry = async (text, params, maxRetries = 3) => {
    let retries = maxRetries;
    
    while (retries > 0) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            retries--;
            console.warn(`⚠️ Query falhou, tentativas restantes: ${retries}`, err.message);
            
            if (retries === 0) {
                throw err;
            }
            
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// Função para verificar saúde da conexão
const healthCheck = async () => {
    try {
        const result = await pool.query('SELECT 1 as health');
        return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
        return { 
            status: 'error', 
            error: error.message, 
            timestamp: new Date().toISOString() 
        };
    }
};

module.exports = {
    query: queryWithRetry,
    pool,
    healthCheck,
    
    // Método direto sem retry (para casos específicos)
    directQuery: (text, params) => pool.query(text, params)
};