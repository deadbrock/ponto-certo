const db = require('../config/database');

const listarEscalas = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log(`[${new Date()}] Listando escalas - Página ${page}`);

        // Buscar escalas reais do PostgreSQL
        const query = `
            SELECT 
                e.id,
                e.colaborador_id,
                e.tipo_escala,
                e.horario_inicio,
                e.horario_fim,
                e.dias_semana,
                e.data_inicio,
                e.data_fim,
                e.observacoes,
                e.criado_em,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf
            FROM escalas e
            LEFT JOIN colaboradores c ON e.colaborador_id = c.id
            ORDER BY e.criado_em DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, [limit, offset]);

        // Contar total de escalas
        const countQuery = 'SELECT COUNT(*) FROM escalas';
        const countResult = await db.query(countQuery);
        const total = parseInt(countResult.rows[0].count);

        return res.status(200).json({
            success: true,
            escalas: result.rows,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Erro ao listar escalas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const cadastrarEscala = async (req, res) => {
    try {
        const {
            colaborador_id,
            tipo_escala,
            horario_inicio,
            horario_fim,
            dias_semana,
            data_inicio,
            data_fim,
            observacoes
        } = req.body;

        console.log(`[${new Date()}] Cadastrando nova escala para colaborador ${colaborador_id}`);

        // Validações
        if (!colaborador_id || !tipo_escala || !horario_inicio || !horario_fim) {
            return res.status(400).json({
                success: false,
                error: 'Colaborador, tipo de escala e horários são obrigatórios'
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
            INSERT INTO escalas (
                colaborador_id, tipo_escala, horario_inicio, horario_fim,
                dias_semana, data_inicio, data_fim, observacoes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            colaborador_id, tipo_escala, horario_inicio, horario_fim,
            dias_semana || '[]', data_inicio, data_fim, observacoes
        ];

        const result = await db.query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Escala cadastrada com sucesso',
            escala: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const editarEscala = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            colaborador_id,
            tipo_escala,
            horario_inicio,
            horario_fim,
            dias_semana,
            data_inicio,
            data_fim,
            observacoes
        } = req.body;

        console.log(`[${new Date()}] Editando escala ${id}`);

        // Verificar se escala existe
        const escalaQuery = 'SELECT id FROM escalas WHERE id = $1';
        const escalaResult = await db.query(escalaQuery, [id]);
        
        if (escalaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Escala não encontrada'
            });
        }

        const query = `
            UPDATE escalas SET
                colaborador_id = $1,
                tipo_escala = $2,
                horario_inicio = $3,
                horario_fim = $4,
                dias_semana = $5,
                data_inicio = $6,
                data_fim = $7,
                observacoes = $8,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;

        const values = [
            colaborador_id, tipo_escala, horario_inicio, horario_fim,
            dias_semana || '[]', data_inicio, data_fim, observacoes, id
        ];

        const result = await db.query(query, values);

        return res.status(200).json({
            success: true,
            message: 'Escala atualizada com sucesso',
            escala: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao editar escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const excluirEscala = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`[${new Date()}] Excluindo escala ${id}`);

        // Verificar se escala existe
        const escalaQuery = 'SELECT id FROM escalas WHERE id = $1';
        const escalaResult = await db.query(escalaQuery, [id]);
        
        if (escalaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Escala não encontrada'
            });
        }

        const query = 'DELETE FROM escalas WHERE id = $1';
        await db.query(query, [id]);

        return res.status(200).json({
            success: true,
            message: 'Escala excluída com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarFeriados = async (req, res) => {
    try {
        console.log(`[${new Date()}] Listando feriados`);

        // Buscar feriados reais do PostgreSQL
        const query = `
            SELECT 
                id,
                nome,
                data_feriado,
                tipo,
                recorrente,
                observacoes,
                criado_em
            FROM feriados
            ORDER BY data_feriado ASC
        `;

        const result = await db.query(query);

        return res.status(200).json({
            success: true,
            feriados: result.rows
        });

    } catch (error) {
        console.error('Erro ao listar feriados:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const cadastrarFeriado = async (req, res) => {
    try {
        const { nome, data_feriado, tipo, recorrente, observacoes } = req.body;

        console.log(`[${new Date()}] Cadastrando feriado: ${nome}`);

        // Validações
        if (!nome || !data_feriado) {
            return res.status(400).json({
                success: false,
                error: 'Nome e data do feriado são obrigatórios'
            });
        }

        const query = `
            INSERT INTO feriados (nome, data_feriado, tipo, recorrente, observacoes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [nome, data_feriado, tipo || 'nacional', recorrente || false, observacoes];
        const result = await db.query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Feriado cadastrado com sucesso',
            feriado: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar feriado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    listarEscalas,
    cadastrarEscala,
    editarEscala,
    excluirEscala,
    listarFeriados,
    cadastrarFeriado
}; 