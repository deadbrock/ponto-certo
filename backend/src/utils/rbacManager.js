/**
 * 🛡️ RBAC MANAGER - CONTROLE DE ACESSO BASEADO EM ROLES
 * 
 * Sistema avançado de controle de acesso com:
 * - Roles dinâmicos e hierárquicos
 * - Permissões granulares por recurso e ação
 * - Herança de permissões
 * - Cache de permissões para performance
 * - Auditoria completa de acessos
 */

const EventEmitter = require('events');
const auditLogger = require('./auditLogger');
const cacheManager = require('./cacheManager');
const db = require('../config/database');

class RBACManager extends EventEmitter {
  constructor() {
    super();
    
    // Cache de permissões para performance
    this.permissionsCache = new Map();
    this.rolesCache = new Map();
    
    // Configurações
    this.config = {
      cacheTimeout: 300, // 5 minutos
      enableInheritance: true,
      enableWildcards: true,
      auditAll: true
    };

    // Inicializar sistema
    this.initialize();
  }

  /**
   * Inicializar sistema RBAC
   */
  async initialize() {
    try {
      // Criar tabelas se não existirem
      await this.createTables();
      
      // Carregar roles e permissões padrão
      await this.loadDefaultRoles();
      
      // Configurar limpeza de cache
      this.setupCacheCleanup();
      
      console.log('🛡️ RBAC Manager inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar RBAC Manager:', error);
      throw error;
    }
  }

