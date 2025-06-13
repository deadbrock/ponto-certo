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
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    caminho_foto VARCHAR(255), -- Caminho para a foto armazenada (ex: no Google Cloud Storage)
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id)
);

-- Índices para otimizar as consultas
CREATE INDEX idx_colaboradores_cpf ON colaboradores(cpf);
CREATE INDEX idx_registros_ponto_colaborador_id ON registros_ponto(colaborador_id);

-- Evolução (Adicionando Roles) - 12/06/2025
ALTER TABLE colaboradores
ADD COLUMN perfil VARCHAR(20) NOT NULL DEFAULT 'colaborador';

COMMENT ON COLUMN colaboradores.perfil IS 'Define o nível de acesso do usuário (ex: colaborador, gestor, rh, admin)';