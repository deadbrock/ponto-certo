/**
 * Script para verificar estrutura do banco de dados e identificar problemas
 */

const { Pool } = require('pg');

// Configuração do banco (usar mesma do index.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ponto_digital',
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

async function checkDatabase() {
  try {
    console.log('🔍 Verificando estrutura do banco de dados...\n');

    // 1. Listar todas as tabelas
    console.log('📋 TABELAS EXISTENTES:');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    tables.forEach(table => console.log(`  ✓ ${table}`));
    console.log(`\nTotal: ${tables.length} tabelas\n`);

    // 2. Verificar tabelas essenciais
    console.log('🔧 VERIFICANDO TABELAS ESSENCIAIS:');
    const essentialTables = [
      'colaboradores',
      'registros_ponto',
      'atestados',
      'escalas',
      'feriados',
      'dispositivos',
      'usuarios',
      'contratos'
    ];

    for (const tableName of essentialTables) {
      const exists = tables.includes(tableName);
      console.log(`  ${exists ? '✓' : '✗'} ${tableName} ${exists ? '(EXISTS)' : '(MISSING)'}`);
    }
    console.log('');

    // 3. Verificar estrutura de registros_ponto
    if (tables.includes('registros_ponto')) {
      console.log('📊 ESTRUTURA: registros_ponto');
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'registros_ponto'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
      });
      
      // Contar registros
      const countResult = await pool.query('SELECT COUNT(*) as total FROM registros_ponto');
      console.log(`  Total de registros: ${countResult.rows[0].total}\n`);
    }

    // 4. Verificar estrutura de colaboradores
    if (tables.includes('colaboradores')) {
      console.log('👥 ESTRUTURA: colaboradores');
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'colaboradores'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
      });
      
      // Contar colaboradores
      const countResult = await pool.query('SELECT COUNT(*) as total FROM colaboradores');
      console.log(`  Total de colaboradores: ${countResult.rows[0].total}\n`);
    }

    // 5. Verificar tabelas para as rotas com erro 500
    console.log('⚠️  DIAGNÓSTICO DOS ERROS 500:');
    
    // Atestados
    if (!tables.includes('atestados')) {
      console.log('  ✗ Tabela "atestados" não existe - causando erro em /api/atestados');
    }
    
    // Escalas
    if (!tables.includes('escalas')) {
      console.log('  ✗ Tabela "escalas" não existe - causando erro em /api/escalas');
    }
    
    // Feriados
    if (!tables.includes('feriados')) {
      console.log('  ✗ Tabela "feriados" não existe - causando erro em /api/escalas/feriados');
    }
    
    // Dispositivos
    if (!tables.includes('dispositivos')) {
      console.log('  ✗ Tabela "dispositivos" não existe - causando erro em /api/configuracoes/dispositivos');
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  } finally {
    await pool.end();
  }
}

// Executar verificação
checkDatabase();

