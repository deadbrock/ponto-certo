require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const authRoutes = require('./api/routes/authRoutes');
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

// Novas rotas para integração 100% com painel web
const dashboardRoutes = require('./api/routes/dashboardRoutes');
const notificacoesRoutes = require('./api/routes/notificacoesRoutes');
const analyticsRoutes = require('./api/routes/analyticsRoutes');
const contratosRoutes = require('./api/routes/contratosRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar limite para imagens base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
            mapa: '/api/mapa',
            dashboard: '/api/dashboard',
            notificacoes: '/api/notificacoes',
            analytics: '/api/analytics',
            contratos: '/api/contratos'
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

// Middleware para logging de requests (deve vir ANTES das rotas)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/ponto', pontoRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/colaboradores', colaboradorRoutes);
app.use('/api/atestados', atestadoRoutes);
app.use('/api/escalas', escalaRoutes);
app.use('/api/feriados', feriadoRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/mapa', mapaRoutes);

// Novas rotas para integração 100% com painel web
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contratos', contratosRoutes);

app.get('/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).send(`Conexão com o banco bem-sucedida! Hora do servidor do banco: ${result.rows[0].now}`);
    } catch (error) {
        res.status(500).send(`Erro ao conectar com o banco de dados: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Endpoint de reconhecimento facial: http://localhost:${PORT}/api/face-recognition/`);
    console.log(`🔍 Health check: http://localhost:${PORT}/`);
    console.log(`📊 Teste DB: http://localhost:${PORT}/db-test`);
    console.log(`🗺️ Mapa de Atuação: http://localhost:${PORT}/api/contratos/estados`);
});