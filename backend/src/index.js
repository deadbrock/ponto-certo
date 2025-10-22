require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/database');
const { criarTabelasEssenciais } = require('./database/schema');

// Ativar console seguro GLOBALMENTE (LGPD)
const { enableSafeConsole } = require('./utils/safeConsole');
enableSafeConsole();

// Inicializar sistema de auditoria
const auditLogger = require('./utils/auditLogger');
const logRotationManager = require('./utils/logRotation');
const securityMonitor = require('./utils/securityMonitor');
const performanceMonitor = require('./utils/performanceMonitor');
const cacheManager = require('./utils/cacheManager');
const rbacManager = require('./utils/rbacManager');
const alertManager = require('./utils/alertManager');
const alertEscalationManager = require('./utils/alertEscalation');
const alertIntegrationMiddleware = require('./api/middlewares/alertIntegrationMiddleware');
const disasterRecoveryManager = require('./utils/disasterRecovery');
const dataRecoveryValidator = require('./utils/dataRecoveryValidator');
const performanceOptimizations = require('./utils/performanceOptimizations');
console.log('📋 Sistema de auditoria inicializado');
console.log('🛡️ Monitor de segurança inicializado');
console.log('📊 Monitor de performance inicializado');
console.log('🧠 Cache manager inicializado');
console.log('🛡️ RBAC Manager inicializado');
console.log('🚨 Alert Manager inicializado');
console.log('⬆️ Alert Escalation Manager inicializado');
console.log('🔗 Alert Integration Middleware inicializado');
console.log('🚨 Disaster Recovery Manager inicializado');
console.log('🔄 Data Recovery Validator inicializado');
console.log('⚡ Performance Optimizations inicializadas');

// Importar middlewares de rate limiting avançado
const { 
  checkIPStatus,
  apiLimiter, 
  loginLimiter, 
  faceRecognitionLimiter,
  sensitiveEndpointsLimiter,
  uploadLimiter,
  reportsLimiter,
  getStats
} = require('./api/middlewares/rateLimitMiddleware');
const { 
  helmetConfig, 
  detectAttacks, 
  securityAuditLog, 
  sanitizeInput 
} = require('./api/middlewares/securityMiddleware');

// CORS RESTRITIVO E SEGURO (conforme cronograma de segurança)
const getAllowedOrigins = () => {
  const origins = [];
  
  // URL principal do frontend (via env var)
  if (process.env.CORS_ALLOWED_ORIGINS) {
    origins.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map(url => url.trim()));
  }
  
  // Fallback para URL padrão atual (produção Vercel)
  if (origins.length === 0) {
    origins.push('https://ponto-digital-painel.vercel.app');
    origins.push('https://ponto-digital-painel-ow1hpupv0-douglas-projects-c2be5a2b.vercel.app');
  }
  
  // Localhost APENAS em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
  }
  
  console.log('🔒 CORS Origins permitidas:', origins);
  return origins;
};

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos específicos
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'X-CSRF-Token' // Adicionar suporte CSRF
  ],
  exposedHeaders: ['X-Total-Count'], // Headers que o frontend pode acessar
  optionsSuccessStatus: 200,
  maxAge: 86400, // Cache preflight por 24h
  preflightContinue: false // Não passar preflight para próximo handler
};

// HTTPS middlewares removidos - não necessários no Railway (proxy reverso)

// Importar novos middlewares de segurança
const secureLogger = require('./utils/secureLogger');
const { auditMiddleware, auditAccessDenied, auditFileUpload } = require('./api/middlewares/auditMiddleware');
const { requireAdmin, requireAdminOrRH } = require('./api/middlewares/roleMiddleware');

const authRoutes = require('./api/routes/authRoutes');
const sessionRoutes = require('./api/routes/sessionRoutes');
const backupRoutes = require('./api/routes/backupRoutes');
const pontoRoutes = require('./api/routes/pontoRoutes');
const faceRoutes = require('./api/routes/faceRoutes');
const relatoriosRoutes = require('./api/routes/relatoriosRoutes');
const auditoriaRoutes = require('./api/routes/auditoriaRoutes');
const usuarioRoutes = require('./api/routes/usuarioRoutes');
const colaboradorRoutes = require('./api/routes/colaboradorRoutes');
const atestadoRoutes = require('./api/routes/atestadoRoutes');
const escalaRoutes = require('./api/routes/escalaRoutes');
const feriadoRoutes = require('./api/routes/feriadoRoutes');
const configuracaoRoutes = require('./api/routes/configuracaoRoutes');
const mapaRoutes = require('./api/routes/mapaRoutes');
const frequenciaRoutes = require('./api/routes/frequenciaRoutes');

