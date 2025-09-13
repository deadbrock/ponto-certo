/**
 * 🔗 MIDDLEWARE DE INTEGRAÇÃO DE ALERTAS
 * 
 * Middleware que integra todos os sistemas de monitoramento e alertas:
 * - Coleta eventos de diferentes fontes
 * - Processa e correlaciona eventos
 * - Dispara alertas apropriados
 * - Integra com escalação automática
 */

const alertManager = require('../../utils/alertManager');
const alertEscalationManager = require('../../utils/alertEscalation');
const securityMonitor = require('../../utils/securityMonitor');
const performanceMonitor = require('../../utils/performanceMonitor');
const rbacManager = require('../../utils/rbacManager');
const auditLogger = require('../../utils/auditLogger');

class AlertIntegrationMiddleware {
  constructor() {
    this.eventQueue = [];
    this.processingQueue = false;
    this.correlationWindow = 5 * 60 * 1000; // 5 minutos
    
    // Configurar listeners
    this.setupEventListeners();
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Eventos de segurança
    securityMonitor.on('threat_detected', (event) => {
      this.queueSecurityEvent('THREAT_DETECTED', event);
    });

    securityMonitor.on('ip_blocked', (event) => {
      this.queueSecurityEvent('IP_BLOCKED', event);
    });

    // Eventos de performance
    performanceMonitor.on('performanceAlert', (event) => {
      this.queuePerformanceEvent('PERFORMANCE_ALERT', event);
    });

    // Eventos de RBAC
    rbacManager.on('permission_denied', (event) => {
      this.queueRBACEvent('PERMISSION_DENIED', event);
    });

    // Processar fila a cada segundo
    setInterval(() => {
      this.processEventQueue();
    }, 1000);
  }

