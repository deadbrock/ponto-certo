/**
 * Script simplificado para criar as tabelas faltantes
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Criando tabelas faltantes...\n');
    
    // Tabela: atestados
    console.log('📝 Criando tabela atestados...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS atestados (
        id SERIAL PRIMARY KEY,
        colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
        tipo VARCHAR(50) NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        dias_afastamento INTEGER,
        cid VARCHAR(10),
        observacao TEXT,
        arquivo_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pendente',
        aprovado_por INTEGER,
        data_aprovacao TIMESTAMP,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ atestados criada\n');
    
    // Tabela: escalas
    console.log('📝 Criando tabela escalas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS escalas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        tipo VARCHAR(50) DEFAULT 'padrao',
        horario_entrada TIME NOT NULL,
        horario_saida TIME NOT NULL,
        intervalo_almoco_inicio TIME,
        intervalo_almoco_fim TIME,
        dias_semana VARCHAR(50),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ escalas criada\n');
    
    // Tabela: escalas_colaboradores
    console.log('📝 Criando tabela escalas_colaboradores...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS escalas_colaboradores (
        id SERIAL PRIMARY KEY,
        escala_id INTEGER NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
        colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(escala_id, colaborador_id, data_inicio)
      )
    `);
    console.log('  ✅ escalas_colaboradores criada\n');
    
    // Tabela: feriados
    console.log('📝 Criando tabela feriados...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feriados (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        data DATE NOT NULL,
        tipo VARCHAR(20) DEFAULT 'nacional',
        recorrente BOOLEAN DEFAULT false,
        estado VARCHAR(2),
        cidade VARCHAR(100),
        ponto_facultativo BOOLEAN DEFAULT false,
        observacao TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(data, tipo, estado, cidade)
      )
    `);
    console.log('  ✅ feriados criada\n');
    
    // Tabela: dispositivos
    console.log('📝 Criando tabela dispositivos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dispositivos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'totem',
        identificador VARCHAR(100) UNIQUE NOT NULL,
        local VARCHAR(200),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status VARCHAR(20) DEFAULT 'ativo',
        ultima_conexao TIMESTAMP,
        versao_app VARCHAR(20),
        modelo VARCHAR(100),
        sistema_operacional VARCHAR(50),
        ip_address VARCHAR(45),
        observacao TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ dispositivos criada\n');
    
    // Tabela: alert_escalations
    console.log('📝 Criando tabela alert_escalations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_escalations (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER NOT NULL REFERENCES security_alerts(alert_id) ON DELETE CASCADE,
        escalation_level INTEGER DEFAULT 1,
        escalated_to VARCHAR(200),
        escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified BOOLEAN DEFAULT false,
        notification_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ alert_escalations criada\n');
    
    // Criar índices
    console.log('📝 Criando índices...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_atestados_colaborador ON atestados(colaborador_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_escalas_ativo ON escalas(ativo)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_feriados_data ON feriados(data)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_dispositivos_status ON dispositivos(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_escalations_alert ON alert_escalations(alert_id)');
    console.log('  ✅ Índices criados\n');
    
    // Inserir feriados de 2025
    console.log('📝 Inserindo feriados de 2025...');
    await client.query(`
      INSERT INTO feriados (nome, data, tipo, recorrente) VALUES
        ('Ano Novo', '2025-01-01', 'nacional', true),
        ('Carnaval', '2025-03-04', 'nacional', false),
        ('Sexta-feira Santa', '2025-04-18', 'nacional', false),
        ('Tiradentes', '2025-04-21', 'nacional', true),
        ('Dia do Trabalho', '2025-05-01', 'nacional', true),
        ('Corpus Christi', '2025-06-19', 'nacional', false),
        ('Independência do Brasil', '2025-09-07', 'nacional', true),
        ('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true),
        ('Finados', '2025-11-02', 'nacional', true),
        ('Proclamação da República', '2025-11-15', 'nacional', true),
        ('Consciência Negra', '2025-11-20', 'nacional', true),
        ('Natal', '2025-12-25', 'nacional', true)
      ON CONFLICT (data, tipo, estado, cidade) DO NOTHING
    `);
    console.log('  ✅ Feriados inseridos\n');
    
    // Inserir escala padrão
    console.log('📝 Inserindo escala padrão...');
    const escalaResult = await client.query(`
      INSERT INTO escalas (nome, descricao, horario_entrada, horario_saida, dias_semana)
      VALUES ('Escala Padrão', 'Horário comercial padrão', '08:00:00', '17:00:00', '["seg", "ter", "qua", "qui", "sex"]')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    console.log('  ✅ Escala padrão inserida\n');
    
    // Verificação final
    console.log('🔍 VERIFICAÇÃO FINAL:\n');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('atestados', 'escalas', 'escalas_colaboradores', 'feriados', 'dispositivos', 'security_alerts', 'alert_escalations')
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas criadas:');
    tables.rows.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });
    console.log('');
    
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM registros_ponto) as registros,
        (SELECT COUNT(*) FROM colaboradores) as colaboradores,
        (SELECT COUNT(*) FROM feriados) as feriados,
        (SELECT COUNT(*) FROM escalas) as escalas,
        (SELECT COUNT(*) FROM atestados) as atestados,
        (SELECT COUNT(*) FROM dispositivos) as dispositivos
    `);
    
    console.log('📈 RESUMO DO BANCO:');
    console.log(`  Registros de ponto: ${summary.rows[0].registros}`);
    console.log(`  Colaboradores: ${summary.rows[0].colaboradores}`);
    console.log(`  Feriados: ${summary.rows[0].feriados}`);
    console.log(`  Escalas: ${summary.rows[0].escalas}`);
    console.log(`  Atestados: ${summary.rows[0].atestados}`);
    console.log(`  Dispositivos: ${summary.rows[0].dispositivos}`);
    console.log('');
    
    console.log('✅ TODAS AS TABELAS CRIADAS COM SUCESSO!\n');
    console.log('🎉 O banco de dados está completo e pronto para uso!\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();

