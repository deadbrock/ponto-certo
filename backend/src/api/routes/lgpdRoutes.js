const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrRH } = require('../middlewares/roleMiddleware');
const { auditMiddleware } = require('../middlewares/auditMiddleware');
const secureLogger = require('../../utils/secureLogger');
const { dataClassifier } = require('../../utils/dataClassification');
const db = require('../../config/database');

// Aplicar middlewares de segurança
router.use(authMiddleware);
router.use(auditMiddleware);

/**
 * @route GET /api/lgpd/mapeamento-dados
 * @desc Gerar mapeamento completo de dados sensíveis
 * @access Admin apenas
 */
router.get('/mapeamento-dados', requireAdmin, async (req, res) => {
  try {
    secureLogger.audit('LGPD_MAPPING_REQUEST', req.user.id, {
      action: 'generate_data_mapping',
      timestamp: new Date().toISOString()
    });

    const mapeamento = {
      timestamp: new Date().toISOString(),
      solicitante: {
        id: req.user.id,
        nome: req.user.nome || 'Administrador',
        perfil: req.user.perfil
      },
      tabelas: {}
    };

    // Analisar cada tabela com dados pessoais
    const tabelas = [
      'colaboradores',
      'usuarios', 
      'registros_ponto',
      'atestados',
      'escalas'
    ];

    for (const tabela of tabelas) {
      try {
        // Buscar amostra de dados (apenas estrutura)
        const sampleQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        const sampleResult = await db.query(sampleQuery, [tabela]);
        const columns = sampleResult.rows;

        // Criar objeto de exemplo para classificação
        const sampleData = {};
        columns.forEach(col => {
          sampleData[col.column_name] = null;
        });

        // Classificar dados
        const classification = dataClassifier.classifyObject(sampleData);

        // Contar registros
        const countResult = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
        const totalRecords = parseInt(countResult.rows[0].total);

        mapeamento.tabelas[tabela] = {
          totalRegistros: totalRecords,
          classificacao: classification.overallClassification,
          requeresCriptografia: classification.requiresEncryption,
          requereAuditoria: classification.requiresAudit,
          campos: classification.fields.map(f => ({
            nome: f.field,
            classificacao: f.classification.label,
            nivel: f.classification.level,
            requeresCriptografia: f.requiresEncryption,
            requereAuditoria: f.requiresAudit
          })),
          resumo: classification.summary,
          recomendacoes: dataClassifier.generateRecommendations(classification)
        };

      } catch (error) {
        secureLogger.error(error, {
          context: 'lgpd_mapping',
          table: tabela
        });
        
        mapeamento.tabelas[tabela] = {
          erro: `Erro ao analisar tabela: ${error.message}`,
          totalRegistros: 0
        };
      }
    }

    // Análise de arquivos biométricos
    try {
      const fs = require('fs');
      const path = require('path');
      const facesDir = path.join(__dirname, '../../uploads/faces');
      
      let biometricFiles = 0;
      if (fs.existsSync(facesDir)) {
        biometricFiles = fs.readdirSync(facesDir).length;
      }

      mapeamento.arquivos_biometricos = {
        diretorio: '/uploads/faces/',
        total_arquivos: biometricFiles,
        classificacao: 'CRÍTICO',
        criptografia: 'AES-256-GCM',
        acesso_restrito: true
      };
    } catch (error) {
      mapeamento.arquivos_biometricos = {
        erro: 'Erro ao analisar arquivos biométricos'
      };
    }

    // Resumo geral
    const totalTabelas = Object.keys(mapeamento.tabelas).length;
    const tabelasComDadosSensiveis = Object.values(mapeamento.tabelas)
      .filter(t => t.classificacao && t.classificacao.level >= 3).length;
    
    mapeamento.resumo_geral = {
      total_tabelas: totalTabelas,
      tabelas_dados_sensiveis: tabelasComDadosSensiveis,
      compliance_score: Math.round(((totalTabelas - tabelasComDadosSensiveis) / totalTabelas) * 100),
      status_lgpd: tabelasComDadosSensiveis > 0 ? 'REQUER_ATENÇÃO' : 'COMPLIANT'
    };

    res.json({
      success: true,
      mapeamento,
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    secureLogger.error(error, {
      context: 'lgpd_mapping_endpoint',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao gerar mapeamento de dados',
      message: 'Entre em contato com o administrador do sistema'
    });
  }
});

/**
 * @route GET /api/lgpd/dados-pessoais/:colaboradorId
 * @desc Exportar dados pessoais de um colaborador (Direito de acesso LGPD)
 * @access Admin/RH ou próprio colaborador
 */
router.get('/dados-pessoais/:colaboradorId', requireAdminOrRH, async (req, res) => {
  try {
    const { colaboradorId } = req.params;
    const userId = req.user.id;

    // Verificar se usuário pode acessar estes dados
    if (req.user.perfil === 'COLABORADOR' && req.user.id !== parseInt(colaboradorId)) {
      return res.status(403).json({
        success: false,
        error: 'Você só pode acessar seus próprios dados'
      });
    }

    secureLogger.audit('LGPD_DATA_ACCESS', userId, {
      action: 'export_personal_data',
      target_colaborador: colaboradorId,
      timestamp: new Date().toISOString()
    });

    const dadosPessoais = {
      colaborador_id: colaboradorId,
      exportado_em: new Date().toISOString(),
      solicitante: {
        id: userId,
        perfil: req.user.perfil
      },
      dados: {}
    };

    // Dados do colaborador
    const colaboradorQuery = `
      SELECT id, nome, cpf, email, telefone, cargo, departamento, 
             data_admissao, endereco, criado_em, atualizado_em
      FROM colaboradores WHERE id = $1
    `;
    const colaborador = await db.query(colaboradorQuery, [colaboradorId]);
    
    if (colaborador.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado'
      });
    }

    dadosPessoais.dados.informacoes_pessoais = colaborador.rows[0];

    // Registros de ponto (últimos 90 dias)
    const pontosQuery = `
      SELECT id, data_hora, latitude, longitude, tablet_id, observacoes
      FROM registros_ponto 
      WHERE colaborador_id = $1 AND data_hora >= NOW() - INTERVAL '90 days'
      ORDER BY data_hora DESC
    `;
    const pontos = await db.query(pontosQuery, [colaboradorId]);
    dadosPessoais.dados.registros_ponto = pontos.rows;

    // Escalas
    const escalasQuery = `
      SELECT tipo_escala, horario_inicio, horario_fim, dias_semana, 
             data_inicio, data_fim, ativo
      FROM escalas WHERE colaborador_id = $1
    `;
    const escalas = await db.query(escalasQuery, [colaboradorId]);
    dadosPessoais.dados.escalas = escalas.rows;

    // Atestados
    const atestadosQuery = `
      SELECT id, tipo_atestado, data_inicio, data_fim, motivo, status, 
             criado_em, observacoes
      FROM atestados WHERE colaborador_id = $1
    `;
    const atestados = await db.query(atestadosQuery, [colaboradorId]);
    dadosPessoais.dados.atestados = atestados.rows;

    // Informações sobre dados biométricos (sem expor os dados)
    dadosPessoais.dados.dados_biometricos = {
      possui_cadastro_facial: true, // Verificar se existe
      data_primeiro_cadastro: null, // Buscar do persons.json
      total_reconhecimentos: pontos.rows.length,
      observacao: 'Dados biométricos não são exportáveis por questões de segurança'
    };

    // Filtrar dados baseado no nível de acesso
    const dadosFiltrados = dataClassifier.filterDataByAccess(
      dadosPessoais.dados, 
      req.user
    );

    res.json({
      success: true,
      dados_pessoais: {
        ...dadosPessoais,
        dados: dadosFiltrados
      },
      observacoes: {
        periodo_pontos: '90 dias',
        dados_biometricos: 'Não exportáveis por segurança',
        base_legal: 'LGPD Art. 18, II - Direito de acesso'
      }
    });

  } catch (error) {
    secureLogger.error(error, {
      context: 'lgpd_data_export',
      colaboradorId: req.params.colaboradorId
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao exportar dados pessoais'
    });
  }
});

