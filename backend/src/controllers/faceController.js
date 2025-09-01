const multer = require('multer');
const fs = require('fs');
const path = require('path');
const RegistroPonto = require('../models/registroPontoModel');
const Colaborador = require('../models/colaboradorModel');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/faces');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `image-${uniqueSuffix}.jpg`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Carregar pessoas cadastradas do arquivo JSON
function loadPersons() {
  try {
    const dataPath = path.join(__dirname, '../data/persons.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar persons.json:', error);
    return [];
  }
}

// Salvar pessoas no arquivo JSON
function savePersons(persons) {
  try {
    const dataPath = path.join(__dirname, '../data/persons.json');
    const dirPath = path.dirname(dataPath);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(persons, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar persons.json:', error);
    return false;
  }
}

// Reconhecimento facial e registro de ponto
const recognizeFace = async (req, res) => {
  try {
    console.log(`[${new Date()}] Iniciando reconhecimento facial`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada'
      });
    }

    const imagePath = req.file.path;
    const { latitude, longitude, tablet_id, tablet_name, tablet_location } = req.body;

    console.log(`📸 Imagem recebida: ${imagePath}`);
    console.log(`📍 Coordenadas: ${latitude}, ${longitude}`);
    console.log(`📱 Totem: ${tablet_id} - ${tablet_name}`);

    // Carregar pessoas cadastradas
    const registeredPersons = loadPersons();
    console.log(`👥 Pessoas cadastradas: ${registeredPersons.length}`);

    if (registeredPersons.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma pessoa cadastrada no sistema. Cadastre faces primeiro.',
        message: 'Sistema vazio - cadastre colaboradores com reconhecimento facial'
      });
    }

    // Simular reconhecimento facial (em produção usar biblioteca real como face_recognition)
    const recognitionResult = simulateFaceRecognition(imagePath, registeredPersons);

    if (!recognitionResult.recognized) {
      // Limpar arquivo temporário
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return res.status(200).json({
        success: false,
        error: 'Pessoa não reconhecida',
        confidence: recognitionResult.confidence,
        message: 'Face não corresponde a nenhum colaborador cadastrado'
      });
    }

    const person = recognitionResult.person;
    console.log(`✅ Pessoa reconhecida: ${person.name} (ID: ${person.colaborador_id})`);

    // Verificar se colaborador existe no banco
    const colaborador = await Colaborador.findById(person.colaborador_id);
    if (!colaborador) {
      console.error(`❌ Colaborador ${person.colaborador_id} não encontrado no banco`);
      
      // Limpar arquivo temporário
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado no sistema',
        message: 'Face reconhecida mas colaborador não existe no banco de dados'
      });
    }

    // Registrar ponto automaticamente
    try {
      const registro = await RegistroPonto.create({
        colaborador_id: person.colaborador_id,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        tablet_id: tablet_id || null,
        tablet_name: tablet_name || null,
        tablet_location: tablet_location || null,
        caminho_foto: imagePath // Salvar caminho da foto
      });

      console.log(`📝 Ponto registrado: ID ${registro.id}`);

      // Determinar tipo de registro
      const proximoTipo = await RegistroPonto.determinarProximoTipo(person.colaborador_id);
      
      // Obter informações do turno
      const infoTurno = await RegistroPonto.obterInfoTurno(person.colaborador_id);

      return res.status(200).json({
        success: true,
        recognized: true,
        person_name: colaborador.nome,
        person_id: person.colaborador_id,
        confidence: recognitionResult.confidence,
        attendance_recorded: true,
        registro: {
          id: registro.id,
          data_hora: registro.data_hora,
          tipo_registro: proximoTipo,
          latitude: registro.latitude,
          longitude: registro.longitude
        },
        turno: infoTurno,
        message: `Ponto registrado com sucesso para ${colaborador.nome}`
      });

    } catch (registroError) {
      console.error('Erro ao registrar ponto:', registroError);
      
      // Limpar arquivo temporário em caso de erro
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar ponto',
        recognized: true,
        person_name: colaborador.nome,
        details: registroError.message
      });
    }

  } catch (error) {
    console.error('Erro no reconhecimento facial:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno no reconhecimento facial',
      details: error.message
    });
  }
};

