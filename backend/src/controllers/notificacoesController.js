const db = require('../config/database');

/**
 * Controller para endpoints de Notificações
 * Gera notificações automáticas baseadas nos dados dos totems
 */

// GET /api/notificacoes/recentes
const obterNotificacoesRecentes = async (req, res) => {
    try {
        console.log(`[${new Date()}] Buscando notificações recentes`);

        const notificacoes = [];
        
        // 1. Verificar colaboradores em atraso (entrada após 08:30)
        const atrasosQuery = `
            SELECT c.nome, rp.data_hora
            FROM colaboradores c
            JOIN registros_ponto rp ON c.id = rp.colaborador_id
            WHERE DATE(rp.data_hora) = CURRENT_DATE
            AND (
                (EXTRACT(HOUR FROM rp.data_hora) = 8 AND EXTRACT(MINUTE FROM rp.data_hora) > 30)
                OR EXTRACT(HOUR FROM rp.data_hora) > 8
            )
            AND (rp.tipo_registro = 'entrada' OR rp.tipo_registro IS NULL)
            ORDER BY rp.data_hora DESC
            LIMIT 5
        `;
        
        const atrasosResult = await db.query(atrasosQuery);
        
        atrasosResult.rows.forEach(atraso => {
            const horaAtraso = new Date(atraso.data_hora).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            notificacoes.push({
                id: `atraso-${atraso.nome}-${Date.now()}`,
                type: 'warning',
                title: '⏰ Colaborador em Atraso',
                message: `${atraso.nome} registrou entrada às ${horaAtraso}. Horário previsto: 08:00.`,
                timestamp: new Date(atraso.data_hora),
                read: false,
                priority: 'medium',
                category: 'ponto',
                colaborador: atraso.nome,
                actionUrl: '/registros',
                showToast: true
            });
        });

        // 2. Verificar colaboradores sem registro hoje (apenas se há atividade no sistema)
        const atividadeHojeQuery = `
            SELECT COUNT(*) as registros_hoje
            FROM registros_ponto 
            WHERE DATE(data_hora) = CURRENT_DATE
        `;
        
        const atividadeResult = await db.query(atividadeHojeQuery);
        const registrosHoje = parseInt(atividadeResult.rows[0].registros_hoje) || 0;
        
        // Só verificar faltas se há pelo menos 3 registros hoje (sistema em uso ativo)
        if (registrosHoje >= 3) {
            const faltasQuery = `
                SELECT c.nome
                FROM colaboradores c
                WHERE NOT EXISTS (
                    SELECT 1 FROM registros_ponto rp 
                    WHERE rp.colaborador_id = c.id 
                    AND DATE(rp.data_hora) = CURRENT_DATE
                )
                AND EXTRACT(HOUR FROM CURRENT_TIME) >= 9
                AND EXISTS (
                    SELECT 1 FROM registros_ponto rp2 
                    WHERE rp2.colaborador_id = c.id 
                    AND rp2.data_hora >= CURRENT_DATE - INTERVAL '7 days'
                )
                LIMIT 3
            `;
            
            const faltasResult = await db.query(faltasQuery);
            
            faltasResult.rows.forEach(falta => {
                notificacoes.push({
                    id: `falta-${falta.nome}-${Date.now()}`,
                    type: 'error',
                    title: '🚨 Possível Falta',
                    message: `${falta.nome} ainda não registrou ponto hoje após as 09:00.`,
                    timestamp: new Date(),
                    read: false,
                    priority: 'high',
                    category: 'presenca',
                    colaborador: falta.nome,
                    actionUrl: '/frequencia',
                    showToast: true
                });
            });
        }

        // 3. Verificar status dos equipamentos (apenas se há histórico de uso)
        const ultimoRegistroQuery = `
            SELECT 
                MAX(data_hora) as ultimo_registro,
                COUNT(*) as total_registros
            FROM registros_ponto
            WHERE data_hora >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        const ultimoRegistroResult = await db.query(ultimoRegistroQuery);
        
        if (ultimoRegistroResult.rows[0].ultimo_registro && parseInt(ultimoRegistroResult.rows[0].total_registros) >= 10) {
            const ultimoRegistro = new Date(ultimoRegistroResult.rows[0].ultimo_registro);
            const agora = new Date();
            const diferencaHoras = (agora - ultimoRegistro) / (1000 * 60 * 60);
            
            // Só alertar se há mais de 6 horas sem registro E se é horário comercial
            const horaAtual = new Date().getHours();
            if (diferencaHoras > 6 && horaAtual >= 8 && horaAtual <= 18) {
                notificacoes.push({
                    id: `equipamento-offline-${Date.now()}`,
                    type: 'error',
                    title: '🔧 Equipamento Possivelmente Offline',
                    message: `Último registro de ponto há ${Math.floor(diferencaHoras)} horas. Verificar conectividade dos totems.`,
                    timestamp: new Date(),
                    read: false,
                    priority: 'critical',
                    category: 'sistema',
                    actionUrl: '/configuracoes-infra'
                });
            }
        }

        // 4. Verificar presença baixa (apenas com base histórica significativa)
        const presencaQuery = `
            SELECT 
                COUNT(DISTINCT c.id) as total_colaboradores,
                COUNT(DISTINCT rp.colaborador_id) as registrados_hoje,
                AVG(sub.registrados_historico) as media_historica
            FROM colaboradores c
            LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id 
                AND DATE(rp.data_hora) = CURRENT_DATE
            CROSS JOIN (
                SELECT AVG(registrados_dia) as registrados_historico
                FROM (
                    SELECT COUNT(DISTINCT colaborador_id) as registrados_dia
                    FROM registros_ponto 
                    WHERE data_hora >= CURRENT_DATE - INTERVAL '7 days'
                    AND data_hora < CURRENT_DATE
                    GROUP BY DATE(data_hora)
                ) historico
            ) sub
            WHERE EXISTS (
                SELECT 1 FROM registros_ponto rp2 
                WHERE rp2.colaborador_id = c.id 
                AND rp2.data_hora >= CURRENT_DATE - INTERVAL '7 days'
            )
        `;
        
        const presencaResult = await db.query(presencaQuery);
        
        if (presencaResult.rows[0]) {
            const total = parseInt(presencaResult.rows[0].total_colaboradores) || 0;
            const registrados = parseInt(presencaResult.rows[0].registrados_hoje) || 0;
            const mediaHistorica = parseFloat(presencaResult.rows[0].media_historica) || 0;
            
            // Só alertar se há pelo menos 5 colaboradores ativos e presença muito abaixo da média histórica
            if (total >= 5 && mediaHistorica >= 3 && registrados < (mediaHistorica * 0.6) && new Date().getHours() >= 10) {
                const percentualPresenca = (registrados / total) * 100;
                notificacoes.push({
                    id: `presenca-baixa-${Date.now()}`,
                    type: 'warning',
                    title: '📉 Presença Muito Abaixo do Normal',
                    message: `Apenas ${registrados} de ${total} colaboradores ativos registraram ponto hoje (${percentualPresenca.toFixed(1)}%). Média dos últimos dias: ${Math.round(mediaHistorica)}.`,
                    timestamp: new Date(),
                    read: false,
                    priority: 'medium',
                    category: 'presenca',
                    actionUrl: '/analytics'
                });
            }
        }

        // Apenas notificações baseadas em dados reais do banco são retornadas

        // Ordenar por prioridade e timestamp
        const prioridadeOrdem = { critical: 4, high: 3, medium: 2, low: 1 };
        notificacoes.sort((a, b) => {
            if (prioridadeOrdem[a.priority] !== prioridadeOrdem[b.priority]) {
                return prioridadeOrdem[b.priority] - prioridadeOrdem[a.priority];
            }
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        return res.status(200).json({
            success: true,
            notificacoes: notificacoes.slice(0, 10) // Limitar a 10 notificações
        });

    } catch (error) {
        console.error('Erro ao obter notificações:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// POST /api/notificacoes/marcar-lida
const marcarNotificacaoLida = async (req, res) => {
    try {
        const { notificacaoId } = req.body;
        
        // Por enquanto, apenas retornar sucesso
        // Em uma implementação completa, armazenaria no banco
        console.log(`Notificação ${notificacaoId} marcada como lida`);
        
        return res.status(200).json({
            success: true,
            message: 'Notificação marcada como lida'
        });

    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// GET /api/notificacoes/configuracoes
const obterConfiguracoes = async (req, res) => {
    try {
        // Configurações simples baseadas apenas em dados reais
        const configuracoes = {
            regras: [
                {
                    id: 'atraso-colaborador',
                    nome: 'Atraso de Colaborador',
                    descricao: 'Baseado em registros de ponto reais após 08:30',
                    ativa: true,
                    prioridade: 'medium'
                },
                {
                    id: 'falta-nao-justificada',
                    nome: 'Colaborador Sem Registro',
                    descricao: 'Baseado em ausência de registros no banco de dados',
                    ativa: true,
                    prioridade: 'high'
                },
                {
                    id: 'equipamento-offline',
                    nome: 'Equipamento Inativo',
                    descricao: 'Baseado no último registro real no banco',
                    ativa: true,
                    prioridade: 'critical'
                },
                {
                    id: 'presenca-baixa',
                    nome: 'Presença Baixa',
                    descricao: 'Calculado com base nos registros reais do dia',
                    ativa: true,
                    prioridade: 'medium'
                }
            ],
            configuracoes_gerais: {
                auto_refresh: 30,
                max_notificacoes: 10
            }
        };

        return res.status(200).json({
            success: true,
            configuracoes
        });

    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    obterNotificacoesRecentes,
    marcarNotificacaoLida,
    obterConfiguracoes
}; 