const { Client } = require('pg');
require('dotenv').config();

// Configuração da conexão usando DATABASE_URL do Railway
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:acAshacscvQtOROcjEpuxaiXXUFyJDqC@tramway.proxy.rlwy.net:43129/railway';

console.log('🔧 Configuração do banco:');
console.log('   User: postgres');
console.log('   Host: tramway.proxy.rlwy.net');
console.log('   Database: railway');
console.log('   Password: [DEFINIDA]');
console.log('   Port: 43129');
console.log('   SSL: false');
console.log('   🌎 Timezone: America/Sao_Paulo');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: false
});

// SQL para criar as tabelas de contratos
const criarTabelasContratosSQL = `
-- =====================================
-- MÓDULO DE CONTRATOS - ESTRUTURA REAL
-- =====================================

-- Tabela principal de contratos
CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    cliente VARCHAR(200) NOT NULL,
    localizacao VARCHAR(300) NOT NULL,
    valor DECIMAL(12,2) NOT NULL DEFAULT 0,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Ativo', -- 'Ativo', 'Vencido', 'Próximo do vencimento'
    descricao TEXT,
    responsavel VARCHAR(100),
    numero_contrato VARCHAR(100),
    objeto TEXT,
    coordenadas_latitude DECIMAL(9,6),
    coordenadas_longitude DECIMAL(9,6),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER,
    atualizado_por INTEGER,
    FOREIGN KEY (criado_por) REFERENCES usuarios (id),
    FOREIGN KEY (atualizado_por) REFERENCES usuarios (id)
);

-- Tabela de documentos dos contratos
CREATE TABLE IF NOT EXISTS documentos_contrato (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'Contrato', 'Aditivo', 'Memorando', 'Outro'
    nome VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER NOT NULL,
    FOREIGN KEY (contrato_id) REFERENCES contratos (id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios (id)
);

-- Tabela de histórico de alterações dos contratos
CREATE TABLE IF NOT EXISTS historico_contratos (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL,
    campo_alterado VARCHAR(100) NOT NULL,
    valor_antigo TEXT,
    valor_novo TEXT,
    observacoes TEXT,
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alterado_por INTEGER NOT NULL,
    FOREIGN KEY (contrato_id) REFERENCES contratos (id) ON DELETE CASCADE,
    FOREIGN KEY (alterado_por) REFERENCES usuarios (id)
);

-- Relação de colaboradores alocados nos contratos
CREATE TABLE IF NOT EXISTS colaboradores_contratos (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    contrato_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id),
    FOREIGN KEY (contrato_id) REFERENCES contratos (id) ON DELETE CASCADE,
    UNIQUE(colaborador_id, contrato_id, data_inicio)
);

-- Alertas de vigência de contratos
CREATE TABLE IF NOT EXISTS alertas_vigencia (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'vencimento_30', 'vencimento_15', 'vencimento_5', 'vencido'
    mensagem TEXT NOT NULL,
    data_alerta DATE NOT NULL,
    visualizado BOOLEAN DEFAULT false,
    prioridade VARCHAR(20) DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contrato_id) REFERENCES contratos (id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_vigencia_fim ON contratos(vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_contratos_criado_em ON contratos(criado_em);
CREATE INDEX IF NOT EXISTS idx_documentos_contrato_id ON documentos_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_historico_contrato_id ON historico_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_contratos_colaborador ON colaboradores_contratos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_contratos_contrato ON colaboradores_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_alertas_vigencia_contrato ON alertas_vigencia(contrato_id);
CREATE INDEX IF NOT EXISTS idx_alertas_vigencia_visualizado ON alertas_vigencia(visualizado);

-- Trigger para atualizar o campo atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contratos_atualizado_em
    BEFORE UPDATE ON contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários nas tabelas
COMMENT ON TABLE contratos IS 'Tabela principal para armazenar dados dos contratos';
COMMENT ON TABLE documentos_contrato IS 'Documentos relacionados aos contratos';
COMMENT ON TABLE historico_contratos IS 'Histórico de alterações nos contratos';
COMMENT ON TABLE colaboradores_contratos IS 'Alocação de colaboradores nos contratos';
COMMENT ON TABLE alertas_vigencia IS 'Alertas de vencimento dos contratos';

COMMENT ON COLUMN contratos.status IS 'Status do contrato: Ativo, Vencido, Próximo do vencimento';
COMMENT ON COLUMN documentos_contrato.tipo IS 'Tipo do documento: Contrato, Aditivo, Memorando, Outro';
COMMENT ON COLUMN alertas_vigencia.tipo IS 'Tipo de alerta: vencimento_30, vencimento_15, vencimento_5, vencido';
COMMENT ON COLUMN alertas_vigencia.prioridade IS 'Prioridade do alerta: baixa, media, alta, critica';
`;

async function aplicarMudancas() {
  try {
    console.log('🔗 Conectando ao banco de dados PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    console.log('📋 Aplicando estrutura de tabelas para contratos...');
    await client.query(criarTabelasContratosSQL);
    console.log('✅ Tabelas de contratos criadas com sucesso!');

    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    const verificarTabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('contratos', 'documentos_contrato', 'historico_contratos', 'colaboradores_contratos', 'alertas_vigencia')
      ORDER BY table_name;
    `);

    console.log('📊 Tabelas encontradas:');
    verificarTabelas.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    // Inserir alguns dados de exemplo (opcional)
    console.log('📝 Inserindo dados de exemplo...');
    
    // Verificar se existe usuário administrador
    const usuarioAdmin = await client.query(`
      SELECT id FROM usuarios WHERE email = 'admin@fgservices.com' LIMIT 1
    `);

    let adminId = 1;
    if (usuarioAdmin.rows.length > 0) {
      adminId = usuarioAdmin.rows[0].id;
    }

    // Inserir contrato de exemplo se não existir
    const contratoExemplo = await client.query(`
      SELECT COUNT(*) as total FROM contratos
    `);

    if (contratoExemplo.rows[0].total == 0) {
      await client.query(`
        INSERT INTO contratos (
          nome, cliente, localizacao, valor, 
          vigencia_inicio, vigencia_fim, status,
          descricao, responsavel, numero_contrato, objeto,
          criado_por, atualizado_por
        ) VALUES (
          'Contrato Exemplo - Shopping Center ABC',
          'Grupo ABC Empreendimentos',
          'São Paulo, SP',
          85000.00,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '12 months',
          'Ativo',
          'Contrato de prestação de serviços de limpeza e conservação',
          'João Silva',
          'CT-2024-001',
          'Prestação de serviços de limpeza, conservação e manutenção predial do Shopping Center ABC',
          $1, $1
        )
      `, [adminId]);
      
      console.log('📝 Contrato de exemplo inserido!');
    }

    console.log('🎉 Estrutura do módulo de contratos aplicada com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('   1. Reinicie o servidor backend');
    console.log('   2. Acesse a página de contratos');
    console.log('   3. Teste a criação de um novo contrato');

  } catch (error) {
    console.error('❌ Erro ao aplicar mudanças no banco:', error);
    console.error('📋 Detalhes do erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão com banco encerrada.');
  }
}

// Executar o script
aplicarMudancas(); 