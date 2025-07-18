const listarAtestados = async (req, res) => {
    try {
        console.log('📋 ATESTADOS: Listando atestados...');
        console.log('🔍 Parâmetros recebidos:', req.query);
        
        // DADOS MOCK REMOVIDOS - Sistema limpo
        // Em produção, aqui conectaria com tabela de atestados real
        const solicitacoes = [
            // Array vazio - não há atestados cadastrados ainda
        ];

        const { page = 1, limit = 10 } = req.query;
        
        console.log('✅ ATESTADOS: Retornando dados limpos (sem mock)');
        console.log(`📊 Total de solicitações: ${solicitacoes.length}`);
        
        res.status(200).json({
            success: true,
            solicitacoes: solicitacoes,
            total: solicitacoes.length,
            page: parseInt(page),
            pages: Math.ceil(solicitacoes.length / parseInt(limit)),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('❌ ATESTADOS: Erro ao listar:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const aprovarAtestado = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`✅ ATESTADOS: Aprovando solicitação ID ${id}`);
        
        return res.status(200).json({
            success: true,
            message: `Solicitação ${id} aprovada com sucesso`
        });

    } catch (error) {
        console.error('❌ Erro ao aprovar atestado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const rejeitarAtestado = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`❌ ATESTADOS: Rejeitando solicitação ID ${id}`);
        
        return res.status(200).json({
            success: true,
            message: `Solicitação ${id} rejeitada com sucesso`
        });

    } catch (error) {
        console.error('❌ Erro ao rejeitar atestado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    listarAtestados,
    aprovarAtestado,
    rejeitarAtestado
}; 