  /**
   * Criar tabelas do sistema RBAC
   */
  async createTables() {
    const queries = [
      // Tabela de roles
      `CREATE TABLE IF NOT EXISTS rbac_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        level INTEGER NOT NULL DEFAULT 0,
        parent_role_id INTEGER REFERENCES rbac_roles(id),
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de recursos
      `CREATE TABLE IF NOT EXISTS rbac_resources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de ações
      `CREATE TABLE IF NOT EXISTS rbac_actions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Tabela de permissões
      `CREATE TABLE IF NOT EXISTS rbac_permissions (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER NOT NULL REFERENCES rbac_resources(id),
        action_id INTEGER NOT NULL REFERENCES rbac_actions(id),
        name VARCHAR(100) UNIQUE NOT NULL, -- formato: resource:action
        display_name VARCHAR(200) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(resource_id, action_id)
      )`,

      // Tabela de roles x permissões
      `CREATE TABLE IF NOT EXISTS rbac_role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES rbac_roles(id),
        permission_id INTEGER NOT NULL REFERENCES rbac_permissions(id),
        granted_by INTEGER REFERENCES usuarios(id),
        granted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      )`,

      // Tabela de usuários x roles
      `CREATE TABLE IF NOT EXISTS rbac_user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id),
        role_id INTEGER NOT NULL REFERENCES rbac_roles(id),
        assigned_by INTEGER REFERENCES usuarios(id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      )`,

      // Tabela de sessões com permissões (cache)
      `CREATE TABLE IF NOT EXISTS rbac_session_cache (
        session_id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        permissions JSONB NOT NULL,
        roles JSONB NOT NULL,
        cached_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )`,

      // Índices para performance
      `CREATE INDEX IF NOT EXISTS idx_rbac_roles_level ON rbac_roles(level)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_roles_parent ON rbac_roles(parent_role_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_permissions_name ON rbac_permissions(name)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user ON rbac_user_roles(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_active ON rbac_user_roles(user_id, is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_session_cache_user ON rbac_session_cache(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rbac_session_cache_expires ON rbac_session_cache(expires_at)`
    ];

    for (const query of queries) {
      await db.query(query);
    }
  }

  /**
   * Carregar roles e permissões padrão
   */
  async loadDefaultRoles() {
    try {
      // Verificar se já existem roles
      const existingRoles = await db.query('SELECT COUNT(*) FROM rbac_roles');
      if (parseInt(existingRoles.rows[0].count) > 0) {
        console.log('🔄 Roles já existem, pulando criação padrão');
        return;
      }

      console.log('📋 Criando roles e permissões padrão...');

      // 1. Criar recursos padrão
      const resources = [
        { name: 'users', display_name: 'Usuários', category: 'admin' },
        { name: 'collaborators', display_name: 'Colaboradores', category: 'hr' },
        { name: 'timerecords', display_name: 'Registros de Ponto', category: 'core' },
        { name: 'reports', display_name: 'Relatórios', category: 'reports' },
        { name: 'schedules', display_name: 'Escalas', category: 'hr' },
        { name: 'attendance', display_name: 'Frequência', category: 'hr' },
        { name: 'dashboard', display_name: 'Dashboard', category: 'core' },
        { name: 'analytics', display_name: 'Analytics', category: 'reports' },
        { name: 'settings', display_name: 'Configurações', category: 'admin' },
        { name: 'audit', display_name: 'Auditoria', category: 'admin' },
        { name: 'security', display_name: 'Segurança', category: 'admin' },
        { name: 'biometrics', display_name: 'Biometria', category: 'core' },
        { name: 'notifications', display_name: 'Notificações', category: 'core' }
      ];

      for (const resource of resources) {
        await db.query(
          `INSERT INTO rbac_resources (name, display_name, category, is_system) 
           VALUES ($1, $2, $3, true) ON CONFLICT (name) DO NOTHING`,
          [resource.name, resource.display_name, resource.category]
        );
      }

      // 2. Criar ações padrão
      const actions = [
        { name: 'create', display_name: 'Criar' },
        { name: 'read', display_name: 'Visualizar' },
        { name: 'update', display_name: 'Editar' },
        { name: 'delete', display_name: 'Excluir' },
        { name: 'export', display_name: 'Exportar' },
        { name: 'import', display_name: 'Importar' },
        { name: 'approve', display_name: 'Aprovar' },
        { name: 'reject', display_name: 'Rejeitar' },
        { name: 'assign', display_name: 'Atribuir' },
        { name: 'manage', display_name: 'Gerenciar' },
        { name: 'admin', display_name: 'Administrar' },
        { name: 'execute', display_name: 'Executar' }
      ];

      for (const action of actions) {
        await db.query(
          `INSERT INTO rbac_actions (name, display_name, is_system) 
           VALUES ($1, $2, true) ON CONFLICT (name) DO NOTHING`,
          [action.name, action.display_name]
        );
      }

      // 3. Criar permissões combinando recursos e ações
      await this.generatePermissions();

      // 4. Criar roles padrão
      const roles = [
        {
          name: 'SUPER_ADMIN',
          display_name: 'Super Administrador',
          description: 'Acesso total ao sistema',
          level: 100,
          permissions: ['*:*'] // Todas as permissões
        },
        {
          name: 'ADMINISTRADOR',
          display_name: 'Administrador',
          description: 'Administrador do sistema',
          level: 90,
          permissions: [
            'users:*', 'settings:*', 'audit:*', 'security:*',
            'collaborators:read', 'reports:read', 'dashboard:read'
          ]
        },
        {
          name: 'RH',
          display_name: 'Recursos Humanos',
          description: 'Gestão de colaboradores e relatórios',
          level: 80,
          permissions: [
            'collaborators:*', 'schedules:*', 'leaves:*', 'attendance:*',
            'reports:*', 'timerecords:read', 'dashboard:read',
            'analytics:read', 'notifications:read'
          ]
        },
        {
          name: 'GESTOR',
          display_name: 'Gestor',
          description: 'Gestão de equipe',
          level: 60,
          permissions: [
            'collaborators:read', 'schedules:read', 'attendance:read',
            'reports:read', 'timerecords:read', 'dashboard:read',
            'analytics:read'
          ]
        },
        {
          name: 'COLABORADOR',
          display_name: 'Colaborador',
          description: 'Acesso básico do colaborador',
          level: 20,
          permissions: [
            'timerecords:create', 'biometrics:create', 'biometrics:read',
            'schedules:read', 'leaves:create', 'notifications:read'
          ]
        },
        {
          name: 'TOTEM',
          display_name: 'Totem',
          description: 'Acesso do totem de ponto',
          level: 10,
          permissions: [
            'timerecords:create', 'biometrics:read', 'collaborators:read'
          ]
        }
      ];

      for (const role of roles) {
        // Inserir role
        const roleResult = await db.query(
          `INSERT INTO rbac_roles (name, display_name, description, level, is_system) 
           VALUES ($1, $2, $3, $4, true) RETURNING id`,
          [role.name, role.display_name, role.description, role.level]
        );

        const roleId = roleResult.rows[0].id;

        // Atribuir permissões
        await this.assignPermissionsToRole(roleId, role.permissions);
      }

      console.log('✅ Roles e permissões padrão criados com sucesso');

    } catch (error) {
      console.error('❌ Erro ao criar roles padrão:', error);
      throw error;
    }
  }

  /**
   * Gerar permissões combinando recursos e ações
   */
  async generatePermissions() {
    const query = `
      INSERT INTO rbac_permissions (resource_id, action_id, name, display_name, is_system)
      SELECT 
        r.id,
        a.id,
        CONCAT(r.name, ':', a.name),
        CONCAT(a.display_name, ' ', r.display_name),
        true
      FROM rbac_resources r
      CROSS JOIN rbac_actions a
      ON CONFLICT (name) DO NOTHING
    `;
    
    await db.query(query);
  }

  /**
   * Atribuir permissões a um role
   */
  async assignPermissionsToRole(roleId, permissions) {
    for (const permission of permissions) {
      if (permission === '*:*') {
        // Atribuir todas as permissões
        await db.query(`
          INSERT INTO rbac_role_permissions (role_id, permission_id)
          SELECT $1, id FROM rbac_permissions
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [roleId]);
      } else if (permission.includes('*')) {
        // Permissão com wildcard
        const [resource, action] = permission.split(':');
        
        if (action === '*') {
          // Todas as ações para um recurso
          await db.query(`
            INSERT INTO rbac_role_permissions (role_id, permission_id)
            SELECT $1, p.id 
            FROM rbac_permissions p
            JOIN rbac_resources r ON p.resource_id = r.id
            WHERE r.name = $2
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [roleId, resource]);
        }
      } else {
        // Permissão específica
        await db.query(`
          INSERT INTO rbac_role_permissions (role_id, permission_id)
          SELECT $1, id FROM rbac_permissions WHERE name = $2
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [roleId, permission]);
      }
    }
  }

  /**
   * Verificar se usuário tem permissão
   */
  async hasPermission(userId, permission, context = {}) {
    try {
      const startTime = Date.now();
      
      // Tentar buscar do cache primeiro
      const cachedPermissions = await this.getCachedPermissions(userId);
      if (cachedPermissions) {
        const hasAccess = this.checkPermissionInCache(cachedPermissions, permission, context);
        
        // Emitir evento se permissão foi negada
        if (!hasAccess) {
          this.emit('permission_denied', {
            userId,
            permission,
            context,
            timestamp: new Date(),
            source: 'cache'
          });
        }
        
        this.auditAccess(userId, permission, hasAccess, 'cache', Date.now() - startTime);
        return hasAccess;
      }

      // Buscar permissões do banco
      const userPermissions = await this.getUserPermissions(userId);
      
      // Cachear permissões
      await this.cacheUserPermissions(userId, userPermissions);
      
      // Verificar permissão
      const hasAccess = this.checkPermissionInList(userPermissions, permission, context);
      
      // Emitir evento se permissão foi negada
      if (!hasAccess) {
        this.emit('permission_denied', {
          userId,
          permission,
          context,
          timestamp: new Date(),
          source: 'database'
        });
      }
      
      this.auditAccess(userId, permission, hasAccess, 'database', Date.now() - startTime);
      return hasAccess;

    } catch (error) {
      console.error('❌ Erro ao verificar permissão:', error);
      this.auditAccess(userId, permission, false, 'error', 0, error.message);
      return false;
    }
  }

  /**
   * Obter permissões do usuário do banco
   */
  async getUserPermissions(userId) {
    const query = `
      SELECT DISTINCT
        p.name as permission,
        p.display_name,
        r.name as resource,
        a.name as action,
        role.name as role_name,
        role.level as role_level
      FROM rbac_user_roles ur
      JOIN rbac_roles role ON ur.role_id = role.id
      JOIN rbac_role_permissions rp ON role.id = rp.role_id
      JOIN rbac_permissions p ON rp.permission_id = p.id
      JOIN rbac_resources r ON p.resource_id = r.id
      JOIN rbac_actions a ON p.action_id = a.id
      WHERE ur.user_id = $1 
        AND ur.is_active = true
        AND role.is_active = true
        AND p.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY role.level DESC, p.name
    `;

    const result = await db.query(query, [userId]);
    
    return {
      permissions: result.rows.map(row => row.permission),
      roles: [...new Set(result.rows.map(row => row.role_name))],
      maxLevel: Math.max(...result.rows.map(row => row.role_level), 0),
      details: result.rows
    };
  }

  /**
   * Verificar permissão na lista
   */
  checkPermissionInList(userPermissions, requiredPermission, context = {}) {
    const { permissions } = userPermissions;
    
    // Verificar acesso total
    if (permissions.includes('*:*')) {
      return true;
    }

    // Verificar permissão exata
    if (permissions.includes(requiredPermission)) {
      return true;
    }

    // Verificar wildcards
    if (this.config.enableWildcards) {
      const [resource, action] = requiredPermission.split(':');
      
      // Verificar wildcard de ação (resource:*)
      if (permissions.includes(`${resource}:*`)) {
        return true;
      }
      
      // Verificar wildcard de recurso (*:action)
      if (permissions.includes(`*:${action}`)) {
        return true;
      }
    }

    // Verificar contexto (ex: own data)
    if (context.ownerId && context.userId === context.ownerId) {
      const ownPermission = `${requiredPermission}:own`;
      if (permissions.includes(ownPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cachear permissões do usuário
   */
  async cacheUserPermissions(userId, permissions) {
    try {
      const cacheKey = `rbac_permissions_${userId}`;
      await cacheManager.set(cacheKey, permissions, 'auth', this.config.cacheTimeout);
      
      this.permissionsCache.set(userId, {
        permissions,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Erro ao cachear permissões:', error);
    }
  }

  /**
   * Obter permissões do cache
   */
  async getCachedPermissions(userId) {
    try {
      // Tentar cache em memória primeiro
      const memoryCache = this.permissionsCache.get(userId);
      if (memoryCache && (Date.now() - memoryCache.timestamp) < (this.config.cacheTimeout * 1000)) {
        return memoryCache.permissions;
      }

      // Tentar cache distribuído
      const cacheKey = `rbac_permissions_${userId}`;
      const cached = await cacheManager.get(cacheKey, 'auth');
      
      if (cached) {
        // Atualizar cache em memória
        this.permissionsCache.set(userId, {
          permissions: cached,
          timestamp: Date.now()
        });
        return cached;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao obter permissões do cache:', error);
      return null;
    }
  }

  /**
   * Verificar permissão no cache
   */
  checkPermissionInCache(cachedPermissions, permission, context) {
    return this.checkPermissionInList(cachedPermissions, permission, context);
  }

  /**
   * Atribuir role a usuário
   */
  async assignRoleToUser(userId, roleName, assignedBy = null, expiresAt = null) {
    try {
      // Buscar role
      const roleResult = await db.query(
        'SELECT id FROM rbac_roles WHERE name = $1 AND is_active = true',
        [roleName]
      );

      if (roleResult.rows.length === 0) {
        throw new Error(`Role '${roleName}' não encontrado`);
      }

      const roleId = roleResult.rows[0].id;

      // Atribuir role
      await db.query(`
        INSERT INTO rbac_user_roles (user_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, role_id) 
        DO UPDATE SET 
          assigned_by = $3,
          assigned_at = NOW(),
          expires_at = $4,
          is_active = true
      `, [userId, roleId, assignedBy, expiresAt]);

      // Limpar cache
      await this.clearUserCache(userId);

      // Auditar
      await auditLogger.logUserAction(assignedBy || 'system', 'ROLE_ASSIGNED', {
        targetUserId: userId,
        roleName,
        expiresAt
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao atribuir role:', error);
      throw error;
    }
  }

  /**
   * Remover role de usuário
   */
  async removeRoleFromUser(userId, roleName, removedBy = null) {
    try {
      await db.query(`
        UPDATE rbac_user_roles 
        SET is_active = false
        FROM rbac_roles r
        WHERE rbac_user_roles.role_id = r.id
          AND rbac_user_roles.user_id = $1
          AND r.name = $2
      `, [userId, roleName]);

      // Limpar cache
      await this.clearUserCache(userId);

      // Auditar
      await auditLogger.logUserAction(removedBy || 'system', 'ROLE_REMOVED', {
        targetUserId: userId,
        roleName
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao remover role:', error);
      throw error;
    }
  }

  /**
   * Obter roles do usuário
   */
  async getUserRoles(userId) {
    const query = `
      SELECT 
        r.name,
        r.display_name,
        r.description,
        r.level,
        ur.assigned_at,
        ur.expires_at,
        ur.is_active
      FROM rbac_user_roles ur
      JOIN rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.level DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Limpar cache do usuário
   */
  async clearUserCache(userId) {
    try {
      // Limpar cache em memória
      this.permissionsCache.delete(userId);
      
      // Limpar cache distribuído
      const cacheKey = `rbac_permissions_${userId}`;
      await cacheManager.invalidate(cacheKey);
      
      // Limpar cache de sessão
      await db.query('DELETE FROM rbac_session_cache WHERE user_id = $1', [userId]);
      
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Auditar acesso
   */
  auditAccess(userId, permission, granted, source, responseTime, error = null) {
    if (!this.config.auditAll) return;

    try {
      auditLogger.logSecurityEvent('PERMISSION_CHECK', {
        userId,
        permission,
        granted,
        source,
        responseTime,
        error
      });
    } catch (auditError) {
      console.error('❌ Erro ao auditar acesso:', auditError);
    }
  }

  /**
   * Middleware para verificar permissão
   */
  requirePermission(permission, options = {}) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Usuário não autenticado',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        // Preparar contexto
        const context = {
          userId,
          ownerId: req.params.userId || req.body.userId || req.query.userId,
          method: req.method,
          path: req.path,
          ...options.context
        };

        // Verificar permissão
        const hasAccess = await this.hasPermission(userId, permission, context);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Permissão insuficiente',
            code: 'INSUFFICIENT_PERMISSION',
            requiredPermission: permission
          });
        }

        next();
      } catch (error) {
        console.error('❌ Erro no middleware de permissão:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno na verificação de permissões',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Middleware para verificar múltiplas permissões
   */
  requireAnyPermission(permissions, options = {}) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Usuário não autenticado'
          });
        }

        const context = {
          userId,
          ownerId: req.params.userId || req.body.userId || req.query.userId,
          method: req.method,
          path: req.path,
          ...options.context
        };

        // Verificar se tem pelo menos uma permissão
        let hasAccess = false;
        for (const permission of permissions) {
          if (await this.hasPermission(userId, permission, context)) {
            hasAccess = true;
            break;
          }
        }
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Permissão insuficiente',
            code: 'INSUFFICIENT_PERMISSION',
            requiredPermissions: permissions
          });
        }

        next();
      } catch (error) {
        console.error('❌ Erro no middleware de múltiplas permissões:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno na verificação de permissões'
        });
      }
    };
  }

  /**
   * Configurar limpeza de cache
   */
  setupCacheCleanup() {
    // Limpar cache expirado a cada hora
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 3600000); // 1 hora

    // Limpar cache de sessão expirado
    setInterval(() => {
      this.cleanupExpiredSessionCache();
    }, 1800000); // 30 minutos
  }

  /**
   * Limpar cache expirado
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const timeout = this.config.cacheTimeout * 1000;

    for (const [userId, cache] of this.permissionsCache.entries()) {
      if (now - cache.timestamp > timeout) {
        this.permissionsCache.delete(userId);
      }
    }
  }

  /**
   * Limpar cache de sessão expirado
   */
  async cleanupExpiredSessionCache() {
    try {
      await db.query('DELETE FROM rbac_session_cache WHERE expires_at < NOW()');
    } catch (error) {
      console.error('❌ Erro ao limpar cache de sessão:', error);
    }
  }

  /**
   * Obter estatísticas do RBAC
   */
  async getStats() {
    try {
      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM rbac_roles WHERE is_active = true) as total_roles,
          (SELECT COUNT(*) FROM rbac_permissions WHERE is_active = true) as total_permissions,
          (SELECT COUNT(*) FROM rbac_user_roles WHERE is_active = true) as total_user_roles,
          (SELECT COUNT(DISTINCT user_id) FROM rbac_user_roles WHERE is_active = true) as users_with_roles,
          (SELECT COUNT(*) FROM rbac_session_cache) as cached_sessions
      `);

      return {
        ...stats.rows[0],
        cache: {
          memoryCache: this.permissionsCache.size,
          hitRate: this.calculateCacheHitRate()
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }

  /**
   * Calcular taxa de hit do cache
   */
  calculateCacheHitRate() {
    // Implementar lógica de cálculo de hit rate
    return 0; // Placeholder
  }
}

// Singleton instance
const rbacManager = new RBACManager();

module.exports = rbacManager;
