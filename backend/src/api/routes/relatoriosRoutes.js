const express = require('express');
const router = express.Router();
const pontoController = require('../../controllers/pontoController');
const db = require('../../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas de relatórios requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/relatorios/afd
 * @desc Gerar relatório AFD (Portaria 671/2021)
 * @access Private
 * @query {string} data_inicio - Data de início (YYYY-MM-DD)
 * @query {string} data_fim - Data de fim (YYYY-MM-DD)
 */
router.get('/afd', pontoController.gerarRelatorioAFD);

/**
 * @route GET /api/relatorios/acjef
 * @desc Gerar relatório ACJEF
 * @access Private
 * @query {string} data_inicio - Data de início (YYYY-MM-DD)
 * @query {string} data_fim - Data de fim (YYYY-MM-DD)
 */
router.get('/acjef', pontoController.gerarRelatorioACJEF);

/**
 * @route GET /api/relatorios/geral
 * @desc Gerar relatório geral de ponto
 * @access Private
 */
router.get('/geral', pontoController.gerarRelatorio);

/**
 * @route GET /api/relatorios/presenca-colaboradores
 * @desc Gerar relatório de presença dos colaboradores
 * @access Public
 */
router.get('/presenca-colaboradores', async (req, res) => {
    try {
        console.log(`[${new Date()}] Gerando relatório de presença dos colaboradores`);

        const query = `
            SELECT 
                c.nome,
                c.cpf,
                COUNT(rp.id) as total_registros,
                COUNT(CASE WHEN DATE(rp.data_hora) = CURRENT_DATE THEN 1 END) as registros_hoje,
                MAX(rp.data_hora) as ultimo_registro,
                CASE 
                    WHEN COUNT(rp.id) > 0 THEN 
                        ROUND((COUNT(CASE WHEN EXTRACT(HOUR FROM rp.data_hora) <= 8 THEN 1 END)::float / COUNT(rp.id)) * 100, 1)
                    ELSE 0 
                END as pontualidade
            FROM colaboradores c
            LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
                AND rp.data_hora >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY c.id, c.nome, c.cpf
            ORDER BY c.nome
        `;

        const result = await db.query(query);
        
        const colaboradores = result.rows.map(colaborador => ({
            nome: colaborador.nome,
            cpf: colaborador.cpf,
            totalRegistros: parseInt(colaborador.total_registros) || 0,
            registrosHoje: parseInt(colaborador.registros_hoje) || 0,
            ultimoRegistro: colaborador.ultimo_registro ? 
                new Date(colaborador.ultimo_registro).toLocaleDateString('pt-BR') : 
                'Nunca',
            pontualidade: `${colaborador.pontualidade || 0}%`,
            status: parseInt(colaborador.registros_hoje) > 0 ? 'Presente' : 'Ausente'
        }));

        return res.status(200).json({
            success: true,
            colaboradores,
            total: colaboradores.length,
            data_geracao: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao gerar relatório de presença:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 