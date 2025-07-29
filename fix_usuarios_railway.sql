-- CORREÇÃO DEFINITIVA TABELA USUARIOS - RAILWAY
-- Copie e execute este SQL no Query Editor do Railway

-- 1. Verificar estrutura atual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;

-- 2. Remover tabela usuarios se existir (cuidado: vai apagar dados!)
DROP TABLE IF EXISTS usuarios CASCADE;

-- 3. Recriar tabela com estrutura correta
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,  -- CAMPO CORRETO
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inserir usuário admin com hash bcrypt válido
-- Senha: admin123
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) VALUES 
('Administrador', 'admin@fgservices.com', '$2b$10$EixZxYPyLEsxeUjW9H3hsuQOIGDgV9QJ.O7.L6z3LqL4RxG4QwJ5u', 'administrador', true);

-- 5. Verificar se foi inserido corretamente
SELECT id, nome, email, perfil, ativo, 
       length(senha_hash) as hash_length,
       substr(senha_hash, 1, 10) as hash_preview
FROM usuarios;

-- 6. Testar se a tabela configuracoes existe, se não, criar
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT
);

-- 7. Inserir configurações básicas
INSERT INTO configuracoes (chave, valor, descricao) VALUES 
('sistema_inicializado', 'true', 'Sistema inicializado'),
('versao_sistema', '2.0', 'Versão do sistema')
ON CONFLICT (chave) DO NOTHING;