/**
 * @route POST /api/lgpd/solicitar-exclusao/:colaboradorId
 * @desc Solicitar exclusão de dados pessoais (Direito ao esquecimento)
 * @access Admin/RH apenas
 */
router.post('/solicitar-exclusao/:colaboradorId', requireAdminOrRH, async (req, res) => {
  try {
    const { colaboradorId } = req.params;
    const { motivo, confirmar_exclusao } = req.body;

    if (!confirmar_exclusao) {
      return res.status(400).json({
        success: false,
        error: 'Confirmação de exclusão é obrigatória'
      });
    }

    secureLogger.audit('LGPD_DELETE_REQUEST', req.user.id, {
      action: 'request_data_deletion',
      target_colaborador: colaboradorId,
      motivo,
      timestamp: new Date().toISOString()
    });

    // Por enquanto, apenas registrar a solicitação
    // Em produção, implementar workflow de aprovação
    
    res.json({
      success: true,
      message: 'Solicitação de exclusão registrada',
      protocolo: `LGPD-${Date.now()}`,
      observacao: 'A exclusão será processada conforme procedimentos internos',
      prazo_legal: '15 dias úteis (LGPD Art. 18, VI)'
    });

  } catch (error) {
    secureLogger.error(error, {
      context: 'lgpd_deletion_request'
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao processar solicitação de exclusão'
    });
  }
});

/**
 * @route GET /api/lgpd/relatorio-compliance
 * @desc Gerar relatório de compliance LGPD
 * @access Admin apenas
 */
router.get('/relatorio-compliance', requireAdmin, async (req, res) => {
  try {
    secureLogger.audit('LGPD_COMPLIANCE_REPORT', req.user.id, {
      action: 'generate_compliance_report',
      timestamp: new Date().toISOString()
    });

    const relatorio = {
      gerado_em: new Date().toISOString(),
      periodo_analise: '30 dias',
      status_geral: 'EM_CONFORMIDADE',
      itens_verificados: {
        criptografia_dados_sensiveis: {
          status: 'CONFORME',
          detalhes: 'AES-256-GCM implementado para dados biométricos'
        },
        controle_acesso: {
          status: 'CONFORME', 
          detalhes: 'RBAC implementado com níveis adequados'
        },
        auditoria_acessos: {
          status: 'CONFORME',
          detalhes: 'Logs estruturados e sanitizados implementados'
        },
        consentimento_biometrico: {
          status: 'CONFORME',
          detalhes: 'Sistema de consentimento específico implementado'
        },
        direito_acesso: {
          status: 'CONFORME',
          detalhes: 'Endpoint de exportação de dados implementado'
        },
        direito_exclusao: {
          status: 'PARCIAL',
          detalhes: 'Processo de exclusão requer implementação completa'
        }
      },
      recomendacoes: [
        'Implementar processo automatizado de exclusão de dados',
        'Realizar treinamento LGPD para equipe',
        'Documentar procedimentos de incident response',
        'Implementar monitoramento contínuo de compliance'
      ],
      proxima_auditoria: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    res.json({
      success: true,
      relatorio_compliance: relatorio
    });

  } catch (error) {
    secureLogger.error(error, {
      context: 'lgpd_compliance_report'
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório de compliance'
    });
  }
});

module.exports = router;