  /**
   * Middleware principal
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Interceptar resposta para análise
      const originalSend = res.send;
      res.send = (data) => {
        const responseTime = Date.now() - startTime;
        
        // Analisar resposta para eventos de segurança
        this.analyzeResponse(req, res, responseTime, data);
        
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Analisar resposta para eventos de segurança
   */
  analyzeResponse(req, res, responseTime, data) {
    try {
      // Detectar tentativas de autenticação falhadas
      if (req.path.includes('/auth/') && res.statusCode === 401) {
        this.queueAuthEvent('LOGIN_FAILED', {
          user_id: req.body?.email || req.body?.login,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date()
        });
      }

      // Detectar tentativas de acesso negado
      if (res.statusCode === 403) {
        this.queueAuthEvent('ACCESS_DENIED', {
          user_id: req.user?.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          timestamp: new Date()
        });
      }

      // Detectar requests anômalos
      if (responseTime > 5000) { // 5 segundos
        this.queuePerformanceEvent('SLOW_REQUEST', {
          user_id: req.user?.id,
          ip_address: req.ip,
          endpoint: req.path,
          method: req.method,
          response_time: responseTime,
          timestamp: new Date()
        });
      }

      // Detectar possíveis ataques de injeção
      if (res.statusCode === 500 && this.containsSQLKeywords(req)) {
        this.queueSecurityEvent('POSSIBLE_SQL_INJECTION', {
          user_id: req.user?.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          query: req.query,
          body: this.sanitizeBody(req.body),
          timestamp: new Date()
        });
      }

      // Detectar tentativas de upload malicioso
      if (req.path.includes('/upload') && res.statusCode === 400) {
        this.queueSecurityEvent('MALICIOUS_UPLOAD_ATTEMPT', {
          user_id: req.user?.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          file_info: req.file || req.files,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Erro ao analisar resposta:', error);
    }
  }

  /**
   * Verificar se contém palavras-chave SQL
   */
  containsSQLKeywords(req) {
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION',
      'OR 1=1', 'AND 1=1', '--', '/*', '*/', 'xp_', 'sp_'
    ];

    const searchText = JSON.stringify({
      query: req.query,
      body: req.body,
      params: req.params
    }).toUpperCase();

    return sqlKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Sanitizar corpo da requisição para logs
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remover campos sensíveis
    const sensitiveFields = ['password', 'senha', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Adicionar evento de segurança à fila
   */
  queueSecurityEvent(type, event) {
    this.eventQueue.push({
      category: 'SECURITY',
      type,
      event,
      timestamp: Date.now()
    });
  }

  /**
   * Adicionar evento de autenticação à fila
   */
  queueAuthEvent(type, event) {
    this.eventQueue.push({
      category: 'AUTHENTICATION',
      type,
      event,
      timestamp: Date.now()
    });
  }

  /**
   * Adicionar evento de performance à fila
   */
  queuePerformanceEvent(type, event) {
    this.eventQueue.push({
      category: 'PERFORMANCE',
      type,
      event,
      timestamp: Date.now()
    });
  }

  /**
   * Adicionar evento de RBAC à fila
   */
  queueRBACEvent(type, event) {
    this.eventQueue.push({
      category: 'RBAC',
      type,
      event,
      timestamp: Date.now()
    });
  }

  /**
   * Processar fila de eventos
   */
  async processEventQueue() {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      // Processar eventos em lotes
      const batchSize = 10;
      const batch = this.eventQueue.splice(0, batchSize);

      for (const queuedEvent of batch) {
        await this.processEvent(queuedEvent);
      }
    } catch (error) {
      console.error('❌ Erro ao processar fila de eventos:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Processar evento individual
   */
  async processEvent(queuedEvent) {
    try {
      const { category, type, event } = queuedEvent;
      
      // Enriquecer evento com contexto
      const enrichedEvent = {
        ...event,
        type,
        category,
        source: 'alert_integration_middleware',
        processed_at: new Date()
      };

      // Correlacionar com eventos recentes
      const correlatedEvents = await this.correlateEvent(enrichedEvent);
      if (correlatedEvents.length > 0) {
        enrichedEvent.correlation_id = this.generateCorrelationId(correlatedEvents);
        enrichedEvent.correlated_events = correlatedEvents;
      }

      // Enviar para o alert manager
      await alertManager.processSecurityEvent(enrichedEvent);
      
      // Log do evento processado
      await auditLogger.logSecurityEvent('EVENT_PROCESSED', {
        event_type: type,
        category,
        correlation_id: enrichedEvent.correlation_id,
        correlated_count: correlatedEvents.length
      });

    } catch (error) {
      console.error('❌ Erro ao processar evento:', error);
    }
  }

  /**
   * Correlacionar evento com eventos recentes
   */
  async correlateEvent(event) {
    try {
      const correlatedEvents = [];
      const windowStart = Date.now() - this.correlationWindow;

      // Buscar eventos similares na janela de correlação
      for (const queuedEvent of this.eventQueue) {
        if (queuedEvent.timestamp > windowStart) {
          // Verificar critérios de correlação
          if (this.shouldCorrelate(event, queuedEvent.event)) {
            correlatedEvents.push(queuedEvent);
          }
        }
      }

      return correlatedEvents;
    } catch (error) {
      console.error('❌ Erro ao correlacionar evento:', error);
      return [];
    }
  }

  /**
   * Verificar se eventos devem ser correlacionados
   */
  shouldCorrelate(event1, event2) {
    // Mesmo IP
    if (event1.ip_address && event2.ip_address && event1.ip_address === event2.ip_address) {
      return true;
    }

    // Mesmo usuário
    if (event1.user_id && event2.user_id && event1.user_id === event2.user_id) {
      return true;
    }

    // Mesmo tipo de evento
    if (event1.type === event2.type) {
      return true;
    }

    // Padrões específicos
    if (event1.category === 'AUTHENTICATION' && event2.category === 'AUTHENTICATION') {
      return true;
    }

    return false;
  }

  /**
   * Gerar ID de correlação
   */
  generateCorrelationId(events) {
    const hash = require('crypto')
      .createHash('md5')
      .update(`${Date.now()}-${events.length}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
    
    return `CORR-${hash}`;
  }

  /**
   * Middleware de detecção de anomalias
   */
  anomalyDetectionMiddleware() {
    return (req, res, next) => {
      // Detectar padrões anômalos na requisição
      const anomalies = this.detectAnomalies(req);
      
      if (anomalies.length > 0) {
        this.queueSecurityEvent('ANOMALY_DETECTED', {
          user_id: req.user?.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          anomalies,
          timestamp: new Date()
        });
      }

      next();
    };
  }

  /**
   * Detectar anomalias na requisição
   */
  detectAnomalies(req) {
    const anomalies = [];

    // User-Agent suspeito
    const userAgent = req.get('User-Agent') || '';
    const suspiciousUAs = ['sqlmap', 'nikto', 'nmap', 'burp', 'owasp'];
    if (suspiciousUAs.some(ua => userAgent.toLowerCase().includes(ua))) {
      anomalies.push({
        type: 'SUSPICIOUS_USER_AGENT',
        value: userAgent,
        severity: 'HIGH'
      });
    }

    // Headers suspeitos
    const suspiciousHeaders = ['X-Forwarded-For', 'X-Real-IP', 'X-Originating-IP'];
    suspiciousHeaders.forEach(header => {
      if (req.get(header) && !req.get(header).match(/^[\d.]+$/)) {
        anomalies.push({
          type: 'SUSPICIOUS_HEADER',
          header,
          value: req.get(header),
          severity: 'MEDIUM'
        });
      }
    });

    // Tamanho de payload suspeito
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB
      anomalies.push({
        type: 'LARGE_PAYLOAD',
        size: contentLength,
        severity: 'MEDIUM'
      });
    }

    // Múltiplos parâmetros iguais (possível ataque)
    if (req.query) {
      const queryKeys = Object.keys(req.query);
      const duplicateKeys = queryKeys.filter((key, index) => queryKeys.indexOf(key) !== index);
      if (duplicateKeys.length > 0) {
        anomalies.push({
          type: 'DUPLICATE_PARAMETERS',
          keys: duplicateKeys,
          severity: 'LOW'
        });
      }
    }

    return anomalies;
  }

  /**
   * Middleware de detecção de ataques automatizados
   */
  botDetectionMiddleware() {
    return (req, res, next) => {
      const botIndicators = this.detectBotIndicators(req);
      
      if (botIndicators.score > 70) {
        this.queueSecurityEvent('BOT_DETECTED', {
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          bot_score: botIndicators.score,
          indicators: botIndicators.indicators,
          timestamp: new Date()
        });

        // Bloquear se score muito alto
        if (botIndicators.score > 90) {
          return res.status(429).json({
            success: false,
            error: 'Atividade automatizada detectada',
            code: 'BOT_DETECTED'
          });
        }
      }

      next();
    };
  }

  /**
   * Detectar indicadores de bot
   */
  detectBotIndicators(req) {
    let score = 0;
    const indicators = [];

    const userAgent = req.get('User-Agent') || '';
    
    // User-Agent ausente ou muito simples
    if (!userAgent || userAgent.length < 10) {
      score += 30;
      indicators.push('MISSING_OR_SIMPLE_UA');
    }

    // User-Agent de ferramentas conhecidas
    const botUAs = ['curl', 'wget', 'python', 'java', 'go-http', 'postman'];
    if (botUAs.some(ua => userAgent.toLowerCase().includes(ua))) {
      score += 40;
      indicators.push('TOOL_USER_AGENT');
    }

    // Headers ausentes que browsers normalmente enviam
    const expectedHeaders = ['Accept', 'Accept-Language', 'Accept-Encoding'];
    const missingHeaders = expectedHeaders.filter(header => !req.get(header));
    if (missingHeaders.length > 1) {
      score += 20;
      indicators.push('MISSING_BROWSER_HEADERS');
    }

    // Ordem de headers suspeita
    const headerOrder = Object.keys(req.headers);
    if (headerOrder[0] === 'user-agent') { // Muitos bots colocam UA primeiro
      score += 10;
      indicators.push('SUSPICIOUS_HEADER_ORDER');
    }

    // Velocidade de requisições muito alta
    const recentRequests = this.getRecentRequestCount(req.ip);
    if (recentRequests > 100) { // 100 requests por minuto
      score += 30;
      indicators.push('HIGH_REQUEST_RATE');
    }

    return { score, indicators };
  }

  /**
   * Obter contagem de requisições recentes por IP
   */
  getRecentRequestCount(ip) {
    // Implementar contagem de requisições (placeholder)
    return 0;
  }

  /**
   * Middleware de detecção de ataques de força bruta
   */
  bruteForceDetectionMiddleware() {
    const attempts = new Map();

    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = (data) => {
        // Detectar tentativas de força bruta
        if (req.path.includes('/auth/') && res.statusCode === 401) {
          const key = `${req.ip}-${req.body?.email || 'unknown'}`;
          const now = Date.now();
          
          if (!attempts.has(key)) {
            attempts.set(key, []);
          }
          
          const userAttempts = attempts.get(key);
          userAttempts.push(now);
          
          // Manter apenas últimos 15 minutos
          const filtered = userAttempts.filter(time => now - time < 15 * 60 * 1000);
          attempts.set(key, filtered);
          
          // Verificar se é força bruta
          if (filtered.length >= 5) {
            this.queueSecurityEvent('BRUTE_FORCE_DETECTED', {
              ip_address: req.ip,
              target_user: req.body?.email,
              attempts_count: filtered.length,
              time_window: '15 minutes',
              timestamp: new Date()
            });
          }
        }
        
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Middleware de detecção de data exfiltration
   */
  dataExfiltrationDetectionMiddleware() {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = (data) => {
        // Detectar possível exfiltração de dados
        if (res.statusCode === 200 && data) {
          try {
            const responseSize = Buffer.byteLength(JSON.stringify(data));
            
            // Resposta muito grande pode indicar exfiltração
            if (responseSize > 1024 * 1024) { // 1MB
              this.queueSecurityEvent('LARGE_DATA_EXPORT', {
                user_id: req.user?.id,
                ip_address: req.ip,
                endpoint: req.path,
                response_size: responseSize,
                timestamp: new Date()
              });
            }

            // Detectar exportação de dados pessoais
            const dataStr = JSON.stringify(data).toLowerCase();
            const personalDataKeywords = ['cpf', 'email', 'telefone', 'endereco'];
            const foundKeywords = personalDataKeywords.filter(keyword => 
              dataStr.includes(keyword)
            );

            if (foundKeywords.length > 2 && responseSize > 50000) { // 50KB
              this.queueSecurityEvent('PERSONAL_DATA_EXPORT', {
                user_id: req.user?.id,
                ip_address: req.ip,
                endpoint: req.path,
                data_types: foundKeywords,
                response_size: responseSize,
                timestamp: new Date()
              });
            }
          } catch (error) {
            // Ignorar erros de parsing
          }
        }
        
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Processar fila de eventos
   */
  async processEventQueue() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToProcess = this.eventQueue.splice(0, 50); // Processar até 50 por vez

    for (const queuedEvent of eventsToProcess) {
      try {
        // Processar através do alert manager
        await alertManager.processSecurityEvent({
          type: queuedEvent.type,
          category: queuedEvent.category,
          source: 'integration_middleware',
          ...queuedEvent.event
        });
      } catch (error) {
        console.error('❌ Erro ao processar evento da fila:', error);
      }
    }
  }

  /**
   * Obter estatísticas do middleware
   */
  getStats() {
    return {
      queueSize: this.eventQueue.length,
      processingQueue: this.processingQueue,
      correlationWindow: this.correlationWindow,
      uptime: process.uptime()
    };
  }

  /**
   * Limpar fila de eventos
   */
  clearEventQueue() {
    const cleared = this.eventQueue.length;
    this.eventQueue = [];
    console.log(`🧹 Fila de eventos limpa: ${cleared} eventos removidos`);
    return cleared;
  }
}

// Singleton instance
const alertIntegrationMiddleware = new AlertIntegrationMiddleware();

module.exports = alertIntegrationMiddleware;
