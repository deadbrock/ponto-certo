-- Script para criar tabelas que estão faltando e causando erros 500
-- Execute este script no banco de dados PostgreSQL do Railway

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

SELECT 'Tabelas criadas com sucesso!' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('atestados', 'escalas', 'escalas_colaboradores', 'feriados', 'dispositivos')
ORDER BY table_name;

