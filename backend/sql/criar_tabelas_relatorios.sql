-- Script SQL para criar tabelas do módulo de relatórios importados
-- Módulo: relatorios-importados
-- Data: 2025-01-18

-- 1. Tabela para registros de ponto importados
CREATE TABLE IF NOT EXISTS registros_ponto (
    id SERIAL PRIMARY KEY,
    id_colaborador INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
    data_hora TIMESTAMP NOT NULL,
    origem VARCHAR(20) DEFAULT 'arquivo_txt' CHECK (origem IN ('arquivo_txt', 'manual', 'totem', 'biometrico')),
    status VARCHAR(20) DEFAULT 'importado' CHECK (status IN ('importado', 'pendente', 'validado', 'rejeitado')),
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela para controle de arquivos importados
CREATE TABLE IF NOT EXISTS arquivos_importados (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500),
    tamanho_arquivo BIGINT,
    tipo_arquivo VARCHAR(50) DEFAULT 'txt',
    id_usuario INTEGER, -- Referência ao usuário que fez o upload (se houver tabela usuarios)
    data_upload TIMESTAMP DEFAULT NOW(),
    total_registros INTEGER DEFAULT 0,
    registros_validos INTEGER DEFAULT 0,
    registros_invalidos INTEGER DEFAULT 0,
    status_processamento VARCHAR(30) DEFAULT 'processado' CHECK (status_processamento IN ('pendente', 'processando', 'processado', 'erro')),
    detalhes_erros TEXT, -- JSON com lista de erros
    hash_arquivo VARCHAR(64), -- MD5 ou SHA256 para evitar duplicatas
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 3. Índices para otimização
CREATE INDEX IF NOT EXISTS idx_registros_ponto_colaborador ON registros_ponto(id_colaborador);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON registros_ponto(data_hora);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_origem ON registros_ponto(origem);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_status ON registros_ponto(status);
CREATE INDEX IF NOT EXISTS idx_arquivos_importados_data ON arquivos_importados(data_upload);
CREATE INDEX IF NOT EXISTS idx_arquivos_importados_hash ON arquivos_importados(hash_arquivo);

-- 4. Trigger para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_registros_ponto_timestamp
    BEFORE UPDATE ON registros_ponto
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 5. Comentários nas tabelas
COMMENT ON TABLE registros_ponto IS 'Registros de ponto dos colaboradores importados de diferentes fontes';
COMMENT ON COLUMN registros_ponto.origem IS 'Fonte do registro: arquivo_txt, manual, totem, biometrico';
COMMENT ON COLUMN registros_ponto.status IS 'Status do registro: importado, pendente, validado, rejeitado';

COMMENT ON TABLE arquivos_importados IS 'Controle de arquivos de ponto importados no sistema';
COMMENT ON COLUMN arquivos_importados.detalhes_erros IS 'JSON contendo detalhes dos erros de processamento';
COMMENT ON COLUMN arquivos_importados.hash_arquivo IS 'Hash do arquivo para evitar importações duplicadas';

-- 6. Inserir dados de exemplo para teste (opcional)
-- INSERT INTO registros_ponto (id_colaborador, data_hora, origem, status) 
-- VALUES (1, '2025-01-18 08:00:00', 'arquivo_txt', 'importado');

COMMIT;