// Adicionar nova pessoa ao sistema
const addPerson = async (req, res) => {
  try {
    const { name, colaborador_id } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada'
      });
    }

    if (!name || !colaborador_id) {
      return res.status(400).json({
        success: false,
        error: 'Nome e ID do colaborador são obrigatórios'
      });
    }

    console.log(`[${new Date()}] Cadastrando nova face: ${name} (ID: ${colaborador_id})`);

    // Verificar se colaborador existe
    const colaborador = await Colaborador.findById(colaborador_id);
    if (!colaborador) {
      // Limpar arquivo temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado no banco de dados'
      });
    }

    // Carregar pessoas existentes
    const persons = loadPersons();
    
    // Verificar se a pessoa já está cadastrada
    const existingPerson = persons.find(p => p.colaborador_id === parseInt(colaborador_id));
    if (existingPerson) {
      // Atualizar foto existente
      if (fs.existsSync(existingPerson.image_path)) {
        fs.unlinkSync(existingPerson.image_path);
      }
      existingPerson.image_path = req.file.path;
      existingPerson.name = name;
      existingPerson.updated_at = new Date().toISOString();
    } else {
      // Adicionar nova pessoa
      const newPerson = {
        id: persons.length + 1,
        name: name,
        colaborador_id: parseInt(colaborador_id),
        image_path: req.file.path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      persons.push(newPerson);
    }

    // Salvar arquivo JSON
    if (savePersons(persons)) {
      console.log(`✅ Face cadastrada com sucesso: ${name}`);
      
      return res.status(200).json({
        success: true,
        message: `Face de ${name} cadastrada com sucesso`,
        person: {
          name: name,
          colaborador_id: colaborador_id,
          image_path: req.file.path
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar dados da pessoa'
      });
    }

  } catch (error) {
    console.error('Erro ao adicionar pessoa:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao cadastrar pessoa',
      details: error.message
    });
  }
};

// Listar pessoas cadastradas
const listPersons = async (req, res) => {
  try {
    console.log(`[${new Date()}] Listando pessoas cadastradas`);
    
    const persons = loadPersons();
    
    // Enriquecer dados com informações dos colaboradores
    const enrichedPersons = await Promise.all(
      persons.map(async (person) => {
        try {
          const colaborador = await Colaborador.findById(person.colaborador_id);
          return {
            ...person,
            colaborador_nome: colaborador ? colaborador.nome : 'Colaborador não encontrado',
            colaborador_cpf: colaborador ? colaborador.cpf : null,
            colaborador_ativo: colaborador ? true : false
          };
        } catch (error) {
          console.warn(`Erro ao buscar colaborador ${person.colaborador_id}:`, error);
          return {
            ...person,
            colaborador_nome: 'Erro ao carregar',
            colaborador_cpf: null,
            colaborador_ativo: false
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedPersons.length,
      persons: enrichedPersons
    });

  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao listar pessoas',
      details: error.message
    });
  }
};

// Resetar sistema (limpar todas as faces cadastradas)
const resetSystem = async (req, res) => {
  try {
    console.log(`[${new Date()}] Resetando sistema de reconhecimento facial`);
    
    const persons = loadPersons();
    
    // Remover todas as imagens
    persons.forEach(person => {
      if (fs.existsSync(person.image_path)) {
        fs.unlinkSync(person.image_path);
      }
    });

    // Limpar arquivo JSON
    if (savePersons([])) {
      console.log('✅ Sistema resetado com sucesso');
      
      return res.status(200).json({
        success: true,
        message: 'Sistema de reconhecimento facial resetado com sucesso',
        removed_count: persons.length
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Erro ao resetar sistema'
      });
    }

  } catch (error) {
    console.error('Erro ao resetar sistema:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao resetar sistema',
      details: error.message
    });
  }
};

// Registrar ponto por reconhecimento facial (alias para recognizeFace)
const registerPointByFace = recognizeFace;

// Simulação de reconhecimento facial (substituir por biblioteca real em produção)
function simulateFaceRecognition(imagePath, registeredPersons) {
  // IMPORTANTE: Em produção, substituir por biblioteca real como:
  // - face_recognition (Python/Node.js)
  // - face-api.js
  // - OpenCV com modelos treinados
  // - Azure Face API, AWS Rekognition, Google Vision API
  
  if (registeredPersons.length === 0) {
    return {
      recognized: false,
      person: null,
      confidence: 0,
      message: 'Nenhuma pessoa cadastrada no sistema'
    };
  }

  // Simular processo de reconhecimento
  const randomValue = Math.random();
  
  // 70% de chance de reconhecer se há pessoas cadastradas
  if (randomValue < 0.7) {
    // Simular reconhecimento de uma pessoa cadastrada
    const randomPerson = registeredPersons[Math.floor(Math.random() * registeredPersons.length)];
    return {
      recognized: true,
      person: randomPerson,
      confidence: 0.85 + (Math.random() * 0.1) // 85-95% de confiança
    };
  } else {
    // Simular pessoa não reconhecida
    return {
      recognized: false,
      person: null,
      confidence: 0.3 + (Math.random() * 0.4) // 30-70% de confiança (baixa)
    };
  }
}

module.exports = {
  recognizeFace,
  addPerson,
  listPersons,
  resetSystem,
  registerPointByFace,
  upload
}; 