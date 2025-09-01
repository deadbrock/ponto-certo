const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'txts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceitar apenas arquivos .txt
  if (file.mimetype === 'text/plain' || path.extname(file.originalname).toLowerCase() === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos .txt são permitidos'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

/**
 * Função para validar e converter linha do arquivo de ponto
 * Formato esperado: "001234567890 20250806 0800"
 */
function processarLinhaArquivo(linha, numeroLinha) {
  try {
    // Remove espaços extras e quebras de linha
    linha = linha.trim();
    
    // Pular linhas vazias
    if (!linha) {
      return { valido: false, motivo: 'Linha vazia' };
    }
    
    // Dividir por espaços (pode ter múltiplos espaços)
    const partes = linha.split(/\s+/);
    
    if (partes.length !== 3) {
      return { 
        valido: false, 
        motivo: `Formato inválido. Esperado: PIS DATA HORA. Encontrado: ${partes.length} campos` 
      };
    }
    
    const [pis, dataStr, horaStr] = partes;
    
    // Validar PIS (deve ter entre 10-11 dígitos)
    if (!/^\d{10,11}$/.test(pis)) {
      return { 
        valido: false, 
        motivo: `PIS inválido: ${pis}. Deve conter 10-11 dígitos` 
      };
    }
    
    // Validar data (AAAAMMDD)
    if (!/^\d{8}$/.test(dataStr)) {
      return { 
        valido: false, 
        motivo: `Data inválida: ${dataStr}. Formato esperado: AAAAMMDD` 
      };
    }
    
    // Validar hora (HHMM)
    if (!/^\d{4}$/.test(horaStr)) {
      return { 
        valido: false, 
        motivo: `Hora inválida: ${horaStr}. Formato esperado: HHMM` 
      };
    }
    
    // Converter data
    const ano = parseInt(dataStr.substr(0, 4));
    const mes = parseInt(dataStr.substr(4, 2));
    const dia = parseInt(dataStr.substr(6, 2));
    
    // Validar valores de data
    if (ano < 2020 || ano > 2030) {
      return { valido: false, motivo: `Ano inválido: ${ano}` };
    }
    if (mes < 1 || mes > 12) {
      return { valido: false, motivo: `Mês inválido: ${mes}` };
    }
    if (dia < 1 || dia > 31) {
      return { valido: false, motivo: `Dia inválido: ${dia}` };
    }
    
    // Converter hora
    const hora = parseInt(horaStr.substr(0, 2));
    const minuto = parseInt(horaStr.substr(2, 2));
    
    // Validar valores de hora
    if (hora < 0 || hora > 23) {
      return { valido: false, motivo: `Hora inválida: ${hora}` };
    }
    if (minuto < 0 || minuto > 59) {
      return { valido: false, motivo: `Minuto inválido: ${minuto}` };
    }
    
    // Criar timestamp
    const dataHora = new Date(ano, mes - 1, dia, hora, minuto);
    
    // Verificar se a data é válida
    if (isNaN(dataHora.getTime())) {
      return { valido: false, motivo: 'Data/hora resultante é inválida' };
    }
    
    return {
      valido: true,
      pis: pis,
      dataHora: dataHora,
      linha: numeroLinha
    };
    
  } catch (error) {
    return { 
      valido: false, 
      motivo: `Erro ao processar linha: ${error.message}` 
    };
  }
}

/**
 * Buscar colaborador pelo PIS
 */
async function buscarColaboradorPorPis(pis) {
  try {
    const query = `
      SELECT id, nome, pis 
      FROM colaboradores 
      WHERE pis = $1 OR matricula = $1
      LIMIT 1
    `;
    const result = await db.query(query, [pis]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao buscar colaborador:', error);
    return null;
  }
}

/**
 * Inserir registro de ponto
 */
async function inserirRegistroPonto(idColaborador, dataHora, origem = 'arquivo_txt') {
  try {
    // Verificar se a tabela tem id_colaborador ou colaborador_id
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registros_ponto' 
      AND column_name IN ('id_colaborador', 'colaborador_id')
    `;
    const checkResult = await db.query(checkQuery);
    
    let colaboradorColumn = 'colaborador_id'; // padrão
    if (checkResult.rows.some(row => row.column_name === 'id_colaborador')) {
      colaboradorColumn = 'id_colaborador';
    }
    
    // Verificar se existem as colunas origem e status
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registros_ponto' 
      AND column_name IN ('origem', 'status')
    `;
    const columnsResult = await db.query(columnsQuery);
    const hasOrigem = columnsResult.rows.some(row => row.column_name === 'origem');
    const hasStatus = columnsResult.rows.some(row => row.column_name === 'status');
    
    // Construir query dinâmica baseada nas colunas disponíveis
    let query, values;
    
    if (hasOrigem && hasStatus) {
      query = `
        INSERT INTO registros_ponto (${colaboradorColumn}, data_hora, origem, status)
        VALUES ($1, $2, $3, 'importado')
        RETURNING id
      `;
      values = [idColaborador, dataHora, origem];
    } else {
      query = `
        INSERT INTO registros_ponto (${colaboradorColumn}, data_hora)
        VALUES ($1, $2)
        RETURNING id
      `;
      values = [idColaborador, dataHora];
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao inserir registro de ponto:', error);
    throw error;
  }
}

/**
 * Calcular hash MD5 do arquivo
 */
function calcularHashArquivo(caminhoArquivo) {
  const conteudo = fs.readFileSync(caminhoArquivo);
  return crypto.createHash('md5').update(conteudo).digest('hex');
}

/**
 * Registrar arquivo importado
 */
async function registrarArquivoImportado(dados) {
  try {
    const query = `
      INSERT INTO arquivos_importados 
      (nome_arquivo, caminho_arquivo, tamanho_arquivo, id_usuario, total_registros, 
       registros_validos, registros_invalidos, detalhes_erros, hash_arquivo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    
    const valores = [
      dados.nomeArquivo,
      dados.caminhoArquivo,
      dados.tamanhoArquivo,
      dados.idUsuario,
      dados.totalRegistros,
      dados.registrosValidos,
      dados.registrosInvalidos,
      JSON.stringify(dados.erros),
      dados.hashArquivo
    ];
    
    const result = await db.query(query, valores);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao registrar arquivo importado:', error);
    throw error;
  }
}

/**
 * Controller principal para importar arquivo TXT
 */
const importarArquivoTxt = async (req, res) => {
  console.log('🔄 Iniciando importação de arquivo TXT de ponto...');
  
  try {
    // Verificar se arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }
    
    const arquivo = req.file;
    const caminhoArquivo = arquivo.path;
    const hashArquivo = calcularHashArquivo(caminhoArquivo);
    
    console.log(`📁 Arquivo recebido: ${arquivo.originalname}`);
    console.log(`📊 Tamanho: ${arquivo.size} bytes`);
    console.log(`🔒 Hash: ${hashArquivo}`);
    
    // Verificar se arquivo já foi importado antes
    const arquivoExistente = await db.query(
      'SELECT id FROM arquivos_importados WHERE hash_arquivo = $1',
      [hashArquivo]
    );
    
    if (arquivoExistente.rows.length > 0) {
      // Remover arquivo duplicado
      fs.unlinkSync(caminhoArquivo);
      return res.status(409).json({
        success: false,
        message: 'Este arquivo já foi importado anteriormente',
        arquivoId: arquivoExistente.rows[0].id
      });
    }
    
    // Ler conteúdo do arquivo
    const conteudoArquivo = fs.readFileSync(caminhoArquivo, 'utf8');
    const linhas = conteudoArquivo.split('\n');
    
    console.log(`📄 Total de linhas no arquivo: ${linhas.length}`);
    
    // Estatísticas do processamento
    let totalRegistros = 0;
    let registrosValidos = 0;
    let registrosInvalidos = 0;
    let erros = [];
    
    // Processar cada linha
    for (let i = 0; i < linhas.length; i++) {
      const numeroLinha = i + 1;
      const linha = linhas[i];
      
      // Pular linhas vazias
      if (!linha.trim()) continue;
      
      totalRegistros++;
      
      console.log(`🔍 Processando linha ${numeroLinha}: ${linha.trim()}`);
      
      // Validar e converter linha
      const resultado = processarLinhaArquivo(linha, numeroLinha);
      
      if (!resultado.valido) {
        registrosInvalidos++;
        erros.push({
          linha: numeroLinha,
          conteudo: linha.trim(),
          motivo: resultado.motivo
        });
        console.log(`❌ Erro linha ${numeroLinha}: ${resultado.motivo}`);
        continue;
      }
      
      // Buscar colaborador
      const colaborador = await buscarColaboradorPorPis(resultado.pis);
      
      if (!colaborador) {
        registrosInvalidos++;
        erros.push({
          linha: numeroLinha,
          conteudo: linha.trim(),
          motivo: `PIS não encontrado: ${resultado.pis}`
        });
        console.log(`❌ PIS não encontrado linha ${numeroLinha}: ${resultado.pis}`);
        continue;
      }
      
      try {
        // Inserir registro de ponto
        await inserirRegistroPonto(colaborador.id, resultado.dataHora);
        registrosValidos++;
        console.log(`✅ Registro inserido linha ${numeroLinha}: ${colaborador.nome} - ${resultado.dataHora}`);
      } catch (error) {
        registrosInvalidos++;
        erros.push({
          linha: numeroLinha,
          conteudo: linha.trim(),
          motivo: `Erro ao inserir no banco: ${error.message}`
        });
        console.log(`❌ Erro ao inserir linha ${numeroLinha}: ${error.message}`);
      }
    }
    
    // Registrar arquivo importado
    const dadosArquivo = {
      nomeArquivo: arquivo.originalname,
      caminhoArquivo: caminhoArquivo,
      tamanhoArquivo: arquivo.size,
      idUsuario: req.user?.id || null,
      totalRegistros: totalRegistros,
      registrosValidos: registrosValidos,
      registrosInvalidos: registrosInvalidos,
      erros: erros,
      hashArquivo: hashArquivo
    };
    
    const arquivoImportado = await registrarArquivoImportado(dadosArquivo);
    
    console.log(`🎉 Importação concluída!`);
    console.log(`📊 Estatísticas: ${registrosValidos} válidos, ${registrosInvalidos} inválidos de ${totalRegistros} total`);
    
    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'Arquivo processado com sucesso',
      dados: {
        arquivoId: arquivoImportado.id,
        nomeArquivo: arquivo.originalname,
        totalRegistros: totalRegistros,
        registrosValidos: registrosValidos,
        registrosInvalidos: registrosInvalidos,
        erros: erros,
        percentualSucesso: totalRegistros > 0 ? ((registrosValidos / totalRegistros) * 100).toFixed(2) : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao processar arquivo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

/**
 * Listar arquivos importados
 */
const listarArquivosImportados = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        id,
        nome_arquivo,
        data_upload,
        total_registros,
        registros_validos,
        registros_invalidos,
        status_processamento,
        tamanho_arquivo
      FROM arquivos_importados
      ORDER BY data_upload DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = 'SELECT COUNT(*) as total FROM arquivos_importados';
    
    const [arquivos, totalCount] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);
    
    res.json({
      success: true,
      dados: arquivos.rows,
      paginacao: {
        paginaAtual: page,
        totalPaginas: Math.ceil(totalCount.rows[0].total / limit),
        totalRegistros: parseInt(totalCount.rows[0].total),
        registrosPorPagina: limit
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar arquivos importados'
    });
  }
};

/**
 * Obter detalhes de um arquivo importado
 */
const obterDetalhesArquivo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id,
        nome_arquivo,
        data_upload,
        total_registros,
        registros_validos,
        registros_invalidos,
        status_processamento,
        detalhes_erros,
        tamanho_arquivo,
        hash_arquivo
      FROM arquivos_importados
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }
    
    const arquivo = result.rows[0];
    
    // Parse dos erros se existirem
    if (arquivo.detalhes_erros) {
      try {
        arquivo.detalhes_erros = JSON.parse(arquivo.detalhes_erros);
      } catch (e) {
        arquivo.detalhes_erros = [];
      }
    }
    
    res.json({
      success: true,
      dados: arquivo
    });
    
  } catch (error) {
    console.error('Erro ao obter detalhes do arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do arquivo'
    });
  }
};

module.exports = {
  upload,
  importarArquivoTxt,
  listarArquivosImportados,
  obterDetalhesArquivo
};