const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rotas de Suporte
 * Endpoints para gerenciamento de chamados de suporte
 */

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

/**
 * GET /api/suporte/chamados
 * Listar todos os chamados de suporte
 */
router.get('/chamados', async (req, res) => {
  try {
    // Por enquanto retornar array vazio - implementar futuramente quando houver tabela
    res.json({
      success: true,
      chamados: [],
      total: 0,
      message: 'Nenhum chamado encontrado'
    });
  } catch (error) {
    console.error('Erro ao buscar chamados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar chamados'
    });
  }
});

/**
 * POST /api/suporte/chamados
 * Criar novo chamado de suporte
 */
router.post('/chamados', async (req, res) => {
  try {
    const { titulo, descricao, prioridade } = req.body;
    
    // Por enquanto retornar sucesso - implementar quando houver tabela
    res.json({
      success: true,
      chamado: {
        id: Date.now(),
        titulo,
        descricao,
        prioridade: prioridade || 'media',
        status: 'aberto',
        criado_em: new Date().toISOString()
      },
      message: 'Chamado criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar chamado'
    });
  }
});

/**
 * GET /api/suporte/chamados/:id
 * Buscar chamado específico
 */
router.get('/chamados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.status(404).json({
      success: false,
      message: 'Chamado não encontrado'
    });
  } catch (error) {
    console.error('Erro ao buscar chamado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar chamado'
    });
  }
});

module.exports = router;

