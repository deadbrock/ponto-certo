-- ===================================================================
-- SISTEMA DE PONTO DIGITAL - DATABASE SCHEMA COMPLETO
-- Versão: 2.0 (Produção)
-- Data: Janeiro 2025
-- ===================================================================

-- Limpar banco e recriar estrutura
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ===================================================================
-- TABELA: usuarios
-- Usuários administrativos do painel web
-- ===================================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('administrador', 'Administrador', 'gestor', 'Gestor', 'rh', 'RH')),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: colaboradores
-- Colaboradores que utilizam o sistema de ponto
-- ===================================================================
CREATE TABLE colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    data_admissao DATE,
    salario DECIMAL(10,2),
    endereco TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: registros_ponto
-- Registros de ponto dos colaboradores
-- ===================================================================
CREATE TABLE registros_ponto (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    caminho_foto VARCHAR(500),
    tablet_id VARCHAR(100),
    tablet_name VARCHAR(100),
    tablet_location VARCHAR(100),
    observacoes TEXT,
    validado BOOLEAN DEFAULT false,
    validado_por INTEGER REFERENCES usuarios(id),
    validado_em TIMESTAMP
);

-- ===================================================================
-- TABELA: escalas
-- Escalas de trabalho dos colaboradores
-- ===================================================================
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo_escala VARCHAR(50) NOT NULL, -- 'fixo', 'revezamento', 'flexivel'
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dias_semana JSONB DEFAULT '[]', -- Array com dias da semana [1,2,3,4,5]
    data_inicio DATE,
    data_fim DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: feriados
-- Feriados nacionais, estaduais e municipais
-- ===================================================================
CREATE TABLE feriados (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_feriado DATE NOT NULL,
    tipo VARCHAR(20) DEFAULT 'nacional', -- 'nacional', 'estadual', 'municipal'
    recorrente BOOLEAN DEFAULT false, -- Se repete anualmente
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: atestados
-- Atestados médicos e solicitações de afastamento
-- ===================================================================
CREATE TABLE atestados (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo_atestado VARCHAR(50) NOT NULL, -- 'medico', 'odontologico', 'psicologico'
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    motivo TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
    observacoes TEXT,
    observacoes_aprovacao TEXT,
    arquivo_anexo VARCHAR(500), -- Caminho para arquivo do atestado
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aprovado_por INTEGER REFERENCES usuarios(id),
    aprovado_em TIMESTAMP
);

-- ===================================================================
-- TABELA: configuracoes
-- Configurações gerais do sistema
-- ===================================================================
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'text', -- 'text', 'json', 'number', 'boolean'
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: contratos
-- Gestão de contratos da empresa
-- ===================================================================
CREATE TABLE contratos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    cliente VARCHAR(200) NOT NULL,
    numero_contrato VARCHAR(100),
    objeto TEXT,
    localizacao VARCHAR(200) NOT NULL,
    coordenadas_latitude DECIMAL(10, 8),
    coordenadas_longitude DECIMAL(11, 8),
    valor DECIMAL(15,2) DEFAULT 0,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo', -- 'ativo', 'vencido', 'cancelado'
    descricao TEXT,
    responsavel VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER REFERENCES usuarios(id),
    atualizado_por INTEGER REFERENCES usuarios(id)
);

-- ===================================================================
-- TABELA: documentos_contrato
-- Documentos associados aos contratos
-- ===================================================================
CREATE TABLE documentos_contrato (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(200) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tipo_documento VARCHAR(50), -- 'contrato', 'aditivo', 'comprovante'
    tamanho_bytes BIGINT,
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado_por INTEGER REFERENCES usuarios(id)
);

-- ===================================================================
-- TABELA: historico_contratos
-- Histórico de alterações nos contratos
-- ===================================================================
CREATE TABLE historico_contratos (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
    campo_alterado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    motivo_alteracao TEXT,
    alterado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alterado_por INTEGER REFERENCES usuarios(id)
);

-- ===================================================================
-- TABELA: colaboradores_contratos
-- Relacionamento entre colaboradores e contratos
-- ===================================================================
CREATE TABLE colaboradores_contratos (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    cargo_no_contrato VARCHAR(100),
    salario_contrato DECIMAL(10,2),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colaborador_id, contrato_id)
);

-- ===================================================================
-- TABELA: alertas_vigencia
-- Alertas automáticos de vencimento de contratos
-- ===================================================================
CREATE TABLE alertas_vigencia (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
    tipo_alerta VARCHAR(50) NOT NULL, -- 'vencimento_30_dias', 'vencimento_15_dias', 'vencido'
    mensagem TEXT NOT NULL,
    visualizado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visualizado_em TIMESTAMP,
    visualizado_por INTEGER REFERENCES usuarios(id)
);

-- ===================================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================================

-- Índices para registros_ponto
CREATE INDEX idx_registros_ponto_colaborador ON registros_ponto(colaborador_id);
CREATE INDEX idx_registros_ponto_data ON registros_ponto(data_hora);
CREATE INDEX idx_registros_ponto_tablet ON registros_ponto(tablet_id);

-- Índices para escalas
CREATE INDEX idx_escalas_colaborador ON escalas(colaborador_id);
CREATE INDEX idx_escalas_ativo ON escalas(ativo);

-- Índices para atestados
CREATE INDEX idx_atestados_colaborador ON atestados(colaborador_id);
CREATE INDEX idx_atestados_status ON atestados(status);
CREATE INDEX idx_atestados_data ON atestados(data_inicio, data_fim);

