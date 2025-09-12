-- ===================================================================
-- SISTEMA COMPLETO DE AUDITORIA E LOGS - LGPD COMPLIANT
-- Versão: 1.0
-- Data: Setembro 2025
-- ===================================================================

-- ===================================================================
-- TABELA: logs_auditoria
-- Log principal de todas as ações do sistema
-- ===================================================================
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Identificação da ação
    action VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, CREATE_USER, etc.
    category VARCHAR(50) NOT NULL, -- AUTHENTICATION, DATA_ACCESS, SYSTEM, BIOMETRIC
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- info, warning, error, critical
    
    -- Dados do usuário
    user_id INTEGER,
    user_email VARCHAR(100),
    user_profile VARCHAR(50),
    user_ip INET,
    user_agent TEXT,
    
    -- Dados da requisição
    method VARCHAR(10), -- GET, POST, PUT, DELETE
    endpoint VARCHAR(500),
    request_id VARCHAR(100), -- UUID único da requisição
    session_id VARCHAR(100),
    
    -- Dados da resposta
    status_code INTEGER,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    
    -- Detalhes da ação
    resource_type VARCHAR(100), -- colaborador, usuario, contrato, etc.
    resource_id VARCHAR(100), -- ID do recurso afetado
    old_values JSONB, -- Valores antigos (para updates/deletes)
    new_values JSONB, -- Valores novos (para creates/updates)
    additional_data JSONB, -- Dados extras específicos da ação
    
    -- Dados de contexto
    source VARCHAR(50) DEFAULT 'backend', -- backend, frontend, mobile, system
    environment VARCHAR(20) DEFAULT 'production', -- development, staging, production
    
    -- Conformidade LGPD
    data_subject_cpf VARCHAR(11), -- CPF do titular dos dados (quando aplicável)
    legal_basis VARCHAR(100), -- Base legal LGPD
    consent_id VARCHAR(100), -- ID do consentimento (quando aplicável)
    data_category VARCHAR(50), -- personal, sensitive, biometric, etc.
    
    -- Indexação e busca
    searchable_text TEXT, -- Texto indexável para busca
    tags VARCHAR(500), -- Tags separadas por vírgula
    
    -- Metadados
    retention_days INTEGER DEFAULT 2555, -- 7 anos (LGPD)
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_severity CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT chk_category CHECK (category IN ('AUTHENTICATION', 'DATA_ACCESS', 'SYSTEM', 'BIOMETRIC', 'SECURITY', 'BUSINESS')),
    CONSTRAINT chk_environment CHECK (environment IN ('development', 'staging', 'production'))
);

