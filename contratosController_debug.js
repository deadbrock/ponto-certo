// VERSÃO SIMPLIFICADA PARA DEBUG do obterDadosMapaAtuacao

const obterDadosMapaAtuacao = async (req, res) => {
    try {
        console.log(`[${new Date()}] 🗺️ Iniciando busca do mapa de atuação - VERSÃO DEBUG`);

        // TESTE 1: Resposta básica
        return res.status(200).json({
            success: true,
            data: {
                estados: [
                    {
                        uf: 'SP',
                        nomeEstado: 'São Paulo',
                        statusContrato: 'ativo',
                        totalContratos: 1,
                        totalFuncionarios: 0,
                        valorTotal: 85000,
                        clientes: ['Empresa Teste'],
                        contratos: [
                            {
                                id: 1,
                                nome: 'Contrato Teste',
                                cliente: 'Empresa Teste',
                                valor: 85000,
                                statusContrato: 'ativo'
                            }
                        ]
                    }
                ],
                resumo: {
                    totalEstados: 1,
                    totalContratos: 1,
                    totalFuncionarios: 0,
                    valorTotalContratos: 85000,
                    estadosAtivos: 1,
                    estadosVencidos: 0,
                    estadosProximoVencimento: 0
                }
            }
        });

    } catch (error) {
        console.error('❌ ERRO DEBUG - Mapa de atuação:', error.message);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor - DEBUG',
            details: error.message
        });
    }
};

module.exports = {
    obterDadosMapaAtuacao
};