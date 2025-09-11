const rateLimit = require('express-rate-limit');

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

// Key generator IPv6-compatible (sem usar keyGenerator customizado)
// Usaremos o padrão do express-rate-limit que já suporta IPv6

// Rate limiting para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  
  // Usar keyGenerator padrão (IPv6-compatible) com trust proxy
  
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Registrar tentativas suspeitas (versão atualizada)
  handler: (req, res) => {
    const realIP = getRealIP(req);
    console.warn(`🚨 SEGURANÇA: Rate limit excedido para IP ${realIP} em ${new Date().toISOString()}`);
    console.warn(`🚨 User-Agent: ${req.headers['user-agent']}`);
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// Rate limiting geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  
  // Usar keyGenerator padrão (IPv6-compatible) com trust proxy
  
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting específico para reconhecimento facial
const faceRecognitionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // máximo 10 tentativas por minuto
  
  // Usar keyGenerator padrão (IPv6-compatible) com trust proxy
  
  message: {
    error: 'Muitas tentativas de reconhecimento facial. Aguarde 1 minuto.',
    code: 'FACE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  faceRecognitionLimiter
};