-- ===================================================================
-- TABELA: audit_alerts
-- Alertas automáticos baseados em logs
-- ===================================================================
CREATE TABLE IF NOT EXISTS audit_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- FAILED_LOGIN, SUSPICIOUS_ACTIVITY, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Dados do trigger
    trigger_log_id INTEGER REFERENCES logs_auditoria(id),
    trigger_pattern VARCHAR(200), -- Padrão que disparou o alerta
    trigger_count INTEGER DEFAULT 1, -- Quantas ocorrências
    trigger_timeframe INTERVAL, -- Janela de tempo (ex: '5 minutes')
    
    -- Status do alerta
    status VARCHAR(20) DEFAULT 'active', -- active, acknowledged, resolved, false_positive
    acknowledged_by INTEGER REFERENCES usuarios(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES usuarios(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Dados contextuais
    affected_users TEXT[], -- Array de user_ids afetados
    affected_resources TEXT[], -- Array de recursos afetados
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    
    -- Notificações
    notifications_sent BOOLEAN DEFAULT false,
    notification_channels VARCHAR(200), -- email, sms, webhook
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_alert_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive'))
);

-- ===================================================================
-- TABELA: audit_sessions
-- Sessões de auditoria para compliance
-- ===================================================================
CREATE TABLE IF NOT EXISTS audit_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES usuarios(id),
    
    -- Dados da sessão
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Dados de acesso
    login_ip INET,
    login_user_agent TEXT,
    login_method VARCHAR(50), -- password, biometric, token
    logout_reason VARCHAR(50), -- manual, timeout, forced, error
    
    -- Estatísticas da sessão
    actions_count INTEGER DEFAULT 0,
    sensitive_actions_count INTEGER DEFAULT 0,
    failed_actions_count INTEGER DEFAULT 0,
    
    -- Dados de segurança
    suspicious_activity BOOLEAN DEFAULT false,
    security_events JSONB DEFAULT '[]',
    
    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- TABELA: audit_data_access
-- Log específico para acesso a dados pessoais (LGPD)
-- ===================================================================
CREATE TABLE IF NOT EXISTS audit_data_access (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES logs_auditoria(id),
    
    -- Dados do titular
    data_subject_type VARCHAR(50), -- colaborador, usuario, cliente
    data_subject_id INTEGER,
    data_subject_cpf VARCHAR(11),
    data_subject_name VARCHAR(100),
    
    -- Dados acessados
    data_types VARCHAR(500), -- personal, sensitive, biometric
    data_fields TEXT[], -- Array com campos específicos acessados
    data_purpose VARCHAR(200), -- Finalidade do acesso
    
    -- Base legal
    legal_basis VARCHAR(100), -- consent, contract, legal_obligation, etc.
    consent_id VARCHAR(100),
    consent_granted_at TIMESTAMP WITH TIME ZONE,
    
    -- Contexto do acesso
    access_reason VARCHAR(200),
    business_justification TEXT,
    
    -- Retenção
    retention_period INTERVAL,
    delete_after TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================================

-- Índices principais para logs_auditoria
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_timestamp ON logs_auditoria(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_action ON logs_auditoria(action);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_category ON logs_auditoria(category);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_id ON logs_auditoria(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_ip ON logs_auditoria(user_ip);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_severity ON logs_auditoria(severity);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_endpoint ON logs_auditoria(endpoint);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_session_id ON logs_auditoria(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_cpf ON logs_auditoria(data_subject_cpf);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_resource ON logs_auditoria(resource_type, resource_id);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_action_time ON logs_auditoria(user_id, action, timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_category_severity_time ON logs_auditoria(category, severity, timestamp);

-- Índice para busca full-text
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_searchable ON logs_auditoria USING gin(to_tsvector('portuguese', searchable_text));

-- Índices para audit_alerts
CREATE INDEX IF NOT EXISTS idx_audit_alerts_status ON audit_alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_alerts_severity ON audit_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_audit_alerts_created ON audit_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_alerts_type ON audit_alerts(alert_type);

-- Índices para audit_sessions
CREATE INDEX IF NOT EXISTS idx_audit_sessions_user_id ON audit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_start_time ON audit_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_active ON audit_sessions(active);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_session_id ON audit_sessions(session_id);

-- Índices para audit_data_access
CREATE INDEX IF NOT EXISTS idx_audit_data_access_cpf ON audit_data_access(data_subject_cpf);
CREATE INDEX IF NOT EXISTS idx_audit_data_access_type ON audit_data_access(data_subject_type, data_subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_data_access_created ON audit_data_access(created_at);

-- ===================================================================
-- FUNCTIONS E TRIGGERS
-- ===================================================================

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER tr_audit_alerts_updated 
    BEFORE UPDATE ON audit_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_audit_timestamp();

CREATE TRIGGER tr_audit_sessions_updated 
    BEFORE UPDATE ON audit_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_audit_timestamp();

-- Função para gerar searchable_text automaticamente
CREATE OR REPLACE FUNCTION generate_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.searchable_text = COALESCE(NEW.action, '') || ' ' || 
                         COALESCE(NEW.user_email, '') || ' ' || 
                         COALESCE(NEW.endpoint, '') || ' ' || 
                         COALESCE(NEW.additional_data::text, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para searchable_text
CREATE TRIGGER tr_logs_auditoria_searchable 
    BEFORE INSERT OR UPDATE ON logs_auditoria 
    FOR EACH ROW EXECUTE FUNCTION generate_searchable_text();

-- Função para detectar atividades suspeitas
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
    failed_logins_count INTEGER;
    recent_actions_count INTEGER;
BEGIN
    -- Detectar múltiplos logins falhados
    IF NEW.action = 'LOGIN_FAILED' THEN
        SELECT COUNT(*) INTO failed_logins_count
        FROM logs_auditoria 
        WHERE user_ip = NEW.user_ip 
          AND action = 'LOGIN_FAILED' 
          AND timestamp > NOW() - INTERVAL '15 minutes';
        
        IF failed_logins_count >= 5 THEN
            INSERT INTO audit_alerts (
                alert_type, severity, title, description, trigger_log_id, trigger_count
            ) VALUES (
                'MULTIPLE_FAILED_LOGINS', 'high',
                'Múltiplas tentativas de login falhadas',
                'Detectadas ' || failed_logins_count || ' tentativas de login falhadas do IP ' || NEW.user_ip,
                NEW.id, failed_logins_count
            );
        END IF;
    END IF;
    
    -- Detectar atividade anormal de alta frequência
    SELECT COUNT(*) INTO recent_actions_count
    FROM logs_auditoria 
    WHERE user_id = NEW.user_id 
      AND timestamp > NOW() - INTERVAL '1 minute';
    
    IF recent_actions_count > 50 THEN
        INSERT INTO audit_alerts (
            alert_type, severity, title, description, trigger_log_id, trigger_count
        ) VALUES (
            'HIGH_FREQUENCY_ACTIVITY', 'medium',
            'Atividade de alta frequência detectada',
            'Usuário ' || NEW.user_id || ' realizou ' || recent_actions_count || ' ações em 1 minuto',
            NEW.id, recent_actions_count
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para detecção automática
CREATE TRIGGER tr_logs_auditoria_suspicious 
    AFTER INSERT ON logs_auditoria 
    FOR EACH ROW EXECUTE FUNCTION detect_suspicious_activity();

-- ===================================================================
-- VIEWS PARA RELATÓRIOS
-- ===================================================================

-- View para dashboard de auditoria
CREATE OR REPLACE VIEW v_audit_dashboard AS
SELECT 
    DATE(timestamp) as date,
    category,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE severity = 'error') as error_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT user_ip) as unique_ips
FROM logs_auditoria 
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), category
ORDER BY date DESC, category;

-- View para ações sensíveis
CREATE OR REPLACE VIEW v_sensitive_actions AS
SELECT 
    l.*,
    u.nome as user_name,
    c.nome as colaborador_name
FROM logs_auditoria l
LEFT JOIN usuarios u ON l.user_id = u.id
LEFT JOIN colaboradores c ON l.data_subject_cpf = c.cpf
WHERE l.data_category IN ('sensitive', 'biometric')
   OR l.action IN ('FACE_RECOGNITION', 'BIOMETRIC_ACCESS', 'DATA_EXPORT')
ORDER BY l.timestamp DESC;

-- View para compliance LGPD
CREATE OR REPLACE VIEW v_lgpd_compliance AS
SELECT 
    data_subject_cpf,
    COUNT(*) as total_accesses,
    COUNT(DISTINCT DATE(timestamp)) as access_days,
    MIN(timestamp) as first_access,
    MAX(timestamp) as last_access,
    ARRAY_AGG(DISTINCT action) as actions_performed,
    ARRAY_AGG(DISTINCT legal_basis) as legal_bases
FROM logs_auditoria 
WHERE data_subject_cpf IS NOT NULL
GROUP BY data_subject_cpf
ORDER BY total_accesses DESC;

-- ===================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ===================================================================

COMMENT ON TABLE logs_auditoria IS 'Log principal de auditoria do sistema - LGPD compliant';
COMMENT ON TABLE audit_alerts IS 'Alertas automáticos baseados em padrões suspeitos';
COMMENT ON TABLE audit_sessions IS 'Sessões de usuário para auditoria de compliance';
COMMENT ON TABLE audit_data_access IS 'Log específico para acesso a dados pessoais';

COMMENT ON COLUMN logs_auditoria.data_subject_cpf IS 'CPF do titular dos dados (LGPD Art. 5º, I)';
COMMENT ON COLUMN logs_auditoria.legal_basis IS 'Base legal para tratamento (LGPD Art. 7º)';
COMMENT ON COLUMN logs_auditoria.retention_days IS 'Período de retenção em dias (padrão: 7 anos)';
COMMENT ON COLUMN logs_auditoria.searchable_text IS 'Texto indexável para busca full-text';

-- ===================================================================
-- DADOS INICIAIS
-- ===================================================================

-- Inserir configurações padrão se necessário
INSERT INTO logs_auditoria (
    action, category, severity, user_email, endpoint, 
    additional_data, source, searchable_text
) VALUES (
    'AUDIT_SYSTEM_INITIALIZED', 'SYSTEM', 'info', 'system@fgservices.com', '/system/init',
    '{"version": "1.0", "tables_created": true}', 'system',
    'Sistema de auditoria inicializado com sucesso'
) ON CONFLICT DO NOTHING;
