const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configuração do multer para upload de faces do primeiro registro
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/faces');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const cpf = req.body.cpf || 'unknown';
    cb(null, `primeiro_registro_${cpf}_${timestamp}.jpg`);
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

/**
 * POST /api/primeiro-registro/consultar-cpf
 * Consultar colaborador por CPF para primeiro registro
 */
const consultarColaboradorPorCpf = async (req, res) => {
  try {
    const { cpf } = req.body;
    
    console.log(`🔍 Consultando colaborador por CPF: ${cpf}`);
    
    // Validar CPF
    if (!cpf || cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
      return res.status(400).json({
        success: false,
        message: 'CPF inválido. Deve conter 11 dígitos numéricos.'
      });
    }
    
    // Buscar colaborador no banco
    const query = `
      SELECT 
        id, nome, cpf, data_nascimento, face_cadastrada, 
        cargo, departamento, ativo
      FROM colaboradores 
      WHERE cpf = $1 AND ativo = true
    `;
    
    const result = await db.query(query, [cpf]);
    
    if (result.rows.length === 0) {
      console.log(`❌ CPF não encontrado: ${cpf}`);
      return res.status(404).json({
        success: false,
        message: 'CPF não encontrado no sistema. Verifique com o RH.'
      });
    }
    
    const colaborador = result.rows[0];
    
    // Verificar se já tem face cadastrada
    if (colaborador.face_cadastrada) {
      console.log(`⚠️ Colaborador ${colaborador.nome} já tem face cadastrada`);
      return res.status(409).json({
        success: false,
        message: 'Este colaborador já realizou o primeiro registro. Use o reconhecimento facial normal.',
        colaborador: {
          nome: colaborador.nome,
          cargo: colaborador.cargo
        }
      });
    }
    
    console.log(`✅ Colaborador encontrado: ${colaborador.nome}`);
    
    return res.status(200).json({
      success: true,
      message: 'Colaborador encontrado. Confirme os dados para continuar.',
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        cpf: colaborador.cpf,
        data_nascimento: colaborador.data_nascimento,
        cargo: colaborador.cargo,
        departamento: colaborador.departamento
      }
    });
    
  } catch (error) {
    console.error('Erro ao consultar CPF:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

/**
 * POST /api/primeiro-registro/cadastrar-face
 * Cadastrar face e registrar primeiro ponto
 */
const cadastrarFaceEPonto = async (req, res) => {
  try {
    const { 
      colaborador_id, 
      cpf_confirmado, 
      nome_confirmado, 
      data_nascimento_confirmada,
      latitude, 
      longitude, 
      tablet_id 
    } = req.body;
    
    console.log(`📸 Cadastrando face para primeiro registro: ${nome_confirmado} (CPF: ${cpf_confirmado})`);
    
    // Verificar se arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }
    
    // Validar dados obrigatórios
    if (!colaborador_id || !cpf_confirmado || !nome_confirmado || !data_nascimento_confirmada) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }
    
    // Verificar se colaborador ainda existe e não tem face
    const colaboradorQuery = `
      SELECT id, nome, cpf, data_nascimento, face_cadastrada 
      FROM colaboradores 
      WHERE id = $1 AND cpf = $2 AND ativo = true
    `;
    
    const colaboradorResult = await db.query(colaboradorQuery, [colaborador_id, cpf_confirmado]);
    
    if (colaboradorResult.rows.length === 0) {
      // Limpar arquivo temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Colaborador não encontrado ou inativo'
      });
    }
    
    const colaborador = colaboradorResult.rows[0];
    
    if (colaborador.face_cadastrada) {
      // Limpar arquivo temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(409).json({
        success: false,
        message: 'Este colaborador já possui face cadastrada'
      });
    }
    
    // Validar dados confirmados
    const dataNascimentoFormatada = new Date(data_nascimento_confirmada).toISOString().split('T')[0];
    const dataBanco = new Date(colaborador.data_nascimento).toISOString().split('T')[0];
    
    if (dataNascimentoFormatada !== dataBanco) {
      // Limpar arquivo temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Data de nascimento não confere com os dados cadastrados'
      });
    }
    
    try {
      // 1. Cadastrar face no sistema de reconhecimento
      const faceData = {
        id: colaborador.id,
        name: colaborador.nome,
        colaborador_id: colaborador.id,
        image_path: req.file.path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        first_registration: true
      };
      
      // Carregar/criar arquivo persons.json
      const dataPath = path.join(__dirname, '../data/persons.json');
      let persons = [];
      
      if (fs.existsSync(dataPath)) {
        try {
          const data = fs.readFileSync(dataPath, 'utf8');
          persons = JSON.parse(data);
        } catch (e) {
          console.warn('Erro ao ler persons.json, criando novo:', e.message);
          persons = [];
        }
      }
      
      // Adicionar nova face
      persons.push(faceData);
      
      // Salvar persons.json
      const dirPath = path.dirname(dataPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(dataPath, JSON.stringify(persons, null, 2));
      
      console.log('✅ Face adicionada ao sistema de reconhecimento');
      
      // 2. Marcar colaborador como tendo face cadastrada
      await db.query(
        'UPDATE colaboradores SET face_cadastrada = true WHERE id = $1',
        [colaborador.id]
      );
      
      console.log('✅ Colaborador marcado como face cadastrada');
      
      // 3. Registrar primeiro ponto automaticamente
      const registroPontoQuery = `
        INSERT INTO registros_ponto (
          colaborador_id, data_hora, latitude, longitude, 
          origem, status, caminho_foto, tablet_id, observacoes
        ) VALUES ($1, NOW(), $2, $3, 'primeiro_registro', 'registrado', $4, $5, 'Primeiro registro com cadastro de face')
        RETURNING id, data_hora
      `;
      
      const registroResult = await db.query(registroPontoQuery, [
        colaborador.id,
        parseFloat(latitude) || null,
        parseFloat(longitude) || null,
        req.file.path,
        tablet_id || 'totem_principal'
      ]);
      
      const registro = registroResult.rows[0];
      
      console.log(`✅ Primeiro ponto registrado: ID ${registro.id}`);
      
      // 4. Resposta de sucesso
      return res.status(200).json({
        success: true,
        message: 'Primeiro registro realizado com sucesso!',
        colaborador: {
          id: colaborador.id,
          nome: colaborador.nome,
          cpf: colaborador.cpf
        },
        registro: {
          id: registro.id,
          data_hora: registro.data_hora,
          tipo: 'primeiro_registro'
        },
        proximos_passos: 'Face cadastrada! Próximos registros podem usar reconhecimento facial.'
      });
      
    } catch (error) {
      console.error('Erro ao processar primeiro registro:', error);
      
      // Limpar arquivo em caso de erro
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar primeiro registro',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
    
  } catch (error) {
    console.error('Erro no primeiro registro:', error);
    
    // Limpar arquivo temporário
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

/**
 * GET /api/primeiro-registro/colaboradores-pendentes
 * Listar colaboradores que ainda não fizeram primeiro registro
 */
const listarColaboradoresPendentes = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, nome, cpf, cargo, departamento, data_admissao, criado_em
      FROM colaboradores 
      WHERE face_cadastrada = false AND ativo = true
      ORDER BY criado_em DESC
    `;
    
    const result = await db.query(query);
    
    return res.status(200).json({
      success: true,
      total: result.rows.length,
      colaboradores: result.rows,
      message: result.rows.length > 0 
        ? `${result.rows.length} colaboradores aguardando primeiro registro`
        : 'Todos os colaboradores já realizaram o primeiro registro'
    });
    
  } catch (error) {
    console.error('Erro ao listar colaboradores pendentes:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar colaboradores pendentes'
    });
  }
};

// Alias para compatibilidade com rotas
const buscarColaboradorPorCpf = consultarColaboradorPorCpf;
const confirmarERegistrarFace = cadastrarFaceEPonto;

module.exports = {
  consultarColaboradorPorCpf,
  buscarColaboradorPorCpf,
  cadastrarFaceEPonto,
  confirmarERegistrarFace,
  listarColaboradoresPendentes,
  upload
};