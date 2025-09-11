const rateLimit = require('express-rate-limit');

/**
 * SISTEMA DE RATE LIMITING AVANÇADO E ADAPTATIVO
 * Implementação conforme cronograma de segurança
 */

// Sistema de Whitelist/Blacklist de IPs
const ipWhitelist = new Set([
  // IPs confiáveis podem ser adicionados via env var
  ...(process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim()) : [])
]);

const ipBlacklist = new Set([
  // IPs maliciosos podem ser adicionados dinamicamente
  ...(process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',').map(ip => ip.trim()) : [])
]);

// Contador de tentativas suspeitas por IP
const suspiciousAttempts = new Map();

/**
 * Configuração de key generator compatível com Railway e IPv6
 * Railway usa proxy reverso, então precisamos tratar X-Forwarded-For corretamente
 */
const getRealIP = (req) => {
  // Em produção (Railway), usar X-Forwarded-For se disponível
  if (process.env.NODE_ENV === 'production') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For pode conter múltiplos IPs, pegar o primeiro
      return forwarded.split(',')[0].trim();
    }
  }
  
  // Fallback para req.ip (que já considera trust proxy)
  return req.ip || req.connection.remoteAddress || 'unknown';
};

/**
 * Sistema de detecção de burst attacks
 */
const detectBurstAttack = (ip) => {
  const now = Date.now();
  const attempts = suspiciousAttempts.get(ip) || [];
  
  // Remover tentativas antigas (mais de 1 minuto)
  const recentAttempts = attempts.filter(time => now - time < 60000);
  
  // Se mais de 20 tentativas em 1 minuto = burst attack
  if (recentAttempts.length > 20) {
    console.error(`🚨 BURST ATTACK detectado de IP: ${ip}`);
    ipBlacklist.add(ip); // Adicionar à blacklist temporariamente
    return true;
  }
  
  // Atualizar contador
  recentAttempts.push(now);
  suspiciousAttempts.set(ip, recentAttempts);
  
  return false;
};

/**
 * Middleware de verificação de IP
 */
const checkIPStatus = (req, res, next) => {
  const ip = getRealIP(req);
  
  // Verificar blacklist
  if (ipBlacklist.has(ip)) {
    console.warn(`🚫 IP bloqueado tentando acesso: ${ip}`);
    return res.status(403).json({
      error: 'Acesso negado. IP temporariamente bloqueado.',
      code: 'IP_BLOCKED'
    });
  }
  
  // Verificar burst attack
  if (detectBurstAttack(ip)) {
    return res.status(429).json({
      error: 'Burst attack detectado. IP bloqueado temporariamente.',
      code: 'BURST_ATTACK_DETECTED'
    });
  }
  
  next();
};

/**
 * RATE LIMITERS ESPECÍFICOS POR ENDPOINT
 * Configuração adaptativa baseada no risco de cada endpoint
 */

// 1. LOGIN - CRÍTICO (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    const ip = getRealIP(req);
    // IPs na whitelist têm limite maior
    return ipWhitelist.has(ip) ? 10 : 3; // Reduzido de 5 para 3
  },
  
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Handler avançado com logging
  handler: (req, res) => {
    const realIP = getRealIP(req);
    const userAgent = req.headers['user-agent'];
    
    console.error(`🚨 LOGIN RATE LIMIT: IP ${realIP} | UA: ${userAgent}`);
    
    // Adicionar à lista suspeita após 3 tentativas
    const attempts = suspiciousAttempts.get(realIP) || [];
    attempts.push(Date.now());
    suspiciousAttempts.set(realIP, attempts);
    
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutos em segundos
    });
  }
});

// 2. RECONHECIMENTO FACIAL - CRÍTICO
const faceRecognitionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: (req) => {
    const ip = getRealIP(req);
    return ipWhitelist.has(ip) ? 15 : 5; // Reduzido de 10 para 5
  },
  
  message: {
    error: 'Muitas tentativas de reconhecimento facial. Aguarde 1 minuto.',
    code: 'FACE_RECOGNITION_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 3. API GERAL - MODERADO
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    const ip = getRealIP(req);
    return ipWhitelist.has(ip) ? 200 : 100;
  },
  
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 4. ENDPOINTS SENSÍVEIS - RESTRITIVO
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: (req) => {
    const ip = getRealIP(req);
    return ipWhitelist.has(ip) ? 20 : 10;
  },
  
  message: {
    error: 'Limite de requisições para endpoints sensíveis excedido.',
    code: 'SENSITIVE_ENDPOINT_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 5. UPLOAD DE ARQUIVOS - RESTRITIVO
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: (req) => {
    const ip = getRealIP(req);
    return ipWhitelist.has(ip) ? 10 : 3;
  },
  
  message: {
    error: 'Limite de uploads excedido. Aguarde 5 minutos.',
    code: 'UPLOAD_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 6. RELATÓRIOS - MODERADO
const reportsLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutos
  max: (req) => {
    const ip = getRealIP(req);
    return ipWhitelist.has(ip) ? 10 : 5;
  },
  
  message: {
    error: 'Limite de geração de relatórios excedido.',
    code: 'REPORTS_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * SISTEMA DE MONITORAMENTO E LIMPEZA
 */

// Limpeza automática de dados antigos (executar a cada hora)
const cleanupOldData = () => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Limpar tentativas antigas
  for (const [ip, attempts] of suspiciousAttempts.entries()) {
    const recentAttempts = attempts.filter(time => time > oneHourAgo);
    if (recentAttempts.length === 0) {
      suspiciousAttempts.delete(ip);
    } else {
      suspiciousAttempts.set(ip, recentAttempts);
    }
  }
  
  console.log(`🧹 Limpeza automática: ${suspiciousAttempts.size} IPs monitorados`);
};

// Executar limpeza a cada hora
setInterval(cleanupOldData, 60 * 60 * 1000);

/**
 * FUNÇÕES UTILITÁRIAS
 */

// Adicionar IP à whitelist dinamicamente
const addToWhitelist = (ip) => {
  ipWhitelist.add(ip);
  console.log(`✅ IP adicionado à whitelist: ${ip}`);
};

// Remover IP da blacklist
const removeFromBlacklist = (ip) => {
  ipBlacklist.delete(ip);
  console.log(`✅ IP removido da blacklist: ${ip}`);
};

// Obter estatísticas
const getStats = () => {
  return {
    whitelist: Array.from(ipWhitelist),
    blacklist: Array.from(ipBlacklist),
    suspiciousIPs: suspiciousAttempts.size,
    totalAttempts: Array.from(suspiciousAttempts.values()).reduce((sum, attempts) => sum + attempts.length, 0)
  };
};

module.exports = {
  // Middlewares principais
  checkIPStatus,
  loginLimiter,
  apiLimiter,
  faceRecognitionLimiter,
  sensitiveEndpointsLimiter,
  uploadLimiter,
  reportsLimiter,
  
  // Funções utilitárias
  addToWhitelist,
  removeFromBlacklist,
  getStats,
  getRealIP
};
