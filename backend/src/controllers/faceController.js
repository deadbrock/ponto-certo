const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../config/database');
const RegistroPonto = require('../models/registroPontoModel');
const Colaborador = require('../models/colaboradorModel');

// Configuração do multer para upload de fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/faces');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
  }
});

const upload = multer({ storage: storage });

// Base de dados simples para armazenar pessoas registradas (em produção use banco de dados)
let registeredPersons = [];

// Função para salvar dados das pessoas registradas
function savePersonsData() {
  const dataPath = path.join(__dirname, '../data/persons.json');
  const dataDir = path.dirname(dataPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(registeredPersons, null, 2));
}

// Função para carregar dados das pessoas registradas
function loadPersonsData() {
  const dataPath = path.join(__dirname, '../data/persons.json');
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    registeredPersons = JSON.parse(data);
  }
}

// Carregar dados na inicialização
loadPersonsData();

// Simulação de reconhecimento facial (para demonstração)
function simulateFaceRecognition(imagePath, registeredPersons) {
  // Em uma implementação real, aqui seria feito o processamento da imagem
  // e comparação com faces cadastradas usando bibliotecas de machine learning
  
  // Para demonstração, vamos simular algumas situações:
  
  // 1. Se existem pessoas cadastradas, simular reconhecimento com 70% de chance
  if (registeredPersons.length > 0) {
    const randomValue = Math.random();
    
    if (randomValue < 0.7) {
      // Simula reconhecimento de uma pessoa cadastrada
      const randomPerson = registeredPersons[Math.floor(Math.random() * registeredPersons.length)];
      return {
        recognized: true,
        person: randomPerson,
        confidence: 0.85 + (Math.random() * 0.1) // 85-95% de confiança
      };
    } else {
      // Simula pessoa não reconhecida
      return {
        recognized: false,
        person: null,
        confidence: 0.3 + (Math.random() * 0.4) // 30-70% de confiança
      };
    }
  } else {
    // Nenhuma pessoa cadastrada
    return {
      recognized: false,
      person: null,
      confidence: 0,
      message: 'Nenhuma pessoa cadastrada no sistema'
    };
  }
}

