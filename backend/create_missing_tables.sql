-- Script para criar tabelas que estão faltando e causando erros 500
-- Execute este script no banco de dados PostgreSQL do Railway

-- ============================================
-- PARTE 1: CORRIGIR TABELAS EXISTENTES
-- ============================================

-- Adicionar colunas faltantes em registros_ponto
DO $$ 
BEGIN
    -- Adicionar tipo_registro se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registros_ponto' AND column_name = 'tipo_registro'
    ) THEN
        ALTER TABLE registros_ponto ADD COLUMN tipo_registro VARCHAR(50);
        UPDATE registros_ponto SET tipo_registro = 'Entrada' WHERE tipo_registro IS NULL;
        RAISE NOTICE 'Coluna tipo_registro adicionada';
    END IF;

    -- Adicionar tablet_name se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registros_ponto' AND column_name = 'tablet_name'
    ) THEN
        ALTER TABLE registros_ponto ADD COLUMN tablet_name VARCHAR(100);
        RAISE NOTICE 'Coluna tablet_name adicionada';
    END IF;

    -- Adicionar tablet_location se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registros_ponto' AND column_name = 'tablet_location'
    ) THEN
        ALTER TABLE registros_ponto ADD COLUMN tablet_location VARCHAR(200);
        RAISE NOTICE 'Coluna tablet_location adicionada';
    END IF;
END $$;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_registros_tipo ON registros_ponto(tipo_registro);
CREATE INDEX IF NOT EXISTS idx_registros_tablet ON registros_ponto(tablet_id);

-- ============================================
-- PARTE 2: CRIAR NOVAS TABELAS
-- ============================================

-- ============================================
-- TABELA: atestados
-- ============================================
CREATE TABLE IF NOT EXISTS atestados (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
    tipo VARCHAR(50) NOT NULL, -- 'medico', 'abono', 'falta_justificada', etc
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dias_afastamento INTEGER,
    cid VARCHAR(10), -- Código CID (opcional)
    observacao TEXT,
    arquivo_url VARCHAR(500), -- URL do arquivo digitalizado
    status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    aprovado_por INTEGER REFERENCES usuarios(id),
    data_aprovacao TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_atestados_colaborador ON atestados(colaborador_id);
CREATE INDEX idx_atestados_data_inicio ON atestados(data_inicio);
CREATE INDEX idx_atestados_status ON atestados(status);

-- ============================================
-- TABELA: escalas
-- ============================================
CREATE TABLE IF NOT EXISTS escalas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'padrao', -- 'padrao', 'plantao', 'revezamento', etc
    horario_entrada TIME NOT NULL,
    horario_saida TIME NOT NULL,
    intervalo_almoco_inicio TIME,
    intervalo_almoco_fim TIME,
    dias_semana VARCHAR(50), -- JSON array: ["seg", "ter", "qua", "qui", "sex"]
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escalas_ativo ON escalas(ativo);

-- ============================================
-- TABELA: escalas_colaboradores (associação)
-- ============================================
CREATE TABLE IF NOT EXISTS escalas_colaboradores (
    id SERIAL PRIMARY KEY,
    escala_id INTEGER NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escala_id, colaborador_id, data_inicio)
);

CREATE INDEX idx_escalas_colab_escala ON escalas_colaboradores(escala_id);
CREATE INDEX idx_escalas_colab_colaborador ON escalas_colaboradores(colaborador_id);

-- ============================================
-- TABELA: feriados
-- ============================================
CREATE TABLE IF NOT EXISTS feriados (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    tipo VARCHAR(20) DEFAULT 'nacional', -- 'nacional', 'estadual', 'municipal'
    recorrente BOOLEAN DEFAULT false, -- Se repete todo ano
    estado VARCHAR(2), -- Sigla do estado (para feriados estaduais)
    cidade VARCHAR(100), -- Nome da cidade (para feriados municipais)
    ponto_facultativo BOOLEAN DEFAULT false,
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data, tipo, estado, cidade)
);

