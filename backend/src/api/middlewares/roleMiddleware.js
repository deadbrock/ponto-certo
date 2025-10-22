const secureLogger = require('../../utils/secureLogger');
const rbacManager = require('../../utils/rbacManager');

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
      'frequencia:*', 'auditoria:read'
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
      'ponto:create', 'escalas:read:own'
    ]
  }
};

/**
 * Middleware para verificar se usuário tem perfil adequado (VERSÃO HÍBRIDA)
 * Suporta tanto o sistema legado quanto o novo sistema RBAC
 * @param {Array} perfisPermitidos - Lista de perfis que podem acessar
 * @returns {Function} Middleware function
 */
const requireRole = (perfisPermitidos) => {
  return async (req, res, next) => {
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

      // NOVO SISTEMA RBAC - Verificar se usuário tem roles apropriados
      try {
        const userRoles = await rbacManager.getUserRoles(usuario.id);
        const userRoleNames = userRoles.filter(r => r.is_active).map(r => r.name);
        
        // Verificar se tem algum dos roles permitidos
        const hasRequiredRole = perfisPermitidosUpper.some(requiredRole => 
          userRoleNames.includes(requiredRole)
        );
        
        if (hasRequiredRole) {
          secureLogger.audit('ACCESS_GRANTED_RBAC', usuario.id, {
            url: req.url,
            method: req.method,
            userRoles: userRoleNames,
            requiredRoles: perfisPermitidosUpper
          });
          return next();
        }
      } catch (rbacError) {
        console.warn('⚠️ Erro no sistema RBAC, usando sistema legado:', rbacError.message);
      }

      // SISTEMA LEGADO - Fallback para compatibilidade
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

      // Log de acesso autorizado (sistema legado)
      secureLogger.audit('ACCESS_GRANTED_LEGACY', usuario.id, {
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
 * Middleware para verificar permissão específica (VERSÃO RBAC AVANÇADA)
 * @param {string} permissao - Permissão no formato 'recurso:acao'
 * @param {Object} options - Opções adicionais
 * @returns {Function} Middleware function
 */
const requirePermission = (permissao, options = {}) => {
  return async (req, res, next) => {
    try {
      const usuario = req.user;
      
      if (!usuario) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // NOVO SISTEMA RBAC - Verificação avançada de permissões
      try {
        const context = {
          userId: usuario.id,
          ownerId: req.params.userId || req.body.userId || req.query.userId,
          method: req.method,
          path: req.path,
          ...options.context
        };

        const hasPermission = await rbacManager.hasPermission(usuario.id, permissao, context);
        
        if (hasPermission) {
          return next();
        }

        // Se não tem permissão no novo sistema, tentar sistema legado
      } catch (rbacError) {
        console.warn('⚠️ Erro no sistema RBAC, usando sistema legado:', rbacError.message);
      }

      // SISTEMA LEGADO - Fallback
      const perfilUsuario = usuario.perfil?.toUpperCase();
      const configPerfil = PERFIS[perfilUsuario];

      if (!configPerfil) {
        secureLogger.security('error', 'Perfil de usuário inválido', {
          userId: usuario.id,
          invalidProfile: perfilUsuario
        });

        return res.status(403).json({
          success: false,
          error: 'Perfil de usuário inválido',
          code: 'INVALID_PROFILE'
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
          code: 'INSUFFICIENT_PERMISSION',
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
        error: 'Erro na verificação de permissões',
        code: 'PERMISSION_CHECK_ERROR'
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
const requireAdmin = requireRole(['ADMINISTRADOR', 'SUPER_ADMIN']);
const requireRH = requireRole(['RH', 'ADMINISTRADOR', 'SUPER_ADMIN']);
const requireGestor = requireRole(['GESTOR', 'RH', 'ADMINISTRADOR', 'SUPER_ADMIN']);

// Middlewares RBAC avançados
const requireRBACPermission = rbacManager.requirePermission.bind(rbacManager);
const requireAnyRBACPermission = rbacManager.requireAnyPermission.bind(rbacManager);

/**
 * Migrar usuário para o sistema RBAC
 */
async function migrateUserToRBAC(userId, legacyProfile) {
  try {
    const roleName = LEGACY_PROFILE_MAPPING[legacyProfile?.toUpperCase()];
    if (roleName) {
      await rbacManager.assignRoleToUser(userId, roleName, 'system');
      console.log(`✅ Usuário ${userId} migrado para role ${roleName}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao migrar usuário ${userId}:`, error);
  }
}

/**
 * Middleware de migração automática
 */
const autoMigrateMiddleware = async (req, res, next) => {
  try {
    const usuario = req.user;
    if (usuario?.id && usuario?.perfil) {
      // Verificar se usuário já tem roles no sistema RBAC
      const userRoles = await rbacManager.getUserRoles(usuario.id);
      
      if (userRoles.length === 0) {
        // Migrar automaticamente
        await migrateUserToRBAC(usuario.id, usuario.perfil);
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro na migração automática:', error);
  }
  next();
};
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
  requireRBACPermission,
  requireAnyRBACPermission,
  PERFIS
};
