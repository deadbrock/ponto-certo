const fs = require('fs');
const path = require('path');

/**
 * Sistema de Logging Seguro - OWASP Compliant
 * Remove informações sensíveis e estrutura logs para análise
 */

class SecureLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
    
    // Campos sensíveis que nunca devem ser logados
    this.sensitiveFields = [
      'senha', 'password', 'token', 'jwt', 'secret', 'hash', 
      'senha_hash', 'authorization', 'cookie', 'session',
      'cpf', 'rg', 'biometric', 'face_data'
    ];
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Sanitizar dados removendo informações sensíveis
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Sanitizar headers de autorização
    if (sanitized.headers && sanitized.headers.authorization) {
      sanitized.headers.authorization = 'Bearer [REDACTED]';
    }

    // Sanitizar body de requisições
    if (sanitized.body) {
      sanitized.body = this.sanitizeData(sanitized.body);
    }

    return sanitized;
  }

  // Gerar timestamp estruturado
  getTimestamp() {
    return new Date().toISOString();
  }

  // Log estruturado para segurança
  security(level, message, data = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      type: 'SECURITY',
      message,
      data: this.sanitizeData(data),
      source: 'ponto-digital-backend'
    };

    this.writeLog('security', logEntry);
    
    // Log crítico também no console (mas sanitizado)
    if (level === 'critical' || level === 'error') {
      console.error(`🚨 SEGURANÇA [${level.toUpperCase()}]:`, message);
    }
  }

  // Log de auditoria
  audit(action, userId, details = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'AUDIT',
      action,
      userId,
      details: this.sanitizeData(details),
      source: 'ponto-digital-backend'
    };

    this.writeLog('audit', logEntry);
    console.log(`📋 AUDITORIA: ${action} - Usuário: ${userId}`);
  }

  // Log de acesso
  access(req, res, responseTime) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'ACCESS',
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user ? req.user.id : null,
      source: 'ponto-digital-backend'
    };

    this.writeLog('access', logEntry);
  }

  // Log de erro
  error(error, context = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'ERROR',
      message: error.message,
      stack: error.stack,
      context: this.sanitizeData(context),
      source: 'ponto-digital-backend'
    };

    this.writeLog('error', logEntry);
    console.error(`❌ ERRO:`, error.message);
  }

  // Log de informação (desenvolvimento)
  info(message, data = {}) {
    // Em produção, logs de info são limitados
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'INFO',
      message,
      data: this.sanitizeData(data),
      source: 'ponto-digital-backend'
    };

    this.writeLog('info', logEntry);
    console.log(`ℹ️ INFO:`, message);
  }

  // Escrever log no arquivo
  writeLog(type, logEntry) {
    const filename = `${type}-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.logDir, filename);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(filepath, logLine, (err) => {
      if (err) {
        console.error('Erro ao escrever log:', err);
      }
    });
  }

  // Detectar atividade suspeita
  detectSuspiciousActivity(req, description) {
    this.security('warning', 'Atividade suspeita detectada', {
      description,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      timestamp: this.getTimestamp()
    });
  }

  // Log de login
  loginAttempt(email, success, ip, userAgent) {
    this.security(success ? 'info' : 'warning', 
      `Tentativa de login ${success ? 'bem-sucedida' : 'falhada'}`, {
      email: email.substring(0, 3) + '***', // Parcialmente mascarado
      success,
      ip,
      userAgent: userAgent ? userAgent.substring(0, 50) : 'unknown'
    });
  }

  // Limpar logs antigos (manter apenas 30 dias)
  cleanOldLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    fs.readdir(this.logDir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filepath = path.join(this.logDir, file);
        fs.stat(filepath, (err, stats) => {
          if (err) return;
          
          if (stats.mtime < thirtyDaysAgo) {
            fs.unlink(filepath, () => {
              console.log(`🗑️ Log antigo removido: ${file}`);
            });
          }
        });
      });
    });
  }
}

// Singleton
const secureLogger = new SecureLogger();

// Limpeza automática de logs (executar uma vez por dia)
setInterval(() => {
  secureLogger.cleanOldLogs();
}, 24 * 60 * 60 * 1000); // 24 horas

module.exports = secureLogger;
