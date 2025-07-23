const db = require('../config/database');

/**
 * Controller para endpoints de Frequência
 * Fornece relatórios de frequência baseados nos registros de ponto reais
 */

// GET /api/frequencia/resumo-mensal
const obterResumoMensal = async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        console.log(`[${new Date()}] Obtendo resumo de frequência - ${mesAtual}/${anoAtual}`);

        const query = `
            SELECT 
                c.id,
                c.nome,
                c.cpf,
                COUNT(DISTINCT DATE(rp.data_hora)) as dias_trabalhados,
                COUNT(rp.id) as total_registros,
                ROUND(
                    (COUNT(DISTINCT DATE(rp.data_hora)) * 100.0 / 
                    EXTRACT(DAY FROM (DATE_TRUNC('month', $3::date) + INTERVAL '1 month - 1 day'))), 
                    1
                ) as percentual_presenca,
                MIN(rp.data_hora) as primeiro_registro,
                MAX(rp.data_hora) as ultimo_registro
            FROM colaboradores c
            LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
                AND EXTRACT(MONTH FROM rp.data_hora) = $1
                AND EXTRACT(YEAR FROM rp.data_hora) = $2
            GROUP BY c.id, c.nome, c.cpf
            ORDER BY c.nome
        `;

        const dataBase = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`;
        const result = await db.query(query, [mesAtual, anoAtual, dataBase]);

        const resumoColaboradores = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            cpf: row.cpf,
            diasTrabalhados: parseInt(row.dias_trabalhados) || 0,
            totalRegistros: parseInt(row.total_registros) || 0,
            percentualPresenca: parseFloat(row.percentual_presenca) || 0,
            primeiroRegistro: row.primeiro_registro,
            ultimoRegistro: row.ultimo_registro,
            status: parseFloat(row.percentual_presenca) >= 95 ? 'Excelente' :
                   parseFloat(row.percentual_presenca) >= 85 ? 'Bom' :
                   parseFloat(row.percentual_presenca) >= 70 ? 'Regular' : 'Baixo'
        }));

        return res.status(200).json({
            success: true,
            resumo: resumoColaboradores,
            periodo: `${mesAtual}/${anoAtual}`,
            total_colaboradores: resumoColaboradores.length
        });

    } catch (error) {
        console.error('Erro ao obter resumo mensal de frequência:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// GET /api/frequencia/estatisticas
const obterEstatisticasFrequencia = async (req, res) => {
    try {
        console.log(`[${new Date()}] Obtendo estatísticas de frequência`);

        const query = `
            SELECT 
                COUNT(DISTINCT c.id) as total_colaboradores,
                COUNT(DISTINCT DATE(rp.data_hora)) as dias_com_registros,
                COUNT(rp.id) as total_registros,
                AVG(
                    CASE 
                        WHEN colaborador_stats.dias_trabalhados > 0 
                        THEN colaborador_stats.percentual_presenca 
                        ELSE 0 
                    END
                ) as presenca_media_geral
            FROM colaboradores c
            LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
                AND DATE(rp.data_hora) >= DATE_TRUNC('month', CURRENT_DATE)
            LEFT JOIN (
                SELECT 
                    c2.id,
                    COUNT(DISTINCT DATE(rp2.data_hora)) as dias_trabalhados,
                    ROUND(
                        (COUNT(DISTINCT DATE(rp2.data_hora)) * 100.0 / 
                        EXTRACT(DAY FROM CURRENT_DATE)), 
                        1
                    ) as percentual_presenca
                FROM colaboradores c2
                LEFT JOIN registros_ponto rp2 ON c2.id = rp2.colaborador_id
                    AND DATE(rp2.data_hora) >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY c2.id
            ) colaborador_stats ON c.id = colaborador_stats.id
        `;

        const result = await db.query(query);
        const stats = result.rows[0];

        return res.status(200).json({
            success: true,
            estatisticas: {
                total_colaboradores: parseInt(stats.total_colaboradores) || 0,
                dias_com_registros: parseInt(stats.dias_com_registros) || 0,
                total_registros: parseInt(stats.total_registros) || 0,
                presenca_media_geral: parseFloat(stats.presenca_media_geral) || 0
            }
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas de frequência:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// GET /api/frequencia/detalhes/:colaborador_id
const obterDetalhesColaborador = async (req, res) => {
    try {
        const { colaborador_id } = req.params;
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        console.log(`[${new Date()}] Obtendo detalhes de frequência do colaborador ${colaborador_id}`);

        // Verificar se colaborador existe
        const colaboradorQuery = 'SELECT id, nome, cpf FROM colaboradores WHERE id = $1';
        const colaboradorResult = await db.query(colaboradorQuery, [colaborador_id]);
        
        if (colaboradorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const colaborador = colaboradorResult.rows[0];

        // Buscar registros detalhados
        const registrosQuery = `
            SELECT 
                DATE(data_hora) as data,
                ARRAY_AGG(
                    json_build_object(
                        'id', id,
                        'hora', TO_CHAR(data_hora, 'HH24:MI:SS'),
                        'tipo', 
                        CASE 
                            WHEN ROW_NUMBER() OVER (PARTITION BY DATE(data_hora) ORDER BY data_hora) = 1 THEN 'entrada'
                            WHEN ROW_NUMBER() OVER (PARTITION BY DATE(data_hora) ORDER BY data_hora DESC) = 1 THEN 'saida'
                            ELSE 'intervalo'
                        END,
                        'latitude', latitude,
                        'longitude', longitude
                    ) ORDER BY data_hora
                ) as registros
            FROM registros_ponto
            WHERE colaborador_id = $1
                AND EXTRACT(MONTH FROM data_hora) = $2
                AND EXTRACT(YEAR FROM data_hora) = $3
            GROUP BY DATE(data_hora)
            ORDER BY DATE(data_hora)
        `;

        const registrosResult = await db.query(registrosQuery, [colaborador_id, mesAtual, anoAtual]);

        return res.status(200).json({
            success: true,
            colaborador: colaborador,
            periodo: `${mesAtual}/${anoAtual}`,
            detalhes: registrosResult.rows
        });

    } catch (error) {
        console.error('Erro ao obter detalhes do colaborador:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    obterResumoMensal,
    obterEstatisticasFrequencia,
    obterDetalhesColaborador
}; 