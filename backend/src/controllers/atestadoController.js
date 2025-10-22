const db = require('../config/database');

const listarAtestados = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, colaborador_id } = req.query;
        const offset = (page - 1) * limit;
        
        console.log('📋 ATESTADOS: Listando atestados...');
        console.log('🔍 Parâmetros recebidos:', req.query);
        
        // Construir query com filtros opcionais
        let query = `
            SELECT 
                a.id,
                a.colaborador_id,
                a.tipo,
                a.data_inicio,
                a.data_fim,
                a.dias_afastamento,
                a.cid,
                a.observacao,
                a.arquivo_url,
                a.status,
                a.aprovado_por,
                a.data_aprovacao,
                a.criado_em,
                a.atualizado_em,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf
            FROM atestados a
            LEFT JOIN colaboradores c ON a.colaborador_id = c.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramIndex = 1;
        
        // Filtro por status
        if (status) {
            query += ` AND a.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        
        // Filtro por colaborador
        if (colaborador_id) {
            query += ` AND a.colaborador_id = $${paramIndex}`;
            queryParams.push(colaborador_id);
            paramIndex++;
        }
        
        query += ` ORDER BY a.criado_em DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);

        // Contar total
        let countQuery = 'SELECT COUNT(*) FROM atestados a WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (status) {
            countQuery += ` AND a.status = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }
        
        if (colaborador_id) {
            countQuery += ` AND a.colaborador_id = $${countParamIndex}`;
            countParams.push(colaborador_id);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        console.log('✅ ATESTADOS: Retornando dados reais do banco');
        console.log(`📊 Total de atestados: ${total}`);
        
        res.status(200).json({
            success: true,
            solicitacoes: result.rows,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('❌ ATESTADOS: Erro ao listar:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const criarAtestado = async (req, res) => {
    try {
        const {
            colaborador_id,
            tipo,
            data_inicio,
            data_fim,
            dias_afastamento,
            cid,
            observacao,
            arquivo_url
        } = req.body;

        console.log(`[${new Date()}] Criando atestado para colaborador ${colaborador_id}`);

        // Validações
        if (!colaborador_id || !tipo || !data_inicio || !data_fim) {
            return res.status(400).json({
                success: false,
                error: 'Colaborador, tipo, data de início e data de fim são obrigatórios'
            });
        }

        // Verificar se colaborador existe
        const colaboradorQuery = 'SELECT id, nome FROM colaboradores WHERE id = $1';
        const colaboradorResult = await db.query(colaboradorQuery, [colaborador_id]);
        
        if (colaboradorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const query = `
            INSERT INTO atestados (
                colaborador_id, tipo, data_inicio, data_fim,
                dias_afastamento, cid, observacao, arquivo_url, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente')
            RETURNING *
        `;

        const values = [
            colaborador_id, tipo, data_inicio, data_fim,
            dias_afastamento || null, cid || null, observacao || null, arquivo_url || null
        ];

        const result = await db.query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Atestado criado com sucesso',
            atestado: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao criar atestado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const atualizarStatusAtestado = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, observacao } = req.body;
        const usuario_id = req.user?.id || null;

        console.log(`[${new Date()}] Atualizando status do atestado ${id} para ${status}`);

        // Verificar se atestado existe
        const atestadoQuery = 'SELECT id FROM atestados WHERE id = $1';
        const atestadoResult = await db.query(atestadoQuery, [id]);
        
        if (atestadoResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atestado não encontrado'
            });
        }

        const query = `
            UPDATE atestados SET
                status = $1,
                observacao = COALESCE($2, observacao),
                aprovado_por = $3,
                data_aprovacao = CASE WHEN $1 IN ('aprovado', 'rejeitado') THEN CURRENT_TIMESTAMP ELSE data_aprovacao END,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;

        const result = await db.query(query, [status, observacao, usuario_id, id]);

        return res.status(200).json({
            success: true,
            message: 'Status do atestado atualizado com sucesso',
            atestado: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar status do atestado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const obterEstatisticasAtestados = async (req, res) => {
    try {
        console.log(`[${new Date()}] Obtendo estatísticas de atestados`);

        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as aprovados,
                SUM(CASE WHEN status = 'rejeitado' THEN 1 ELSE 0 END) as rejeitados,
                SUM(CASE WHEN DATE(criado_em) = CURRENT_DATE THEN 1 ELSE 0 END) as hoje
            FROM atestados
        `;

        const result = await db.query(query);
        const stats = result.rows[0];

        return res.status(200).json({
            success: true,
            estatisticas: {
                total: parseInt(stats.total),
                pendentes: parseInt(stats.pendentes),
                aprovados: parseInt(stats.aprovados),
                rejeitados: parseInt(stats.rejeitados),
                hoje: parseInt(stats.hoje)
            }
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas de atestados:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    listarAtestados,
    criarAtestado,
    atualizarStatusAtestado,
    obterEstatisticasAtestados
}; 