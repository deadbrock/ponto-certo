const express = require('express');
const router = express.Router();
const usuarioController = require('../../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdminOrRH, requireAdmin } = require('../middlewares/roleMiddleware');

// Todas as rotas de usuários requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/usuarios
 * @desc Listar usuários
 * @access Private
 * @query {number} limite - Limite de registros (padrão: 20)
 * @query {number} offset - Offset para paginação (padrão: 0)
 * @query {string} search - Busca por nome ou email
 * @query {string} perfil - Filtro por perfil
 * @query {boolean} ativo - Filtro por status ativo
 */
router.get('/', requireAdminOrRH, usuarioController.listarUsuarios);

/**
 * @route POST /api/usuarios
 * @desc Cadastrar novo usuário
 * @access Private (Admin ou RH)
 */
router.post('/', requireAdminOrRH, usuarioController.cadastrarUsuario);

/**
 * @route PUT /api/usuarios/:id
 * @desc Editar usuário
 * @access Private
 */
router.put('/:id', usuarioController.editarUsuario);

/**
 * @route PATCH /api/usuarios/:id/ativar
 * @desc Ativar usuário
 * @access Private
 */
router.patch('/:id/ativar', usuarioController.ativarUsuario);

/**
 * @route PATCH /api/usuarios/:id/desativar
 * @desc Desativar usuário
 * @access Private
 */
router.patch('/:id/desativar', usuarioController.desativarUsuario);

module.exports = router; 