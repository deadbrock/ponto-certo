const db = require('../config/database');

/**
 * Controlador para gerenciar consentimentos LGPD
 * Art. 7º LGPD - Consentimento explícito para dados sensíveis
 */

/**
 * Registrar consentimento para dados biométricos
 * POST /api/consentimento/biometrico
 */
const registrarConsentimentoBiometrico = async (req, res) => {
  try {
    const {
      colaborador_id,
      cpf,
      nome_completo,
      aceita_biometria,
      finalidade,
      ip_address,
      user_agent
    } = req.body;

    // Validações obrigatórias LGPD
    if (!colaborador_id || !cpf || !nome_completo) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios: colaborador_id, cpf, nome_completo'
      });
    }

    if (aceita_biometria === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Consentimento explícito obrigatório (aceita_biometria)'
      });
    }

    // Verificar se colaborador existe
    const colaboradorQuery = 'SELECT id, nome, cpf FROM colaboradores WHERE id = $1 AND cpf = $2';
    const colaboradorResult = await db.query(colaboradorQuery, [colaborador_id, cpf]);

    if (colaboradorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado ou CPF não confere'
      });
    }

    // Criar tabela de consentimentos se não existir
    await db.query(`
      CREATE TABLE IF NOT EXISTS consentimentos_lgpd (
        id SERIAL PRIMARY KEY,
        colaborador_id INTEGER NOT NULL,
        cpf VARCHAR(11) NOT NULL,
        nome_completo VARCHAR(255) NOT NULL,
        tipo_dados VARCHAR(50) NOT NULL,
        finalidade TEXT NOT NULL,
        aceita_tratamento BOOLEAN NOT NULL,
        data_consentimento TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        revogado BOOLEAN DEFAULT FALSE,
        data_revogacao TIMESTAMP,
        versao_termo VARCHAR(10) DEFAULT '1.0',
        hash_consentimento VARCHAR(64),
        criado_em TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
      )
    `);

    // Gerar hash único do consentimento
    const crypto = require('crypto');
    const dadosConsentimento = `${colaborador_id}-${cpf}-${aceita_biometria}-${new Date().toISOString()}`;
    const hashConsentimento = crypto.createHash('sha256').update(dadosConsentimento).digest('hex');

    // Inserir consentimento
    const insertQuery = `
      INSERT INTO consentimentos_lgpd 
      (colaborador_id, cpf, nome_completo, tipo_dados, finalidade, aceita_tratamento, 
       ip_address, user_agent, hash_consentimento)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, data_consentimento, hash_consentimento
    `;

    const finalidadeTexto = finalidade || 'Controle de ponto eletrônico por reconhecimento facial conforme legislação trabalhista brasileira';

    const result = await db.query(insertQuery, [
      colaborador_id,
      cpf,
      nome_completo,
      'biometria_facial',
      finalidadeTexto,
      aceita_biometria,
      ip_address,
      user_agent,
      hashConsentimento
    ]);

    // Log de auditoria
    console.log(`🔍 LGPD: Consentimento registrado - Colaborador ${colaborador_id} - ${aceita_biometria ? 'ACEITO' : 'RECUSADO'}`);

    return res.status(201).json({
      success: true,
      message: 'Consentimento registrado com sucesso',
      consentimento: {
        id: result.rows[0].id,
        colaborador_id: colaborador_id,
        aceita_tratamento: aceita_biometria,
        data_consentimento: result.rows[0].data_consentimento,
        hash_consentimento: result.rows[0].hash_consentimento,
        finalidade: finalidadeTexto
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar consentimento LGPD:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

/**
 * Consultar consentimento de um colaborador
 * GET /api/consentimento/colaborador/:id
 */
const consultarConsentimento = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, colaborador_id, cpf, nome_completo, tipo_dados, finalidade,
        aceita_tratamento, data_consentimento, revogado, data_revogacao,
        versao_termo, hash_consentimento
      FROM consentimentos_lgpd 
      WHERE colaborador_id = $1 
      ORDER BY data_consentimento DESC
      LIMIT 1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum consentimento encontrado para este colaborador'
      });
    }

    return res.status(200).json({
      success: true,
      consentimento: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erro ao consultar consentimento:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

/**
 * Revogar consentimento (Direito de revogação LGPD Art. 8º)
 * POST /api/consentimento/revogar
 */
const revogarConsentimento = async (req, res) => {
  try {
    const { colaborador_id, motivo } = req.body;

    if (!colaborador_id) {
      return res.status(400).json({
        success: false,
        error: 'colaborador_id obrigatório'
      });
    }

    // Atualizar consentimento para revogado
    const updateQuery = `
      UPDATE consentimentos_lgpd 
      SET revogado = TRUE, data_revogacao = NOW()
      WHERE colaborador_id = $1 AND revogado = FALSE
      RETURNING id, data_revogacao
    `;

    const result = await db.query(updateQuery, [colaborador_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum consentimento ativo encontrado para revogar'
      });
    }

    // Marcar colaborador como sem face cadastrada
    await db.query(
      'UPDATE colaboradores SET face_cadastrada = FALSE WHERE id = $1',
      [colaborador_id]
    );

    // Log de auditoria
    console.log(`🔍 LGPD: Consentimento REVOGADO - Colaborador ${colaborador_id} - Motivo: ${motivo || 'Não informado'}`);

    return res.status(200).json({
      success: true,
      message: 'Consentimento revogado com sucesso',
      data_revogacao: result.rows[0].data_revogacao,
      observacao: 'Dados biométricos serão removidos conforme política de retenção'
    });

  } catch (error) {
    console.error('❌ Erro ao revogar consentimento:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

/**
 * Listar todos os consentimentos (para auditoria)
 * GET /api/consentimento/auditoria
 */
const listarConsentimentosAuditoria = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        c.id, c.colaborador_id, c.cpf, c.nome_completo,
        c.aceita_tratamento, c.data_consentimento, c.revogado, 
        c.data_revogacao, c.finalidade, c.hash_consentimento,
        col.nome as nome_colaborador_atual
      FROM consentimentos_lgpd c
      LEFT JOIN colaboradores col ON c.colaborador_id = col.id
      ORDER BY c.data_consentimento DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);

    // Contar total
    const countQuery = 'SELECT COUNT(*) as total FROM consentimentos_lgpd';
    const countResult = await db.query(countQuery);

    return res.status(200).json({
      success: true,
      consentimentos: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar consentimentos:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

module.exports = {
  registrarConsentimentoBiometrico,
  consultarConsentimento,
  revogarConsentimento,
  listarConsentimentosAuditoria
};