// Controller para reconhecimento facial
const recognizeFace = (req, res) => {
  try {
    // Middleware de upload será executado antes
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const imagePath = req.file.path;
    
    // Simular processamento de reconhecimento
    const result = simulateFaceRecognition(imagePath, registeredPersons);
    
    // Log para debugging
    console.log('Resultado do reconhecimento:', result);
    
    if (result.recognized) {
      res.json({
        success: true,
        recognized: true,
        person: result.person,
        confidence: result.confidence,
        message: `Pessoa reconhecida: ${result.person.name}`
      });
    } else {
      res.json({
        success: true,
        recognized: false,
        confidence: result.confidence,
        message: result.message || 'Pessoa não reconhecida'
      });
    }
    
    // Remover arquivo temporário após processamento
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Erro no reconhecimento facial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Controller para adicionar nova pessoa
const addPerson = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const { name, cpf } = req.body;
    
    if (!name || !cpf) {
      return res.status(400).json({
        success: false,
        message: 'Nome e CPF são obrigatórios'
      });
    }

    // Verificar se a pessoa já está cadastrada no sistema facial
    const existingPerson = registeredPersons.find(p => p.cpf === cpf);
    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: 'Pessoa já cadastrada com este CPF'
      });
    }

    // Verificar se já existe no banco de dados
    const existingColaborador = await Colaborador.findByCpf(cpf);
    if (existingColaborador) {
      return res.status(400).json({
        success: false,
        message: 'Colaborador já cadastrado com este CPF'
      });
    }

    // 1. SALVAR NO BANCO DE DADOS (colaboradores table)
    const novoColaborador = await Colaborador.create(name, cpf, 'senha123'); // senha padrão
    console.log('Colaborador salvo no banco:', novoColaborador);

    // 2. SALVAR NO SISTEMA FACIAL (JSON)
    const newPerson = {
      id: novoColaborador.id.toString(), // usar ID do banco
      name: name,
      cpf: cpf,
      imagePath: req.file.path,
      registeredAt: new Date().toISOString()
    };

    // Adicionar à lista do sistema facial
    registeredPersons.push(newPerson);
    
    // Salvar dados do sistema facial
    savePersonsData();
    
    console.log('Pessoa cadastrada no sistema facial:', newPerson);
    
    res.json({
      success: true,
      message: 'Colaborador cadastrado com sucesso no sistema',
      person: {
        id: novoColaborador.id,
        name: name,
        cpf: cpf,
        registeredAt: newPerson.registeredAt
      }
    });
    
  } catch (error) {
    console.error('Erro ao adicionar pessoa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Controller para listar pessoas cadastradas
const listPersons = (req, res) => {
  try {
    const persons = registeredPersons.map(person => ({
      id: person.id,
      name: person.name,
      cpf: person.cpf,
      registeredAt: person.registeredAt
    }));
    
    res.json({
      success: true,
      persons: persons,
      total: persons.length
    });
    
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Controller para resetar sistema
const resetSystem = (req, res) => {
  try {
    // Limpar lista de pessoas
    registeredPersons = [];
    
    // Salvar dados vazios
    savePersonsData();
    
    // Remover arquivos de imagem
    const uploadsDir = path.join(__dirname, '../uploads/faces');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    console.log('Sistema resetado');
    
    res.json({
      success: true,
      message: 'Sistema resetado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao resetar sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Controller para registrar ponto via reconhecimento facial
const registerPointByFace = async (req, res) => {
  try {
    // Middleware de upload será executado antes
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const { latitude, longitude, tablet_id, tablet_name, tablet_location } = req.body;
    const imagePath = req.file.path;
    
    // Simular reconhecimento facial
    const result = simulateFaceRecognition(imagePath, registeredPersons);
    
    console.log('Resultado do reconhecimento para ponto:', result);
    
    if (!result.recognized || !result.person) {
      // Remover arquivo temporário
      setTimeout(() => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }, 1000);
      
      return res.json({
        success: false,
        recognized: false,
        message: 'Pessoa não reconhecida. Cadastre-se primeiro.'
      });
    }

    // Pessoa reconhecida - buscar colaborador no banco
    const colaborador = await Colaborador.findByCpf(result.person.cpf);
    if (!colaborador) {
      return res.status(404).json({
        success: false,
        message: 'Colaborador não encontrado no sistema'
      });
    }

    // Registrar ponto no banco de dados
    const query = `
      INSERT INTO registros_ponto 
      (colaborador_id, data_hora, latitude, longitude, tablet_id, tablet_name, tablet_location)
              VALUES ($1, NOW() AT TIME ZONE 'America/Sao_Paulo', $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      colaborador.id,
      latitude || null,
      longitude || null, 
      tablet_id || null,
      tablet_name || null,
      tablet_location || null
    ];
    
    const registroResult = await db.query(query, values);
    const registro = registroResult.rows[0];
    
    console.log(`✅ Ponto registrado via reconhecimento facial: ID ${registro.id} para ${colaborador.nome}`);

    // Remover arquivo temporário após processamento
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 1000);
    
    res.json({
      success: true,
      recognized: true,
      point_registered: true,
      person: {
        id: result.person.id,
        name: result.person.name,
        cpf: result.person.cpf
      },
      registro: {
        id: registro.id,
        data_hora: registro.data_hora,
        colaborador_nome: colaborador.nome,
        tablet_id: registro.tablet_id
      },
      confidence: result.confidence,
      message: `Ponto registrado com sucesso para ${result.person.name}!`
    });
    
  } catch (error) {
    console.error('Erro no registro de ponto por reconhecimento facial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = {
  recognizeFace,
  addPerson,
  listPersons,
  resetSystem,
  registerPointByFace,
  upload
}; 