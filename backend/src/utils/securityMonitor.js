/**
 * 🛡️ MONITOR DE SEGURANÇA EM TEMPO REAL
 * 
 * Sistema avançado de monitoramento de segurança que detecta
 * e responde a ameaças em tempo real
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    
    this.threats = new Map();
    this.blockedIPs = new Set();
    this.suspiciousActivities = [];
    this.securityMetrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      attackAttempts: 0,
      lastReset: new Date()
    };
    
    // Configurações de detecção
    this.config = {
      maxRequestsPerMinute: 60,
      maxFailedLogins: 5,
      blockDuration: 15 * 60 * 1000, // 15 minutos
      suspiciousPatterns: [
        /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/gi,
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /\.\.\//g,
        /etc\/passwd/gi,
        /cmd\.exe/gi,
        /system\(/gi,
        /exec\(/gi
      ],
      criticalEndpoints: [
        '/api/usuarios',
        '/api/backup',
        '/api/auth/criar-admin-emergencia',
        '/api/relatorios'
      ]
    };
    
    // Inicializar monitoramento
    this.startMonitoring();
  }

  /**
   * Inicializar sistema de monitoramento
   */
  startMonitoring() {
    console.log('🛡️ SECURITY MONITOR: Sistema iniciado');
    
    // Limpar IPs bloqueados periodicamente
    setInterval(() => {
      this.cleanupBlockedIPs();
    }, 60000); // A cada minuto
    
    // Reset de métricas diárias
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000); // A cada 24 horas
    
    // Relatório de status a cada hora
    setInterval(() => {
      this.generateStatusReport();
    }, 60 * 60 * 1000); // A cada hora
  }

  /**
   * Middleware de monitoramento de segurança
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const clientIP = this.getClientIP(req);
      
      // Incrementar contador de requests
      this.securityMetrics.totalRequests++;
      
      // Verificar se IP está bloqueado
      if (this.isIPBlocked(clientIP)) {
        this.securityMetrics.blockedRequests++;
        this.logSecurityEvent('IP_BLOCKED', {
          ip: clientIP,
          endpoint: req.path,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          error: 'Acesso bloqueado por motivos de segurança',
          code: 'IP_BLOCKED'
        });
      }
      
      // Verificar rate limiting
      if (this.checkRateLimit(clientIP)) {
        this.handleRateLimitViolation(clientIP, req);
        return res.status(429).json({
          error: 'Muitas requisições. Tente novamente mais tarde.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
      
      // Analisar request em busca de padrões suspeitos
      const threatLevel = this.analyzeRequest(req);
      if (threatLevel > 0) {
        this.handleSuspiciousActivity(clientIP, req, threatLevel);
      }
      
      // Hook para resposta
      const originalSend = res.send;
      res.send = (body) => {
        const responseTime = Date.now() - startTime;
        
        // Analisar resposta
        this.analyzeResponse(req, res, body, responseTime);
        
        return originalSend.call(res, body);
      };
      
      next();
    };
  }

  /**
   * Verificar se IP está bloqueado
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Verificar rate limiting
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minuto
    
    if (!this.threats.has(ip)) {
      this.threats.set(ip, {
        requests: [],
        failedLogins: 0,
        lastActivity: now,
        threatScore: 0
      });
    }
    
    const ipData = this.threats.get(ip);
    
    // Limpar requests antigas
    ipData.requests = ipData.requests.filter(time => time > windowStart);
    
    // Adicionar request atual
    ipData.requests.push(now);
    ipData.lastActivity = now;
    
    // Verificar se excedeu limite
    return ipData.requests.length > this.config.maxRequestsPerMinute;
  }

  /**
   * Analisar request em busca de ameaças
   */
  analyzeRequest(req) {
    let threatLevel = 0;
    const threats = [];
    
    // Verificar URL
    const url = req.originalUrl || req.url;
    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.test(url)) {
        threatLevel += 3;
        threats.push({ type: 'URL_PATTERN', pattern: pattern.source });
      }
    }
    
    // Verificar body
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      for (const pattern of this.config.suspiciousPatterns) {
        if (pattern.test(bodyStr)) {
          threatLevel += 4;
          threats.push({ type: 'BODY_PATTERN', pattern: pattern.source });
        }
      }
    }
    
    // Verificar query parameters
    if (req.query) {
      const queryStr = JSON.stringify(req.query);
      for (const pattern of this.config.suspiciousPatterns) {
        if (pattern.test(queryStr)) {
          threatLevel += 3;
          threats.push({ type: 'QUERY_PATTERN', pattern: pattern.source });
        }
      }
    }
    
    // Verificar headers suspeitos
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.length < 10 || /bot|crawler|scanner|hack/i.test(userAgent)) {
      threatLevel += 2;
      threats.push({ type: 'SUSPICIOUS_USER_AGENT', userAgent });
    }
    
    // Verificar endpoints críticos
    const isCriticalEndpoint = this.config.criticalEndpoints.some(endpoint => 
      req.path.startsWith(endpoint)
    );
    
    if (isCriticalEndpoint) {
      threatLevel += 1;
      threats.push({ type: 'CRITICAL_ENDPOINT', endpoint: req.path });
    }
    
    // Armazenar detalhes da ameaça se encontrada
    if (threatLevel > 0) {
      const clientIP = this.getClientIP(req);
      const ipData = this.threats.get(clientIP) || {};
      ipData.threatScore = (ipData.threatScore || 0) + threatLevel;
      ipData.lastThreats = threats;
      this.threats.set(clientIP, ipData);
    }
    
    return threatLevel;
  }

  /**
   * Analisar resposta
   */
  analyzeResponse(req, res, body, responseTime) {
    const clientIP = this.getClientIP(req);
    
    // Detectar tentativas de login falhadas
    if (req.path.includes('/login') && res.statusCode === 401) {
      this.handleFailedLogin(clientIP, req);
    }
    
    // Detectar respostas suspeitas
    if (res.statusCode === 500 && body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      
      // Verificar se expõe informações sensíveis
      if (/stack|trace|error|exception/i.test(bodyStr)) {
        this.logSecurityEvent('INFORMATION_DISCLOSURE', {
          ip: clientIP,
          endpoint: req.path,
          responseTime,
          hasStackTrace: /stack.*trace/i.test(bodyStr)
        });
      }
    }
    
    // Detectar respostas muito lentas (possível DoS)
    if (responseTime > 5000) {
      this.logSecurityEvent('SLOW_RESPONSE', {
        ip: clientIP,
        endpoint: req.path,
        responseTime,
        method: req.method
      });
    }
  }

  /**
   * Lidar com violação de rate limit
   */
  handleRateLimitViolation(ip, req) {
    this.securityMetrics.suspiciousRequests++;
    
    const ipData = this.threats.get(ip);
    ipData.threatScore += 5;
    
    this.logSecurityEvent('RATE_LIMIT_VIOLATION', {
      ip,
      endpoint: req.path,
      requestCount: ipData.requests.length,
      userAgent: req.get('User-Agent')
    });
    
    // Bloquear IP se score muito alto
    if (ipData.threatScore >= 15) {
      this.blockIP(ip, 'Múltiplas violações de rate limit');
    }
    
    this.emit('rateLimitViolation', { ip, req });
  }

  /**
   * Lidar com atividade suspeita
   */
  handleSuspiciousActivity(ip, req, threatLevel) {
    this.securityMetrics.suspiciousRequests++;
    this.securityMetrics.attackAttempts++;
    
    const activity = {
      timestamp: new Date(),
      ip,
      endpoint: req.path,
      method: req.method,
      threatLevel,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query
    };
    
    this.suspiciousActivities.push(activity);
    
    // Manter apenas últimas 1000 atividades
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-1000);
    }
    
    this.logSecurityEvent('SUSPICIOUS_ACTIVITY', activity);
    
    // Auto-bloquear IPs com alto nível de ameaça
    const ipData = this.threats.get(ip);
    if (ipData.threatScore >= 20) {
      this.blockIP(ip, `Alto nível de ameaça (score: ${ipData.threatScore})`);
    }
    
    this.emit('suspiciousActivity', activity);
  }

  /**
   * Lidar com login falhado
   */
  handleFailedLogin(ip, req) {
    const ipData = this.threats.get(ip) || {};
    ipData.failedLogins = (ipData.failedLogins || 0) + 1;
    ipData.lastFailedLogin = new Date();
    ipData.threatScore = (ipData.threatScore || 0) + 2;
    
    this.threats.set(ip, ipData);
    
    this.logSecurityEvent('FAILED_LOGIN', {
      ip,
      attempts: ipData.failedLogins,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    // Bloquear após muitas tentativas
    if (ipData.failedLogins >= this.config.maxFailedLogins) {
      this.blockIP(ip, `${ipData.failedLogins} tentativas de login falhadas`);
    }
    
    this.emit('failedLogin', { ip, attempts: ipData.failedLogins });
  }

  /**
   * Bloquear IP
   */
  blockIP(ip, reason) {
    this.blockedIPs.add(ip);
    this.securityMetrics.blockedRequests++;
    
    // Agendar desbloqueio
    setTimeout(() => {
      this.unblockIP(ip);
    }, this.config.blockDuration);
    
    this.logSecurityEvent('IP_BLOCKED', {
      ip,
      reason,
      duration: this.config.blockDuration,
      blockedUntil: new Date(Date.now() + this.config.blockDuration)
    });
    
    this.emit('ipBlocked', { ip, reason });
    
    console.log(`🚫 IP BLOQUEADO: ${ip} - ${reason}`);
  }

  /**
   * Desbloquear IP
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    
    this.logSecurityEvent('IP_UNBLOCKED', { ip });
    this.emit('ipUnblocked', { ip });
    
    console.log(`✅ IP DESBLOQUEADO: ${ip}`);
  }

  /**
   * Limpar IPs bloqueados expirados
   */
  cleanupBlockedIPs() {
    // Esta função é chamada periodicamente pelo setTimeout
    // IPs são desbloqueados automaticamente via setTimeout individual
  }

  /**
   * Reset de métricas diárias
   */
  resetDailyMetrics() {
    console.log('📊 SECURITY MONITOR: Reset de métricas diárias');
    
    // Salvar métricas antes do reset
    this.saveMetrics();
    
    // Reset
    this.securityMetrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      attackAttempts: 0,
      lastReset: new Date()
    };
    
    // Limpar atividades antigas
    this.suspiciousActivities = [];
    
    // Reduzir scores de ameaça
    for (const [ip, data] of this.threats.entries()) {
      data.threatScore = Math.max(0, data.threatScore - 5);
      data.failedLogins = Math.max(0, data.failedLogins - 2);
      
      if (data.threatScore === 0 && data.failedLogins === 0) {
        this.threats.delete(ip);
      }
    }
  }

  /**
   * Gerar relatório de status
   */
  generateStatusReport() {
    const report = {
      timestamp: new Date(),
      metrics: this.securityMetrics,
      blockedIPs: Array.from(this.blockedIPs),
      topThreats: this.getTopThreats(),
      recentActivities: this.suspiciousActivities.slice(-10),
      systemStatus: this.getSystemStatus()
    };
    
    console.log('📊 SECURITY MONITOR - Status Report:');
    console.log(`   Total Requests: ${report.metrics.totalRequests}`);
    console.log(`   Blocked: ${report.metrics.blockedRequests}`);
    console.log(`   Suspicious: ${report.metrics.suspiciousRequests}`);
    console.log(`   Attack Attempts: ${report.metrics.attackAttempts}`);
    console.log(`   Blocked IPs: ${report.blockedIPs.length}`);
    
    this.emit('statusReport', report);
    
    return report;
  }

  /**
   * Obter principais ameaças
   */
  getTopThreats() {
    return Array.from(this.threats.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.threatScore - a.threatScore)
      .slice(0, 10);
  }

  /**
   * Obter status do sistema
   */
  getSystemStatus() {
    const totalRequests = this.securityMetrics.totalRequests;
    const suspiciousRate = totalRequests > 0 ? 
      (this.securityMetrics.suspiciousRequests / totalRequests) * 100 : 0;
    
    let status = 'NORMAL';
    
    if (suspiciousRate > 10) {
      status = 'HIGH_THREAT';
    } else if (suspiciousRate > 5) {
      status = 'ELEVATED';
    } else if (this.securityMetrics.attackAttempts > 50) {
      status = 'UNDER_ATTACK';
    }
    
    return {
      level: status,
      suspiciousRate: Math.round(suspiciousRate * 100) / 100,
      threatCount: this.threats.size,
      blockedCount: this.blockedIPs.size
    };
  }

  /**
   * Log de evento de segurança
   */
  logSecurityEvent(type, data) {
    const event = {
      timestamp: new Date(),
      type,
      data,
      severity: this.getEventSeverity(type)
    };
    
    // Log para console em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      const severityEmoji = {
        'LOW': '🟢',
        'MEDIUM': '🟡',
        'HIGH': '🟠',
        'CRITICAL': '🔴'
      };
      
      console.log(`${severityEmoji[event.severity]} SECURITY: ${type}`, data);
    }
    
    // Salvar em arquivo de log
    this.saveSecurityLog(event);
    
    // Emitir evento
    this.emit('securityEvent', event);
  }

  /**
   * Obter severidade do evento
   */
  getEventSeverity(type) {
    const severities = {
      'IP_BLOCKED': 'HIGH',
      'SUSPICIOUS_ACTIVITY': 'MEDIUM',
      'FAILED_LOGIN': 'MEDIUM',
      'RATE_LIMIT_VIOLATION': 'MEDIUM',
      'INFORMATION_DISCLOSURE': 'HIGH',
      'SLOW_RESPONSE': 'LOW',
      'IP_UNBLOCKED': 'LOW'
    };
    
    return severities[type] || 'MEDIUM';
  }

  /**
   * Salvar log de segurança
   */
  saveSecurityLog(event) {
    try {
      const logDir = path.join(__dirname, '..', 'logs', 'security');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = JSON.stringify(event) + '\n';
      
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Erro ao salvar log de segurança:', error);
    }
  }

  /**
   * Salvar métricas
   */
  saveMetrics() {
    try {
      const metricsDir = path.join(__dirname, '..', 'logs', 'metrics');
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }
      
      const metricsFile = path.join(metricsDir, `metrics-${new Date().toISOString().split('T')[0]}.json`);
      const metricsData = {
        ...this.securityMetrics,
        threats: Array.from(this.threats.entries()),
        suspiciousActivities: this.suspiciousActivities.length
      };
      
      fs.writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('Erro ao salvar métricas:', error);
    }
  }

  /**
   * Obter IP do cliente
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip ||
           '127.0.0.1';
  }

  /**
   * Obter estatísticas atuais
   */
  getStats() {
    return {
      metrics: this.securityMetrics,
      blockedIPs: Array.from(this.blockedIPs),
      threatCount: this.threats.size,
      recentActivities: this.suspiciousActivities.slice(-5),
      systemStatus: this.getSystemStatus()
    };
  }

  /**
   * Configurar alertas
   */
  setupAlerts() {
    this.on('ipBlocked', ({ ip, reason }) => {
      // Integração com sistema de alertas (email, Slack, etc.)
      console.log(`🚨 ALERTA: IP ${ip} foi bloqueado - ${reason}`);
    });
    
    this.on('suspiciousActivity', (activity) => {
      if (activity.threatLevel >= 8) {
        console.log(`🚨 ALERTA: Atividade altamente suspeita detectada de ${activity.ip}`);
      }
    });
    
    this.on('statusReport', (report) => {
      if (report.systemStatus.level === 'UNDER_ATTACK') {
        console.log('🚨 ALERTA CRÍTICO: Sistema sob ataque!');
      }
    });
  }
}

// Singleton instance
const securityMonitor = new SecurityMonitor();

// Configurar alertas
securityMonitor.setupAlerts();

module.exports = securityMonitor;
