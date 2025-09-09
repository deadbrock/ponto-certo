const secureLogger = require('../../utils/secureLogger');

/**
 * Middleware de Autorização Baseada em Perfil (RBAC)
 * Implementa controle de acesso granular por perfil de usuário
 */

// Definição de perfis e suas hierarquias
const PERFIS = {
  ADMINISTRADOR: {
    nivel: 100,
    permissoes: ['*'] // Acesso total
  },
  RH: {
    nivel: 80,
    permissoes: [
      'usuarios:read', 'usuarios:create', 'usuarios:update',
      'colaboradores:*', 'relatorios:*', 'escalas:*',
      'atestados:*', 'frequencia:*', 'auditoria:read'
    ]
  },
  GESTOR: {
    nivel: 60,
    permissoes: [
      'colaboradores:read', 'relatorios:read', 'escalas:read',
      'frequencia:read', 'dashboard:read'
    ]
  },
  COLABORADOR: {
    nivel: 20,
    permissoes: [
      'ponto:create', 'escalas:read:own', 'atestados:create:own'
    ]
  }
};

/**
 * Middleware para verificar se usuário tem perfil adequado
 * @param {Array} perfisPermitidos - Lista de perfis que podem acessar
 * @returns {Function} Middleware function
 */
const requireRole = (perfisPermitidos) => {
  return (req, res, next) => {
    try {
      const usuario = req.user;
      
      if (!usuario) {
        secureLogger.security('warning', 'Tentativa de acesso sem autenticação', {
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const perfilUsuario = usuario.perfil?.toUpperCase();
      const perfisPermitidosUpper = perfisPermitidos.map(p => p.toUpperCase());

      if (!perfisPermitidosUpper.includes(perfilUsuario)) {
        secureLogger.security('warning', 'Tentativa de acesso negado - perfil insuficiente', {
          userId: usuario.id,
          userProfile: perfilUsuario,
          requiredProfiles: perfisPermitidosUpper,
          url: req.url,
          method: req.method,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Perfil insuficiente.',
          code: 'INSUFFICIENT_PERMISSIONS',
          userProfile: perfilUsuario,
          requiredProfiles: perfisPermitidosUpper
        });
      }

      // Log de acesso autorizado
      secureLogger.audit('ACCESS_GRANTED', usuario.id, {
        url: req.url,
        method: req.method,
        userProfile: perfilUsuario
      });

      next();
    } catch (error) {
      secureLogger.error(error, {
        context: 'roleMiddleware',
        url: req.url,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        error: 'Erro interno na verificação de permissões',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Middleware para verificar permissão específica
 * @param {string} permissao - Permissão no formato 'recurso:acao'
 * @returns {Function} Middleware function
 */
const requirePermission = (permissao) => {
  return (req, res, next) => {
    try {
      const usuario = req.user;
      
      if (!usuario) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const perfilUsuario = usuario.perfil?.toUpperCase();
      const configPerfil = PERFIS[perfilUsuario];

      if (!configPerfil) {
        secureLogger.security('error', 'Perfil de usuário inválido', {
          userId: usuario.id,
          invalidProfile: perfilUsuario
        });

        return res.status(403).json({
          success: false,
          error: 'Perfil de usuário inválido'
        });
      }

      // Verificar se tem acesso total (*)
      if (configPerfil.permissoes.includes('*')) {
        return next();
      }

      // Verificar permissão específica
      const [recurso, acao] = permissao.split(':');
      const permissaoWildcard = `${recurso}:*`;
      
      const temPermissao = configPerfil.permissoes.includes(permissao) ||
                          configPerfil.permissoes.includes(permissaoWildcard);

      if (!temPermissao) {
        secureLogger.security('warning', 'Acesso negado - permissão específica', {
          userId: usuario.id,
          userProfile: perfilUsuario,
          requiredPermission: permissao,
          userPermissions: configPerfil.permissoes
        });

        return res.status(403).json({
          success: false,
          error: 'Permissão insuficiente para esta ação',
          requiredPermission: permissao
        });
      }

      next();
    } catch (error) {
      secureLogger.error(error, {
        context: 'permissionMiddleware',
        permission: permissao
      });

      return res.status(500).json({
        success: false,
        error: 'Erro na verificação de permissões'
      });
    }
  };
};

/**
 * Middleware para verificar se usuário pode acessar apenas seus próprios dados
 * @param {string} paramName - Nome do parâmetro que contém o ID do usuário
 * @returns {Function} Middleware function
 */
const requireSelfOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    const usuario = req.user;
    const targetUserId = req.params[paramName];

    // Admin pode acessar qualquer coisa
    if (usuario.perfil?.toUpperCase() === 'ADMINISTRADOR') {
      return next();
    }

    // Usuário só pode acessar seus próprios dados
    if (usuario.id.toString() !== targetUserId.toString()) {
      secureLogger.security('warning', 'Tentativa de acesso a dados de outro usuário', {
        userId: usuario.id,
        targetUserId,
        url: req.url
      });

      return res.status(403).json({
        success: false,
        error: 'Você só pode acessar seus próprios dados'
      });
    }

    next();
  };
};

/**
 * Verificar se usuário tem nível hierárquico suficiente
 * @param {number} nivelMinimo - Nível mínimo necessário
 * @returns {Function} Middleware function
 */
const requireLevel = (nivelMinimo) => {
  return (req, res, next) => {
    const usuario = req.user;
    const perfilUsuario = usuario.perfil?.toUpperCase();
    const configPerfil = PERFIS[perfilUsuario];

    if (!configPerfil || configPerfil.nivel < nivelMinimo) {
      secureLogger.security('warning', 'Acesso negado - nível hierárquico insuficiente', {
        userId: usuario.id,
        userLevel: configPerfil?.nivel || 0,
        requiredLevel: nivelMinimo
      });

      return res.status(403).json({
        success: false,
        error: 'Nível de acesso insuficiente',
        userLevel: configPerfil?.nivel || 0,
        requiredLevel: nivelMinimo
      });
    }

    next();
  };
};

// Middlewares pré-configurados para facilitar uso
const requireAdmin = requireRole(['ADMINISTRADOR']);
const requireAdminOrRH = requireRole(['ADMINISTRADOR', 'RH']);
const requireManagement = requireRole(['ADMINISTRADOR', 'RH', 'GESTOR']);
const requireHighLevel = requireLevel(80); // RH ou superior

module.exports = {
  requireRole,
  requirePermission,
  requireSelfOrAdmin,
  requireLevel,
  requireAdmin,
  requireAdminOrRH,
  requireManagement,
  requireHighLevel,
  PERFIS
};
