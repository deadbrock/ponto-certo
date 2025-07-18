-- Tabela para armazenar os dados dos colaboradores
CREATE TABLE colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Armazenaremos o hash da senha, não a senha em si
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    perfil VARCHAR(20) NOT NULL DEFAULT 'colaborador'
);

-- Tabela para armazenar os registros de ponto
CREATE TABLE registros_ponto (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo_registro VARCHAR(20) NOT NULL DEFAULT 'entrada', -- 'entrada', 'parada_almoco', 'volta_almoco', 'saida'
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    caminho_foto VARCHAR(255), -- Caminho para a foto armazenada (ex: no Google Cloud Storage)
    tablet_id VARCHAR(100), -- ID único do tablet que registrou o ponto
    tablet_name VARCHAR(100), -- Nome amigável do tablet
    tablet_location VARCHAR(200), -- Localização física do tablet
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id)
);

-- Índices para otimizar as consultas
CREATE INDEX idx_colaboradores_cpf ON colaboradores(cpf);
CREATE INDEX idx_registros_ponto_colaborador_id ON registros_ponto(colaborador_id);
CREATE INDEX idx_registros_ponto_tablet_id ON registros_ponto(tablet_id);
CREATE INDEX idx_registros_ponto_data_hora ON registros_ponto(data_hora);
CREATE INDEX idx_registros_ponto_tipo ON registros_ponto(tipo_registro);

-- Evolução (Adicionando Roles) - 12/06/2025
ALTER TABLE colaboradores
ADD COLUMN perfil VARCHAR(20) NOT NULL DEFAULT 'colaborador';

COMMENT ON COLUMN colaboradores.perfil IS 'Define o nível de acesso do usuário (ex: colaborador, gestor, rh, admin)';

-- Evolução (Adicionando campos do tablet) - 17/06/2025
ALTER TABLE registros_ponto
ADD COLUMN tablet_id VARCHAR(100),
ADD COLUMN tablet_name VARCHAR(100),
ADD COLUMN tablet_location VARCHAR(200);

COMMENT ON COLUMN registros_ponto.tablet_id IS 'ID único do tablet que registrou o ponto';
COMMENT ON COLUMN registros_ponto.tablet_name IS 'Nome amigável do tablet';
COMMENT ON COLUMN registros_ponto.tablet_location IS 'Localização física do tablet';

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_registros_ponto_tablet_id ON registros_ponto(tablet_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON registros_ponto(data_hora);

-- Evolução (Adicionando controle de tipos de registro) - 09/07/2025
ALTER TABLE registros_ponto 
ADD COLUMN IF NOT EXISTS tipo_registro VARCHAR(20) NOT NULL DEFAULT 'entrada';

COMMENT ON COLUMN registros_ponto.tipo_registro IS 'Tipo do registro: entrada, parada_almoco, volta_almoco, saida';

-- Criar índice para tipo de registro
CREATE INDEX IF NOT EXISTS idx_registros_ponto_tipo ON registros_ponto(tipo_registro);

-- Atualizar registros existentes para ter tipo 'entrada' se não especificado
UPDATE registros_ponto SET tipo_registro = 'entrada' WHERE tipo_registro IS NULL OR tipo_registro = '';

-- Evolução (Adicionando tabelas de auditoria e logs) - 19/06/2025

-- Tabela para armazenar usuários administrativos
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'gestor', -- administrador, gestor, rh
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para logs de auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    acao VARCHAR(100) NOT NULL,
    detalhes TEXT,
    ip_address INET,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

-- Tabela para correções de ponto
CREATE TABLE IF NOT EXISTS correcoes_ponto (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    usuario_autor_id INTEGER NOT NULL,
    acao VARCHAR(50) NOT NULL, -- 'Ajuste de Entrada', 'Ajuste de Saída', 'Inclusão de Ponto', 'Exclusão de Ponto'
    justificativa TEXT NOT NULL,
    data_hora_original TIMESTAMP WITH TIME ZONE,
    data_hora_nova TIMESTAMP WITH TIME ZONE,
    data_correcao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id),
    FOREIGN KEY (usuario_autor_id) REFERENCES usuarios (id)
);

-- Adicionar campo PIS/PASEP aos colaboradores para relatórios AFD
ALTER TABLE colaboradores 
ADD COLUMN IF NOT EXISTS pis_pasep VARCHAR(11);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario_id ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_data_hora ON logs_auditoria(data_hora);
CREATE INDEX IF NOT EXISTS idx_correcoes_ponto_colaborador_id ON correcoes_ponto(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_ponto_usuario_autor_id ON correcoes_ponto(usuario_autor_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_ponto_data_correcao ON correcoes_ponto(data_correcao);

-- Inserir usuário administrador padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, perfil) 
VALUES ('Administrador', 'admin@fgservices.com', '$2b$10$8K1p/a0dM8Q7n4xG9RbVg.HI7YYYc7i6rYVJT9QqqZJcnZl8QG5HO', 'administrador')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE usuarios IS 'Usuários administrativos do sistema';
COMMENT ON TABLE logs_auditoria IS 'Logs de auditoria do sistema';
COMMENT ON TABLE correcoes_ponto IS 'Registros de correções de ponto realizadas';
COMMENT ON COLUMN colaboradores.pis_pasep IS 'Número PIS/PASEP para relatórios AFD';
COMMENT ON COLUMN registros_ponto.tipo_registro IS 'Tipo do registro: entrada, parada_almoco, volta_almoco, saida';

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