// Novas rotas para integração 100% com painel web
const dashboardRoutes = require('./api/routes/dashboardRoutes');
const notificacoesRoutes = require('./api/routes/notificacoesRoutes');
const analyticsRoutes = require('./api/routes/analyticsRoutes');
const contratosRoutes = require('./api/routes/contratosRoutes');
const primeiroRegistroRoutes = require('./api/routes/primeiroRegistroRoutes');
const consentimentoRoutes = require('./api/routes/consentimentoRoutes');
const lgpdRoutes = require('./api/routes/lgpdRoutes');
// const corsRoutes = require('./api/routes/corsRoutes'); // TEMPORARIAMENTE DESABILITADO

const app = express();

// ===== CONFIGURAÇÃO TRUST PROXY PARA RAILWAY =====
// Railway usa proxy reverso, precisamos confiar nos headers X-Forwarded-*
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
  console.log('🔧 Trust proxy habilitado para produção (Railway)');
} else {
  app.set('trust proxy', 'loopback');
  console.log('🔧 Trust proxy configurado para desenvolvimento');
}

// ===== ENDPOINTS PÚBLICOS (ANTES DOS MIDDLEWARES) =====
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Ponto Digital FG - Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Manifest.json público para PWA
app.get('/manifest.json', (req, res) => {
  res.status(200).json({
    "short_name": "Ponto Digital",
    "name": "Sistema Ponto Digital FG",
    "description": "Sistema de Gestão de Ponto Digital com Reconhecimento Facial",
    "icons": [
      {
        "src": "/favicon.ico",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/x-icon"
      }
    ],
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#1976d2",
    "background_color": "#ffffff",
    "scope": "/"
  });
});

app.get('/health', async (req, res) => {
  try {
    // Teste rápido de conexão com o banco
    const result = await db.query('SELECT NOW() as timestamp');
    
    res.status(200).json({
      status: 'healthy',
      service: 'Ponto Digital FG - Backend API',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      database_time: result.rows[0].timestamp
    });
  } catch (error) {
    console.error('❌ Health check falhou:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      service: 'Ponto Digital FG - Backend API',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: 'disconnected',
      error: error.message
    });
  }
});

// ===== APLICAR MIDDLEWARES DE SEGURANÇA =====
console.log('🔒 Aplicando middlewares de segurança avançados...');

// 1. CORS RESTRITIVO E SEGURO
console.log('🔒 Ativando CORS restritivo e seguro...');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // Log de tentativas de acesso
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`🚨 CORS: Origem bloqueada: ${origin} de IP: ${req.ip}`);
    secureLogger.security('warn', 'CORS_BLOCKED', {
      origin,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }
  
  next();
});

app.use(cors(corsOptions));

// 2. Monitor de segurança em tempo real
app.use(securityMonitor.middleware());

// 3. Monitor de performance em tempo real
app.use(performanceMonitor.middleware());

// 4. Sistema de alertas integrado
app.use(alertIntegrationMiddleware.middleware());
app.use(alertIntegrationMiddleware.anomalyDetectionMiddleware());
app.use(alertIntegrationMiddleware.bruteForceDetectionMiddleware());
app.use(alertIntegrationMiddleware.botDetectionMiddleware());
app.use(alertIntegrationMiddleware.dataExfiltrationDetectionMiddleware());

// 5. Otimizações de performance pós-stress test
performanceOptimizations.applyOptimizations(app);

// 6. Headers de segurança (Helmet) - REATIVADO
app.use(helmet(helmetConfig));

// 3. HTTPS é gerenciado pelo Railway (proxy reverso)
if (process.env.NODE_ENV === 'production') {
  console.log('🔒 HTTPS gerenciado pelo Railway...');
  // Middlewares HTTPS removidos - Railway já fornece HTTPS automaticamente
}

// 4. Verificação de IP (whitelist/blacklist + burst protection)
console.log('🛡️ Ativando proteção contra burst attacks e IP blocking...');
app.use(checkIPStatus);

// 5. Rate limiting global (aplicado após verificação de IP)
console.log('⚡ Ativando rate limiting global...');
app.use(apiLimiter);

// 6. Detectar ataques comuns - REATIVADO
app.use(detectAttacks);

// 6. Sistema de auditoria completo - ATUALIZADO
app.use(auditMiddleware);
app.use(auditAccessDenied);
app.use(auditFileUpload);

// 7. Sanitização de entrada - REATIVADO
app.use(sanitizeInput);

// 8. Log de inicialização seguro
secureLogger.security('info', 'Sistema iniciado com middlewares de segurança completos', {
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString()
});

// 8. Parser JSON com limite (aumentar limite para imagens base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('✅ Middlewares de segurança aplicados');

const PORT = process.env.PORT || 3333;

app.get('/', (req, res) => {
    res.json({
        message: 'API do Ponto Digital está no ar!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            ponto: '/api/ponto',
            face: '/api/face',
            relatorios: '/api/relatorios',
            auditoria: '/api/auditoria',
            usuarios: '/api/usuarios',
            colaboradores: '/api/colaboradores',
            atestados: '/api/atestados',
            escalas: '/api/escalas',
            feriados: '/api/feriados',
            configuracoes: '/api/configuracoes',
            frequencia: '/api/frequencia',
            mapa: '/api/mapa',
            dashboard: '/api/dashboard',
            notificacoes: '/api/notificacoes',
            analytics: '/api/analytics',
            contratos: '/api/contratos',
            "primeiro-registro": '/api/primeiro-registro',
            consentimento: '/api/consentimento'
        }
    });
});

