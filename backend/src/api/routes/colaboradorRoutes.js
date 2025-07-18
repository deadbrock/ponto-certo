const express = require('express');
const router = express.Router();
const colaboradorController = require('../../controllers/colaboradorController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route GET /api/colaboradores
 * @desc Buscar colaboradores
 * @access Private
 */
router.get('/', authMiddleware, colaboradorController.buscarColaboradores);

/**
 * @route GET /api/colaboradores/public
 * @desc Buscar colaboradores (temporário sem auth para debug)
 * @access Public
 */
router.get('/public', colaboradorController.buscarColaboradores);

module.exports = router; 