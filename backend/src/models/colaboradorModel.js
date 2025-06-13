const db = require('../config/database');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const Colaborador = {
    async create(nome, cpf, senha) {
        const hash = await bcrypt.hash(senha, saltRounds);
        const query = `
            INSERT INTO colaboradores (nome, cpf, senha)
            VALUES ($1, $2, $3)
            RETURNING id, nome, cpf, data_criacao;
        `;
        const values = [nome, cpf, hash];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    async findByCpf(cpf) {
        const query = 'SELECT * FROM colaboradores WHERE cpf = $1;';
        const { rows } = await db.query(query, [cpf]);
        return rows[0];
    },

    async findById(id) {
        const query = 'SELECT id, nome, cpf, perfil FROM colaboradores WHERE id = $1;';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    },

    async comparePassword(senha, hash) {
        return await bcrypt.compare(senha, hash);
    }
};

module.exports = Colaborador; 