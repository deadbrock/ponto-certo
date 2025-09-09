const secureLogger = require('../../utils/secureLogger');

/**
 * Middleware de Auditoria Completa
 * Registra todas as ações críticas do sistema para compliance
 */

// Ações que sempre devem ser auditadas
const CRITICAL_ACTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
  'CHANGE_PASSWORD', 'REGISTER_POINT', 'FACE_RECOGNITION',
  'IMPORT_REPORT', 'EXPORT_DATA', 'SYSTEM_CONFIG',
  'EMERGENCY_ACCESS', 'PERMISSION_CHANGE', 'DATA_ACCESS'
];

// Endpoints sensíveis que sempre devem ser auditados
const SENSITIVE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/login-admin',
  '/api/auth/criar-admin-emergencia',
  '/api/usuarios',
  '/api/face',
  '/api/relatorios',
  '/api/configuracoes',
  '/api/auditoria'
];

/**
 * Middleware principal de auditoria
 */
const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar dados da requisição
  const requestData = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    userId: req.user ? req.user.id : null,
    userProfile: req.user ? req.user.perfil : null,
    sessionId: req.sessionID || 'unknown'
  };

  // Verificar se é endpoint sensível
  const isSensitive = SENSITIVE_ENDPOINTS.some(endpoint => 
    req.url.startsWith(endpoint)
  );

  // Interceptar resposta
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log de acesso sempre para endpoints sensíveis
    if (isSensitive) {
      secureLogger.access(req, res, responseTime);
      
      // Auditoria detalhada para ações críticas
      auditCriticalAction(req, res, responseTime, data);
    }

    // Log de erro para qualquer falha
    if (res.statusCode >= 400) {
      secureLogger.security('warning', 'Requisição com erro', {
        ...requestData,
        statusCode: res.statusCode,
        responseTime
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Auditar ações críticas específicas
 */
function auditCriticalAction(req, res, responseTime, responseData) {
  const action = determineAction(req);
  
  if (CRITICAL_ACTIONS.includes(action)) {
    const auditData = {
      action,
      userId: req.user ? req.user.id : null,
      userEmail: req.user ? req.user.email : null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      success: res.statusCode < 400
    };

    // Adicionar contexto específico baseado na ação
    switch (action) {
      case 'LOGIN':
        auditData.loginMethod = req.url.includes('admin') ? 'admin' : 'colaborador';
        break;
      case 'REGISTER_POINT':
        auditData.pointType = 'face_recognition';
        break;
      case 'FACE_RECOGNITION':
        auditData.biometricAccess = true;
        break;
      case 'EMERGENCY_ACCESS':
        auditData.emergencyType = 'admin_creation';
        auditData.severity = 'HIGH';
        break;
    }

    secureLogger.audit(action, auditData.userId, auditData);

    // Log crítico para ações de alta severidade
    if (auditData.severity === 'HIGH') {
      secureLogger.security('critical', `Ação crítica executada: ${action}`, auditData);
    }
  }
}

/**
 * Determinar tipo de ação baseado na requisição
 */
function determineAction(req) {
  const url = req.url.toLowerCase();
  const method = req.method.toUpperCase();

  // Login actions
  if (url.includes('/auth/login')) {
    return 'LOGIN';
  }
  
  if (url.includes('/auth/logout')) {
    return 'LOGOUT';
  }

  if (url.includes('/auth/criar-admin-emergencia')) {
    return 'EMERGENCY_ACCESS';
  }

  // User management
  if (url.includes('/usuarios')) {
    if (method === 'POST') return 'CREATE_USER';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE_USER';
    if (method === 'DELETE') return 'DELETE_USER';
    return 'DATA_ACCESS';
  }

  // Face recognition
  if (url.includes('/face')) {
    return 'FACE_RECOGNITION';
  }

  // Point registration
  if (url.includes('/ponto') && method === 'POST') {
    return 'REGISTER_POINT';
  }

  // Reports
  if (url.includes('/relatorios')) {
    if (method === 'POST') return 'IMPORT_REPORT';
    return 'EXPORT_DATA';
  }

  // Configuration changes
  if (url.includes('/configuracoes') && method !== 'GET') {
    return 'SYSTEM_CONFIG';
  }

  return 'DATA_ACCESS';
}

/**
 * Middleware específico para mudanças de dados críticos
 */
const auditDataChange = (tableName) => {
  return (req, res, next) => {
    // Interceptar resposta para capturar mudanças
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode < 400) {
        secureLogger.audit('DATA_CHANGE', req.user?.id, {
          table: tableName,
          operation: req.method,
          url: req.url,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware para auditoria de tentativas de acesso negado
 */
const auditAccessDenied = (req, res, next) => {
  const originalStatus = res.status;
  res.status = function(code) {
    if (code === 401 || code === 403) {
      secureLogger.security('warning', 'Acesso negado', {
        statusCode: code,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user ? req.user.id : null,
        timestamp: new Date().toISOString()
      });
    }
    return originalStatus.call(this, code);
  };
  
  next();
};

/**
 * Middleware para auditoria de uploads de arquivos
 */
const auditFileUpload = (req, res, next) => {
  if (req.file || req.files) {
    const files = req.files || [req.file];
    
    files.forEach(file => {
      if (file) {
        secureLogger.audit('FILE_UPLOAD', req.user?.id, {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadPath: file.path,
          url: req.url,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  next();
};

/**
 * Gerar relatório de auditoria
 */
const generateAuditReport = async (startDate, endDate, userId = null) => {
  // Esta função seria implementada para gerar relatórios
  // Por enquanto, retorna estrutura básica
  return {
    period: { startDate, endDate },
    userId,
    summary: {
      totalActions: 0,
      criticalActions: 0,
      failedAttempts: 0,
      uniqueUsers: 0
    },
    details: []
  };
};

module.exports = {
  auditMiddleware,
  auditDataChange,
  auditAccessDenied,
  auditFileUpload,
  generateAuditReport,
  CRITICAL_ACTIONS,
  SENSITIVE_ENDPOINTS
};
