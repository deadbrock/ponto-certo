/**
 * 🚨 ROTAS DE ALERTAS DE SEGURANÇA
 * 
 * API completa para gerenciamento de alertas de segurança:
 * - Dashboard de alertas em tempo real
 * - Gestão de alertas (acknowledge/resolve)
 * - Configuração de regras de alerta
 * - Gestão de canais de notificação
 * - Relatórios e métricas de segurança
 */

const express = require('express');
const router = express.Router();
const alertManager = require('../../utils/alertManager');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireRBACPermission } = require('../middlewares/roleMiddleware');
const auditLogger = require('../../utils/auditLogger');
const db = require('../../config/database');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/alerts/dashboard
 * @desc Dashboard de alertas em tempo real
 * @access Admin/Security
 */
router.get('/dashboard', requireRBACPermission('security:read'), async (req, res) => {
  try {
    const stats = alertManager.getStats();
    
    // Alertas ativos por severidade
    const activeBySeverity = await db.query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM security_alerts 
      WHERE status = 'ACTIVE'
      GROUP BY severity
      ORDER BY 
        CASE severity 
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          WHEN 'INFO' THEN 5
        END
    `);

    // Alertas recentes (últimas 24h)
    const recentAlerts = await db.query(`
      SELECT 
        alert_id,
        type,
        severity,
        title,
        created_at,
        acknowledged,
        resolved,
        escalated
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Top tipos de alerta (última semana)
    const topTypes = await db.query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    `);

    // Tendências (comparar com semana anterior)
    const trends = await db.query(`
      SELECT 
        'current_week' as period,
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'previous_week' as period,
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '14 days'
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    res.json({
      success: true,
      dashboard: {
        overview: stats,
        activeBySeverity: activeBySeverity.rows,
        recentAlerts: recentAlerts.rows,
        topTypes: topTypes.rows,
        trends: trends.rows,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erro ao obter dashboard de alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts
 * @desc Listar alertas com filtros
 * @access Admin/Security
 */
router.get('/', requireRBACPermission('security:read'), async (req, res) => {
  try {
    const {
      status = 'ACTIVE',
      severity,
      type,
      acknowledged,
      resolved,
      start_date,
      end_date,
      user_id,
      ip_address,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        sa.*,
        u.nome as user_name,
        ack_u.nome as acknowledged_by_name,
        res_u.nome as resolved_by_name
      FROM security_alerts sa
      LEFT JOIN usuarios u ON sa.user_id = u.id
      LEFT JOIN usuarios ack_u ON sa.acknowledged_by = ack_u.id
      LEFT JOIN usuarios res_u ON sa.resolved_by = res_u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtros
    if (status) {
      query += ` AND sa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      query += ` AND sa.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (type) {
      query += ` AND sa.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (acknowledged !== undefined) {
      query += ` AND sa.acknowledged = $${paramIndex}`;
      params.push(acknowledged === 'true');
      paramIndex++;
    }

    if (resolved !== undefined) {
      query += ` AND sa.resolved = $${paramIndex}`;
      params.push(resolved === 'true');
      paramIndex++;
    }

    if (start_date) {
      query += ` AND sa.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND sa.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND sa.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (ip_address) {
      query += ` AND sa.ip_address = $${paramIndex}`;
      params.push(ip_address);
      paramIndex++;
    }

    query += ` ORDER BY sa.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const alerts = await db.query(query, params);

    // Contar total para paginação
    let countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    countQuery = countQuery.replace(/ORDER BY.*/, '').replace(/LIMIT.*/, '');
    const countParams = params.slice(0, -2); // Remover limit e offset
    
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].total);

    res.json({
      success: true,
      alerts: alerts.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts/:alertId
 * @desc Obter detalhes de um alerta específico
 * @access Admin/Security
 */
router.get('/:alertId', requireRBACPermission('security:read'), async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await db.query(`
      SELECT 
        sa.*,
        u.nome as user_name,
        u.email as user_email,
        ack_u.nome as acknowledged_by_name,
        res_u.nome as resolved_by_name
      FROM security_alerts sa
      LEFT JOIN usuarios u ON sa.user_id = u.id
      LEFT JOIN usuarios ack_u ON sa.acknowledged_by = ack_u.id
      LEFT JOIN usuarios res_u ON sa.resolved_by = res_u.id
      WHERE sa.alert_id = $1
    `, [alertId]);

    if (alert.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }

    // Obter notificações relacionadas
    const notifications = await db.query(`
      SELECT * FROM alert_notifications 
      WHERE alert_id = $1 
      ORDER BY sent_at DESC
    `, [alertId]);

    // Obter eventos correlacionados se houver
    let correlatedEvents = [];
    if (alert.rows[0].correlation_id) {
      correlatedEvents = await db.query(`
        SELECT * FROM security_alerts 
        WHERE correlation_id = $1 AND alert_id != $2
        ORDER BY created_at DESC
      `, [alert.rows[0].correlation_id, alertId]);
    }

    res.json({
      success: true,
      alert: {
        ...alert.rows[0],
        notifications: notifications.rows,
        correlatedEvents: correlatedEvents.rows
      }
    });

  } catch (error) {
    console.error('Erro ao obter alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/:alertId/acknowledge
 * @desc Reconhecer alerta
 * @access Admin/Security
 */
router.post('/:alertId/acknowledge', requireRBACPermission('security:manage'), async (req, res) => {
  try {
    const { alertId } = req.params;
    
    await alertManager.acknowledgeAlert(alertId, req.user.id);
    
    res.json({
      success: true,
      message: 'Alerta reconhecido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/:alertId/resolve
 * @desc Resolver alerta
 * @access Admin/Security
 */
router.post('/:alertId/resolve', requireRBACPermission('security:manage'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution_notes } = req.body;
    
    await alertManager.resolveAlert(alertId, req.user.id);
    
    // Registrar notas de resolução se fornecidas
    if (resolution_notes) {
      await auditLogger.logUserAction(req.user.id, 'ALERT_RESOLVED', {
        alert_id: alertId,
        notes: resolution_notes
      });
    }
    
    res.json({
      success: true,
      message: 'Alerta resolvido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/:alertId/false-positive
 * @desc Marcar alerta como falso positivo
 * @access Admin only
 */
router.post('/:alertId/false-positive', requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;

    // Atualizar no banco
    await db.query(`
      UPDATE security_alerts 
      SET false_positive = true, resolved = true, resolved_by = $1, 
          resolved_at = NOW(), status = 'FALSE_POSITIVE', updated_at = NOW()
      WHERE alert_id = $2
    `, [req.user.id, alertId]);

    // Remover dos alertas ativos
    alertManager.activeAlerts.delete(alertId);

    // Atualizar métricas
    alertManager.metrics.falsePositives++;

    // Auditar
    await auditLogger.logUserAction(req.user.id, 'ALERT_FALSE_POSITIVE', {
      alert_id: alertId,
      reason
    });

    res.json({
      success: true,
      message: 'Alerta marcado como falso positivo'
    });

  } catch (error) {
    console.error('Erro ao marcar falso positivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts/rules
 * @desc Listar regras de alerta
 * @access Admin only
 */
router.get('/rules', requireAdmin, async (req, res) => {
  try {
    const rules = await db.query(`
      SELECT * FROM alert_rules 
      ORDER BY severity DESC, name
    `);

    res.json({
      success: true,
      rules: rules.rows,
      total: rules.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar regras:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/rules
 * @desc Criar nova regra de alerta
 * @access Admin only
 */
router.post('/rules', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      type,
      severity,
      conditions,
      actions,
      cooldown_minutes = 5,
      escalation_minutes = 15,
      correlation_enabled = false
    } = req.body;

    // Validações
    if (!name || !type || !severity || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: name, type, severity, conditions, actions'
      });
    }

    // Inserir regra
    await db.query(`
      INSERT INTO alert_rules (
        name, type, severity, conditions, actions, 
        cooldown_minutes, escalation_minutes, correlation_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      name, type, severity,
      JSON.stringify(conditions),
      JSON.stringify(actions),
      cooldown_minutes,
      escalation_minutes,
      correlation_enabled
    ]);

    // Recarregar regras no alert manager
    await alertManager.loadAlertRules();

    // Auditar
    await auditLogger.logUserAction(req.user.id, 'ALERT_RULE_CREATED', {
      rule_name: name,
      type,
      severity
    });

    res.status(201).json({
      success: true,
      message: 'Regra de alerta criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar regra:', error);
    res.status(500).json({
      success: false,
      error: error.code === '23505' ? 'Regra com este nome já existe' : 'Erro interno do servidor'
    });
  }
});

/**
 * @route PUT /api/alerts/rules/:id
 * @desc Atualizar regra de alerta
 * @access Admin only
 */
router.put('/rules/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      severity,
      enabled,
      conditions,
      actions,
      cooldown_minutes,
      escalation_minutes,
      correlation_enabled
    } = req.body;

    // Verificar se regra existe
    const rule = await db.query('SELECT * FROM alert_rules WHERE id = $1', [id]);
    if (rule.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    // Atualizar regra
    await db.query(`
      UPDATE alert_rules 
      SET type = COALESCE($1, type),
          severity = COALESCE($2, severity),
          enabled = COALESCE($3, enabled),
          conditions = COALESCE($4, conditions),
          actions = COALESCE($5, actions),
          cooldown_minutes = COALESCE($6, cooldown_minutes),
          escalation_minutes = COALESCE($7, escalation_minutes),
          correlation_enabled = COALESCE($8, correlation_enabled),
          updated_at = NOW()
      WHERE id = $9
    `, [
      type,
      severity,
      enabled,
      conditions ? JSON.stringify(conditions) : null,
      actions ? JSON.stringify(actions) : null,
      cooldown_minutes,
      escalation_minutes,
      correlation_enabled,
      id
    ]);

    // Recarregar regras
    await alertManager.loadAlertRules();

    // Auditar
    await auditLogger.logUserAction(req.user.id, 'ALERT_RULE_UPDATED', {
      rule_id: id,
      rule_name: rule.rows[0].name
    });

    res.json({
      success: true,
      message: 'Regra atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts/channels
 * @desc Listar canais de notificação
 * @access Admin only
 */
router.get('/channels', requireAdmin, async (req, res) => {
  try {
    const channels = await db.query(`
      SELECT 
        id,
        name,
        type,
        enabled,
        severities,
        created_at,
        updated_at
      FROM notification_channels 
      ORDER BY name
    `);

    // Obter estatísticas de envio por canal
    const stats = await db.query(`
      SELECT 
        channel_name,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'SENT' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
      FROM alert_notifications 
      WHERE sent_at >= NOW() - INTERVAL '7 days'
      GROUP BY channel_name
    `);

    const channelsWithStats = channels.rows.map(channel => {
      const channelStats = stats.rows.find(s => s.channel_name === channel.name);
      return {
        ...channel,
        stats: channelStats || { total_sent: 0, successful: 0, failed: 0 }
      };
    });

    res.json({
      success: true,
      channels: channelsWithStats,
      total: channels.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar canais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/test-notification
 * @desc Testar notificação
 * @access Admin only
 */
router.post('/test-notification', requireAdmin, async (req, res) => {
  try {
    const { channel, severity = 'INFO' } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: 'Canal é obrigatório'
      });
    }

    // Criar alerta de teste
    const testAlert = {
      id: `TEST-${Date.now()}`,
      type: 'TEST',
      severity,
      title: 'Teste de Notificação',
      description: `Este é um teste de notificação do canal ${channel} disparado por ${req.user.nome}`,
      source: 'test',
      user_id: req.user.id,
      created_at: new Date()
    };

    // Enviar notificação
    const success = await alertManager.sendNotifications(testAlert, [channel]);

    res.json({
      success: true,
      message: success ? 'Notificação de teste enviada com sucesso' : 'Falha ao enviar notificação de teste',
      sent: success
    });

  } catch (error) {
    console.error('Erro ao testar notificação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts/metrics
 * @desc Obter métricas de alertas
 * @access Admin/Security
 */
router.get('/metrics', requireRBACPermission('security:read'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Determinar intervalo
    let interval;
    switch (period) {
      case '24h': interval = '24 hours'; break;
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
      default: interval = '7 days';
    }

    // Métricas gerais
    const generalMetrics = await db.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_alerts,
        COUNT(CASE WHEN acknowledged = true THEN 1 END) as acknowledged_alerts,
        COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_alerts,
        COUNT(CASE WHEN false_positive = true THEN 1 END) as false_positives,
        COUNT(CASE WHEN escalated = true THEN 1 END) as escalated_alerts,
        AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))/60) as avg_acknowledge_time_minutes,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_resolution_time_minutes
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `);

    // Alertas por dia
    const dailyAlerts = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top tipos de alerta
    const topTypes = await db.query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN false_positive = true THEN 1 END) as false_positive_count
      FROM security_alerts 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      metrics: {
        period,
        general: generalMetrics.rows[0],
        daily: dailyAlerts.rows,
        topTypes: topTypes.rows,
        systemMetrics: alertManager.getStats()
      }
    });

  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/alerts/bulk-acknowledge
 * @desc Reconhecer múltiplos alertas
 * @access Admin only
 */
router.post('/bulk-acknowledge', requireAdmin, async (req, res) => {
  try {
    const { alertIds, filters } = req.body;
    
    let processedCount = 0;
    let errorCount = 0;

    if (alertIds && Array.isArray(alertIds)) {
      // Reconhecer alertas específicos
      for (const alertId of alertIds) {
        try {
          await alertManager.acknowledgeAlert(alertId, req.user.id);
          processedCount++;
        } catch (error) {
          console.error(`Erro ao reconhecer alerta ${alertId}:`, error);
          errorCount++;
        }
      }
    } else if (filters) {
      // Reconhecer baseado em filtros
      let query = 'UPDATE security_alerts SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW() WHERE status = $2';
      const params = [req.user.id, 'ACTIVE'];
      let paramIndex = 3;

      if (filters.severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      const result = await db.query(query, params);
      processedCount = result.rowCount;
    }

    // Auditar operação em lote
    await auditLogger.logUserAction(req.user.id, 'BULK_ALERT_ACKNOWLEDGE', {
      processed_count: processedCount,
      error_count: errorCount,
      filters: filters || { alertIds: alertIds?.length }
    });

    res.json({
      success: true,
      message: `${processedCount} alerta(s) reconhecido(s) com sucesso`,
      stats: { processedCount, errorCount }
    });

  } catch (error) {
    console.error('Erro no reconhecimento em lote:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/alerts/export
 * @desc Exportar alertas
 * @access Admin only
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      format = 'json',
      start_date,
      end_date,
      severity,
      type
    } = req.query;

    let query = `
      SELECT 
        sa.*,
        u.nome as user_name
      FROM security_alerts sa
      LEFT JOIN usuarios u ON sa.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND sa.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND sa.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (severity) {
      query += ` AND sa.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (type) {
      query += ` AND sa.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ' ORDER BY sa.created_at DESC';

    const alerts = await db.query(query, params);

    // Auditar exportação
    await auditLogger.logUserAction(req.user.id, 'ALERTS_EXPORTED', {
      format,
      count: alerts.rows.length,
      filters: { start_date, end_date, severity, type }
    });

    if (format === 'csv') {
      // Converter para CSV
      const csv = this.convertToCSV(alerts.rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=security-alerts-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // Retornar JSON
      res.json({
        success: true,
        alerts: alerts.rows,
        total: alerts.rows.length,
        exported_at: new Date()
      });
    }

  } catch (error) {
    console.error('Erro ao exportar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Converter alertas para CSV
 */
function convertToCSV(alerts) {
  const headers = [
    'ID', 'Tipo', 'Severidade', 'Título', 'Descrição', 'Usuário',
    'IP', 'Status', 'Reconhecido', 'Resolvido', 'Escalado', 'Data Criação'
  ];

  const rows = alerts.map(alert => [
    alert.alert_id,
    alert.type,
    alert.severity,
    alert.title,
    alert.description.replace(/"/g, '""'),
    alert.user_name || '',
    alert.ip_address || '',
    alert.status,
    alert.acknowledged ? 'Sim' : 'Não',
    alert.resolved ? 'Sim' : 'Não',
    alert.escalated ? 'Sim' : 'Não',
    alert.created_at
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

module.exports = router;
