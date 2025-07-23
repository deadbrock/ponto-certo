-- SCHEMA SIMPLIFICADO PARA RAILWAY
-- Execute este SQL no Railway

-- Limpar e recriar
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Tabela usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela colaboradores
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

-- Tabela registros_ponto
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

-- Tabela escalas
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo_escala VARCHAR(50) NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dias_semana JSONB DEFAULT '[]',
    data_inicio DATE,
    data_fim DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela feriados
CREATE TABLE feriados (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_feriado DATE NOT NULL,
    tipo VARCHAR(20) DEFAULT 'nacional',
    recorrente BOOLEAN DEFAULT false,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela atestados
CREATE TABLE atestados (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo_atestado VARCHAR(50) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    motivo TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    observacoes TEXT,
    observacoes_aprovacao TEXT,
    arquivo_anexo VARCHAR(500),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aprovado_por INTEGER REFERENCES usuarios(id),
    aprovado_em TIMESTAMP
);

-- Tabela configuracoes
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'text',
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela contratos
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
    status VARCHAR(20) DEFAULT 'ativo',
    descricao TEXT,
    responsavel VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER REFERENCES usuarios(id),
    atualizado_por INTEGER REFERENCES usuarios(id)
);

-- Dados iniciais
INSERT INTO usuarios (nome, email, senha, perfil) VALUES 
('Administrador', 'admin@fgservices.com', '$2b$10$rQ8R6BVVLy9.9L9L6K7K5eOZG1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', 'administrador');

INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES 
('horario_trabalho_inicio', '08:00', 'text', 'Horário padrão de início do trabalho'),
('horario_trabalho_fim', '17:00', 'text', 'Horário padrão de fim do trabalho'),
('tolerancia_atraso_minutos', '15', 'number', 'Tolerância em minutos para atraso'),
('sistema_inicializado', 'true', 'boolean', 'Sistema foi inicializado'),
('versao_sistema', '2.0', 'text', 'Versão atual do sistema');

INSERT INTO feriados (nome, data_feriado, tipo, recorrente) VALUES 
('Confraternização Universal', '2025-01-01', 'nacional', true),
('Tiradentes', '2025-04-21', 'nacional', true),
('Dia do Trabalhador', '2025-05-01', 'nacional', true),
('Independência do Brasil', '2025-09-07', 'nacional', true),
('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true),
('Finados', '2025-11-02', 'nacional', true),
('Proclamação da República', '2025-11-15', 'nacional', true),
('Natal', '2025-12-25', 'nacional', true); 