// Rota de documentação da API
app.get('/api', (req, res) => {
    res.json({
        message: 'API do Ponto Digital - Documentação',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: {
                'POST /api/auth/login-admin': 'Login administrativo (painel web)',
                'POST /api/auth/login': 'Login colaboradores (app)',
                'GET /api/auth/criar-admin-emergencia': 'Criar usuário admin de emergência'
            },
            dashboard: 'GET /api/dashboard',
            colaboradores: 'GET /api/colaboradores',
            ponto: 'GET /api/ponto',
            relatorios: 'GET /api/relatorios',
            configuracoes: 'GET /api/configuracoes'
        }
    });
});

// Endpoint de teste para debug de CORS
app.get('/api/test-cors', (req, res) => {
    res.json({
        success: true,
        message: 'CORS está funcionando!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// Endpoint para monitoramento de rate limiting (apenas admin)
app.get('/api/admin/rate-limit-stats', requireAdmin, (req, res) => {
  try {
    const stats = getStats();
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de rate limiting:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Middleware para logging de requests (deve vir ANTES das rotas)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Middleware de logging personalizado
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ❌ REMOVIDO: CORS antigo inseguro substituído por configuração restritiva

// Registrar rotas com rate limiting específico
console.log('🔗 Registrando rotas com rate limiting específico...');

// Rotas críticas com limiters específicos
app.use('/api/auth', loginLimiter, authRoutes); // Login mais restritivo
app.use('/api/session', apiLimiter, sessionRoutes); // Controle de sessões
app.use('/api/backup', sensitiveEndpointsLimiter, backupRoutes); // Backup criptografado
app.use('/api/face', faceRecognitionLimiter, faceRoutes); // Reconhecimento facial restritivo

// Rotas sensíveis 
app.use('/api/usuarios', sensitiveEndpointsLimiter, usuarioRoutes);
app.use('/api/colaboradores', sensitiveEndpointsLimiter, colaboradorRoutes);
app.use('/api/auditoria', sensitiveEndpointsLimiter, auditoriaRoutes);
app.use('/api/configuracoes', sensitiveEndpointsLimiter, configuracaoRoutes);

// Rotas de relatórios
app.use('/api/relatorios', reportsLimiter, relatoriosRoutes);

// Rotas normais (com rate limiting global apenas)
app.use('/api/ponto', pontoRoutes);
app.use('/api/atestados', atestadoRoutes);
app.use('/api/escalas', escalaRoutes);
app.use('/api/feriados', feriadoRoutes);
app.use('/api/frequencia', frequenciaRoutes);
app.use('/api/mapa', mapaRoutes);
app.use('/api/security', sensitiveEndpointsLimiter, require('./api/routes/securityRoutes'));
app.use('/api/performance', sensitiveEndpointsLimiter, require('./api/routes/performanceRoutes'));
app.use('/api/rbac', sensitiveEndpointsLimiter, require('./api/routes/rbacRoutes'));
app.use('/api/alerts', sensitiveEndpointsLimiter, require('./api/routes/alertRoutes'));
app.use('/api/recovery', sensitiveEndpointsLimiter, require('./api/routes/recoveryRoutes'));

// Novas rotas para integração 100% com painel web
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/primeiro-registro', primeiroRegistroRoutes);
app.use('/api/consentimento', consentimentoRoutes);
app.use('/api/lgpd', lgpdRoutes);
// app.use('/api/cors', corsRoutes); // TEMPORARIAMENTE DESABILITADO

app.get('/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).send(`Conexão com o banco bem-sucedida! Hora do servidor do banco: ${result.rows[0].now}`);
    } catch (error) {
        res.status(500).send(`Erro ao conectar com o banco de dados: ${error.message}`);
    }
});

// Testar conexão com banco ao iniciar
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Endpoint de reconhecimento facial: http://localhost:${PORT}/api/face/recognize`);
    console.log(`🔍 Health check: http://localhost:${PORT}/`);
    console.log(`📊 Teste DB: http://localhost:${PORT}/db-test`);
    // Mapa de Atuação removido
    
    try {
        const result = await db.query('SELECT NOW()');
        console.log('✅ Conexão com PostgreSQL estabelecida:', result.rows[0].now);
        
        // Aplicar schema automaticamente
        console.log('🗄️ Aplicando schema do banco...');
        const schemaOk = await criarTabelasEssenciais();
        
        if (schemaOk) {
            console.log('🎉 Backend totalmente configurado e pronto para uso!');
        } else {
            console.warn('⚠️ Houve problemas ao aplicar o schema, mas o servidor está rodando');
        }
        
    } catch (error) {
        console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
    }
});