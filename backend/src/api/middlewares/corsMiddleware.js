/**
 * CORS SUPER RESTRITIVO - Máxima Segurança
 * Implementa políticas rigorosas de Cross-Origin Resource Sharing
 */

const secureLogger = require('../../utils/secureLogger');

/**
 * Lista de origens permitidas por ambiente
 */
const getAllowedOrigins = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return [
      // URLs ATUAIS e VÁLIDAS apenas
      'https://ponto-digital-painel.vercel.app', // URL de produção Vercel
      'https://ponto-certo-production.up.railway.app',
      'https://ponto-digital-painel-ow1hpupv0-douglas-projects-c2be5a2b.vercel.app', // URL dos logs
      'https://ponto-digital-painel-ekytsq6ob-douglas-projects-c2be5a2b.vercel.app',
      'https://ponto-digital-painel-8hf7kmuxj-douglas-projects-c2be5a2b.vercel.app',
      'https://pontodigitalclean-pegasus.up.railway.app', // URL do backend dos logs
      // Adicionar novas URLs Vercel quando necessário
    ];
  } else {
    // Desenvolvimento - ainda restritivo
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://ponto-certo-production.up.railway.app' // Para testes
    ];
  }
};

/**
 * Validação rigorosa de Origin
 */
const validateOrigin = (origin, callback) => {
  const allowedOrigins = getAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // LOG de auditoria para todas as tentativas
  secureLogger.audit('CORS Origin Request', {
    origin: origin || 'null',
    allowed: allowedOrigins,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  // EM PRODUÇÃO: SEM EXCEÇÕES
  if (isProduction) {
    // BLOQUEAR requests sem origin em produção
    if (!origin) {
      console.warn('🚨 CORS PRODUÇÃO: Request sem origin BLOQUEADO');
      secureLogger.security('warn', 'CORS: Request sem origin bloqueado em produção');
      return callback(new Error('Origin obrigatório em produção'), false);
    }
    
    // Validação rigorosa da whitelist
    if (!allowedOrigins.includes(origin)) {
      console.warn(`🚨 CORS PRODUÇÃO: Origin não autorizada: ${origin}`);
      secureLogger.security('warn', 'CORS: Origin não autorizada bloqueada', { origin });
      return callback(new Error('Origin não autorizada'), false);
    }
    
    console.log(`✅ CORS PRODUÇÃO: Origin autorizada: ${origin}`);
    return callback(null, true);
  }
  
  // EM DESENVOLVIMENTO: Mais flexível mas ainda controlado
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  
  console.warn(`⚠️ CORS DEV: Origin não permitida: ${origin}`);
  return callback(new Error('Origin não permitida'), false);
};

/**
 * Configuração CORS Super Restritiva
 */
const corsOptions = {
  origin: validateOrigin,
  
  // Credenciais apenas para origins confiáveis
  credentials: true,
  
  // Métodos HTTP permitidos - MÍNIMOS necessários
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Headers permitidos - MÍNIMOS necessários
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  
  // Headers expostos - MÍNIMOS necessários
  exposedHeaders: ['X-Total-Count'],
  
  // Preflight cache - Reduzido para forçar validações frequentes
  maxAge: 3600, // 1 hora (reduzido de 24h)
  
  // Configurações adicionais de segurança
  optionsSuccessStatus: 200, // Para browsers legados
  preflightContinue: false   // Não passar controle para próximo handler
};

/**
 * Middleware adicional para logging de CORS
 */
const corsAuditMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;
  const path = req.path;
  
  // Log apenas para requests CORS (com Origin header)
  if (origin) {
    secureLogger.audit('CORS Request', {
      origin,
      method,
      path,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Middleware para detectar tentativas de bypass CORS
 */
const corsSecurityMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'] || '';
  
  // Detectar tentativas suspeitas
  const suspiciousPatterns = [
    /postman/i,
    /insomnia/i,
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i
  ];
  
  const isSuspiciousAgent = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent)
  );
  
  // Em produção, ser mais rigoroso com user agents suspeitos
  if (process.env.NODE_ENV === 'production' && isSuspiciousAgent && origin) {
    console.warn(`🚨 CORS SECURITY: User agent suspeito com origin`, {
      origin,
      userAgent,
      ip: req.ip
    });
    
    secureLogger.security('warn', 'CORS: User agent suspeito detectado', {
      origin,
      userAgent: userAgent.substring(0, 100), // Truncar para log
      ip: req.ip
    });
  }
  
  next();
};

/**
 * Middleware para bloquear origins dinâmicos maliciosos
 */
const blockMaliciousOrigins = (req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    // Padrões de origins maliciosos
    const maliciousPatterns = [
      /localhost:\d+/,      // Localhost com portas não autorizadas em prod
      /127\.0\.0\.1:\d+/,   // IPs locais em prod
      /192\.168\./,         // IPs privados
      /10\./,               // IPs privados
      /172\.16\./,          // IPs privados
      /\.ngrok\./,          // Tunneling services
      /\.localtunnel\./,    // Tunneling services
      /file:\/\//           // File protocol
    ];
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      const isMalicious = maliciousPatterns.some(pattern => 
        pattern.test(origin)
      );
      
      if (isMalicious) {
        console.warn(`🚨 CORS SECURITY: Origin maliciosa bloqueada: ${origin}`);
        secureLogger.security('error', 'CORS: Origin maliciosa bloqueada', { origin });
        
        return res.status(403).json({
          error: 'CORS_SECURITY_VIOLATION',
          message: 'Origin não permitida por políticas de segurança'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  corsOptions,
  corsAuditMiddleware,
  corsSecurityMiddleware,
  blockMaliciousOrigins,
  getAllowedOrigins
};
