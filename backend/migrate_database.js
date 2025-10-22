/**
 * Script para executar as migrações do banco de dados
 * Este script aplica todas as correções necessárias automaticamente
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco (usa a mesma DATABASE_URL do Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migrações do banco de dados...\n');
    
    // ============================================
    // PARTE 1: Adicionar colunas faltantes em registros_ponto
    // ============================================
    console.log('📝 PARTE 1: Corrigindo tabela registros_ponto...');
    
    // Verificar e adicionar tipo_registro
    const checkTipoRegistro = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registros_ponto' AND column_name = 'tipo_registro'
    `);
    
    if (checkTipoRegistro.rows.length === 0) {
      await client.query('ALTER TABLE registros_ponto ADD COLUMN tipo_registro VARCHAR(50)');
      await client.query("UPDATE registros_ponto SET tipo_registro = 'Entrada' WHERE tipo_registro IS NULL");
      console.log('  ✅ Coluna tipo_registro adicionada');
    } else {
      console.log('  ✓ Coluna tipo_registro já existe');
    }
    
    // Verificar e adicionar tablet_name
    const checkTabletName = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registros_ponto' AND column_name = 'tablet_name'
    `);
    
    if (checkTabletName.rows.length === 0) {
      await client.query('ALTER TABLE registros_ponto ADD COLUMN tablet_name VARCHAR(100)');
      console.log('  ✅ Coluna tablet_name adicionada');
    } else {
      console.log('  ✓ Coluna tablet_name já existe');
    }
    
    // Verificar e adicionar tablet_location
    const checkTabletLocation = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registros_ponto' AND column_name = 'tablet_location'
    `);
    
    if (checkTabletLocation.rows.length === 0) {
      await client.query('ALTER TABLE registros_ponto ADD COLUMN tablet_location VARCHAR(200)');
      console.log('  ✅ Coluna tablet_location adicionada');
    } else {
      console.log('  ✓ Coluna tablet_location já existe');
    }
    
    // Criar índices
    await client.query('CREATE INDEX IF NOT EXISTS idx_registros_tipo ON registros_ponto(tipo_registro)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_registros_tablet ON registros_ponto(tablet_id)');
    console.log('  ✅ Índices criados\n');
    
    // ============================================
    // PARTE 2: Ler e executar o arquivo SQL completo
    // ============================================
    console.log('📝 PARTE 2: Criando novas tabelas...');
    
    const sqlFilePath = path.join(__dirname, 'create_missing_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir o SQL em comandos individuais (separados por ;)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const command of commands) {
      try {
        // Pular comandos de verificação SELECT
        if (command.toLowerCase().startsWith('select')) {
          continue;
        }
        
        await client.query(command);
        successCount++;
      } catch (error) {
        // Ignorar erros de "já existe"
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate')) {
          skipCount++;
        } else {
          console.log(`  ⚠️  Aviso: ${error.message.split('\n')[0]}`);
        }
      }
    }
    
    console.log(`  ✅ ${successCount} comandos executados`);
    console.log(`  ✓ ${skipCount} já existiam\n`);
    
    // ============================================
    // VERIFICAÇÃO FINAL
    // ============================================
    console.log('🔍 VERIFICAÇÃO FINAL:\n');
    
    // Verificar colunas adicionadas
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'registros_ponto'
      AND column_name IN ('tipo_registro', 'tablet_name', 'tablet_location')
      ORDER BY column_name
    `);
    
    console.log('📊 Colunas em registros_ponto:');
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // Verificar tabelas criadas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('atestados', 'escalas', 'escalas_colaboradores', 'feriados', 'dispositivos', 'security_alerts', 'alert_escalations')
      ORDER BY table_name
    `);
    
    console.log('📋 Novas tabelas criadas:');
    tables.rows.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });
    console.log('');
    
    // Resumo
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM registros_ponto) as registros,
        (SELECT COUNT(*) FROM colaboradores) as colaboradores,
        (SELECT COUNT(*) FROM feriados) as feriados,
        (SELECT COUNT(*) FROM escalas) as escalas
    `);
    
    console.log('📈 RESUMO DO BANCO:');
    console.log(`  Total de registros: ${summary.rows[0].registros}`);
    console.log(`  Total de colaboradores: ${summary.rows[0].colaboradores}`);
    console.log(`  Total de feriados: ${summary.rows[0].feriados}`);
    console.log(`  Total de escalas: ${summary.rows[0].escalas}`);
    console.log('');
    
    console.log('✅ MIGRAÇÕES CONCLUÍDAS COM SUCESSO!\n');
    console.log('🎉 O backend está pronto para uso!\n');
    
  } catch (error) {
    console.error('❌ Erro durante as migrações:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migrações
runMigrations();

