const Colaborador = require('../models/colaboradorModel');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { nome, cpf, senha } = req.body;
    if (!nome || !cpf || !senha) {
        return res.status(400).json({ error: 'Nome, CPF e senha são obrigatórios.' });
    }

    try {
        const existingColaborador = await Colaborador.findByCpf(cpf);
        if (existingColaborador) {
            return res.status(409).json({ error: 'CPF já cadastrado.' });
        }

        const novoColaborador = await Colaborador.create(nome, cpf, senha);
        res.status(201).json(novoColaborador);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar colaborador.', details: error.message });
    }
};

const login = async (req, res) => {
    const { cpf, senha } = req.body;
    if (!cpf || !senha) {
        return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    try {
        const colaborador = await Colaborador.findByCpf(cpf);
        if (!colaborador) {
            return res.status(404).json({ error: 'Colaborador não encontrado.' });
        }

        const senhaValida = await Colaborador.comparePassword(senha, colaborador.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha inválida.' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { id: colaborador.id, cpf: colaborador.cpf },
            process.env.JWT_SECRET || 'seu_segredo_jwt_padrao',
            { expiresIn: '8h' }
        );

        // Não retornar a senha no objeto final
        delete colaborador.senha;

        res.status(200).json({ colaborador, token });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar login.', details: error.message });
    }
};

module.exports = {
    register,
    login,
}; 