const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Função para carregar dados do sistema facial
function loadFaceSystemData() {
  const dataPath = path.join(__dirname, '../data/persons.json');
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

const buscarColaboradores = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Buscar colaboradores do banco de dados
        let query = `
            SELECT 
                id, 
                nome, 
                cpf, 
                perfil,
                data_criacao as data_cadastro
            FROM colaboradores
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (nome ILIKE $${params.length + 1} OR cpf ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Buscar dados do sistema facial para enriquecer informações
        const faceSystemData = loadFaceSystemData();
        
        // Combinar dados do banco com dados do sistema facial
        const colaboradoresEnriquecidos = result.rows.map(colaborador => {
            const dadosFaciais = faceSystemData.find(face => face.cpf === colaborador.cpf);
            return {
                ...colaborador,
                tem_cadastro_facial: !!dadosFaciais,
                data_cadastro_facial: dadosFaciais?.registeredAt || null
            };
        });

        // Buscar total de registros para paginação
        let countQuery = `SELECT COUNT(*) as total FROM colaboradores WHERE 1=1`;
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (nome ILIKE $${countParams.length + 1} OR cpf ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        console.log(`Encontrados ${colaboradoresEnriquecidos.length} colaboradores de ${total} total`);

        return res.status(200).json({
            success: true,
            colaboradores: colaboradoresEnriquecidos,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
};

module.exports = {
    buscarColaboradores
}; 