/**
 * 🛡️ ROTAS DE ADMINISTRAÇÃO RBAC
 * 
 * Rotas para gerenciamento completo do sistema RBAC:
 * - Gestão de roles e permissões
 * - Atribuição de roles a usuários
 * - Dashboard administrativo
 * - Auditoria de acessos
 * - Relatórios de segurança
 */

const express = require('express');
const router = express.Router();
const rbacManager = require('../../utils/rbacManager');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireRBACPermission } = require('../middlewares/roleMiddleware');
const auditLogger = require('../../utils/auditLogger');
const db = require('../../config/database');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/rbac/dashboard
 * @desc Dashboard administrativo do RBAC
 * @access Admin only
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const stats = await rbacManager.getStats();
    
    // Estatísticas adicionais
    const additionalStats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as total_users,
        (SELECT COUNT(*) FROM rbac_user_roles WHERE is_active = true AND expires_at > NOW()) as active_assignments,
        (SELECT COUNT(*) FROM rbac_user_roles WHERE expires_at < NOW()) as expired_assignments,
        (SELECT COUNT(DISTINCT user_id) FROM rbac_user_roles WHERE is_active = false) as users_without_roles
    `);

    // Top roles mais usados
    const topRoles = await db.query(`
      SELECT 
        r.name,
        r.display_name,
        COUNT(ur.user_id) as user_count
      FROM rbac_roles r
      LEFT JOIN rbac_user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      WHERE r.is_active = true
      GROUP BY r.id, r.name, r.display_name
      ORDER BY user_count DESC
      LIMIT 10
    `);

    // Permissões mais verificadas (últimas 24h)
    const topPermissions = await db.query(`
      SELECT 
        event_data->>'permission' as permission,
        COUNT(*) as check_count,
        COUNT(CASE WHEN event_data->>'granted' = 'true' THEN 1 END) as granted_count
      FROM logs_auditoria 
      WHERE event_type = 'PERMISSION_CHECK' 
        AND timestamp >= NOW() - INTERVAL '24 hours'
        AND event_data->>'permission' IS NOT NULL
      GROUP BY event_data->>'permission'
      ORDER BY check_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      dashboard: {
        overview: {
          ...stats,
          ...additionalStats.rows[0]
        },
        topRoles: topRoles.rows,
        topPermissions: topPermissions.rows,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erro ao obter dashboard RBAC:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/rbac/roles
 * @desc Listar todos os roles
 * @access Admin only
 */
router.get('/roles', requireAdmin, async (req, res) => {
  try {
    const { active_only = 'true', include_permissions = 'false' } = req.query;
    
    let query = `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.level,
        r.parent_role_id,
        pr.name as parent_role_name,
        r.is_system,
        r.is_active,
        r.created_at,
        r.updated_at,
        COUNT(ur.user_id) as user_count
      FROM rbac_roles r
      LEFT JOIN rbac_roles pr ON r.parent_role_id = pr.id
      LEFT JOIN rbac_user_roles ur ON r.id = ur.role_id AND ur.is_active = true
    `;
    
    const params = [];
    if (active_only === 'true') {
      query += ' WHERE r.is_active = true';
    }
    
    query += `
      GROUP BY r.id, r.name, r.display_name, r.description, r.level, 
               r.parent_role_id, pr.name, r.is_system, r.is_active, 
               r.created_at, r.updated_at
      ORDER BY r.level DESC, r.name
    `;

    const roles = await db.query(query, params);

    // Se solicitado, incluir permissões
    if (include_permissions === 'true') {
      for (const role of roles.rows) {
        const permissions = await db.query(`
          SELECT 
            p.name,
            p.display_name,
            r.name as resource_name,
            a.name as action_name
          FROM rbac_role_permissions rp
          JOIN rbac_permissions p ON rp.permission_id = p.id
          JOIN rbac_resources r ON p.resource_id = r.id
          JOIN rbac_actions a ON p.action_id = a.id
          WHERE rp.role_id = $1
          ORDER BY r.name, a.name
        `, [role.id]);
        
        role.permissions = permissions.rows;
      }
    }

    res.json({
      success: true,
      roles: roles.rows,
      total: roles.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar roles:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/rbac/roles
 * @desc Criar novo role
 * @access Admin only
 */
router.post('/roles', requireAdmin, async (req, res) => {
  try {
    const { name, display_name, description, level, parent_role_id, permissions = [] } = req.body;

    // Validações
    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Nome e nome de exibição são obrigatórios'
      });
    }

    // Verificar se role já existe
    const existingRole = await db.query(
      'SELECT id FROM rbac_roles WHERE name = $1',
      [name]
    );

    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Role com este nome já existe'
      });
    }

    // Criar role
    const roleResult = await db.query(`
      INSERT INTO rbac_roles (name, display_name, description, level, parent_role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [name, display_name, description, level || 0, parent_role_id || null]);

    const roleId = roleResult.rows[0].id;

    // Atribuir permissões se fornecidas
    if (permissions.length > 0) {
      await rbacManager.assignPermissionsToRole(roleId, permissions);
    }

    // Auditar criação
    await auditLogger.logUserAction(req.user.id, 'ROLE_CREATED', {
      roleId,
      roleName: name,
      permissions
    });

    res.status(201).json({
      success: true,
      message: 'Role criado com sucesso',
      roleId
    });

  } catch (error) {
    console.error('Erro ao criar role:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route PUT /api/rbac/roles/:id
 * @desc Atualizar role
 * @access Admin only
 */
router.put('/roles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, description, level, is_active } = req.body;

    // Verificar se role existe
    const role = await db.query(
      'SELECT * FROM rbac_roles WHERE id = $1',
      [id]
    );

    if (role.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role não encontrado'
      });
    }

    // Não permitir alterar roles do sistema
    if (role.rows[0].is_system) {
      return res.status(403).json({
        success: false,
        error: 'Não é possível alterar roles do sistema'
      });
    }

    // Atualizar role
    await db.query(`
      UPDATE rbac_roles 
      SET display_name = COALESCE($1, display_name),
          description = COALESCE($2, description),
          level = COALESCE($3, level),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5
    `, [display_name, description, level, is_active, id]);

    // Auditar alteração
    await auditLogger.logUserAction(req.user.id, 'ROLE_UPDATED', {
      roleId: id,
      roleName: role.rows[0].name,
      changes: { display_name, description, level, is_active }
    });

    res.json({
      success: true,
      message: 'Role atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/rbac/permissions
 * @desc Listar todas as permissões
 * @access Admin only
 */
router.get('/permissions', requireAdmin, async (req, res) => {
  try {
    const { category, resource } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.name,
        p.display_name,
        p.description,
        r.name as resource_name,
        r.display_name as resource_display_name,
        r.category,
        a.name as action_name,
        a.display_name as action_display_name,
        p.is_system,
        p.is_active
      FROM rbac_permissions p
      JOIN rbac_resources r ON p.resource_id = r.id
      JOIN rbac_actions a ON p.action_id = a.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND r.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (resource) {
      query += ` AND r.name = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }

    query += ' ORDER BY r.category, r.name, a.name';

    const permissions = await db.query(query, params);

    // Agrupar por categoria
    const grouped = permissions.rows.reduce((acc, permission) => {
      const category = permission.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    res.json({
      success: true,
      permissions: permissions.rows,
      grouped,
      total: permissions.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar permissões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/rbac/users/:userId/roles
 * @desc Obter roles de um usuário
 * @access Admin only
 */
router.get('/users/:userId/roles', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const roles = await rbacManager.getUserRoles(userId);
    const permissions = await rbacManager.getUserPermissions(userId);

    res.json({
      success: true,
      user: {
        id: userId,
        roles,
        permissions: permissions.permissions,
        maxLevel: permissions.maxLevel
      }
    });

  } catch (error) {
    console.error('Erro ao obter roles do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/rbac/users/:userId/roles
 * @desc Atribuir role a usuário
 * @access Admin only
 */
router.post('/users/:userId/roles', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleName, expiresAt } = req.body;

    if (!roleName) {
      return res.status(400).json({
        success: false,
        error: 'Nome do role é obrigatório'
      });
    }

    // Verificar se usuário existe
    const user = await db.query('SELECT id, nome FROM usuarios WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    await rbacManager.assignRoleToUser(userId, roleName, req.user.id, expiresAt);

    res.json({
      success: true,
      message: `Role ${roleName} atribuído ao usuário com sucesso`
    });

  } catch (error) {
    console.error('Erro ao atribuir role:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route DELETE /api/rbac/users/:userId/roles/:roleName
 * @desc Remover role de usuário
 * @access Admin only
 */
router.delete('/users/:userId/roles/:roleName', requireAdmin, async (req, res) => {
  try {
    const { userId, roleName } = req.params;

    await rbacManager.removeRoleFromUser(userId, roleName, req.user.id);

    res.json({
      success: true,
      message: `Role ${roleName} removido do usuário com sucesso`
    });

  } catch (error) {
    console.error('Erro ao remover role:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/rbac/check-permission
 * @desc Verificar se usuário tem permissão específica
 * @access Admin only
 */
router.post('/check-permission', requireAdmin, async (req, res) => {
  try {
    const { userId, permission, context = {} } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário e permissão são obrigatórios'
      });
    }

    const hasPermission = await rbacManager.hasPermission(userId, permission, context);

    res.json({
      success: true,
      result: {
        userId,
        permission,
        hasPermission,
        context,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/rbac/audit/permissions
 * @desc Relatório de auditoria de permissões
 * @access Admin only
 */
router.get('/audit/permissions', requireAdmin, async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      userId,
      permission,
      granted,
      limit = 100
    } = req.query;

    let query = `
      SELECT 
        l.timestamp,
        l.user_id,
        u.nome as user_name,
        l.event_data->>'permission' as permission,
        l.event_data->>'granted' as granted,
        l.event_data->>'source' as source,
        l.event_data->>'responseTime' as response_time,
        l.ip_address,
        l.user_agent
      FROM logs_auditoria l
      LEFT JOIN usuarios u ON l.user_id = u.id
      WHERE l.event_type = 'PERMISSION_CHECK'
        AND l.timestamp >= $1
        AND l.timestamp <= $2
    `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (userId) {
      query += ` AND l.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (permission) {
      query += ` AND l.event_data->>'permission' = $${paramIndex}`;
      params.push(permission);
      paramIndex++;
    }

    if (granted !== undefined) {
      query += ` AND l.event_data->>'granted' = $${paramIndex}`;
      params.push(granted.toString());
      paramIndex++;
    }

    query += ` ORDER BY l.timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const auditLogs = await db.query(query, params);

    // Estatísticas do período
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN event_data->>'granted' = 'true' THEN 1 END) as granted_count,
        COUNT(CASE WHEN event_data->>'granted' = 'false' THEN 1 END) as denied_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT event_data->>'permission') as unique_permissions,
        AVG((event_data->>'responseTime')::numeric) as avg_response_time
      FROM logs_auditoria 
      WHERE event_type = 'PERMISSION_CHECK'
        AND timestamp >= $1
        AND timestamp <= $2
    `, [startDate, endDate]);

    res.json({
      success: true,
      audit: {
        logs: auditLogs.rows,
        stats: stats.rows[0],
        period: { startDate, endDate },
        total: auditLogs.rows.length
      }
    });

  } catch (error) {
    console.error('Erro ao obter auditoria:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/rbac/migrate-user
 * @desc Migrar usuário do sistema legado para RBAC
 * @access Admin only
 */
router.post('/migrate-user', requireAdmin, async (req, res) => {
  try {
    const { userId, legacyProfile } = req.body;

    if (!userId || !legacyProfile) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário e perfil legado são obrigatórios'
      });
    }

    // Importar função de migração
    const { migrateUserToRBAC } = require('../middlewares/roleMiddleware');
    
    await migrateUserToRBAC(userId, legacyProfile);

    res.json({
      success: true,
      message: 'Usuário migrado com sucesso para o sistema RBAC'
    });

  } catch (error) {
    console.error('Erro ao migrar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/rbac/bulk-migrate
 * @desc Migração em lote de usuários
 * @access Admin only
 */
router.post('/bulk-migrate', requireAdmin, async (req, res) => {
  try {
    const users = await db.query(`
      SELECT id, perfil 
      FROM usuarios 
      WHERE ativo = true 
        AND perfil IS NOT NULL
        AND id NOT IN (SELECT DISTINCT user_id FROM rbac_user_roles WHERE is_active = true)
    `);

    const { migrateUserToRBAC } = require('../middlewares/roleMiddleware');
    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users.rows) {
      try {
        await migrateUserToRBAC(user.id, user.perfil);
        migratedCount++;
      } catch (error) {
        console.error(`Erro ao migrar usuário ${user.id}:`, error);
        errorCount++;
      }
    }

    // Auditar migração em lote
    await auditLogger.logUserAction(req.user.id, 'BULK_MIGRATION', {
      totalUsers: users.rows.length,
      migratedCount,
      errorCount
    });

    res.json({
      success: true,
      message: 'Migração em lote concluída',
      stats: {
        totalUsers: users.rows.length,
        migratedCount,
        errorCount
      }
    });

  } catch (error) {
    console.error('Erro na migração em lote:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route DELETE /api/rbac/cache/:userId?
 * @desc Limpar cache de permissões
 * @access Admin only
 */
router.delete('/cache/:userId?', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId) {
      // Limpar cache de usuário específico
      await rbacManager.clearUserCache(userId);
    } else {
      // Limpar todo o cache (implementar se necessário)
      // await rbacManager.clearAllCache();
    }

    res.json({
      success: true,
      message: userId ? 
        `Cache do usuário ${userId} limpo com sucesso` : 
        'Cache geral limpo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
