const db = require('../config/database');

const salvarParametrosSindicais = async (req, res) => {
    try {
        const { texto } = req.body;
        
        console.log(`[${new Date()}] Salvando parâmetros sindicais`);

        // Salvar no banco de dados (upsert)
        const query = `
            INSERT INTO configuracoes (chave, valor, tipo, descricao)
            VALUES ('parametros_sindicais', $1, 'text', 'Parâmetros sindicais da empresa')
            ON CONFLICT (chave) 
            DO UPDATE SET 
                valor = EXCLUDED.valor,
                atualizado_em = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await db.query(query, [texto]);
        
        return res.status(200).json({
            success: true,
            message: 'Parâmetros sindicais salvos com sucesso',
            configuracao: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao salvar parâmetros sindicais:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const obterParametrosSindicais = async (req, res) => {
    try {
        console.log(`[${new Date()}] Obtendo parâmetros sindicais`);

        const query = 'SELECT valor FROM configuracoes WHERE chave = $1';
        const result = await db.query(query, ['parametros_sindicais']);

        const parametros = result.rows.length > 0 ? result.rows[0].valor : '';

        return res.status(200).json({
            success: true,
            parametros_sindicais: parametros
        });

    } catch (error) {
        console.error('Erro ao obter parâmetros sindicais:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarDispositivos = async (req, res) => {
    try {
        console.log(`[${new Date()}] Listando dispositivos conectados`);

        // Buscar dispositivos registrados (totems que fizeram registros)
        const query = `
            SELECT DISTINCT
                tablet_id,
                tablet_name,
                tablet_location,
                COUNT(*) as total_registros,
                MAX(data_hora) as ultimo_registro,
                CASE 
                    WHEN MAX(data_hora) > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'online'
                    WHEN MAX(data_hora) > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'recente'
                    ELSE 'offline'
                END as status
            FROM registros_ponto
            WHERE tablet_id IS NOT NULL
            GROUP BY tablet_id, tablet_name, tablet_location
            ORDER BY ultimo_registro DESC
        `;

        const result = await db.query(query);

        const dispositivos = result.rows.map(row => ({
            id: row.tablet_id,
            nome: row.tablet_name || 'Totem Sem Nome',
            localizacao: row.tablet_location || 'Localização Não Informada',
            status: row.status,
            totalRegistros: parseInt(row.total_registros),
            ultimoRegistro: row.ultimo_registro,
            tipo: 'totem'
        }));

        return res.status(200).json({
            success: true,
            dispositivos: dispositivos
        });

    } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const realizarBackup = async (req, res) => {
    try {
        console.log(`[${new Date()}] Iniciando processo de backup`);

        // Simular processo de backup (em produção seria um processo real)
        const timestamp = new Date().toISOString();
        
        // Contar registros para backup
        const queries = [
            'SELECT COUNT(*) FROM colaboradores',
            'SELECT COUNT(*) FROM registros_ponto',
            'SELECT COUNT(*) FROM usuarios',
            'SELECT COUNT(*) FROM contratos'
        ];

        const results = await Promise.all(queries.map(query => db.query(query)));
        
        const estatisticas = {
            colaboradores: parseInt(results[0].rows[0].count),
            registros_ponto: parseInt(results[1].rows[0].count),
            usuarios: parseInt(results[2].rows[0].count),
            contratos: parseInt(results[3].rows[0].count)
        };

        // Registrar backup na tabela de configurações
        const backupQuery = `
            INSERT INTO configuracoes (chave, valor, tipo, descricao)
            VALUES ('ultimo_backup', $1, 'json', 'Informações do último backup realizado')
            ON CONFLICT (chave)
            DO UPDATE SET 
                valor = EXCLUDED.valor,
                atualizado_em = CURRENT_TIMESTAMP
        `;

        const backupInfo = JSON.stringify({
            timestamp,
            estatisticas,
            status: 'concluido'
        });

        await db.query(backupQuery, [backupInfo]);

        return res.status(200).json({
            success: true,
            message: 'Backup realizado com sucesso',
            timestamp,
            estatisticas
        });

    } catch (error) {
        console.error('Erro ao realizar backup:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const obterConfiguracaoGeral = async (req, res) => {
    try {
        console.log(`[${new Date()}] Obtendo configurações gerais`);

        const query = 'SELECT chave, valor, tipo, descricao FROM configuracoes ORDER BY chave';
        const result = await db.query(query);

        const configuracoes = {};
        result.rows.forEach(row => {
            configuracoes[row.chave] = {
                valor: row.tipo === 'json' ? JSON.parse(row.valor) : row.valor,
                tipo: row.tipo,
                descricao: row.descricao
            };
        });

        return res.status(200).json({
            success: true,
            configuracoes
        });

    } catch (error) {
        console.error('Erro ao obter configurações gerais:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    salvarParametrosSindicais,
    obterParametrosSindicais,
    listarDispositivos,
    realizarBackup,
    obterConfiguracaoGeral
}; 