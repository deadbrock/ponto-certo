const RegistroPonto = require('../models/registroPontoModel');

const registrarPonto = async (req, res) => {
    // O ID do colaborador virá do token JWT decodificado
    const colaborador_id = req.user.id;
    const { latitude, longitude } = req.body;
    
    // Prova de vida (liveness) e upload da foto serão implementados depois.
    // Por enquanto, o caminho da foto será nulo.
    const caminho_foto = null; 

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias.' });
    }

    try {
        const novoRegistro = await RegistroPonto.create({
            colaborador_id,
            latitude,
            longitude,
            caminho_foto
        });
        res.status(201).json(novoRegistro);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar ponto.', details: error.message });
    }
};

const listarRegistros = async (req, res) => {
    const colaborador_id = req.user.id;
    const { page, limit } = req.query;

    try {
        const registros = await RegistroPonto.findByColaboradorId(colaborador_id, { page, limit });
        res.status(200).json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar registros.', details: error.message });
    }
};


module.exports = {
    registrarPonto,
    listarRegistros,
}; 