CREATE INDEX idx_feriados_data ON feriados(data);
CREATE INDEX idx_feriados_tipo ON feriados(tipo);
CREATE INDEX idx_feriados_ativo ON feriados(ativo);

-- ============================================
-- TABELA: dispositivos (totems/tablets)
-- ============================================
CREATE TABLE IF NOT EXISTS dispositivos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'totem', -- 'totem', 'tablet', 'celular', 'web'
    identificador VARCHAR(100) UNIQUE NOT NULL, -- MAC address, UUID, etc
    local VARCHAR(200), -- Localização física
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    ultima_conexao TIMESTAMP,
    versao_app VARCHAR(20),
    modelo VARCHAR(100),
    sistema_operacional VARCHAR(50),
    ip_address VARCHAR(45),
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispositivos_identificador ON dispositivos(identificador);
CREATE INDEX idx_dispositivos_status ON dispositivos(status);
CREATE INDEX idx_dispositivos_ativo ON dispositivos(ativo);

-- ============================================
-- TABELA: security_alerts (sistema de alertas)
-- ============================================
CREATE TABLE IF NOT EXISTS security_alerts (
    alert_id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    details JSONB,
    source VARCHAR(100), -- origem do alerta
    ip_address VARCHAR(45),
    user_id INTEGER,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);

-- ============================================
-- TABELA: alert_escalations (escalações de alertas)
-- ============================================
CREATE TABLE IF NOT EXISTS alert_escalations (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES security_alerts(alert_id) ON DELETE CASCADE,
    escalation_level INTEGER DEFAULT 1,
    escalated_to VARCHAR(200), -- email, slack, etc
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT false,
    notification_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_escalations_alert ON alert_escalations(alert_id);
CREATE INDEX idx_alert_escalations_level ON alert_escalations(escalation_level);

-- ============================================
-- INSERIR ALGUNS DADOS DE EXEMPLO
-- ============================================

-- Inserir feriados nacionais de 2025
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
ON CONFLICT (data, tipo, estado, cidade) DO NOTHING;

-- Inserir escala padrão
INSERT INTO escalas (nome, descricao, horario_entrada, horario_saida, dias_semana) VALUES
    ('Escala Padrão', 'Horário comercial padrão', '08:00:00', '17:00:00', '["seg", "ter", "qua", "qui", "sex"]')
ON CONFLICT DO NOTHING;

-- ============================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Atestados
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_atestados') THEN
        CREATE TRIGGER set_timestamp_atestados
        BEFORE UPDATE ON atestados
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- Escalas
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_escalas') THEN
        CREATE TRIGGER set_timestamp_escalas
        BEFORE UPDATE ON escalas
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- Feriados
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_feriados') THEN
        CREATE TRIGGER set_timestamp_feriados
        BEFORE UPDATE ON feriados
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- Dispositivos
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_dispositivos') THEN
        CREATE TRIGGER set_timestamp_dispositivos
        BEFORE UPDATE ON dispositivos
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT 'Script executado com sucesso!' as status;

-- Verificar colunas adicionadas em registros_ponto
SELECT 
    'registros_ponto' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'registros_ponto'
AND column_name IN ('tipo_registro', 'tablet_name', 'tablet_location')
ORDER BY column_name;

-- Verificar novas tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('atestados', 'escalas', 'escalas_colaboradores', 'feriados', 'dispositivos', 'security_alerts', 'alert_escalations')
ORDER BY table_name;

-- Resumo
SELECT 
    'RESUMO' as tipo,
    (SELECT COUNT(*) FROM registros_ponto) as total_registros,
    (SELECT COUNT(*) FROM colaboradores) as total_colaboradores,
    (SELECT COUNT(*) FROM feriados) as total_feriados,
    (SELECT COUNT(*) FROM escalas) as total_escalas;

