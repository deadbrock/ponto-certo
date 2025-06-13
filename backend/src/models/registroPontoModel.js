const db = require('../config/database');

const RegistroPonto = {
    async create({ colaborador_id, latitude, longitude, caminho_foto }) {
        const query = `
            INSERT INTO registros_ponto (colaborador_id, data_hora, latitude, longitude, caminho_foto)
            VALUES ($1, NOW(), $2, $3, $4)
            RETURNING *;
        `;
        const values = [colaborador_id, latitude, longitude, caminho_foto];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    async findByColaboradorId(colaborador_id, { page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT * FROM registros_ponto
            WHERE colaborador_id = $1
            ORDER BY data_hora DESC
            LIMIT $2 OFFSET $3;
        `;
        const values = [colaborador_id, limit, offset];
        const { rows } = await db.query(query, values);
        return rows;
    }
};

module.exports = RegistroPonto; 