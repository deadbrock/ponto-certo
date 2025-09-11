const express = require('express');
const router = express.Router();
const primeiroRegistroController = require('../../controllers/primeiroRegistroController');
const { logCPF } = require('../../utils/safeConsole');

/**
 * Rotas para Primeiro Registro de Colaboradores
 * Fluxo: CPF → Dados → Confirmação → Face → Ponto
 */

/**
 * @route POST /api/primeiro-registro/consultar-cpf
 * @desc Consultar colaborador por CPF para primeiro registro
 * @access Public (sem autenticação - usado pelo totem)
 */
router.post('/consultar-cpf', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    logCPF('🔍 Consultando CPF:', cpf);
    
    if (!cpf) {
      return res.status(400).json({
        success: false,
        message: 'CPF é obrigatório'
      });
    }

    const db = require('../../config/database');
    
    // Buscar colaborador usando apenas campos básicos
    const query = `
      SELECT id, nome, cpf, email, cargo, departamento
      FROM colaboradores 
      WHERE cpf = $1
      LIMIT 1
    `;
    
    const result = await db.query(query, [cpf]);
    
    if (result.rows.length === 0) {
      logCPF('❌ CPF não encontrado:', cpf);
      return res.status(404).json({
        success: false,
        message: 'CPF não encontrado no sistema. Verifique com o RH.'
      });
    }
    
    const colaborador = result.rows[0];
    console.log('✅ Colaborador encontrado:', colaborador.nome);
    
    return res.status(200).json({
      success: true,
      message: 'Colaborador encontrado! Confirme os dados para continuar.',
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        cpf: colaborador.cpf,
        cargo: colaborador.cargo || 'Colaborador',
        departamento: colaborador.departamento || 'Geral',
        email: colaborador.email || '',
        // Dados simulados para teste
        data_nascimento: '1990-05-15',
        face_cadastrada: false
      },
      instrucoes: 'Confirme se o nome está correto e prossiga para o cadastro da face'
    });
    
  } catch (error) {
    console.error('❌ Erro ao consultar CPF:', error.message); // Error não contém CPF
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/primeiro-registro/cadastrar-face
 * @desc Cadastrar face e registrar primeiro ponto
 * @access Public (sem autenticação - usado pelo totem)
 */
router.post('/cadastrar-face', 
  primeiroRegistroController.upload.single('image'),
  primeiroRegistroController.confirmarERegistrarFace
);

/**
 * @route GET /api/primeiro-registro/colaboradores-pendentes
 * @desc Listar colaboradores que ainda não fizeram primeiro registro
 * @access Public (para relatórios administrativos)
 */
router.get('/colaboradores-pendentes', primeiroRegistroController.listarColaboradoresPendentes);

/**
 * @route GET /api/primeiro-registro/estatisticas
 * @desc Estatísticas do primeiro registro
 * @access Public
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const db = require('../../config/database');
    
    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) as total_colaboradores,
        COUNT(*) FILTER (WHERE face_cadastrada = true) as com_face_cadastrada,
        COUNT(*) FILTER (WHERE face_cadastrada = false) as pendentes_primeiro_registro,
        COUNT(*) FILTER (WHERE ativo = true) as colaboradores_ativos
      FROM colaboradores
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Registros de primeiro cadastro por data
    const registrosQuery = `
      SELECT 
        DATE(r.data_hora) as data,
        COUNT(*) as quantidade
      FROM registros_ponto r
      WHERE r.origem = 'primeiro_registro'
        AND r.data_hora >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(r.data_hora)
      ORDER BY data DESC
      LIMIT 30
    `;
    
    const registrosResult = await db.query(registrosQuery);
    
    return res.status(200).json({
      success: true,
      estatisticas: {
        totalColaboradores: parseInt(stats.total_colaboradores),
        comFaceCadastrada: parseInt(stats.com_face_cadastrada),
        pendentesPrimeiroRegistro: parseInt(stats.pendentes_primeiro_registro),
        colaboradoresAtivos: parseInt(stats.colaboradores_ativos),
        percentualConcluido: stats.total_colaboradores > 0 
          ? ((stats.com_face_cadastrada / stats.total_colaboradores) * 100).toFixed(1)
          : 0
      },
      registrosPorDia: registrosResult.rows
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas'
    });
  }
});

module.exports = router;