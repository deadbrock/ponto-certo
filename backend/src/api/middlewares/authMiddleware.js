const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    console.log('🔐 AuthMiddleware: Verificando autenticação...');
    console.log('📋 Headers de autorização:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ AuthMiddleware: Token não fornecido ou mal formatado');
        return res.status(401).json({ error: 'Token de autenticação não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 AuthMiddleware: Token recebido:', token.substring(0, 20) + '...');

    try {
        // Usar a mesma chave que está no loginAdmin
        const jwtSecret = process.env.JWT_SECRET || 'ponto-digital-jwt-secret-key-2024';
        console.log('🔑 AuthMiddleware: Usando JWT_SECRET:', jwtSecret);
        
        const decoded = jwt.verify(token, jwtSecret);
        console.log('✅ AuthMiddleware: Token válido, usuário:', decoded);
        
        req.user = decoded; // Adiciona o payload do token (ex: { id, email, perfil }) ao objeto req
        next();
    } catch (error) {
        console.error('❌ AuthMiddleware: Erro ao verificar token:', error.message);
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware; 