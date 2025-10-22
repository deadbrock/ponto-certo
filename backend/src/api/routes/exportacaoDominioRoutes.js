const express = require('express');
const router = express.Router();
const exportacaoDominioController = require('../../controllers/exportacaoDominioController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rotas de Exportação para Domínio Sistemas
 * Gera arquivos .txt com layout fixo para importação de lançamentos
 */

// Aplicar autenticação a todas as rotas
router.use(authMiddleware);

/**
 * @route POST /api/exportar-dominio
 * @desc Gera arquivo .txt para importação no Domínio Sistemas
 * @access Autenticado (Admin/RH/Gestor)
 * @body {
 *   competencia: string (AAAAMM),
 *   tipoFolha: string ('11','41','42','51','52'),
 *   codigoEmpresa: number,
 *   registros: [{
 *     codigoEmpregado: number,
 *     codigoRubrica: number,
 *     valor: number (decimal)
 *   }]
 * }
 */
router.post('/', exportacaoDominioController.exportarArquivoDominio);

module.exports = router;

