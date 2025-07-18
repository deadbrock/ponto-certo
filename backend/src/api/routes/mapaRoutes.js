const express = require('express');
const router = express.Router();

// GET /api/contratos/estados - Retorna status de contratos por UF
router.get('/estados', (req, res) => {
  try {
    // DADOS MOCK REMOVIDOS - Retornar dados vazios para sistema limpo
    // Em produção, aqui você conectaria com uma tabela de contratos real
    const estadosContratos = {
      // Todos os estados começam sem contratos
      // Conforme contratos forem cadastrados no sistema, os status serão atualizados
    };

    res.json(estadosContratos);
  } catch (error) {
    console.error('Erro ao buscar estados com contratos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar dados dos estados'
    });
  }
});

// GET /api/contratos/estatisticas - Retorna estatísticas gerais
router.get('/estatisticas', (req, res) => {
  try {
    // DADOS MOCK REMOVIDOS - Retornar estatísticas vazias para sistema limpo
    const estatisticas = {
      totalContratos: 0,
      contratosAtivos: 0,
      contratosVencidos: 0,
      contratosProximoVencimento: 0,
      valorTotalContratos: 0,
      colaboradoresAtivos: 0,
      estadosComContratos: 0
    };

    res.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar estatísticas'
    });
  }
});

module.exports = router; 