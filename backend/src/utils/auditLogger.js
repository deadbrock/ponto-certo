const db = require('../config/database');
const crypto = require('crypto');

// Função para gerar UUID v4 sem dependência externa
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 📋 AUDIT LOGGER - SISTEMA COMPLETO DE AUDITORIA
 * 
 * Logger especializado para compliance LGPD e auditoria de segurança
 * Integra com tabela logs_auditoria do banco de dados
 */

class AuditLogger {
  constructor() {
    this.defaultRetentionDays = 2555; // 7 anos (LGPD)
    this.batchSize = 100;
    this.batchBuffer = [];
    this.flushInterval = 5000; // 5 segundos
    
    // Iniciar flush automático
    this.startBatchProcessor();
  }

  /**
   * Log principal de auditoria
   */
  async log(auditData) {
    try {
      const logEntry = this.prepareLogEntry(auditData);
      
      // Adicionar ao buffer para processamento em lote
      this.batchBuffer.push(logEntry);
      
      // Flush imediato para ações críticas
      if (logEntry.severity === 'critical' || logEntry.category === 'SECURITY') {
        await this.flushBatch();
      }
      
      console.log(`📋 AUDIT: ${logEntry.action} - User: ${logEntry.user_id} - ${logEntry.severity.toUpperCase()}`);
      
    } catch (error) {
      console.error('❌ AUDIT ERROR: Falha ao registrar log de auditoria:', error);
      // Fallback para arquivo local em caso de falha no banco
      this.fallbackToFile(auditData, error);
    }
  }

  /**
   * Preparar entrada de log padronizada
   */
  prepareLogEntry(data) {
    const requestId = uuidv4();
    const timestamp = new Date();
    
    return {
      // IDs únicos
      request_id: requestId,
      timestamp: timestamp,
      
      // Ação e categoria
      action: data.action || 'UNKNOWN_ACTION',
      category: data.category || this.categorizeAction(data.action),
      severity: data.severity || this.determineSeverity(data),
      
      // Dados do usuário
      user_id: data.userId || data.user_id || null,
      user_email: data.userEmail || data.user_email || null,
      user_profile: data.userProfile || data.user_profile || null,
      user_ip: data.ip || data.user_ip || null,
      user_agent: data.userAgent || data.user_agent || null,
      
      // Dados da requisição
      method: data.method || null,
      endpoint: data.url || data.endpoint || null,
      session_id: data.sessionId || data.session_id || null,
      
      // Dados da resposta
      status_code: data.statusCode || data.status_code || null,
      response_time_ms: data.responseTime || data.response_time_ms || null,
      success: data.success !== undefined ? data.success : (data.statusCode < 400),
      
      // Dados do recurso
      resource_type: data.resourceType || data.resource_type || this.extractResourceType(data.url),
      resource_id: data.resourceId || data.resource_id || null,
      old_values: data.oldValues || data.old_values || null,
      new_values: data.newValues || data.new_values || null,
      additional_data: data.additionalData || data.additional_data || data,
      
      // Contexto
      source: data.source || 'backend',
      environment: process.env.NODE_ENV || 'production',
      
      // LGPD
      data_subject_cpf: data.dataSubjectCpf || data.data_subject_cpf || null,
      legal_basis: data.legalBasis || data.legal_basis || this.determineLegalBasis(data.action),
      consent_id: data.consentId || data.consent_id || null,
      data_category: data.dataCategory || data.data_category || this.categorizeDataType(data),
      
      // Metadados
      tags: data.tags || this.generateTags(data),
      retention_days: data.retentionDays || this.defaultRetentionDays
    };
  }

  /**
   * Categorizar ação automaticamente
   */
  categorizeAction(action) {
    if (!action) return 'SYSTEM';
    
    const actionUpper = action.toUpperCase();
    
    if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH')) {
      return 'AUTHENTICATION';
    }
    
    if (actionUpper.includes('FACE') || actionUpper.includes('BIOMETRIC')) {
      return 'BIOMETRIC';
    }
    
    if (actionUpper.includes('SECURITY') || actionUpper.includes('SUSPICIOUS')) {
      return 'SECURITY';
    }
    
    if (actionUpper.includes('DATA') || actionUpper.includes('CREATE') || 
        actionUpper.includes('UPDATE') || actionUpper.includes('DELETE')) {
      return 'DATA_ACCESS';
    }
    
