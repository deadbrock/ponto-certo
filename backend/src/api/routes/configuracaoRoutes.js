const express = require('express');
const router = express.Router();
const configuracaoController = require('../../controllers/configuracaoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rotas para configurações
router.post('/parametros-sindicais', configuracaoController.salvarParametrosSindicais);

module.exports = router; 