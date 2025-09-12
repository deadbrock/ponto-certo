const jwt = require('jsonwebtoken');
const sessionManager = require('../utils/sessionManager');

const authMiddleware = async (req, res, next) => {
    console.log('🔐 AuthMiddleware: Verificando autenticação...');
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ AuthMiddleware: Token não fornecido ou mal formatado');
        return res.status(401).json({ 
            error: 'Token de autenticação não fornecido ou mal formatado.',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 AuthMiddleware: Validando sessão...');

    try {
        // Validar sessão usando o SessionManager
        const validation = await sessionManager.validateSession(token, req);
        
        if (!validation.valid) {
            console.error('❌ AuthMiddleware: Sessão inválida:', validation.error);
            
            // Diferentes códigos de erro para diferentes cenários
            let errorCode = 'INVALID_SESSION';
            if (validation.error.includes('expirada')) {
                errorCode = 'SESSION_EXPIRED';
            } else if (validation.error.includes('não encontrada')) {
                errorCode = 'SESSION_NOT_FOUND';
            }
            
            return res.status(401).json({ 
                error: validation.error,
                code: errorCode,
                needsLogin: true
            });
        }
        
        console.log('✅ AuthMiddleware: Sessão válida, usuário:', validation.user.id);
        
        // Adicionar dados do usuário e sessão ao request
        req.user = validation.user;
        req.session = validation.session;
        
        // Verificar se precisa renovar token
        if (validation.needsRenewal) {
            console.log('🔄 AuthMiddleware: Token precisa de renovação');
            
            try {
                const renewal = await sessionManager.renewToken(validation.session.session_id, req);
                
                // Adicionar novo token no header de resposta
                res.set('X-New-Token', renewal.token);
                res.set('X-Token-Expires', renewal.expiresAt.toISOString());
                
                console.log('✅ AuthMiddleware: Token renovado automaticamente');
            } catch (renewError) {
                console.warn('⚠️ AuthMiddleware: Falha na renovação automática:', renewError.message);
                // Continuar mesmo se renovação falhar
            }
        }
        
        next();
        
    } catch (error) {
        console.error('❌ AuthMiddleware: Erro na validação de sessão:', error.message);
        return res.status(401).json({ 
            error: 'Erro interno de autenticação.',
            code: 'AUTH_ERROR'
        });
    }
};

module.exports = authMiddleware; 