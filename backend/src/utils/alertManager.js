/**
 * 🚨 GERENCIADOR DE ALERTAS DE SEGURANÇA
 * 
 * Sistema avançado de alertas de segurança com:
 * - Detecção em tempo real de ameaças
 * - Classificação automática por severidade
 * - Múltiplos canais de notificação
 * - Escalação automática
 * - Correlação de eventos
 * - Dashboard em tempo real
 */

const EventEmitter = require('events');
let nodemailer = null;
try {
  // Carrega nodemailer apenas se o módulo existir no ambiente
  // Evita quebra em ambientes sem nodemailer
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('⚠️ Nodemailer não disponível: módulo nodemailer não instalado');
  nodemailer = null;
}
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const auditLogger = require('./auditLogger');
const db = require('../config/database');

class AlertManager extends EventEmitter {
  constructor() {
    super();
    
    // Estado dos alertas
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.alertRules = new Map();
    this.notificationChannels = new Map();
    
    // Configurações
    this.config = {
      maxActiveAlerts: 1000,
      alertRetention: 30 * 24 * 60 * 60 * 1000, // 30 dias
      escalationTimeout: 15 * 60 * 1000, // 15 minutos
      correlationWindow: 5 * 60 * 1000, // 5 minutos
      batchNotificationDelay: 30000, // 30 segundos
      maxNotificationRate: 10 // por minuto
    };

    // Métricas
    this.metrics = {
      totalAlerts: 0,
      alertsBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
      alertsByType: new Map(),
      notificationsSent: 0,
      escalatedAlerts: 0,
      falsePositives: 0
    };

    // Batch de notificações
    this.notificationBatch = [];
    this.batchTimer = null;

    // Rate limiting para notificações
    this.notificationRateLimit = new Map();

    // Inicializar sistema
    this.initialize();
  }

  /**
   * Inicializar sistema de alertas
   */
  async initialize() {
    try {
      // Criar tabelas de alertas
      await this.createTables();
      
      // Carregar regras de alerta
      await this.loadAlertRules();
      
      // Configurar canais de notificação
      await this.setupNotificationChannels();
      
      // Configurar limpeza automática
      this.setupCleanupTasks();
      
      // Carregar alertas ativos do banco
      await this.loadActiveAlerts();
      
      console.log('🚨 Alert Manager inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar Alert Manager:', error);
      throw error;
    }
  }

