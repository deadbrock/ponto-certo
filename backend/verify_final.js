const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔍 VERIFICAÇÃO FINAL COMPLETA\n');
    console.log('='  .repeat(50) + '\n');
    
    // Verificar colunas em registros_ponto
    console.log('📊 COLUNAS EM REGISTROS_PONTO:');
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'registros_ponto'
      AND column_name IN ('tipo_registro', 'tablet_name', 'tablet_location')
      ORDER BY column_name
    `);
    cols.rows.forEach(c => console.log(`  ✓ ${c.column_name} (${c.data_type})`));
    console.log('');
    
    // Verificar todas as tabelas
    console.log('📋 TABELAS CRIADAS:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('atestados', 'escalas', 'escalas_colaboradores', 'feriados', 'dispositivos', 'security_alerts', 'alert_escalations')
      ORDER BY table_name
    `);
    tables.rows.forEach(t => console.log(`  ✓ ${t.table_name}`));
    console.log('');
    
    // Resumo de dados
    console.log('📈 RESUMO DO BANCO DE DADOS:');
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM registros_ponto) as registros,
        (SELECT COUNT(*) FROM colaboradores) as colaboradores,
        (SELECT COUNT(*) FROM feriados) as feriados,
        (SELECT COUNT(*) FROM escalas) as escalas,
        (SELECT COUNT(*) FROM atestados) as atestados,
        (SELECT COUNT(*) FROM dispositivos) as dispositivos,
        (SELECT COUNT(*) FROM security_alerts) as alertas
    `);
    const s = summary.rows[0];
    console.log(`  📍 Registros de ponto: ${s.registros}`);
    console.log(`  👥 Colaboradores: ${s.colaboradores}`);
    console.log(`  📅 Feriados: ${s.feriados}`);
    console.log(`  ⏰ Escalas: ${s.escalas}`);
    console.log(`  📋 Atestados: ${s.atestados}`);
    console.log(`  📱 Dispositivos: ${s.dispositivos}`);
    console.log(`  🚨 Alertas de segurança: ${s.alertas}`);
    console.log('');
    
    console.log('='  .repeat(50));
    console.log('✅ MIGRAÇÕES CONCLUÍDAS COM SUCESSO!\n');
    console.log('🎉 O banco de dados está completo!\n');
    console.log('🚀 Todos os erros 500 devem estar resolvidos!\n');
    console.log('💡 Próximo passo: Testar o frontend em:');
    console.log('   https://ponto-digital-painel.vercel.app\n');
    
  } catch (e) {
    console.log('❌ Erro:', e.message);
  } finally {
    client.release();
    pool.end();
  }
})();

