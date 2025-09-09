const rateLimit = require('express-rate-limit');

// Rate limiting para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Registrar tentativas suspeitas
  onLimitReached: (req, res) => {
    console.warn(`🚨 SEGURANÇA: Rate limit excedido para IP ${req.ip} em ${new Date().toISOString()}`);
    console.warn(`🚨 User-Agent: ${req.headers['user-agent']}`);
  }
});

// Rate limiting geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
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
