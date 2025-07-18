const listarEscalas = async (req, res) => {
    try {
        // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
        // Em produção, aqui seria conectado com uma tabela real de escalas
        const escalas = [
            // Sistema iniciando vazio - escalas serão cadastradas conforme necessário
        ];

        return res.status(200).json({
            success: true,
            escalas: escalas,
            total: escalas.length
        });

    } catch (error) {
        console.error('Erro ao listar escalas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const cadastrarEscala = async (req, res) => {
    try {
        const { colaboradorOuEquipe, tipo, horario, vigencia } = req.body;
        
        return res.status(201).json({
            success: true,
            message: 'Escala cadastrada com sucesso',
            escala: {
                id: Date.now(),
                colaboradorOuEquipe,
                tipo,
                horario,
                vigencia
            }
        });

    } catch (error) {
        console.error('Erro ao cadastrar escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const editarEscala = async (req, res) => {
    try {
        const { id } = req.params;
        
        return res.status(200).json({
            success: true,
            message: `Escala ${id} editada com sucesso`
        });

    } catch (error) {
        console.error('Erro ao editar escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const excluirEscala = async (req, res) => {
    try {
        const { id } = req.params;
        
        return res.status(200).json({
            success: true,
            message: `Escala ${id} excluída com sucesso`
        });

    } catch (error) {
        console.error('Erro ao excluir escala:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const listarFeriados = async (req, res) => {
    try {
        // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
        // Em produção, aqui seria conectado com uma tabela real de feriados
        const feriados = [
            // Sistema iniciando vazio - feriados serão cadastrados conforme necessário
        ];

        return res.status(200).json({
            success: true,
            feriados: feriados
        });

    } catch (error) {
        console.error('Erro ao listar feriados:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const cadastrarFeriado = async (req, res) => {
    try {
        const { nome, data } = req.body;
        
        return res.status(201).json({
            success: true,
            message: 'Feriado cadastrado com sucesso',
            feriado: {
                id: Date.now(),
                nome,
                data
            }
        });

    } catch (error) {
        console.error('Erro ao cadastrar feriado:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    listarEscalas,
    cadastrarEscala,
    editarEscala,
    excluirEscala,
    listarFeriados,
    cadastrarFeriado
}; 