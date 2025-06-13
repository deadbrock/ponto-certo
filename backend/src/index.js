require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const authRoutes = require('./api/routes/authRoutes');
const pontoRoutes = require('./api/routes/pontoRoutes');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

app.get('/', (req, res) => {
    res.send('API do Ponto Digital está no ar!');
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/ponto', pontoRoutes);

app.get('/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).send(`Conexão com o banco bem-sucedida! Hora do servidor do banco: ${result.rows[0].now}`);
    } catch (error) {
        res.status(500).send(`Erro ao conectar com o banco de dados: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
}); 