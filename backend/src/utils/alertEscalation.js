/**
 * ⬆️ SISTEMA DE ESCALAÇÃO AUTOMÁTICA DE ALERTAS
 * 
 * Sistema inteligente de escalação de alertas com:
 * - Escalação baseada em tempo e severidade
 * - Múltiplos níveis de escalação
 * - Notificações diferenciadas por nível
 * - Integração com sistemas externos
 * - Análise de padrões para otimização
 */

const EventEmitter = require('events');
const alertManager = require('./alertManager');
const auditLogger = require('./auditLogger');
const db = require('../config/database');

class AlertEscalationManager extends EventEmitter {
  constructor() {
    super();
    
    // Configuração de escalação
    this.escalationLevels = new Map([
      ['LEVEL_1', {
        name: 'Analista de Segurança',
        timeout: 15 * 60 * 1000, // 15 minutos
        channels: ['email', 'slack'],
        contacts: ['security-analyst@pontodigital.com'],
        severities: ['CRITICAL', 'HIGH', 'MEDIUM'],
        businessHours: true
      }],
      ['LEVEL_2', {
        name: 'CISO',
        timeout: 30 * 60 * 1000, // 30 minutos
        channels: ['email', 'sms', 'slack'],
        contacts: ['ciso@pontodigital.com', '+5511999990001'],
        severities: ['CRITICAL', 'HIGH'],
        businessHours: false // 24x7
      }],
      ['LEVEL_3', {
        name: 'Diretor de TI',
        timeout: 60 * 60 * 1000, // 1 hora
        channels: ['email', 'sms', 'phone'],
        contacts: ['cto@pontodigital.com', '+5511999990002'],
        severities: ['CRITICAL'],
        businessHours: false
      }],
      ['LEVEL_4', {
        name: 'CEO',
        timeout: 120 * 60 * 1000, // 2 horas
        channels: ['email', 'sms', 'phone'],
        contacts: ['ceo@pontodigital.com', '+5511999990000'],
        severities: ['CRITICAL'],
        businessHours: false
      }]
    ]);

    // Escalações ativas
    this.activeEscalations = new Map();
    
    // Configurações
    this.config = {
      enableAutoEscalation: true,
      maxEscalationLevel: 4,
      escalationCooldown: 5 * 60 * 1000, // 5 minutos
      businessHoursStart: 8, // 8h
      businessHoursEnd: 18, // 18h
      weekendEscalation: true
    };

    // Métricas
    this.metrics = {
      totalEscalations: 0,
      escalationsByLevel: new Map(),
      avgEscalationTime: 0,
      escalationTimes: []
    };

    // Inicializar
    this.initialize();
  }

  /**
   * Inicializar sistema de escalação
   */
  async initialize() {
    try {
      // Carregar escalações ativas do banco
      await this.loadActiveEscalations();
      
      // Configurar listeners de eventos
      this.setupEventListeners();
      
      // Configurar limpeza automática
      this.setupCleanupTasks();
      
      console.log('⬆️ Sistema de escalação inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar escalação:', error);
      throw error;
    }
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Escutar novos alertas
    alertManager.on('alert_triggered', (alert) => {
      if (this.shouldEscalate(alert)) {
        this.startEscalation(alert);
      }
    });

    // Escutar alertas reconhecidos
    alertManager.on('alert_acknowledged', (alert) => {
      this.stopEscalation(alert.id);
    });

    // Escutar alertas resolvidos
    alertManager.on('alert_resolved', (alert) => {
      this.stopEscalation(alert.id);
    });
  }

  /**
   * Verificar se alerta deve ser escalado
   */
  shouldEscalate(alert) {
    // Verificar se escalação está habilitada
    if (!this.config.enableAutoEscalation) {
      return false;
    }

    // Verificar severidade
    const criticalSeverities = ['CRITICAL', 'HIGH'];
    if (!criticalSeverities.includes(alert.severity)) {
      return false;
    }

    // Verificar se já está em escalação
    if (this.activeEscalations.has(alert.id)) {
      return false;
    }

    return true;
  }

