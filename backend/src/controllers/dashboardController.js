const db = require('../config/database');
const performanceOptimizer = require('../utils/performanceOptimizer');
const cacheManager = require('../utils/cacheManager');

/**
 * Controller para endpoints do Dashboard
 * Fornece estatísticas em tempo real baseadas nos dados dos totems
 */

// GET /api/dashboard/estatisticas
const obterEstatisticas = async (req, res) => {
    try {
        console.log(`[${new Date()}] Buscando estatísticas do dashboard`);

        // 1. Colaboradores ativos (todos os colaboradores já que não há coluna ativo)
        const colaboradoresQuery = `
            SELECT COUNT(*) as total 
            FROM colaboradores
        `;
        const colaboradoresResult = await db.query(colaboradoresQuery);
        const colaboradores_ativos = parseInt(colaboradoresResult.rows[0].total) || 0;

        // 2. Registros hoje
        const registrosHojeQuery = `
            SELECT COUNT(*) as total 
            FROM registros_ponto 
            WHERE DATE(data_hora) = CURRENT_DATE
        `;
        const registrosHojeResult = await db.query(registrosHojeQuery);
        const registros_hoje = parseInt(registrosHojeResult.rows[0].total) || 0;

        // 3. Registros ontem (para trending)
        const registrosOntemQuery = `
            SELECT COUNT(*) as total 
            FROM registros_ponto 
            WHERE DATE(data_hora) = CURRENT_DATE - INTERVAL '1 day'
        `;
        const registrosOntemResult = await db.query(registrosOntemQuery);
        const registros_ontem = parseInt(registrosOntemResult.rows[0].total) || 0;

        // 4. Atestados pendentes (simulado - será implementado quando houver tabela)
        const atestados_pendentes = 0;

        // 5. Relatórios gerados este mês (simulado)
        const relatorios_mes = Math.floor(registros_hoje / 10); // Estimativa baseada em registros

        // 6. Calcular trending
        const trend_registros = registros_ontem > 0 
            ? `${((registros_hoje - registros_ontem) / registros_ontem * 100).toFixed(1)}%`
            : '+0%';

        const trend_colaboradores = colaboradores_ativos > 0 ? '+0%' : '0%';

        return res.status(200).json({
            success: true,
            dados: {
                colaboradores_ativos,
                registros_hoje,
                atestados_pendentes,
                relatorios_mes,
                trend_colaboradores,
                trend_registros,
                trend_atestados: '+0%',
                trend_relatorios: '+0%',
                ultima_atualizacao: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas do dashboard:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// GET /api/dashboard/registros-recentes
const obterRegistrosRecentes = async (req, res) => {
    try {
        console.log(`[${new Date()}] Buscando registros recentes`);

        const query = `
            SELECT 
                rp.id,
                rp.data_hora,
                rp.tipo_registro,
                rp.latitude,
                rp.longitude,
                c.nome as colaborador,
                'Sistema' as cliente,
                EXTRACT(HOUR FROM rp.data_hora) || ':' || 
                LPAD(EXTRACT(MINUTE FROM rp.data_hora)::text, 2, '0') as hora
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            ORDER BY rp.data_hora DESC
            LIMIT 10
        `;

        const result = await db.query(query);
        
        const registros = result.rows.map(registro => ({
            id: registro.id,
            colaborador: registro.colaborador,
            cliente: registro.cliente,
            acao: registro.tipo_registro || 'Registro',
            hora: registro.hora,
            status: 'no-prazo', // Simplificado por agora
            data_hora: registro.data_hora
        }));

        return res.status(200).json({
            success: true,
            registros
        });

    } catch (error) {
        console.error('Erro ao obter registros recentes:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// GET /api/dashboard/alertas
const obterAlertas = async (req, res) => {
    try {
        console.log(`[${new Date()}] Buscando alertas do dashboard`);

        const alertas = [];

        // 1. Verificar colaboradores sem registro hoje
        const semRegistroQuery = `
            SELECT c.nome
            FROM colaboradores c
            WHERE NOT EXISTS (
                SELECT 1 FROM registros_ponto rp 
                WHERE rp.colaborador_id = c.id 
                AND DATE(rp.data_hora) = CURRENT_DATE
            )
            LIMIT 5
        `;
        
        const semRegistroResult = await db.query(semRegistroQuery);
        
        if (semRegistroResult.rows.length > 0) {
            alertas.push({
                id: 'sem-registro-hoje',
                tipo: 'warning',
                titulo: '⚠️ Colaboradores sem Registro',
                mensagem: `${semRegistroResult.rows.length} colaborador(es) ainda não registraram ponto hoje`,
                prioridade: 'medium',
                timestamp: new Date().toISOString()
            });
        }

        // 2. Verificar equipamentos (simulado baseado em última atividade)
        const ultimoRegistroQuery = `
            SELECT data_hora 
            FROM registros_ponto 
            ORDER BY data_hora DESC 
            LIMIT 1
        `;
        
        const ultimoRegistroResult = await db.query(ultimoRegistroQuery);
        
        if (ultimoRegistroResult.rows.length > 0) {
            const ultimoRegistro = new Date(ultimoRegistroResult.rows[0].data_hora);
            const agora = new Date();
            const diferencaHoras = (agora - ultimoRegistro) / (1000 * 60 * 60);
            
            if (diferencaHoras > 2) {
                alertas.push({
                    id: 'equipamento-offline',
                    tipo: 'error',
                    titulo: '🔧 Possível Equipamento Offline',
                    mensagem: `Último registro há ${Math.floor(diferencaHoras)}h. Verificar totems.`,
                    prioridade: 'high',
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 3. Alerta positivo se sistema funcionando bem
        if (alertas.length === 0) {
            alertas.push({
                id: 'sistema-ok',
                tipo: 'success',
                titulo: '✅ Sistema Funcionando',
                mensagem: 'Todos os equipamentos estão operacionais e colaboradores registrando normalmente.',
                prioridade: 'low',
                timestamp: new Date().toISOString()
            });
        }

        return res.status(200).json({
            success: true,
            alertas
        });

    } catch (error) {
        console.error('Erro ao obter alertas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// GET /api/dashboard/progresso-mensal
const obterProgressoMensal = async (req, res) => {
    try {
        console.log(`[${new Date()}] Buscando progresso mensal`);

        // Calcular presença real dos últimos 7 dias
        const presencaQuery = `
            WITH dias AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '6 days', 
                    CURRENT_DATE, 
                    '1 day'::interval
                )::date AS dia
            ),
            total_colaboradores AS (
                SELECT COUNT(*) as total FROM colaboradores
            ),
            presenca_diaria AS (
                SELECT 
                    d.dia,
                    COUNT(DISTINCT rp.colaborador_id) as presentes,
                    tc.total as total_colaboradores
                FROM dias d
                CROSS JOIN total_colaboradores tc
                LEFT JOIN registros_ponto rp ON DATE(rp.data_hora) = d.dia
                GROUP BY d.dia, tc.total
                ORDER BY d.dia
            )
            SELECT 
                COALESCE(AVG(CASE WHEN total_colaboradores > 0 
                    THEN (presentes::decimal / total_colaboradores) * 100 
                    ELSE 0 END), 0) as presenca_media,
                ARRAY_AGG(CASE WHEN total_colaboradores > 0 
                    THEN ROUND((presentes::decimal / total_colaboradores) * 100) 
                    ELSE 0 END ORDER BY dia) as dados_7_dias
            FROM presenca_diaria
        `;
        
        const presencaResult = await db.query(presencaQuery);
        const presenca_media = Math.round(parseFloat(presencaResult.rows[0]?.presenca_media) || 0);
        const dados_reais = presencaResult.rows[0]?.dados_7_dias || [0, 0, 0, 0, 0, 0, 0];

        const progresso = [
            {
                departamento: 'Todos os Colaboradores',
                presenca: presenca_media,
                meta: 95,
                dados: dados_reais
            }
        ];

        return res.status(200).json({
            success: true,
            progresso
        });

    } catch (error) {
        console.error('Erro ao obter progresso mensal:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    obterEstatisticas,
    obterRegistrosRecentes,
    obterAlertas,
    obterProgressoMensal
}; 