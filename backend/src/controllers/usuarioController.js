const db = require('../config/database');
const bcrypt = require('bcrypt');

const listarUsuarios = async (req, res) => {
    try {
        const { limite = 20, offset = 0, search, perfil, ativo } = req.query;

        console.log(`[${new Date()}] Listando usuários`);

        let query = `
            SELECT 
                id,
                nome,
                email,
                perfil,
                ativo,
                data_criacao,
                data_atualizacao
            FROM usuarios
            WHERE 1=1
        `;
        const queryParams = [];

        if (search) {
            query += ` AND (nome ILIKE $${queryParams.length + 1} OR email ILIKE $${queryParams.length + 1})`;
            queryParams.push(`%${search}%`);
        }

        if (perfil) {
            query += ` AND perfil = $${queryParams.length + 1}`;
            queryParams.push(perfil);
        }

        if (ativo !== undefined) {
            query += ` AND ativo = $${queryParams.length + 1}`;
            queryParams.push(ativo === 'true');
        }

        query += ` ORDER BY nome LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limite, offset);

        const result = await db.query(query, queryParams);

        // Contar total
        let countQuery = `SELECT COUNT(*) as total FROM usuarios WHERE 1=1`;
        const countParams = [];

        if (search) {
            countQuery += ` AND (nome ILIKE $${countParams.length + 1} OR email ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }

        if (perfil) {
            countQuery += ` AND perfil = $${countParams.length + 1}`;
            countParams.push(perfil);
        }

        if (ativo !== undefined) {
            countQuery += ` AND ativo = $${countParams.length + 1}`;
            countParams.push(ativo === 'true');
        }

        const countResult = await db.query(countQuery, countParams);

        return res.status(200).json({
            success: true,
            usuarios: result.rows,
            total: parseInt(countResult.rows[0].total),
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const cadastrarUsuario = async (req, res) => {
    try {
        const { nome, email, perfil, senha } = req.body;

        console.log(`[${new Date()}] Cadastrando usuário: ${email}`);

        // Validar dados obrigatórios
        if (!nome || !email || !perfil || !senha) {
            return res.status(400).json({
                success: false,
                error: 'Nome, email, perfil e senha são obrigatórios'
            });
        }

        // Verificar se email já existe
        const emailExiste = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (emailExiste.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email já está em uso'
            });
        }

        // Hash da senha
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);

        // Cadastrar usuário
        const query = `
            INSERT INTO usuarios (nome, email, perfil, senha_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, email, perfil, ativo, data_criacao
        `;

        const result = await db.query(query, [nome, email, perfil, senhaHash]);

        return res.status(201).json({
            success: true,
            message: 'Usuário cadastrado com sucesso',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const editarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, perfil } = req.body;

        console.log(`[${new Date()}] Editando usuário: ${id}`);

        // Verificar se usuário existe
        const usuarioExiste = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        // Verificar se email já está em uso por outro usuário
        if (email) {
            const emailExiste = await db.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
            if (emailExiste.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email já está em uso por outro usuário'
                });
            }
        }

        // Construir query dinâmica
        const campos = [];
        const valores = [];
        let contador = 1;

        if (nome) {
            campos.push(`nome = $${contador}`);
            valores.push(nome);
            contador++;
        }

        if (email) {
            campos.push(`email = $${contador}`);
            valores.push(email);
            contador++;
        }

        if (perfil) {
            campos.push(`perfil = $${contador}`);
            valores.push(perfil);
            contador++;
        }

        if (campos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum campo para atualizar'
            });
        }

        campos.push(`data_atualizacao = NOW() AT TIME ZONE 'America/Sao_Paulo'`);
        valores.push(id);

        const query = `
            UPDATE usuarios 
            SET ${campos.join(', ')}
            WHERE id = $${contador}
            RETURNING id, nome, email, perfil, ativo, data_criacao, data_atualizacao
        `;

        const result = await db.query(query, valores);

        return res.status(200).json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const ativarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`[${new Date()}] Ativando usuário: ${id}`);

        const query = `
            UPDATE usuarios 
            SET ativo = true, data_atualizacao = NOW() AT TIME ZONE 'America/Sao_Paulo'
            WHERE id = $1
            RETURNING id, nome, email, perfil, ativo
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Usuário ativado com sucesso',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao ativar usuário:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const desativarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`[${new Date()}] Desativando usuário: ${id}`);

        const query = `
            UPDATE usuarios 
            SET ativo = false, data_atualizacao = NOW() AT TIME ZONE 'America/Sao_Paulo'
            WHERE id = $1
            RETURNING id, nome, email, perfil, ativo
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Usuário desativado com sucesso',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    listarUsuarios,
    cadastrarUsuario,
    editarUsuario,
    ativarUsuario,
    desativarUsuario
}; 