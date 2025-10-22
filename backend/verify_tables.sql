-- Script para verificar estrutura do banco de dados

-- 1. Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estrutura da tabela registros_ponto
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'registros_ponto'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela colaboradores
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'colaboradores'
ORDER BY ordinal_position;

-- 4. Verificar se existem dados nas tabelas principais
SELECT 
    'registros_ponto' as tabela,
    COUNT(*) as total_registros
FROM registros_ponto
UNION ALL
SELECT 
    'colaboradores' as tabela,
    COUNT(*) as total_registros
FROM colaboradores;

-- 5. Verificar tabelas que podem estar faltando
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'atestados') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as atestados,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escalas') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as escalas,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feriados') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as feriados,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispositivos') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as dispositivos;

