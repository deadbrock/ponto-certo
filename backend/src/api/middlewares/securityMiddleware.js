const helmet = require('helmet');

/**
 * Middleware de segurança para proteger APIs
 * Implementa headers de segurança conforme boas práticas
 */

// Configuração CORS segura
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas (produção)
    const allowedOrigins = [
      'https://ponto-digital-painel-ow1hpupv0-douglas-projects-c2be5a2b.vercel.app',
      'https://ponto-digital-painel-8hf7kmuxj-douglas-projects-c2be5a2b.vercel.app', // Nova URL
      'https://pontodigitalclean-pegasus.up.railway.app',
      'http://localhost:3000', // Desenvolvimento
      'http://localhost:3333'  // Desenvolvimento backend
    ];
    
    // Permitir requests sem origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS: Origin não permitida: ${origin}`);
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 horas
};

// Headers de segurança com Helmet
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Para compatibilidade
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  }
};

// Middleware para validar HTTPS em produção
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isSecure = req.secure || forwardedProto === 'https';
    
    if (!isSecure) {
      console.warn(`🚨 SEGURANÇA: Tentativa de acesso HTTP em produção de ${req.ip}`);
      return res.status(426).json({
        error: 'HTTPS obrigatório',
        message: 'Esta API requer conexão segura HTTPS'
      });
    }
  }
  next();
};

// Middleware para detectar e bloquear ataques comuns
const detectAttacks = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /burp/i,
    /owasp/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || 
    pattern.test(req.url) ||
    pattern.test(JSON.stringify(req.body))
  );
  
  if (isSuspicious) {
    console.warn(`🚨 SEGURANÇA: Atividade suspeita detectada:`, {
      ip: req.ip,
      userAgent: userAgent,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Atividade suspeita detectada',
      message: 'Requisição bloqueada por motivos de segurança'
    });
  }
  
  next();
};

// Middleware para log de auditoria de segurança
const securityAuditLog = (req, res, next) => {
  const securityHeaders = {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'user-agent': req.headers['user-agent'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none',
    'origin': req.headers['origin']
  };
  
  // Log apenas para endpoints sensíveis
  const sensitiveEndpoints = ['/login', '/face', '/biometric', '/admin'];
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.includes(endpoint)
  );
  
  if (isSensitive) {
    console.log(`🔍 AUDITORIA SEGURANÇA: ${req.method} ${req.path}`, {
      ip: req.ip,
      headers: securityHeaders,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Middleware para sanitizar entrada
const sanitizeInput = (req, res, next) => {
  // Sanitizar parâmetros de query
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
  }
  
  // Sanitizar body (apenas strings)
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  
  next();
};

module.exports = {
  corsOptions,
  helmetConfig,
  enforceHTTPS,
  detectAttacks,
  securityAuditLog,
  sanitizeInput
};
