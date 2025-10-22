const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

(async () => {
  const client = await pool.connect();
  try {
    console.log('📝 Inserindo dados...\n');
    
    // Feriados
    await client.query(`
      INSERT INTO feriados (nome, data, tipo, recorrente) VALUES
      ('Ano Novo', '2025-01-01', 'nacional', true),
      ('Carnaval', '2025-03-04', 'nacional', false),
      ('Sexta-feira Santa', '2025-04-18', 'nacional', false),
      ('Tiradentes', '2025-04-21', 'nacional', true),
      ('Dia do Trabalho', '2025-05-01', 'nacional', true),
      ('Corpus Christi', '2025-06-19', 'nacional', false),
      ('Independência', '2025-09-07', 'nacional', true),
      ('N. Sra. Aparecida', '2025-10-12', 'nacional', true),
      ('Finados', '2025-11-02', 'nacional', true),
      ('Proclamação', '2025-11-15', 'nacional', true),
      ('Consciência Negra', '2025-11-20', 'nacional', true),
      ('Natal', '2025-12-25', 'nacional', true)
      ON CONFLICT (data, tipo, estado, cidade) DO NOTHING
    `);
    console.log('✅ 12 feriados inseridos');
    
    // Escala padrão
    await client.query(`
      INSERT INTO escalas (nome, descricao, horario_entrada, horario_saida, dias_semana)
      VALUES ('Escala Padrão', 'Horário comercial', '08:00', '17:00', '["seg","ter","qua","qui","sex"]')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Escala padrão inserida\n');
    
    // Verificação
    const r = await client.query('SELECT (SELECT COUNT(*) FROM feriados) as f, (SELECT COUNT(*) FROM escalas) as e');
    console.log(`📊 Total de feriados: ${r.rows[0].f}`);
    console.log(`📊 Total de escalas: ${r.rows[0].e}\n`);
    console.log('✅ CONCLUÍDO!\n');
  } catch (e) {
    console.log('⚠️', e.message);
  } finally {
    client.release();
    pool.end();
  }
})();

