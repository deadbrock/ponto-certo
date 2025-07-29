-- CORREÇÃO TABELA USUARIOS - PONTO DIGITAL
-- Execute no PostgreSQL Railway

-- 1. Verificar se a tabela existe e remover dados incorretos
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Recriar tabela com estrutura correta
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,  -- CORRIGIDO: era 'senha', agora é 'senha_hash'
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inserir usuário administrador com hash bcrypt correto
-- Senha: admin123
-- Hash gerado com bcrypt.hash('admin123', 10)
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) VALUES 
('Administrador', 'admin@fgservices.com', '$2b$10$K8nzQs1J.0Q3QvKDKpI7PO8wAe6YUYo0YY9Xs.JHhQe5XsY2I3K2S', 'administrador', true);

-- 4. Verificar se foi inserido corretamente
SELECT id, nome, email, perfil, ativo, 
       length(senha_hash) as hash_length,
       substr(senha_hash, 1, 10) as hash_preview
FROM usuarios;

-- 5. Recriar configurações se necessário
INSERT INTO configuracoes (chave, valor, descricao) VALUES 
('sistema_inicializado', 'true', 'Sistema inicializado'),
('versao_sistema', '2.0', 'Versão do sistema')
ON CONFLICT (chave) DO NOTHING;