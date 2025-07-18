const express = require('express');
const router = express.Router();
const atestadoController = require('../../controllers/atestadoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', atestadoController.listarAtestados);
router.patch('/:id/aprovar', atestadoController.aprovarAtestado);
router.patch('/:id/rejeitar', atestadoController.rejeitarAtestado);

module.exports = router; 