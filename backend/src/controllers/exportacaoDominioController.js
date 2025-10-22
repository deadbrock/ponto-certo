const fs = require('fs');
const path = require('path');

/**
 * Controller para exportação de arquivos no formato Domínio Sistemas
 * Layout fixo para importação de lançamentos de ponto
 */

/**
 * Gera arquivo .txt com layout fixo para Domínio Sistemas
 * @route POST /api/exportar-dominio
 */
const exportarArquivoDominio = async (req, res) => {
  try {
    const { competencia, tipoFolha, codigoEmpresa, registros } = req.body;

    // Validações
    if (!competencia || !tipoFolha || !codigoEmpresa || !registros) {
      return res.status(400).json({
        success: false,
        erro: 'Campos obrigatórios: competencia, tipoFolha, codigoEmpresa, registros'
      });
    }

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({
        success: false,
        erro: 'O campo registros deve ser um array não vazio'
      });
    }

    // Validar formato da competência (AAAAMM)
    if (!/^\d{6}$/.test(competencia)) {
      return res.status(400).json({
        success: false,
        erro: 'Competência deve estar no formato AAAAMM (ex: 202510)'
      });
    }

    // Validar tipo de folha
    const tiposFolhaValidos = ['11', '41', '42', '51', '52'];
    if (!tiposFolhaValidos.includes(tipoFolha)) {
      return res.status(400).json({
        success: false,
        erro: `Tipo de folha deve ser um dos seguintes: ${tiposFolhaValidos.join(', ')}`
      });
    }

    console.log('📄 Gerando arquivo Domínio...');
    console.log(`   Competência: ${competencia}`);
    console.log(`   Tipo Folha: ${tipoFolha}`);
    console.log(`   Empresa: ${codigoEmpresa}`);
    console.log(`   Registros: ${registros.length}`);

    // Gerar linhas do arquivo
    const linhas = registros.map((registro, index) => {
      // Validar registro
      if (!registro.codigoEmpregado || !registro.codigoRubrica || registro.valor === undefined) {
        throw new Error(`Registro ${index + 1}: campos obrigatórios faltando (codigoEmpregado, codigoRubrica, valor)`);
      }

      // Campo 1: Fixo "10"
      const fixo = '10';

      // Campo 2: Código do empregado (10 dígitos, zeros à esquerda)
      const emp = registro.codigoEmpregado.toString().padStart(10, '0');

      // Campo 3: Competência AAAAMM
      const comp = competencia;

      // Campo 4: Código da rubrica (3 dígitos)
      const rub = registro.codigoRubrica.toString().padStart(3, '0');

      // Campo 5: Tipo de folha (2 dígitos)
      const tipo = tipoFolha.padStart(2, '0');

      // Campo 6: Valor (11 dígitos, duas decimais sem ponto)
      // Multiplica por 100 para converter decimais em inteiros
      const valorInteiro = Math.round(registro.valor * 100);
      const valor = valorInteiro.toString().padStart(11, '0');

      // Campo 7: Código da empresa (4 dígitos)
      const empres = codigoEmpresa.toString().padStart(4, '0');

      // Retorna linha formatada (sem separadores)
      return `${fixo}${emp}${comp}${rub}${tipo}${valor}${empres}`;
    });

    // Gerar nome do arquivo único
    const timestamp = new Date().getTime();
    const nomeArquivo = `exportacao_dominio_${competencia}_${timestamp}.txt`;
    const filePath = path.join(process.cwd(), 'temp', nomeArquivo);

    // Criar diretório temp se não existir
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Escrever arquivo
    fs.writeFileSync(filePath, linhas.join('\n'), 'utf8');

    console.log(`✅ Arquivo gerado: ${nomeArquivo}`);
    console.log(`   Linhas: ${linhas.length}`);
    console.log(`   Tamanho: ${fs.statSync(filePath).size} bytes`);

    // Enviar arquivo para download
    res.download(filePath, nomeArquivo, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            erro: 'Erro ao enviar arquivo para download'
          });
        }
      }

      // Limpar arquivo temporário após o download
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Arquivo temporário removido: ${nomeArquivo}`);
          }
        } catch (cleanupErr) {
          console.error('Erro ao remover arquivo temporário:', cleanupErr);
        }
      }, 5000); // Aguarda 5 segundos antes de remover
    });

  } catch (error) {
    console.error('❌ Erro ao gerar arquivo Domínio:', error);
    res.status(500).json({
      success: false,
      erro: 'Falha ao gerar arquivo',
      detalhes: error.message
    });
  }
};

/**
 * Utilitário para converter horas decimais em formato HH:MM
 * Exemplo: 8.75 horas = 8h 45min
 */
const converterHorasDecimais = (horasDecimais) => {
  const horas = Math.floor(horasDecimais);
  const minutos = Math.round((horasDecimais - horas) * 60);
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};

/**
 * Utilitário para converter moeda em centavos
 * Exemplo: R$ 150,50 = 15050 centavos
 */
const converterMoedaEmCentavos = (valorMoeda) => {
  return Math.round(valorMoeda * 100);
};

module.exports = {
  exportarArquivoDominio,
  converterHorasDecimais,
  converterMoedaEmCentavos
};