  /**
   * Iniciar escalação
   */
  async startEscalation(alert) {
    try {
      const escalation = {
        alertId: alert.id,
        alert,
        currentLevel: 0,
        startTime: Date.now(),
        timers: [],
        notificationsSent: [],
        status: 'ACTIVE'
      };

      // Salvar escalação
      this.activeEscalations.set(alert.id, escalation);
      
      // Iniciar primeiro nível
      await this.escalateToLevel(escalation, 1);
      
      console.log(`⬆️ Escalação iniciada para alerta: ${alert.id}`);
      
      // Emitir evento
      this.emit('escalation_started', escalation);
      
    } catch (error) {
      console.error('❌ Erro ao iniciar escalação:', error);
    }
  }

  /**
   * Escalar para nível específico
   */
  async escalateToLevel(escalation, level) {
    try {
      const levelKey = `LEVEL_${level}`;
      const levelConfig = this.escalationLevels.get(levelKey);
      
      if (!levelConfig) {
        console.warn(`⚠️ Nível de escalação ${level} não configurado`);
        return;
      }

      // Verificar se severidade é apropriada para este nível
      if (!levelConfig.severities.includes(escalation.alert.severity)) {
        console.log(`📋 Pulando nível ${level} - severidade não aplicável`);
        await this.scheduleNextLevel(escalation, level + 1);
        return;
      }

      // Verificar horário comercial se necessário
      if (levelConfig.businessHours && !this.isBusinessHours()) {
        console.log(`📋 Pulando nível ${level} - fora do horário comercial`);
        await this.scheduleNextLevel(escalation, level + 1);
        return;
      }

      // Atualizar escalação
      escalation.currentLevel = level;
      escalation.lastEscalation = Date.now();

      // Enviar notificações para este nível
      await this.sendEscalationNotifications(escalation, levelConfig);
      
      // Programar próximo nível se houver
      if (level < this.config.maxEscalationLevel) {
        await this.scheduleNextLevel(escalation, level + 1);
      }

      // Atualizar métricas
      this.updateEscalationMetrics(level);
      
      // Registrar escalação
      await this.recordEscalation(escalation, level, levelConfig);
      
      console.log(`⬆️ Alerta ${escalation.alertId} escalado para nível ${level} (${levelConfig.name})`);
      
      // Emitir evento
      this.emit('escalation_level_reached', { escalation, level, levelConfig });
      
    } catch (error) {
      console.error(`❌ Erro ao escalar para nível ${level}:`, error);
    }
  }

  /**
   * Programar próximo nível de escalação
   */
  async scheduleNextLevel(escalation, nextLevel) {
    const levelKey = `LEVEL_${nextLevel}`;
    const levelConfig = this.escalationLevels.get(levelKey);
    
    if (!levelConfig) {
      return;
    }

    // Calcular timeout baseado no nível atual
    const currentLevelKey = `LEVEL_${escalation.currentLevel}`;
    const currentConfig = this.escalationLevels.get(currentLevelKey);
    const timeout = currentConfig ? currentConfig.timeout : 15 * 60 * 1000;

    // Programar escalação
    const timer = setTimeout(async () => {
      // Verificar se escalação ainda está ativa
      const activeEscalation = this.activeEscalations.get(escalation.alertId);
      if (activeEscalation && activeEscalation.status === 'ACTIVE') {
        await this.escalateToLevel(activeEscalation, nextLevel);
      }
    }, timeout);

    // Adicionar timer à escalação
    escalation.timers.push(timer);
  }

