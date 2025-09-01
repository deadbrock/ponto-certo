const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const relatoriosController = require('../../controllers/relatoriosController');

// Middleware para verificar se usuário tem permissão para importar relatórios
const verificarPermissaoRelatorios = (req, res, next) => {
  const usuario = req.user;
  
  // Verificar se usuário está logado
  if (!usuario) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }
  
  // Verificar se tem perfil adequado (ADMINISTRADOR ou RH)
  const perfisPermitidos = ['ADMINISTRADOR', 'RH', 'ADMIN'];
  
  if (!perfisPermitidos.includes(usuario.perfil?.toUpperCase())) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas usuários com perfil ADMINISTRADOR ou RH podem importar relatórios.',
      perfilUsuario: usuario.perfil,
      perfisNecessarios: perfisPermitidos
    });
  }
  
  console.log(`✅ Usuário ${usuario.email} (${usuario.perfil}) autorizado para importar relatórios`);
  next();
};

/**
 * @route POST /api/relatorios/importar-txt
 * @desc Importar arquivo TXT do relógio de ponto KP-RE1032
 * @access Private (ADMINISTRADOR, RH)
 */
router.post('/importar-txt', 
  authMiddleware,
  verificarPermissaoRelatorios,
  relatoriosController.upload.single('arquivo'),
  relatoriosController.importarArquivoTxt
);

/**
 * @route GET /api/relatorios/arquivos
 * @desc Listar arquivos de relatórios importados
 * @access Private (ADMINISTRADOR, RH)
 */
router.get('/arquivos',
  authMiddleware,
  verificarPermissaoRelatorios,
  relatoriosController.listarArquivosImportados
);

/**
 * @route GET /api/relatorios/arquivos/:id
 * @desc Obter detalhes de um arquivo importado específico
 * @access Private (ADMINISTRADOR, RH)
 */
router.get('/arquivos/:id',
  authMiddleware,
  verificarPermissaoRelatorios,
  relatoriosController.obterDetalhesArquivo
);

/**
 * @route GET /api/relatorios/registros
 * @desc Listar registros de ponto importados com filtros
 * @access Private (ADMINISTRADOR, RH)
 */
router.get('/registros', authMiddleware, verificarPermissaoRelatorios, async (req, res) => {
  try {
    const db = require('../../config/database');
    
    // Parâmetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Filtros opcionais
    const { 
      dataInicio, 
      dataFim, 
      idColaborador, 
      origem = 'arquivo_txt',
      status 
    } = req.query;
    
    // Construir query dinâmica
    let whereConditions = ['r.origem = $1'];
    let params = [origem];
    let paramIndex = 2;
    
    if (dataInicio) {
      whereConditions.push(`r.data_hora >= $${paramIndex}`);
      params.push(dataInicio);
      paramIndex++;
    }
    
    if (dataFim) {
      whereConditions.push(`r.data_hora <= $${paramIndex}`);
      params.push(dataFim + ' 23:59:59');
      paramIndex++;
    }
    
    if (idColaborador) {
      whereConditions.push(`r.id_colaborador = $${paramIndex}`);
      params.push(idColaborador);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        r.id,
        r.data_hora,
        r.origem,
        r.status,
        r.observacoes,
        r.criado_em,
        c.id as colaborador_id,
        c.nome as colaborador_nome,
        c.pis as colaborador_pis
      FROM registros_ponto r
      LEFT JOIN colaboradores c ON r.id_colaborador = c.id
      ${whereClause}
      ORDER BY r.data_hora DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM registros_ponto r
      LEFT JOIN colaboradores c ON r.id_colaborador = c.id
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2); // Remove limit e offset
    
    const [registros, totalCount] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);
    
    res.json({
      success: true,
      dados: registros.rows,
      paginacao: {
        paginaAtual: page,
        totalPaginas: Math.ceil(totalCount.rows[0].total / limit),
        totalRegistros: parseInt(totalCount.rows[0].total),
        registrosPorPagina: limit
      },
      filtros: {
        dataInicio,
        dataFim,
        idColaborador,
        origem,
        status
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar registros de ponto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar registros de ponto importados'
    });
  }
});

/**
 * @route DELETE /api/relatorios/registros/:id
 * @desc Excluir um registro de ponto específico
 * @access Private (ADMINISTRADOR)
 */
router.delete('/registros/:id', authMiddleware, (req, res, next) => {
  // Apenas ADMINISTRADOR pode excluir registros
  if (req.user.perfil?.toUpperCase() !== 'ADMINISTRADOR') {
    return res.status(403).json({
      success: false,
      message: 'Apenas usuários ADMINISTRADOR podem excluir registros'
    });
  }
  next();
}, async (req, res) => {
  try {
    const db = require('../../config/database');
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM registros_ponto WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Registro excluído com sucesso',
      registro: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao excluir registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir registro de ponto'
    });
  }
});

/**
 * @route GET /api/relatorios/estatisticas
 * @desc Obter estatísticas dos relatórios importados
 * @access Private (ADMINISTRADOR, RH)
 */
router.get('/estatisticas', authMiddleware, verificarPermissaoRelatorios, async (req, res) => {
  try {
    const db = require('../../config/database');
    
    // Estatísticas dos arquivos importados
    const statsArquivos = await db.query(`
      SELECT 
        COUNT(*) as total_arquivos,
        SUM(total_registros) as total_registros_processados,
        SUM(registros_validos) as total_registros_validos,
        SUM(registros_invalidos) as total_registros_invalidos,
        AVG(registros_validos::float / NULLIF(total_registros, 0) * 100) as taxa_sucesso_media
      FROM arquivos_importados
    `);
    
    // Estatísticas dos registros por período
    const statsRegistros = await db.query(`
      SELECT 
        DATE(data_hora) as data,
        COUNT(*) as quantidade_registros
      FROM registros_ponto 
      WHERE origem = 'arquivo_txt'
        AND data_hora >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(data_hora)
      ORDER BY data DESC
      LIMIT 30
    `);
    
    // Top colaboradores com mais registros
    const topColaboradores = await db.query(`
      SELECT 
        c.nome,
        c.pis,
        COUNT(r.id) as total_registros
      FROM registros_ponto r
      JOIN colaboradores c ON r.id_colaborador = c.id
      WHERE r.origem = 'arquivo_txt'
        AND r.data_hora >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY c.id, c.nome, c.pis
      ORDER BY total_registros DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      estatisticas: {
        arquivos: statsArquivos.rows[0],
        registrosPorDia: statsRegistros.rows,
        topColaboradores: topColaboradores.rows
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas dos relatórios'
    });
  }
});

module.exports = router;