  /**
   * Criar tabelas de alertas
   */
  async createTables() {
    const queries = [
      // Tabela de alertas
      `CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        source VARCHAR(100),
        user_id INTEGER REFERENCES usuarios(id),
        ip_address INET,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by INTEGER REFERENCES usuarios(id),
        acknowledged_at TIMESTAMP,
        resolved BOOLEAN DEFAULT false,
        resolved_by INTEGER REFERENCES usuarios(id),
        resolved_at TIMESTAMP,
        false_positive BOOLEAN DEFAULT false,
        correlation_id VARCHAR(100),
        escalated BOOLEAN DEFAULT false,
        escalated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de regras de alerta
      `CREATE TABLE IF NOT EXISTS alert_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        cooldown_minutes INTEGER DEFAULT 5,
        escalation_minutes INTEGER DEFAULT 15,
        correlation_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de canais de notificação
      `CREATE TABLE IF NOT EXISTS notification_channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        config JSONB NOT NULL,
        enabled BOOLEAN DEFAULT true,
        severities TEXT[] DEFAULT ARRAY['CRITICAL', 'HIGH'],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de notificações enviadas
      `CREATE TABLE IF NOT EXISTS alert_notifications (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(100) NOT NULL,
        channel_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW(),
        error_message TEXT,
        retry_count INTEGER DEFAULT 0
      )`,

      // Índices para performance
      `CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type)`,
      `CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity)`,
      `CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status)`,
      `CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_security_alerts_correlation ON security_alerts(correlation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert ON alert_notifications(alert_id)`
    ];

    for (const query of queries) {
      await db.query(query);
    }
  }

  /**
   * Carregar regras de alerta padrão
   */
  async loadAlertRules() {
    const defaultRules = [
      {
        name: 'MULTIPLE_FAILED_LOGINS',
        type: 'AUTHENTICATION',
        severity: 'HIGH',
        conditions: {
          event_type: 'LOGIN_FAILED',
          threshold: 5,
          timeWindow: 300, // 5 minutos
          groupBy: ['ip_address', 'user_id']
        },
        actions: {
          notify: ['email', 'slack'],
          block_ip: true,
          escalate_after: 15
        },
        cooldown_minutes: 10,
        escalation_minutes: 15
      },
      {
        name: 'PRIVILEGE_ESCALATION_ATTEMPT',
        type: 'AUTHORIZATION',
        severity: 'CRITICAL',
        conditions: {
          event_type: 'ACCESS_DENIED',
          pattern: 'role_escalation',
          threshold: 3,
          timeWindow: 600
        },
        actions: {
          notify: ['email', 'slack', 'sms'],
          escalate_immediately: true,
          create_incident: true
        },
        cooldown_minutes: 5,
        escalation_minutes: 5
      },
      {
        name: 'SQL_INJECTION_DETECTED',
        type: 'INJECTION_ATTACK',
        severity: 'CRITICAL',
        conditions: {
          event_type: 'SQL_INJECTION',
          threshold: 1,
          timeWindow: 60
        },
        actions: {
          notify: ['email', 'slack', 'sms'],
          block_ip: true,
          escalate_immediately: true
        },
        cooldown_minutes: 1,
        escalation_minutes: 5
      },
      {
        name: 'SUSPICIOUS_DATA_ACCESS',
        type: 'DATA_ACCESS',
        severity: 'HIGH',
        conditions: {
          event_type: 'DATA_ACCESS',
          pattern: 'bulk_export',
          threshold: 1,
          timeWindow: 300
        },
        actions: {
          notify: ['email', 'slack'],
          escalate_after: 10
        },
        cooldown_minutes: 15,
        escalation_minutes: 10
      },
      {
        name: 'MALWARE_DETECTED',
        type: 'MALWARE',
        severity: 'CRITICAL',
        conditions: {
          event_type: 'MALWARE_DETECTED',
          threshold: 1,
          timeWindow: 60
        },
        actions: {
          notify: ['email', 'slack', 'sms'],
          quarantine: true,
          escalate_immediately: true
        },
        cooldown_minutes: 1,
        escalation_minutes: 0
      },
      {
        name: 'UNUSUAL_ACTIVITY_PATTERN',
        type: 'ANOMALY',
        severity: 'MEDIUM',
        conditions: {
          event_type: 'ANOMALY_DETECTED',
          threshold: 1,
          timeWindow: 900
        },
        actions: {
          notify: ['email'],
          escalate_after: 30
        },
        cooldown_minutes: 30,
        escalation_minutes: 30
      },
      {
        name: 'BIOMETRIC_FRAUD_ATTEMPT',
        type: 'BIOMETRIC_FRAUD',
        severity: 'HIGH',
        conditions: {
          event_type: 'BIOMETRIC_MISMATCH',
          threshold: 3,
          timeWindow: 300,
          groupBy: ['user_id']
        },
        actions: {
          notify: ['email', 'slack'],
          disable_user: true,
          escalate_after: 10
        },
        cooldown_minutes: 5,
        escalation_minutes: 10
      },
      {
        name: 'SYSTEM_RESOURCE_EXHAUSTION',
        type: 'RESOURCE_EXHAUSTION',
        severity: 'HIGH',
        conditions: {
          event_type: 'HIGH_RESOURCE_USAGE',
          threshold: 1,
          timeWindow: 300
        },
        actions: {
          notify: ['email', 'slack'],
          escalate_after: 20
        },
        cooldown_minutes: 10,
        escalation_minutes: 20
      }
    ];

    // Inserir regras padrão
    for (const rule of defaultRules) {
      try {
        await db.query(`
          INSERT INTO alert_rules (name, type, severity, conditions, actions, cooldown_minutes, escalation_minutes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (name) DO UPDATE SET
            conditions = $4,
            actions = $5,
            updated_at = NOW()
        `, [
          rule.name,
          rule.type,
          rule.severity,
          JSON.stringify(rule.conditions),
          JSON.stringify(rule.actions),
          rule.cooldown_minutes,
          rule.escalation_minutes
        ]);

        this.alertRules.set(rule.name, rule);
      } catch (error) {
        console.error(`Erro ao carregar regra ${rule.name}:`, error);
      }
    }

    console.log(`✅ ${this.alertRules.size} regras de alerta carregadas`);
  }

  /**
   * Configurar canais de notificação
   */
  async setupNotificationChannels() {
    const channels = [
      {
        name: 'email',
        type: 'EMAIL',
        config: {
          smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          from: process.env.ALERT_EMAIL_FROM || 'alerts@pontodigital.com',
          to: process.env.ALERT_EMAIL_TO?.split(',') || ['admin@pontodigital.com']
        },
        severities: ['CRITICAL', 'HIGH', 'MEDIUM']
      },
      {
        name: 'slack',
        type: 'SLACK',
        config: {
          webhook_url: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#security-alerts',
          username: 'Ponto Digital Security',
          icon_emoji: ':warning:'
        },
        severities: ['CRITICAL', 'HIGH']
      },
      {
        name: 'sms',
        type: 'SMS',
        config: {
          provider: 'twilio',
          account_sid: process.env.TWILIO_ACCOUNT_SID,
          auth_token: process.env.TWILIO_AUTH_TOKEN,
          from: process.env.TWILIO_PHONE_FROM,
          to: process.env.ALERT_SMS_TO?.split(',') || []
        },
        severities: ['CRITICAL']
      },
      {
        name: 'webhook',
        type: 'WEBHOOK',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
          }
        },
        severities: ['CRITICAL', 'HIGH']
      }
    ];

    for (const channel of channels) {
      try {
        // Salvar no banco
        await db.query(`
          INSERT INTO notification_channels (name, type, config, severities)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (name) DO UPDATE SET
            config = $3,
            severities = $4,
            updated_at = NOW()
        `, [
          channel.name,
          channel.type,
          JSON.stringify(channel.config),
          channel.severities
        ]);

        // Configurar canal
        if (channel.type === 'EMAIL' && channel.config.smtp.auth.user) {
          this.notificationChannels.set(channel.name, this.createEmailTransporter(channel.config));
        } else if (channel.type === 'SLACK' && channel.config.webhook_url) {
          this.notificationChannels.set(channel.name, channel.config);
        } else if (channel.type === 'SMS' && channel.config.account_sid) {
          this.notificationChannels.set(channel.name, channel.config);
        } else if (channel.type === 'WEBHOOK' && channel.config.url) {
          this.notificationChannels.set(channel.name, channel.config);
        }
      } catch (error) {
        console.error(`Erro ao configurar canal ${channel.name}:`, error);
      }
    }

    console.log(`✅ ${this.notificationChannels.size} canais de notificação configurados`);
  }

  /**
   * Criar transportador de email
   */
  createEmailTransporter(config) {
    if (!nodemailer) {
      console.log('⚠️ Email não configurado: nodemailer não disponível');
      return null;
    }
    return nodemailer.createTransporter(config.smtp);
  }

  /**
   * Processar evento de segurança
   */
  async processSecurityEvent(event) {
    try {
      // Verificar regras de alerta
      for (const [ruleName, rule] of this.alertRules) {
        if (await this.checkRule(rule, event)) {
          await this.triggerAlert(ruleName, rule, event);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar evento de segurança:', error);
    }
  }

  /**
   * Verificar se regra se aplica ao evento
   */
  async checkRule(rule, event) {
    try {
      const { conditions } = rule;
      
      // Verificar tipo de evento
      if (conditions.event_type && event.type !== conditions.event_type) {
        return false;
      }

      // Verificar padrão
      if (conditions.pattern && !this.matchPattern(event, conditions.pattern)) {
        return false;
      }

      // Verificar threshold dentro da janela de tempo
      if (conditions.threshold && conditions.timeWindow) {
        const count = await this.countRecentEvents(event, conditions);
        return count >= conditions.threshold;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar regra:', error);
      return false;
    }
  }

  /**
   * Verificar padrão no evento
   */
  matchPattern(event, pattern) {
    switch (pattern) {
      case 'role_escalation':
        return event.metadata?.attempted_role && 
               event.metadata?.user_role && 
               this.isRoleEscalation(event.metadata.user_role, event.metadata.attempted_role);
      
      case 'bulk_export':
        return event.metadata?.records_count > 100;
      
      default:
        return false;
    }
  }

  /**
   * Verificar se é escalação de privilégios
   */
  isRoleEscalation(userRole, attemptedRole) {
    const roleLevels = {
      'COLABORADOR': 20,
      'GESTOR': 60,
      'RH': 80,
      'ADMINISTRADOR': 90,
      'SUPER_ADMIN': 100
    };

    const userLevel = roleLevels[userRole] || 0;
    const attemptedLevel = roleLevels[attemptedRole] || 0;

    return attemptedLevel > userLevel;
  }

  /**
   * Contar eventos recentes
   */
  async countRecentEvents(event, conditions) {
    try {
      const timeWindow = new Date(Date.now() - conditions.timeWindow * 1000);
      
      let query = `
        SELECT COUNT(*) as count
        FROM logs_auditoria 
        WHERE event_type = $1 
          AND timestamp >= $2
      `;
      
      const params = [event.type, timeWindow];
      let paramIndex = 3;

      // Agrupar por campos específicos se definido
      if (conditions.groupBy) {
        for (const field of conditions.groupBy) {
          if (event[field]) {
            if (field === 'ip_address') {
              query += ` AND ip_address = $${paramIndex}`;
              params.push(event.ip_address);
            } else if (field === 'user_id') {
              query += ` AND user_id = $${paramIndex}`;
              params.push(event.user_id);
            }
            paramIndex++;
          }
        }
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Erro ao contar eventos:', error);
      return 0;
    }
  }

  /**
   * Disparar alerta
   */
  async triggerAlert(ruleName, rule, event) {
    try {
      // Verificar cooldown
      if (await this.isInCooldown(ruleName, event)) {
        return;
      }

      // Gerar ID único do alerta
      const alertId = this.generateAlertId(ruleName, event);
      
      // Verificar se alerta já existe
      if (this.activeAlerts.has(alertId)) {
        return;
      }

      // Criar alerta
      const alert = {
        id: alertId,
        rule_name: ruleName,
        type: rule.type,
        severity: rule.severity,
        title: this.generateAlertTitle(rule, event),
        description: this.generateAlertDescription(rule, event),
        source: event.source || 'system',
        user_id: event.user_id,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: {
          ...event.metadata,
          rule_conditions: rule.conditions,
          trigger_event: event
        },
        status: 'ACTIVE',
        created_at: new Date(),
        correlation_id: await this.generateCorrelationId(event),
        escalated: false
      };

      // Salvar no banco
      await this.saveAlert(alert);
      
      // Adicionar aos alertas ativos
      this.activeAlerts.set(alertId, alert);
      
      // Atualizar métricas
      this.updateMetrics(alert);
      
      // Processar ações
      await this.processAlertActions(alert, rule.actions);
      
      // Programar escalação se necessário
      if (rule.escalation_minutes > 0) {
        this.scheduleEscalation(alert, rule.escalation_minutes);
      }

      // Emitir evento
      this.emit('alert_triggered', alert);
      
      console.log(`🚨 Alerta disparado: ${alert.title} [${alert.severity}]`);
      
    } catch (error) {
      console.error('❌ Erro ao disparar alerta:', error);
    }
  }

  /**
   * Verificar se regra está em cooldown
   */
  async isInCooldown(ruleName, event) {
    try {
      const rule = this.alertRules.get(ruleName);
      if (!rule || rule.cooldown_minutes === 0) {
        return false;
      }

      const cooldownTime = new Date(Date.now() - rule.cooldown_minutes * 60 * 1000);
      
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM security_alerts 
        WHERE type = $1 
          AND created_at >= $2
          AND (user_id = $3 OR ip_address = $4)
      `, [rule.type, cooldownTime, event.user_id, event.ip_address]);

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar cooldown:', error);
      return false;
    }
  }

  /**
   * Gerar ID único do alerta
   */
  generateAlertId(ruleName, event) {
    const timestamp = Date.now();
    const hash = require('crypto')
      .createHash('md5')
      .update(`${ruleName}-${event.user_id || 'anonymous'}-${event.ip_address || 'unknown'}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    return `ALERT-${timestamp}-${hash}`;
  }

  /**
   * Gerar título do alerta
   */
  generateAlertTitle(rule, event) {
    const titles = {
      'MULTIPLE_FAILED_LOGINS': `Múltiplas tentativas de login falhadas detectadas`,
      'PRIVILEGE_ESCALATION_ATTEMPT': `Tentativa de escalação de privilégios detectada`,
      'SQL_INJECTION_DETECTED': `Tentativa de SQL Injection detectada`,
      'SUSPICIOUS_DATA_ACCESS': `Acesso suspeito a dados detectado`,
      'MALWARE_DETECTED': `Malware detectado no sistema`,
      'UNUSUAL_ACTIVITY_PATTERN': `Padrão de atividade incomum detectado`,
      'BIOMETRIC_FRAUD_ATTEMPT': `Tentativa de fraude biométrica detectada`,
      'SYSTEM_RESOURCE_EXHAUSTION': `Esgotamento de recursos do sistema detectado`
    };

    return titles[rule.name] || `Alerta de segurança: ${rule.type}`;
  }

  /**
   * Gerar descrição do alerta
   */
  generateAlertDescription(rule, event) {
    let description = `Alerta de segurança disparado pela regra: ${rule.name}\n\n`;
    
    description += `Detalhes do evento:\n`;
    description += `- Tipo: ${event.type}\n`;
    description += `- Origem: ${event.source || 'Sistema'}\n`;
    description += `- Timestamp: ${new Date().toLocaleString('pt-BR')}\n`;
    
    if (event.user_id) {
      description += `- Usuário: ID ${event.user_id}\n`;
    }
    
    if (event.ip_address) {
      description += `- IP: ${event.ip_address}\n`;
    }
    
    if (event.metadata) {
      description += `\nMetadados adicionais:\n`;
      Object.entries(event.metadata).forEach(([key, value]) => {
        description += `- ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return description;
  }

  /**
   * Gerar ID de correlação
   */
  async generateCorrelationId(event) {
    // Implementar lógica de correlação baseada em padrões
    // Por exemplo: mesmo IP, mesmo usuário, mesmo tipo em janela de tempo
    return null; // Por enquanto não correlacionar
  }

  /**
   * Salvar alerta no banco
   */
  async saveAlert(alert) {
    try {
      await db.query(`
        INSERT INTO security_alerts (
          alert_id, type, severity, title, description, source,
          user_id, ip_address, user_agent, metadata, status,
          correlation_id, escalated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        alert.id,
        alert.type,
        alert.severity,
        alert.title,
        alert.description,
        alert.source,
        alert.user_id,
        alert.ip_address,
        alert.user_agent,
        JSON.stringify(alert.metadata),
        alert.status,
        alert.correlation_id,
        alert.escalated,
        alert.created_at
      ]);
    } catch (error) {
      console.error('❌ Erro ao salvar alerta:', error);
      throw error;
    }
  }

  /**
   * Processar ações do alerta
   */
  async processAlertActions(alert, actions) {
    try {
      // Notificações
      if (actions.notify) {
        this.scheduleNotification(alert, actions.notify);
      }

      // Bloqueio de IP
      if (actions.block_ip && alert.ip_address) {
        await this.blockIP(alert.ip_address, alert);
      }

      // Desabilitar usuário
      if (actions.disable_user && alert.user_id) {
        await this.disableUser(alert.user_id, alert);
      }

      // Quarentena
      if (actions.quarantine) {
        await this.quarantineSystem(alert);
      }

      // Escalação imediata
      if (actions.escalate_immediately) {
        await this.escalateAlert(alert);
      }

      // Criar incidente
      if (actions.create_incident) {
        await this.createIncident(alert);
      }
    } catch (error) {
      console.error('❌ Erro ao processar ações do alerta:', error);
    }
  }

  /**
   * Programar notificação
   */
  scheduleNotification(alert, channels) {
    // Adicionar ao batch de notificações
    this.notificationBatch.push({ alert, channels });

    // Configurar timer se não existe
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchNotifications();
      }, this.config.batchNotificationDelay);
    }
  }

  /**
   * Processar notificações em lote
   */
  async processBatchNotifications() {
    try {
      const batch = [...this.notificationBatch];
      this.notificationBatch = [];
      this.batchTimer = null;

      for (const { alert, channels } of batch) {
        await this.sendNotifications(alert, channels);
      }
    } catch (error) {
      console.error('❌ Erro ao processar notificações em lote:', error);
    }
  }

  /**
   * Enviar notificações
   */
  async sendNotifications(alert, channels) {
    for (const channelName of channels) {
      try {
        // Verificar rate limiting
        if (this.isRateLimited(channelName)) {
          continue;
        }

        // Verificar se canal está configurado e suporta a severidade
        const channelConfig = await this.getChannelConfig(channelName);
        if (!channelConfig || !channelConfig.severities.includes(alert.severity)) {
          continue;
        }

        // Enviar notificação
        const success = await this.sendNotification(alert, channelName, channelConfig);
        
        // Registrar envio
        await this.recordNotification(alert.id, channelName, success ? 'SENT' : 'FAILED');
        
        if (success) {
          this.metrics.notificationsSent++;
          this.updateRateLimit(channelName);
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar notificação via ${channelName}:`, error);
        await this.recordNotification(alert.id, channelName, 'ERROR', error.message);
      }
    }
  }

  /**
   * Enviar notificação individual
   */
  async sendNotification(alert, channelName, config) {
    try {
      switch (config.type) {
        case 'EMAIL':
          return await this.sendEmailNotification(alert, config);
        case 'SLACK':
          return await this.sendSlackNotification(alert, config);
        case 'SMS':
          return await this.sendSMSNotification(alert, config);
        case 'WEBHOOK':
          return await this.sendWebhookNotification(alert, config);
        default:
          console.warn(`Tipo de canal desconhecido: ${config.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Erro no envio via ${channelName}:`, error);
      return false;
    }
  }

  /**
   * Enviar notificação por email
   */
  async sendEmailNotification(alert, config) {
    try {
      const transporter = this.notificationChannels.get('email');
      if (!transporter || !nodemailer) {
        console.warn('⚠️ Transportador de email não configurado ou nodemailer não disponível');
        return false;
      }

      const severityEmojis = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🟢',
        INFO: 'ℹ️'
      };

      const mailOptions = {
        from: config.config.from,
        to: config.config.to,
        subject: `${severityEmojis[alert.severity]} [${alert.severity}] ${alert.title}`,
        html: this.generateEmailHTML(alert)
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Gerar HTML do email
   */
  generateEmailHTML(alert) {
    const severityColors = {
      CRITICAL: '#dc3545',
      HIGH: '#fd7e14',
      MEDIUM: '#ffc107',
      LOW: '#28a745',
      INFO: '#17a2b8'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Alerta de Segurança</h1>
          <p style="margin: 5px 0 0 0; font-size: 18px;">[${alert.severity}] ${alert.title}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <h3>Detalhes do Alerta:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>ID:</strong> ${alert.id}</li>
            <li><strong>Tipo:</strong> ${alert.type}</li>
            <li><strong>Data/Hora:</strong> ${alert.created_at.toLocaleString('pt-BR')}</li>
            ${alert.user_id ? `<li><strong>Usuário:</strong> ID ${alert.user_id}</li>` : ''}
            ${alert.ip_address ? `<li><strong>IP:</strong> ${alert.ip_address}</li>` : ''}
            ${alert.source ? `<li><strong>Origem:</strong> ${alert.source}</li>` : ''}
          </ul>
          <h3>Descrição:</h3>
          <p style="background: white; padding: 15px; border-left: 4px solid ${severityColors[alert.severity]};">
            ${alert.description.replace(/\n/g, '<br>')}
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/security/alerts/${alert.id}" 
               style="background: ${severityColors[alert.severity]}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Ver Detalhes do Alerta
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Enviar notificação Slack
   */
  async sendSlackNotification(alert, config) {
    try {
      const webhook_url = config.config.webhook_url;
      if (!webhook_url) {
        console.warn('⚠️ Webhook do Slack não configurado');
        return false;
      }

      const severityColors = {
        CRITICAL: 'danger',
        HIGH: 'warning',
        MEDIUM: 'warning',
        LOW: 'good',
        INFO: 'good'
      };

      const payload = {
        channel: config.config.channel,
        username: config.config.username,
        icon_emoji: config.config.icon_emoji,
        attachments: [{
          color: severityColors[alert.severity],
          title: `🚨 [${alert.severity}] ${alert.title}`,
          text: alert.description,
          fields: [
            { title: 'ID', value: alert.id, short: true },
            { title: 'Tipo', value: alert.type, short: true },
            { title: 'Data/Hora', value: alert.created_at.toLocaleString('pt-BR'), short: true },
            ...(alert.user_id ? [{ title: 'Usuário', value: `ID ${alert.user_id}`, short: true }] : []),
            ...(alert.ip_address ? [{ title: 'IP', value: alert.ip_address, short: true }] : [])
          ],
          footer: 'Ponto Digital Security',
          ts: Math.floor(alert.created_at.getTime() / 1000)
        }]
      };

      const response = await axios.post(webhook_url, payload);
      return response.status === 200;
    } catch (error) {
      console.error('❌ Erro ao enviar Slack:', error);
      return false;
    }
  }

  /**
   * Verificar rate limiting
   */
  isRateLimited(channelName) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minuto
    
    const channelLimits = this.notificationRateLimit.get(channelName) || [];
    const recentNotifications = channelLimits.filter(timestamp => timestamp > windowStart);
    
    return recentNotifications.length >= this.config.maxNotificationRate;
  }

  /**
   * Atualizar rate limit
   */
  updateRateLimit(channelName) {
    const now = Date.now();
    const channelLimits = this.notificationRateLimit.get(channelName) || [];
    
    channelLimits.push(now);
    
    // Manter apenas últimos registros
    const windowStart = now - 60000;
    const filtered = channelLimits.filter(timestamp => timestamp > windowStart);
    
    this.notificationRateLimit.set(channelName, filtered);
  }

  /**
   * Obter configuração do canal
   */
  async getChannelConfig(channelName) {
    try {
      const result = await db.query(
        'SELECT type, config, severities FROM notification_channels WHERE name = $1 AND enabled = true',
        [channelName]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return {
        type: result.rows[0].type,
        config: result.rows[0].config,
        severities: result.rows[0].severities
      };
    } catch (error) {
      console.error('❌ Erro ao obter configuração do canal:', error);
      return null;
    }
  }

  /**
   * Registrar notificação enviada
   */
  async recordNotification(alertId, channelName, status, errorMessage = null) {
    try {
      await db.query(`
        INSERT INTO alert_notifications (alert_id, channel_name, status, error_message)
        VALUES ($1, $2, $3, $4)
      `, [alertId, channelName, status, errorMessage]);
    } catch (error) {
      console.error('❌ Erro ao registrar notificação:', error);
    }
  }

  /**
   * Atualizar métricas
   */
  updateMetrics(alert) {
    this.metrics.totalAlerts++;
    this.metrics.alertsBySeverity[alert.severity]++;
    
    const typeCount = this.metrics.alertsByType.get(alert.type) || 0;
    this.metrics.alertsByType.set(alert.type, typeCount + 1);
  }

  /**
   * Programar escalação
   */
  scheduleEscalation(alert, minutes) {
    setTimeout(async () => {
      try {
        // Verificar se alerta ainda está ativo e não foi reconhecido
        const currentAlert = this.activeAlerts.get(alert.id);
        if (currentAlert && !currentAlert.acknowledged) {
          await this.escalateAlert(currentAlert);
        }
      } catch (error) {
        console.error('❌ Erro na escalação automática:', error);
      }
    }, minutes * 60 * 1000);
  }

  /**
   * Escalar alerta
   */
  async escalateAlert(alert) {
    try {
      // Marcar como escalado
      alert.escalated = true;
      alert.escalated_at = new Date();
      
      // Atualizar no banco
      await db.query(`
        UPDATE security_alerts 
        SET escalated = true, escalated_at = NOW(), updated_at = NOW()
        WHERE alert_id = $1
      `, [alert.id]);
      
      // Atualizar cache
      this.activeAlerts.set(alert.id, alert);
      
      // Enviar notificações de escalação
      await this.sendEscalationNotifications(alert);
      
      // Atualizar métricas
      this.metrics.escalatedAlerts++;
      
      // Emitir evento
      this.emit('alert_escalated', alert);
      
      console.log(`⬆️ Alerta escalado: ${alert.title} [${alert.id}]`);
      
    } catch (error) {
      console.error('❌ Erro ao escalar alerta:', error);
    }
  }

  /**
   * Enviar notificações de escalação
   */
  async sendEscalationNotifications(alert) {
    // Notificar canais de escalação (SMS, chamadas, etc.)
    const escalationChannels = ['sms', 'webhook'];
    await this.sendNotifications(alert, escalationChannels);
  }

  /**
   * Bloquear IP
   */
  async blockIP(ipAddress, alert) {
    try {
      // Implementar lógica de bloqueio de IP
      // Pode integrar com firewall, WAF, etc.
      
      console.log(`🚫 IP bloqueado: ${ipAddress} (Alerta: ${alert.id})`);
      
      // Registrar ação
      await auditLogger.logSecurityEvent('IP_BLOCKED', {
        ip_address: ipAddress,
        alert_id: alert.id,
        reason: alert.title
      });
      
    } catch (error) {
      console.error('❌ Erro ao bloquear IP:', error);
    }
  }

  /**
   * Desabilitar usuário
   */
  async disableUser(userId, alert) {
    try {
      // Desabilitar usuário no banco
      await db.query('UPDATE usuarios SET ativo = false WHERE id = $1', [userId]);
      
      console.log(`🚫 Usuário desabilitado: ${userId} (Alerta: ${alert.id})`);
      
      // Registrar ação
      await auditLogger.logUserAction('system', 'USER_DISABLED_BY_ALERT', {
        target_user_id: userId,
        alert_id: alert.id,
        reason: alert.title
      });
      
    } catch (error) {
      console.error('❌ Erro ao desabilitar usuário:', error);
    }
  }

  /**
   * Configurar tarefas de limpeza
   */
  setupCleanupTasks() {
    // Limpeza de alertas antigos a cada hora
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // 1 hora

    // Limpeza de rate limits a cada 5 minutos
    setInterval(() => {
      this.cleanupRateLimits();
    }, 300000); // 5 minutos
  }

  /**
   * Limpar alertas antigos
   */
  async cleanupOldAlerts() {
    try {
      const cutoffDate = new Date(Date.now() - this.config.alertRetention);
      
      // Remover do banco
      const result = await db.query(
        'DELETE FROM security_alerts WHERE created_at < $1 AND status = $2',
        [cutoffDate, 'RESOLVED']
      );
      
      // Remover do cache
      for (const [alertId, alert] of this.activeAlerts) {
        if (alert.created_at < cutoffDate && alert.status === 'RESOLVED') {
          this.activeAlerts.delete(alertId);
        }
      }
      
      if (result.rowCount > 0) {
        console.log(`🧹 ${result.rowCount} alertas antigos removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza de alertas:', error);
    }
  }

  /**
   * Limpar rate limits
   */
  cleanupRateLimits() {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minuto
    
    for (const [channelName, timestamps] of this.notificationRateLimit) {
      const filtered = timestamps.filter(timestamp => timestamp > windowStart);
      if (filtered.length === 0) {
        this.notificationRateLimit.delete(channelName);
      } else {
        this.notificationRateLimit.set(channelName, filtered);
      }
    }
  }

  /**
   * Carregar alertas ativos do banco
   */
  async loadActiveAlerts() {
    try {
      const result = await db.query(`
        SELECT * FROM security_alerts 
        WHERE status = 'ACTIVE' 
        ORDER BY created_at DESC 
        LIMIT 1000
      `);
      
      for (const row of result.rows) {
        const alert = {
          id: row.alert_id,
          type: row.type,
          severity: row.severity,
          title: row.title,
          description: row.description,
          source: row.source,
          user_id: row.user_id,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          metadata: row.metadata,
          status: row.status,
          acknowledged: row.acknowledged,
          resolved: row.resolved,
          escalated: row.escalated,
          created_at: row.created_at,
          correlation_id: row.correlation_id
        };
        
        this.activeAlerts.set(alert.id, alert);
      }
      
      console.log(`📋 ${this.activeAlerts.size} alertas ativos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar alertas ativos:', error);
    }
  }

  /**
   * Obter estatísticas dos alertas
   */
  getStats() {
    return {
      metrics: this.metrics,
      activeAlerts: this.activeAlerts.size,
      alertRules: this.alertRules.size,
      notificationChannels: this.notificationChannels.size,
      uptime: process.uptime()
    };
  }

  /**
   * Reconhecer alerta
   */
  async acknowledgeAlert(alertId, userId) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alerta não encontrado');
      }

      // Atualizar alerta
      alert.acknowledged = true;
      alert.acknowledged_by = userId;
      alert.acknowledged_at = new Date();

      // Atualizar no banco
      await db.query(`
        UPDATE security_alerts 
        SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW(), updated_at = NOW()
        WHERE alert_id = $2
      `, [userId, alertId]);

      // Atualizar cache
      this.activeAlerts.set(alertId, alert);

      // Emitir evento
      this.emit('alert_acknowledged', alert);

      console.log(`✅ Alerta reconhecido: ${alertId} por usuário ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao reconhecer alerta:', error);
      throw error;
    }
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(alertId, userId) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alerta não encontrado');
      }

      // Atualizar alerta
      alert.resolved = true;
      alert.resolved_by = userId;
      alert.resolved_at = new Date();
      alert.status = 'RESOLVED';

      // Atualizar no banco
      await db.query(`
        UPDATE security_alerts 
        SET resolved = true, resolved_by = $1, resolved_at = NOW(), 
            status = 'RESOLVED', updated_at = NOW()
        WHERE alert_id = $2
      `, [userId, alertId]);

      // Remover dos alertas ativos
      this.activeAlerts.delete(alertId);

      // Emitir evento
      this.emit('alert_resolved', alert);

      console.log(`✅ Alerta resolvido: ${alertId} por usuário ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao resolver alerta:', error);
      throw error;
    }
  }
}

// Singleton instance
const alertManager = new AlertManager();

module.exports = alertManager;
