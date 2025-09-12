-- 🚀 OTIMIZAÇÃO DE ÍNDICES PARA PERFORMANCE
-- Sistema completo de índices otimizados para o sistema de ponto digital

-- ============================================================================
-- ANÁLISE INICIAL - Verificar índices existentes
-- ============================================================================

-- Verificar índices atuais
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar estatísticas de uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- ============================================================================
-- ÍNDICES PARA TABELA REGISTROS_PONTO (CRÍTICA PARA PERFORMANCE)
-- ============================================================================

-- Índice composto para consultas por data (mais comum)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_data_hora 
ON registros_ponto (data_hora DESC);

-- Índice composto para consultas por colaborador e data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_colaborador_data 
ON registros_ponto (colaborador_id, data_hora DESC);

-- Índice para consultas por data específica (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_data_only 
ON registros_ponto (DATE(data_hora));

-- Índice para consultas por tablet
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_tablet 
ON registros_ponto (tablet_id) WHERE tablet_id IS NOT NULL;

-- Índice para consultas de status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_status 
ON registros_ponto (status) WHERE status IS NOT NULL;

-- Índice para consultas por origem
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_origem 
ON registros_ponto (origem) WHERE origem IS NOT NULL;

-- Índice composto para relatórios complexos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_relatorios 
ON registros_ponto (data_hora DESC, colaborador_id, tablet_id) 
WHERE data_hora >= CURRENT_DATE - INTERVAL '1 year';

-- Índice para consultas de coordenadas (se usado para geolocalização)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_coordenadas 
ON registros_ponto (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- ÍNDICES PARA TABELA COLABORADORES
-- ============================================================================

-- Índice único para CPF (se não existir)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_cpf_unique 
ON colaboradores (cpf);

-- Índice para consultas por email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_email 
ON colaboradores (email) WHERE email IS NOT NULL;

-- Índice para consultas por nome (busca)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_nome 
ON colaboradores USING gin(to_tsvector('portuguese', nome));

-- Índice para colaboradores ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_ativo 
ON colaboradores (ativo) WHERE ativo = true;

-- Índice para consultas por perfil
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_perfil 
ON colaboradores (perfil) WHERE perfil IS NOT NULL;

-- Índice para face cadastrada
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_face 
ON colaboradores (face_cadastrada);

-- ============================================================================
-- ÍNDICES PARA TABELA USUARIOS (PAINEL ADMINISTRATIVO)
-- ============================================================================

-- Índice único para email
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_email_unique 
ON usuarios (email);

-- Índice para usuários ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_ativo 
ON usuarios (ativo) WHERE ativo = true;

-- Índice para consultas por perfil
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_perfil 
ON usuarios (perfil);

-- ============================================================================
-- ÍNDICES PARA TABELAS DE AUDITORIA
-- ============================================================================

-- Índice para logs de auditoria por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs (timestamp DESC) WHERE timestamp IS NOT NULL;

-- Índice para logs por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user 
ON audit_logs (user_id) WHERE user_id IS NOT NULL;

-- Índice para logs por ação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
ON audit_logs (action) WHERE action IS NOT NULL;

-- ============================================================================
-- ÍNDICES PARA SESSÕES E SEGURANÇA
-- ============================================================================

-- Índice para sessões ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active 
ON sessions (expires_at) WHERE expires_at > NOW();

-- Índice para sessões por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user 
ON sessions (user_id);

-- ============================================================================
-- ÍNDICES PARA TABELAS DE CONFIGURAÇÃO
-- ============================================================================

-- Índice para configurações por chave
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_configuracoes_chave 
ON configuracoes (chave);

-- Índice para configurações ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_configuracoes_ativa 
ON configuracoes (ativa) WHERE ativa = true;

-- ============================================================================
-- ÍNDICES PARA TABELAS DE RELATÓRIOS E ANALYTICS
-- ============================================================================

-- Índice para frequência por colaborador e período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frequencia_colaborador_periodo 
ON frequencia (colaborador_id, data_inicio, data_fim);

-- Índice para escalas por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escalas_data 
ON escalas (data_inicio, data_fim);

-- Índice para atestados por colaborador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atestados_colaborador 
ON atestados (colaborador_id, data_inicio);

-- ============================================================================
-- ÍNDICES PARCIAIS PARA OTIMIZAÇÃO ESPECÍFICA
-- ============================================================================

-- Índice apenas para registros recentes (últimos 3 meses)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_recentes 
ON registros_ponto (colaborador_id, data_hora DESC) 
WHERE data_hora >= CURRENT_DATE - INTERVAL '3 months';

-- Índice apenas para registros com problemas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_problemas 
ON registros_ponto (data_hora DESC) 
WHERE status IN ('erro', 'pendente', 'rejeitado');

-- Índice para primeiro registro do dia (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_primeiro_dia 
ON registros_ponto (colaborador_id, DATE(data_hora), data_hora) 
WHERE data_hora >= CURRENT_DATE - INTERVAL '1 month';

-- ============================================================================
-- ÍNDICES PARA BUSCA FULL-TEXT
-- ============================================================================

-- Índice de busca full-text para colaboradores
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_search 
ON colaboradores USING gin(
    to_tsvector('portuguese', 
        COALESCE(nome, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(cpf, '')
    )
);

-- ============================================================================
-- ESTATÍSTICAS E MANUTENÇÃO
-- ============================================================================

-- Atualizar estatísticas das tabelas principais
ANALYZE registros_ponto;
ANALYZE colaboradores;
ANALYZE usuarios;
ANALYZE audit_logs;

-- ============================================================================
-- VIEWS MATERIALIZADAS PARA PERFORMANCE
-- ============================================================================

-- View materializada para estatísticas diárias
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_estatisticas_diarias AS
SELECT 
    DATE(data_hora) as data,
    COUNT(*) as total_registros,
    COUNT(DISTINCT colaborador_id) as colaboradores_ativos,
    COUNT(CASE WHEN EXTRACT(HOUR FROM data_hora) <= 8 THEN 1 END) as registros_pontuais,
    AVG(EXTRACT(HOUR FROM data_hora) + EXTRACT(MINUTE FROM data_hora)/60.0) as hora_media
FROM registros_ponto 
WHERE data_hora >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(data_hora)
ORDER BY data DESC;

-- Índice para a view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_estatisticas_diarias_data 
ON mv_estatisticas_diarias (data);

-- View materializada para ranking de colaboradores
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ranking_colaboradores AS
SELECT 
    c.id,
    c.nome,
    COUNT(rp.id) as total_registros,
    COUNT(CASE WHEN EXTRACT(HOUR FROM rp.data_hora) <= 8 
               AND EXTRACT(MINUTE FROM rp.data_hora) <= 15 
               THEN 1 END) as registros_pontuais,
    ROUND(
        COUNT(CASE WHEN EXTRACT(HOUR FROM rp.data_hora) <= 8 
                   AND EXTRACT(MINUTE FROM rp.data_hora) <= 15 
                   THEN 1 END) * 100.0 / NULLIF(COUNT(rp.id), 0), 
        2
    ) as pontualidade_pct,
    MAX(rp.data_hora) as ultimo_registro
FROM colaboradores c
LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
    AND rp.data_hora >= CURRENT_DATE - INTERVAL '30 days'
WHERE c.ativo = true
GROUP BY c.id, c.nome
HAVING COUNT(rp.id) > 0
ORDER BY total_registros DESC, pontualidade_pct DESC;

-- Índice para a view de ranking
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ranking_colaboradores_id 
ON mv_ranking_colaboradores (id);

-- ============================================================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- ============================================================================

-- Configurar autovacuum mais agressivo para tabelas críticas
ALTER TABLE registros_ponto SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE colaboradores SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- ============================================================================
-- FUNÇÕES PARA MANUTENÇÃO AUTOMÁTICA
-- ============================================================================

-- Função para refresh das views materializadas
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estatisticas_diarias;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ranking_colaboradores;
    
    -- Log da operação
    INSERT INTO maintenance_log (operation, timestamp, details)
    VALUES ('refresh_materialized_views', NOW(), 'Views materializadas atualizadas');
    
EXCEPTION WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO maintenance_log (operation, timestamp, details, error)
    VALUES ('refresh_materialized_views', NOW(), 'Erro ao atualizar views', SQLERRM);
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de log de manutenção se não existir
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT,
    error TEXT
);

-- ============================================================================
-- CONSULTAS DE MONITORAMENTO DE PERFORMANCE
-- ============================================================================

-- Query para identificar índices não utilizados
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 
    AND idx_tup_fetch = 0
    AND schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Query para identificar tabelas que precisam de VACUUM
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Query para monitorar performance de queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 20;

-- ============================================================================
-- COMANDOS FINAIS
-- ============================================================================

-- Atualizar estatísticas finais
ANALYZE;

-- Verificar integridade dos índices
REINDEX DATABASE CONCURRENTLY ponto_digital;

-- Log da otimização
INSERT INTO maintenance_log (operation, details)
VALUES (
    'index_optimization', 
    'Otimização completa de índices executada. Índices criados para: registros_ponto, colaboradores, usuarios, audit_logs, sessions, configuracoes, frequencia, escalas, atestados. Views materializadas criadas para estatísticas e ranking.'
);

-- Exibir resumo final
SELECT 
    'OTIMIZAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_indices,
    pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as tamanho_total_indices
FROM pg_indexes 
WHERE schemaname = 'public';

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON INDEX idx_registros_ponto_data_hora IS 'Índice principal para consultas por data/hora - usado em dashboard e relatórios';
COMMENT ON INDEX idx_registros_ponto_colaborador_data IS 'Índice composto para consultas por colaborador e período - usado em relatórios individuais';
COMMENT ON INDEX idx_colaboradores_cpf_unique IS 'Índice único para CPF - garante unicidade e performance em login';
COMMENT ON MATERIALIZED VIEW mv_estatisticas_diarias IS 'View materializada para estatísticas diárias - atualizada automaticamente';
COMMENT ON MATERIALIZED VIEW mv_ranking_colaboradores IS 'View materializada para ranking de colaboradores - atualizada diariamente';

-- ============================================================================
-- SCRIPT COMPLETO DE OTIMIZAÇÃO DE PERFORMANCE CONCLUÍDO
-- ============================================================================
