const db = require('../config/database');

const registrarLog = async (req, res) => {
    try {
        const { usuario_id, acao, detalhes, ip_address } = req.body;

        console.log(`[${new Date()}] Registrando log de auditoria`);

        const query = `
            INSERT INTO logs_auditoria (usuario_id, acao, detalhes, ip_address, data_hora)
            VALUES ($1, $2, $3, $4, NOW() AT TIME ZONE 'America/Sao_Paulo')
            RETURNING *
        `;

        const result = await db.query(query, [usuario_id, acao, detalhes, ip_address]);

        return res.status(201).json({
            success: true,
            message: 'Log registrado com sucesso',
            log: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao registrar log:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarLogs = async (req, res) => {
    try {
        const { limite = 50, offset = 0, usuario, acao, data_inicio, data_fim } = req.query;

        console.log(`[${new Date()}] Listando logs de auditoria`);

        let query = `
            SELECT 
                la.id,
                la.data_hora,
                la.acao,
                la.detalhes,
                la.ip_address,
                u.nome as usuario_nome,
                u.email as usuario_email
            FROM logs_auditoria la
            LEFT JOIN usuarios u ON la.usuario_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (usuario) {
            query += ` AND u.nome ILIKE $${queryParams.length + 1}`;
            queryParams.push(`%${usuario}%`);
        }

        if (acao) {
            query += ` AND la.acao ILIKE $${queryParams.length + 1}`;
            queryParams.push(`%${acao}%`);
        }

        if (data_inicio) {
            query += ` AND la.data_hora >= $${queryParams.length + 1}`;
            queryParams.push(data_inicio);
        }

        if (data_fim) {
            query += ` AND la.data_hora <= $${queryParams.length + 1}`;
            queryParams.push(data_fim);
        }

        query += ` ORDER BY la.data_hora DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limite, offset);

        const result = await db.query(query, queryParams);

        // Contar total de registros
        let countQuery = `
            SELECT COUNT(*) as total
            FROM logs_auditoria la
            LEFT JOIN usuarios u ON la.usuario_id = u.id
            WHERE 1=1
        `;
        const countParams = [];

        if (usuario) {
            countQuery += ` AND u.nome ILIKE $${countParams.length + 1}`;
            countParams.push(`%${usuario}%`);
        }

        if (acao) {
            countQuery += ` AND la.acao ILIKE $${countParams.length + 1}`;
            countParams.push(`%${acao}%`);
        }

        if (data_inicio) {
            countQuery += ` AND la.data_hora >= $${countParams.length + 1}`;
            countParams.push(data_inicio);
        }

        if (data_fim) {
            countQuery += ` AND la.data_hora <= $${countParams.length + 1}`;
            countParams.push(data_fim);
        }

        const countResult = await db.query(countQuery, countParams);

        return res.status(200).json({
            success: true,
            logs: result.rows,
            total: parseInt(countResult.rows[0].total),
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao listar logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const registrarCorrecaoPonto = async (req, res) => {
    try {
        const { colaborador_id, usuario_autor_id, acao, justificativa, data_hora_original, data_hora_nova } = req.body;

        console.log(`[${new Date()}] Registrando correção de ponto`);

        // Iniciar transação
        await db.query('BEGIN');

        try {
            // Registrar na tabela de correções
            const correcaoQuery = `
                INSERT INTO correcoes_ponto (
                    colaborador_id, 
                    usuario_autor_id, 
                    acao, 
                    justificativa, 
                    data_hora_original, 
                    data_hora_nova,
                    data_correcao
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW() AT TIME ZONE 'America/Sao_Paulo')
                RETURNING *
            `;

            const correcaoResult = await db.query(correcaoQuery, [
                colaborador_id, 
                usuario_autor_id, 
                acao, 
                justificativa, 
                data_hora_original, 
                data_hora_nova
            ]);

            // Buscar informações do colaborador e usuário para o log
            const infoQuery = `
                SELECT 
                    c.nome as colaborador_nome,
                    u.nome as usuario_nome
                FROM colaboradores c, usuarios u
                WHERE c.id = $1 AND u.id = $2
            `;
            const infoResult = await db.query(infoQuery, [colaborador_id, usuario_autor_id]);

            // Registrar log de auditoria
            const logQuery = `
                INSERT INTO logs_auditoria (usuario_id, acao, detalhes, data_hora)
                VALUES ($1, $2, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')
            `;

            const detalhes = `Correção de ponto para ${infoResult.rows[0].colaborador_nome}: ${acao}. Justificativa: ${justificativa}`;
            await db.query(logQuery, [usuario_autor_id, 'Correção de Ponto', detalhes]);

            // Confirmar transação
            await db.query('COMMIT');

            return res.status(201).json({
                success: true,
                message: 'Correção registrada com sucesso',
                correcao: {
                    ...correcaoResult.rows[0],
                    colaborador_nome: infoResult.rows[0].colaborador_nome,
                    usuario_nome: infoResult.rows[0].usuario_nome
                }
            });

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Erro ao registrar correção:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarCorrecoes = async (req, res) => {
    try {
        const { limite = 50, offset = 0, colaborador, autor, data_inicio, data_fim } = req.query;

        console.log(`[${new Date()}] Listando correções de ponto`);

        let query = `
            SELECT 
                cp.id,
                cp.data_correcao,
                cp.acao,
                cp.justificativa,
                cp.data_hora_original,
                cp.data_hora_nova,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf,
                u.nome as usuario_autor_nome
            FROM correcoes_ponto cp
            JOIN colaboradores c ON cp.colaborador_id = c.id
            JOIN usuarios u ON cp.usuario_autor_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (colaborador) {
            query += ` AND c.nome ILIKE $${queryParams.length + 1}`;
            queryParams.push(`%${colaborador}%`);
        }

        if (autor) {
            query += ` AND u.nome ILIKE $${queryParams.length + 1}`;
            queryParams.push(`%${autor}%`);
        }

        if (data_inicio) {
            query += ` AND cp.data_correcao >= $${queryParams.length + 1}`;
            queryParams.push(data_inicio);
        }

        if (data_fim) {
            query += ` AND cp.data_correcao <= $${queryParams.length + 1}`;
            queryParams.push(data_fim);
        }

        query += ` ORDER BY cp.data_correcao DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limite, offset);

        const result = await db.query(query, queryParams);

        // Contar total
        let countQuery = `
            SELECT COUNT(*) as total
            FROM correcoes_ponto cp
            JOIN colaboradores c ON cp.colaborador_id = c.id
            JOIN usuarios u ON cp.usuario_autor_id = u.id
            WHERE 1=1
        `;
        const countParams = [];

        if (colaborador) {
            countQuery += ` AND c.nome ILIKE $${countParams.length + 1}`;
            countParams.push(`%${colaborador}%`);
        }

        if (autor) {
            countQuery += ` AND u.nome ILIKE $${countParams.length + 1}`;
            countParams.push(`%${autor}%`);
        }

        if (data_inicio) {
            countQuery += ` AND cp.data_correcao >= $${countParams.length + 1}`;
            countParams.push(data_inicio);
        }

        if (data_fim) {
            countQuery += ` AND cp.data_correcao <= $${countParams.length + 1}`;
            countParams.push(data_fim);
        }

        const countResult = await db.query(countQuery, countParams);

        return res.status(200).json({
            success: true,
            correcoes: result.rows,
            total: parseInt(countResult.rows[0].total),
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao listar correções:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    registrarLog,
    listarLogs,
    registrarCorrecaoPonto,
    listarCorrecoes
}; 