  /**
   * Enviar notificações de escalação
   */
  async sendEscalationNotifications(escalation, levelConfig) {
    try {
      const { alert } = escalation;
      
      // Preparar mensagem de escalação
      const escalationAlert = {
        ...alert,
        title: `[ESCALADO - ${levelConfig.name}] ${alert.title}`,
        description: `${alert.description}\n\n⬆️ ESCALAÇÃO:\nNível: ${escalation.currentLevel}\nResponsável: ${levelConfig.name}\nTempo decorrido: ${this.formatDuration(Date.now() - escalation.startTime)}`,
        escalation_level: escalation.currentLevel,
        escalation_target: levelConfig.name
      };

      // Enviar notificações pelos canais configurados
      for (const channel of levelConfig.channels) {
        try {
          await alertManager.sendNotification(escalationAlert, channel, await alertManager.getChannelConfig(channel));
          
          escalation.notificationsSent.push({
            level: escalation.currentLevel,
            channel,
            timestamp: Date.now(),
            status: 'SENT'
          });
        } catch (error) {
          console.error(`❌ Erro ao enviar notificação de escalação via ${channel}:`, error);
          
          escalation.notificationsSent.push({
            level: escalation.currentLevel,
            channel,
            timestamp: Date.now(),
            status: 'FAILED',
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificações de escalação:', error);
    }
  }

  /**
   * Parar escalação
   */
  stopEscalation(alertId) {
    try {
      const escalation = this.activeEscalations.get(alertId);
      if (!escalation) {
        return;
      }

      // Limpar timers
      escalation.timers.forEach(timer => clearTimeout(timer));
      
      // Atualizar status
      escalation.status = 'STOPPED';
      escalation.stopTime = Date.now();
      
      // Calcular tempo total de escalação
      const totalTime = escalation.stopTime - escalation.startTime;
      this.metrics.escalationTimes.push(totalTime);
      
      // Manter apenas últimos 100 tempos
      if (this.metrics.escalationTimes.length > 100) {
        this.metrics.escalationTimes.shift();
      }
      
      // Recalcular média
      this.metrics.avgEscalationTime = this.metrics.escalationTimes.reduce((a, b) => a + b, 0) / this.metrics.escalationTimes.length;
      
      // Remover das escalações ativas
      this.activeEscalations.delete(alertId);
      
      console.log(`⏹️ Escalação parada para alerta: ${alertId} (${this.formatDuration(totalTime)})`);
      
      // Emitir evento
      this.emit('escalation_stopped', escalation);
      
    } catch (error) {
      console.error('❌ Erro ao parar escalação:', error);
    }
  }

  /**
   * Verificar se está em horário comercial
   */
  isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    
    // Verificar se é fim de semana
    if ((day === 0 || day === 6) && !this.config.weekendEscalation) {
      return false;
    }
    
    // Verificar horário
    return hour >= this.config.businessHoursStart && hour < this.config.businessHoursEnd;
  }

  /**
   * Formatar duração
   */
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Atualizar métricas de escalação
   */
  updateEscalationMetrics(level) {
    this.metrics.totalEscalations++;
    
    const levelCount = this.metrics.escalationsByLevel.get(level) || 0;
    this.metrics.escalationsByLevel.set(level, levelCount + 1);
  }

  /**
   * Registrar escalação no banco
   */
  async recordEscalation(escalation, level, levelConfig) {
    try {
      await db.query(`
        INSERT INTO alert_escalations (
          alert_id, escalation_level, target_role, 
          escalated_at, timeout_minutes, channels_used
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        escalation.alertId,
        level,
        levelConfig.name,
        new Date(),
        levelConfig.timeout / 60000,
        JSON.stringify(levelConfig.channels)
      ]);
    } catch (error) {
      // Criar tabela se não existir
      if (error.code === '42P01') {
        await this.createEscalationTable();
        await this.recordEscalation(escalation, level, levelConfig);
      } else {
        console.error('❌ Erro ao registrar escalação:', error);
      }
    }
  }

  /**
   * Criar tabela de escalações
   */
  async createEscalationTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_escalations (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(100) NOT NULL,
        escalation_level INTEGER NOT NULL,
        target_role VARCHAR(100) NOT NULL,
        escalated_at TIMESTAMP DEFAULT NOW(),
        acknowledged_at TIMESTAMP,
        timeout_minutes INTEGER,
        channels_used JSONB,
        response_received BOOLEAN DEFAULT false,
        response_time_minutes INTEGER
      )
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_escalations_alert 
      ON alert_escalations(alert_id)
    `);
  }

  /**
   * Carregar escalações ativas
   */
  async loadActiveEscalations() {
    try {
      // Buscar alertas ativos com escalações pendentes
      const activeAlerts = await db.query(`
        SELECT sa.*, ae.escalation_level, ae.escalated_at
        FROM security_alerts sa
        LEFT JOIN alert_escalations ae ON sa.alert_id = ae.alert_id
        WHERE sa.status = 'ACTIVE' 
          AND sa.escalated = true
          AND sa.acknowledged = false
        ORDER BY sa.created_at DESC
      `);

      for (const alert of activeAlerts.rows) {
        // Reconstruir escalação
        const escalation = {
          alertId: alert.alert_id,
          alert: alert,
          currentLevel: alert.escalation_level || 1,
          startTime: new Date(alert.escalated_at || alert.created_at).getTime(),
          timers: [],
          notificationsSent: [],
          status: 'ACTIVE'
        };

        this.activeEscalations.set(alert.alert_id, escalation);
        
        // Continuar escalação se necessário
        if (escalation.currentLevel < this.config.maxEscalationLevel) {
          await this.scheduleNextLevel(escalation, escalation.currentLevel + 1);
        }
      }

      console.log(`📋 ${this.activeEscalations.size} escalações ativas carregadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar escalações:', error);
    }
  }

  /**
   * Configurar tarefas de limpeza
   */
  setupCleanupTasks() {
    // Limpar escalações antigas a cada hora
    setInterval(() => {
      this.cleanupOldEscalations();
    }, 3600000); // 1 hora

    // Verificar escalações órfãs a cada 30 minutos
    setInterval(() => {
      this.checkOrphanedEscalations();
    }, 1800000); // 30 minutos
  }

  /**
   * Limpar escalações antigas
   */
  cleanupOldEscalations() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    
    for (const [alertId, escalation] of this.activeEscalations) {
      if (escalation.startTime < cutoff) {
        this.stopEscalation(alertId);
      }
    }
  }

  /**
   * Verificar escalações órfãs
   */
  async checkOrphanedEscalations() {
    try {
      // Buscar alertas que não existem mais mas têm escalação ativa
      for (const [alertId, escalation] of this.activeEscalations) {
        const alertExists = alertManager.activeAlerts.has(alertId);
        if (!alertExists) {
          console.log(`🧹 Removendo escalação órfã: ${alertId}`);
          this.stopEscalation(alertId);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar escalações órfãs:', error);
    }
  }

  /**
   * Obter estatísticas de escalação
   */
  getEscalationStats() {
    return {
      activeEscalations: this.activeEscalations.size,
      totalEscalations: this.metrics.totalEscalations,
      escalationsByLevel: Object.fromEntries(this.metrics.escalationsByLevel),
      avgEscalationTime: Math.round(this.metrics.avgEscalationTime / 60000), // em minutos
      config: {
        enabled: this.config.enableAutoEscalation,
        maxLevel: this.config.maxEscalationLevel,
        businessHours: this.isBusinessHours()
      }
    };
  }

  /**
   * Configurar nível de escalação
   */
  async configureEscalationLevel(level, config) {
    try {
      const levelKey = `LEVEL_${level}`;
      this.escalationLevels.set(levelKey, config);
      
      // Salvar configuração (implementar se necessário)
      console.log(`⚙️ Nível de escalação ${level} configurado: ${config.name}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao configurar nível de escalação:', error);
      return false;
    }
  }

  /**
   * Obter escalações ativas
   */
  getActiveEscalations() {
    return Array.from(this.activeEscalations.values()).map(escalation => ({
      alertId: escalation.alertId,
      alertTitle: escalation.alert.title,
      alertSeverity: escalation.alert.severity,
      currentLevel: escalation.currentLevel,
      startTime: escalation.startTime,
      duration: Date.now() - escalation.startTime,
      notificationsSent: escalation.notificationsSent.length
    }));
  }

  /**
   * Forçar escalação manual
   */
  async forceEscalation(alertId, targetLevel, userId) {
    try {
      const alert = alertManager.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alerta não encontrado');
      }

      // Parar escalação automática se existir
      this.stopEscalation(alertId);
      
      // Criar nova escalação manual
      const escalation = {
        alertId,
        alert,
        currentLevel: 0,
        startTime: Date.now(),
        timers: [],
        notificationsSent: [],
        status: 'MANUAL',
        forcedBy: userId
      };

      this.activeEscalations.set(alertId, escalation);
      
      // Escalar diretamente para o nível solicitado
      await this.escalateToLevel(escalation, targetLevel);
      
      // Auditar escalação manual
      await auditLogger.logUserAction(userId, 'MANUAL_ESCALATION', {
        alert_id: alertId,
        target_level: targetLevel
      });
      
      console.log(`⬆️ Escalação manual para nível ${targetLevel}: ${alertId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro na escalação manual:', error);
      throw error;
    }
  }
}

// Singleton instance
const alertEscalationManager = new AlertEscalationManager();

module.exports = alertEscalationManager;