    return 'BUSINESS';
  }

  /**
   * Determinar severidade automaticamente
   */
  determineSeverity(data) {
    // Crítico
    if (data.action?.includes('EMERGENCY') || 
        data.action?.includes('ADMIN_CREATION') ||
        data.statusCode >= 500) {
      return 'critical';
    }
    
    // Erro
    if (data.statusCode >= 400 || 
        data.action?.includes('FAILED') ||
        data.success === false) {
      return 'error';
    }
    
    // Warning
    if (data.action?.includes('SUSPICIOUS') ||
        data.action?.includes('DENIED') ||
        data.statusCode >= 300) {
      return 'warning';
    }
    
    return 'info';
  }

  /**
   * Extrair tipo de recurso da URL
   */
  extractResourceType(url) {
    if (!url) return null;
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('/usuarios')) return 'usuario';
    if (urlLower.includes('/colaboradores')) return 'colaborador';
    if (urlLower.includes('/contratos')) return 'contrato';
    if (urlLower.includes('/face')) return 'biometric_data';
    if (urlLower.includes('/ponto')) return 'registro_ponto';
    if (urlLower.includes('/relatorios')) return 'relatorio';
    if (urlLower.includes('/configuracoes')) return 'configuracao';
    
    return 'unknown';
  }

  /**
   * Determinar base legal LGPD
   */
  determineLegalBasis(action) {
    if (!action) return null;
    
    const actionUpper = action.toUpperCase();
    
    if (actionUpper.includes('BIOMETRIC') || actionUpper.includes('FACE')) {
      return 'consent'; // Dados biométricos requerem consentimento
    }
    
    if (actionUpper.includes('POINT') || actionUpper.includes('PONTO')) {
      return 'contract'; // Registro de ponto é execução de contrato
    }
    
    if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH')) {
      return 'legitimate_interest'; // Autenticação é interesse legítimo
    }
    
    return 'contract'; // Padrão: execução de contrato
  }

  /**
   * Categorizar tipo de dados
   */
  categorizeDataType(data) {
    if (data.action?.includes('BIOMETRIC') || data.action?.includes('FACE')) {
      return 'biometric';
    }
    
    if (data.dataSubjectCpf || data.data_subject_cpf) {
      return 'personal';
    }
    
    return 'operational';
  }

  /**
   * Gerar tags para indexação
   */
  generateTags(data) {
    const tags = [];
    
    if (data.action) tags.push(data.action.toLowerCase());
    if (data.userProfile) tags.push(`profile:${data.userProfile.toLowerCase()}`);
    if (data.method) tags.push(`method:${data.method.toLowerCase()}`);
    if (data.statusCode) tags.push(`status:${Math.floor(data.statusCode / 100)}xx`);
    
    return tags.join(',');
  }

  /**
   * Processar lote de logs
   */
  async flushBatch() {
    if (this.batchBuffer.length === 0) return;
    
    const batch = this.batchBuffer.splice(0, this.batchSize);
    
    try {
      await this.insertBatch(batch);
      console.log(`📋 AUDIT BATCH: ${batch.length} logs processados`);
    } catch (error) {
      console.error('❌ AUDIT BATCH ERROR:', error);
      // Recolocar no buffer para retry
      this.batchBuffer.unshift(...batch);
    }
  }

  /**
   * Inserir lote no banco de dados
   */
  async insertBatch(batch) {
    if (batch.length === 0) return;
    
    const values = [];
    const placeholders = [];
    
    batch.forEach((log, index) => {
      const baseIndex = index * 29; // 29 campos por log
      
      placeholders.push(`(${Array.from({length: 29}, (_, i) => `$${baseIndex + i + 1}`).join(', ')})`);
      
      values.push(
        log.timestamp, log.action, log.category, log.severity,
        log.user_id, log.user_email, log.user_profile, log.user_ip, log.user_agent,
        log.method, log.endpoint, log.request_id, log.session_id,
        log.status_code, log.response_time_ms, log.success,
        log.resource_type, log.resource_id, 
        log.old_values ? JSON.stringify(log.old_values) : null,
        log.new_values ? JSON.stringify(log.new_values) : null,
        log.additional_data ? JSON.stringify(log.additional_data) : null,
        log.source, log.environment,
        log.data_subject_cpf, log.legal_basis, log.consent_id, log.data_category,
        log.tags, log.retention_days
      );
    });
    
    const query = `
      INSERT INTO logs_auditoria (
        timestamp, action, category, severity,
        user_id, user_email, user_profile, user_ip, user_agent,
        method, endpoint, request_id, session_id,
        status_code, response_time_ms, success,
        resource_type, resource_id, old_values, new_values, additional_data,
        source, environment,
        data_subject_cpf, legal_basis, consent_id, data_category,
        tags, retention_days
      ) VALUES ${placeholders.join(', ')}
    `;
    
    await db.query(query, values);
  }

  /**
   * Iniciar processador de lote
   */
  startBatchProcessor() {
    setInterval(() => {
      this.flushBatch().catch(console.error);
    }, this.flushInterval);
  }

  /**
   * Fallback para arquivo em caso de falha no banco
   */
  fallbackToFile(data, error) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const fallbackFile = path.join(logDir, 'audit_fallback.log');
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: error.message,
        originalData: data
      };
      
      fs.appendFileSync(fallbackFile, JSON.stringify(logEntry) + '\n');
    } catch (fallbackError) {
      console.error('❌ AUDIT FALLBACK ERROR:', fallbackError);
    }
  }

  /**
   * Métodos de conveniência para diferentes tipos de log
   */
  async authentication(action, userId, data = {}) {
    return this.log({
      action,
      category: 'AUTHENTICATION',
      userId,
      ...data
    });
  }

  async biometric(action, userId, data = {}) {
    return this.log({
      action,
      category: 'BIOMETRIC',
      dataCategory: 'biometric',
      legalBasis: 'consent',
      userId,
      ...data
    });
  }

  async security(action, data = {}) {
    return this.log({
      action,
      category: 'SECURITY',
      severity: 'warning',
      ...data
    });
  }

  async dataAccess(action, userId, resourceType, resourceId, data = {}) {
    return this.log({
      action,
      category: 'DATA_ACCESS',
      userId,
      resourceType,
      resourceId,
      ...data
    });
  }

  /**
   * Cleanup de logs antigos
   */
  async cleanupOldLogs() {
    try {
      const result = await db.query(`
        DELETE FROM logs_auditoria 
        WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days
        AND archived = false
      `);
      
      console.log(`🧹 AUDIT CLEANUP: ${result.rowCount} logs antigos removidos`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ AUDIT CLEANUP ERROR:', error);
      throw error;
    }
  }

  /**
   * Estatísticas de auditoria
   */
  async getStats(days = 30) {
    try {
      const result = await db.query(`
        SELECT 
          category,
          severity,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM logs_auditoria 
        WHERE timestamp > NOW() - INTERVAL '${days} days'
        GROUP BY category, severity
        ORDER BY count DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ AUDIT STATS ERROR:', error);
      throw error;
    }
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

module.exports = auditLogger;
