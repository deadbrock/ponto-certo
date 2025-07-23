-- DEPLOY RAILWAY - PONTO DIGITAL
-- Execute no PostgreSQL Railway

-- Criar tabelas principais
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registros_ponto (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER REFERENCES colaboradores(id),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    caminho_foto VARCHAR(500),
    tablet_id VARCHAR(100),
    observacoes TEXT
);

CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT
);

-- Dados iniciais
INSERT INTO usuarios (nome, email, senha, perfil) VALUES 
('Admin', 'admin@fgservices.com', '$2b$10$rQ8R6BVVLy9.9L9L6K7K5eOZG1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', 'administrador');

INSERT INTO configuracoes (chave, valor, descricao) VALUES 
('sistema_inicializado', 'true', 'Sistema inicializado'),
('versao_sistema', '2.0', 'Versão do sistema'); 