-- Índices para feriados
CREATE INDEX idx_feriados_data ON feriados(data_feriado);
CREATE INDEX idx_feriados_tipo ON feriados(tipo);

-- Índices para contratos
CREATE INDEX idx_contratos_cliente ON contratos(cliente);
CREATE INDEX idx_contratos_status ON contratos(status);
CREATE INDEX idx_contratos_vigencia ON contratos(vigencia_inicio, vigencia_fim);

-- Índices para configurações
CREATE INDEX idx_configuracoes_chave ON configuracoes(chave);

-- ===================================================================
-- TRIGGERS PARA AUDITORIA
-- ===================================================================

-- Trigger para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas principais
CREATE TRIGGER tr_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_colaboradores_updated BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_escalas_updated BEFORE UPDATE ON escalas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_atestados_updated BEFORE UPDATE ON atestados FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_feriados_updated BEFORE UPDATE ON feriados FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_configuracoes_updated BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_contratos_updated BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ===================================================================
-- DADOS INICIAIS
-- ===================================================================

-- Usuário administrador padrão
INSERT INTO usuarios (nome, email, senha, perfil) VALUES 
('Administrador', 'admin@fgservices.com', '$2b$10$rQ8R6BVVLy9.9L9L6K7K5eOZG1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', 'administrador');

-- Configurações iniciais do sistema
INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES 
('horario_trabalho_inicio', '08:00', 'text', 'Horário padrão de início do trabalho'),
('horario_trabalho_fim', '17:00', 'text', 'Horário padrão de fim do trabalho'),
('tolerancia_atraso_minutos', '15', 'number', 'Tolerância em minutos para atraso'),
('sistema_inicializado', 'true', 'boolean', 'Sistema foi inicializado'),
('versao_sistema', '2.0', 'text', 'Versão atual do sistema');

-- Feriados nacionais padrão para 2025
INSERT INTO feriados (nome, data_feriado, tipo, recorrente) VALUES 
('Confraternização Universal', '2025-01-01', 'nacional', true),
('Tiradentes', '2025-04-21', 'nacional', true),
('Dia do Trabalhador', '2025-05-01', 'nacional', true),
('Independência do Brasil', '2025-09-07', 'nacional', true),
('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true),
('Finados', '2025-11-02', 'nacional', true),
('Proclamação da República', '2025-11-15', 'nacional', true),
('Natal', '2025-12-25', 'nacional', true);

-- ===================================================================
-- VIEWS ÚTEIS
-- ===================================================================

-- View para estatísticas de presença
CREATE VIEW vw_estatisticas_presenca AS
SELECT 
    c.id,
    c.nome,
    COUNT(DISTINCT DATE(rp.data_hora)) as dias_trabalhados_mes,
    COUNT(rp.id) as total_registros_mes,
    ROUND(
        (COUNT(DISTINCT DATE(rp.data_hora)) * 100.0 / 
        EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))), 
        2
    ) as percentual_presenca_mes
FROM colaboradores c
LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
    AND DATE(rp.data_hora) >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY c.id, c.nome;

-- View para contratos próximos do vencimento
CREATE VIEW vw_contratos_vencimento AS
SELECT 
    c.*,
    CASE 
        WHEN c.vigencia_fim < CURRENT_DATE THEN 'vencido'
        WHEN c.vigencia_fim <= CURRENT_DATE + INTERVAL '30 days' THEN 'proximo_vencimento'
        ELSE 'vigente'
    END as status_vigencia,
    (c.vigencia_fim - CURRENT_DATE) as dias_restantes
FROM contratos c
WHERE c.status = 'ativo';

-- ===================================================================
-- FUNÇÕES ÚTEIS
-- ===================================================================

-- Função para calcular horas trabalhadas em um período
CREATE OR REPLACE FUNCTION calcular_horas_trabalhadas(
    p_colaborador_id INTEGER,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS DECIMAL AS $$
DECLARE
    total_horas DECIMAL := 0;
    registro RECORD;
BEGIN
    FOR registro IN
        SELECT 
            DATE(data_hora) as data,
            ARRAY_AGG(data_hora ORDER BY data_hora) as registros
        FROM registros_ponto
        WHERE colaborador_id = p_colaborador_id
            AND DATE(data_hora) BETWEEN p_data_inicio AND p_data_fim
        GROUP BY DATE(data_hora)
    LOOP
        -- Assumir que registros em pares são entrada/saída
        IF array_length(registro.registros, 1) >= 2 THEN
            total_horas := total_horas + 
                EXTRACT(EPOCH FROM (registro.registros[2] - registro.registros[1])) / 3600;
        END IF;
        
        -- Se houver 4 registros (entrada, saída almoço, volta almoço, saída)
        IF array_length(registro.registros, 1) >= 4 THEN
            total_horas := total_horas + 
                EXTRACT(EPOCH FROM (registro.registros[4] - registro.registros[3])) / 3600;
        END IF;
    END LOOP;
    
    RETURN COALESCE(total_horas, 0);
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMENTÁRIOS FINAIS
-- ===================================================================

COMMENT ON DATABASE postgres IS 'Sistema de Ponto Digital FG Services - Base de dados completa para gestão de ponto eletrônico com reconhecimento facial';

-- ===================================================================
-- VERIFICAÇÃO FINAL
-- ===================================================================

-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar índices criados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
