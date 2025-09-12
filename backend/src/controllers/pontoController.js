const db = require('../config/database');
const RegistroPonto = require('../models/registroPontoModel');
const Colaborador = require('../models/colaboradorModel');

// Obter informações do turno do colaborador
const obterInfoTurno = async (req, res) => {
    try {
        const { colaborador_id } = req.params;

        console.log(`[${new Date()}] Obtendo informações do turno para colaborador ${colaborador_id}`);

        if (!colaborador_id) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador é obrigatório'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const infoTurno = await RegistroPonto.obterInfoTurno(colaborador_id);

        return res.status(200).json({
            success: true,
            colaborador_nome: colaborador.nome,
            ...infoTurno
        });

    } catch (error) {
        console.error('Erro ao obter informações do turno:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Verificar próximo tipo de registro
const verificarProximoTipo = async (req, res) => {
    try {
        const { colaborador_id } = req.params;

        console.log(`[${new Date()}] Verificando próximo tipo para colaborador ${colaborador_id}`);

        if (!colaborador_id) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador é obrigatório'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        let proximoTipo = null;
        let proximoTipoNome = null;
        let turno = null;
        let erro = null;
        let sugestaoEmergencia = null;

        try {
            proximoTipo = await RegistroPonto.determinarProximoTipo(colaborador_id);
            turno = await RegistroPonto.detectarTurnoColaborador(colaborador_id);
            
            // Mapear tipos para nomes amigáveis baseado no turno
            const tiposNomes = {
                'entrada': 'Entrada',
                'parada_almoco': 'Parada para Almoço',
                'volta_almoco': 'Volta do Almoço',
                'parada_descanso': 'Parada para Descanso',
                'volta_descanso': 'Volta do Descanso',
                'saida': 'Saída'
            };
            
            proximoTipoNome = tiposNomes[proximoTipo];
        } catch (error) {
            erro = error.message;
            turno = await RegistroPonto.detectarTurnoColaborador(colaborador_id);
            
            // 🆘 Tentar modo de emergência para fornecer sugestão
            try {
                const tipoEmergencia = await RegistroPonto.determinarProximoTipoEmergencia(colaborador_id);
                const tiposNomes = {
                    'entrada': 'Entrada',
                    'parada_almoco': 'Parada para Almoço',
                    'volta_almoco': 'Volta do Almoço',
                    'parada_descanso': 'Parada para Descanso',
                    'volta_descanso': 'Volta do Descanso',
                    'saida': 'Saída'
                };
                sugestaoEmergencia = {
                    tipo: tipoEmergencia,
                    nome: tiposNomes[tipoEmergencia],
                    observacao: 'Registro fora do horário normal - requer confirmação'
                };
            } catch (emergenciaError) {
                console.log(`⚠️ Modo emergência também falhou: ${emergenciaError.message}`);
            }
            
            console.log(`❌ Erro ao determinar próximo tipo: ${error.message}`);
        }

        return res.status(200).json({
            success: proximoTipo !== null,
            colaborador_nome: colaborador.nome,
            turno,
            proximo_tipo: proximoTipo,
            proximo_tipo_nome: proximoTipoNome,
            erro: erro,
            sugestao_emergencia: sugestaoEmergencia,
            horario_atual: new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})
        });

    } catch (error) {
        console.error('Erro ao verificar próximo tipo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Registrar ponto via reconhecimento facial (sem autenticação JWT)
const registrarPontoFacial = async (req, res) => {
    try {
        const { colaborador_id, latitude, longitude, tablet_id, tablet_name, tablet_location } = req.body;

        console.log(`[${new Date()}] Registrando ponto facial para colaborador ${colaborador_id}`);

        if (!colaborador_id) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador é obrigatório'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        // Determinar tipo de registro automaticamente com validações avançadas
        let tipoRegistro;
        try {
            tipoRegistro = await RegistroPonto.determinarProximoTipo(colaborador_id);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                colaborador_nome: colaborador.nome
            });
        }

        // Validar registro completo antes de criar
        const validacao = await RegistroPonto.validarRegistroCompleto(colaborador_id, tipoRegistro);
        if (!validacao.valido) {
            return res.status(400).json({
                success: false,
                error: validacao.erros.join('; '),
                colaborador_nome: colaborador.nome
            });
        }

        // Registrar ponto
        const registro = await RegistroPonto.create({
            colaborador_id,
            latitude,
            longitude,
            tablet_id: tablet_id || null,
            tablet_name: tablet_name || null,
            tablet_location: tablet_location || null,
            caminho_foto: null,
            tipo_registro: tipoRegistro
        });

        // Mapear tipos para mensagens amigáveis
        const tiposNomes = {
            'entrada': 'Entrada',
            'parada_almoco': 'Parada para Almoço',
            'volta_almoco': 'Volta do Almoço', 
            'saida': 'Saída'
        };

        console.log(`✅ Ponto facial registrado: ${tiposNomes[tipoRegistro]} - ID ${registro.id} para ${colaborador.nome}`);

        return res.status(201).json({
            success: true,
            message: `${tiposNomes[tipoRegistro]} registrada com sucesso via reconhecimento facial`,
            registro: {
                id: registro.id,
                colaborador_nome: colaborador.nome,
                data_hora: registro.data_hora,
                tipo_registro: tipoRegistro,
                tipo_registro_nome: tiposNomes[tipoRegistro],
                latitude: registro.latitude,
                longitude: registro.longitude,
                tablet_id: registro.tablet_id
            }
        });

    } catch (error) {
        console.error('Erro ao registrar ponto facial:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const registrarPonto = async (req, res) => {
    try {
        const { latitude, longitude, tablet_id, tablet_name, tablet_location } = req.body;
        const colaborador_id = req.colaborador.id; // Vem do middleware de autenticação

        console.log(`[${new Date()}] Registrando ponto para colaborador ${colaborador_id}`);

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        // Registrar ponto
        const registro = await RegistroPonto.create({
            colaborador_id,
            latitude,
            longitude,
            tablet_id: tablet_id || null,
            tablet_name: tablet_name || null,
            tablet_location: tablet_location || null,
            caminho_foto: null // Por enquanto não salvamos foto
        });

        console.log(`✅ Ponto registrado: ID ${registro.id}`);

        return res.status(201).json({
            success: true,
            message: 'Ponto registrado com sucesso',
            registro: {
                id: registro.id,
                colaborador_nome: colaborador.nome,
                data_hora: registro.data_hora,
                latitude: registro.latitude,
                longitude: registro.longitude,
                tablet_id: registro.tablet_id
            }
        });

    } catch (error) {
        console.error('Erro ao registrar ponto:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const obterHistorico = async (req, res) => {
    try {
        const { colaborador_id } = req.params;
        const { data_inicio, data_fim, limite = 50 } = req.query;

        console.log(`[${new Date()}] Obtendo histórico do colaborador ${colaborador_id}`);

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        // Construir query com filtros
        let query = `
            SELECT rp.*, c.nome as colaborador_nome, c.cpf as colaborador_cpf
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE rp.colaborador_id = $1
        `;
        const queryParams = [colaborador_id];

        if (data_inicio) {
            query += ` AND rp.data_hora >= $${queryParams.length + 1}`;
            queryParams.push(data_inicio);
        }

        if (data_fim) {
            query += ` AND rp.data_hora <= $${queryParams.length + 1}`;
            queryParams.push(data_fim);
        }

        query += ` ORDER BY rp.data_hora DESC LIMIT $${queryParams.length + 1}`;
        queryParams.push(limite);

        const result = await db.query(query, queryParams);

        return res.status(200).json({
            success: true,
            registros: result.rows,
            total: result.rows.length,
            colaborador: {
                id: colaborador.id,
                nome: colaborador.nome,
                cpf: colaborador.cpf
            }
        });

    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const obterHistoricoTablet = async (req, res) => {
    try {
        const { tablet_id } = req.params;
        const { data_inicio, data_fim, limite = 100 } = req.query;

        console.log(`[${new Date()}] Obtendo histórico do tablet ${tablet_id}`);

        // Construir query para registros do tablet
        let query = `
            SELECT 
                rp.id,
                rp.data_hora,
                rp.latitude,
                rp.longitude,
                rp.tablet_id,
                rp.tablet_name,
                rp.tablet_location,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf,
                CASE 
                    WHEN EXTRACT(hour FROM rp.data_hora) < 12 THEN 'entrada'
                    ELSE 'saida'
                END as tipo_registro
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE rp.tablet_id = $1
        `;
        const queryParams = [tablet_id];

        if (data_inicio) {
            query += ` AND rp.data_hora >= $${queryParams.length + 1}`;
            queryParams.push(data_inicio);
        }

        if (data_fim) {
            query += ` AND rp.data_hora <= $${queryParams.length + 1}`;
            queryParams.push(data_fim);
        }

        query += ` ORDER BY rp.data_hora DESC LIMIT $${queryParams.length + 1}`;
        queryParams.push(limite);

        const result = await db.query(query, queryParams);

        // Obter estatísticas do tablet
        const statsQuery = `
            SELECT 
                COUNT(*) as total_registros,
                COUNT(DISTINCT colaborador_id) as colaboradores_unicos,
                MIN(data_hora) as primeiro_registro,
                MAX(data_hora) as ultimo_registro
            FROM registros_ponto 
            WHERE tablet_id = $1
        `;
        const statsResult = await db.query(statsQuery, [tablet_id]);

        return res.status(200).json({
            success: true,
            registros: result.rows,
            total: result.rows.length,
            tablet_id: tablet_id,
            estatisticas: statsResult.rows[0] || {}
        });

    } catch (error) {
        console.error('Erro ao obter histórico do tablet:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarRegistros = async (req, res) => {
    try {
        const { limite = 20, offset = 0, page = 1, limit } = req.query;

        console.log(`[${new Date()}] Listando registros de ponto`);

        // SEMPRE usar dados reais do banco - MOCK REMOVIDO
        const query = `
            SELECT 
                rp.id,
                rp.data_hora,
                rp.latitude,
                rp.longitude,
                rp.tablet_id,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            ORDER BY rp.data_hora DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, [limite, offset]);

        // Contar total de registros
        const countQuery = 'SELECT COUNT(*) FROM registros_ponto';
        const countResult = await db.query(countQuery);

        return res.status(200).json({
            success: true,
            registros: result.rows,
            total: parseInt(countResult.rows[0].count),
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao listar registros:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

// Endpoint público para listar registros (para painel web)
const listarRegistrosPublic = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', unidade = '', tipo = '' } = req.query;
        const offset = (page - 1) * limit;

        console.log(`[${new Date()}] Listando registros públicos - página ${page}`);

        // Construir query com filtros
        let query = `
            SELECT 
                rp.id,
                rp.data_hora,
                rp.tipo_registro,
                rp.latitude,
                rp.longitude,
                rp.tablet_id,
                rp.tablet_name,
                rp.tablet_location,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE 1=1
        `;
        const queryParams = [];

        // Filtro por busca (nome ou CPF)
        if (search) {
            query += ` AND (c.nome ILIKE $${queryParams.length + 1} OR c.cpf ILIKE $${queryParams.length + 1})`;
            queryParams.push(`%${search}%`);
        }

        // Filtro por unidade (usando tablet_location)
        if (unidade) {
            query += ` AND rp.tablet_location ILIKE $${queryParams.length + 1}`;
            queryParams.push(`%${unidade}%`);
        }

        // Filtro por tipo de registro
        if (tipo) {
            query += ` AND rp.tipo_registro = $${queryParams.length + 1}`;
            queryParams.push(tipo);
        }

        query += ` ORDER BY rp.data_hora DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);

        // Contar total de registros com filtros
        let countQuery = `
            SELECT COUNT(*) 
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE 1=1
        `;
        const countParams = [];

        if (search) {
            countQuery += ` AND (c.nome ILIKE $${countParams.length + 1} OR c.cpf ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }

        if (unidade) {
            countQuery += ` AND rp.tablet_location ILIKE $${countParams.length + 1}`;
            countParams.push(`%${unidade}%`);
        }

        if (tipo) {
            countQuery += ` AND rp.tipo_registro = $${countParams.length + 1}`;
            countParams.push(tipo);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Mapear tipos para nomes amigáveis
        const tiposNomes = {
            'entrada': 'Entrada',
            'parada_almoco': 'Parada para Almoço',
            'volta_almoco': 'Volta do Almoço', 
            'saida': 'Saída'
        };

        // Formatar registros para o painel web
        const registrosFormatados = result.rows.map(registro => ({
            id: registro.id,
            data: registro.data_hora.toISOString().replace('T', ' ').slice(0, 19),
            colaborador: {
                id: registro.colaborador_id || 0,
                nome: registro.colaborador_nome,
                cpf: registro.colaborador_cpf,
                unidade: registro.tablet_location || 'Não informado'
            },
            tipo: tiposNomes[registro.tipo_registro] || registro.tipo_registro,
            tipo_codigo: registro.tipo_registro,
            foto: '', // Por enquanto não temos foto
            latitude: registro.latitude,
            longitude: registro.longitude,
            tablet_id: registro.tablet_id,
            tablet_name: registro.tablet_name,
            tablet_location: registro.tablet_location
        }));

        return res.status(200).json({
            success: true,
            registros: registrosFormatados,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Erro ao listar registros públicos:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Endpoint público para histórico do tablet (para app totem)
const obterHistoricoTabletPublic = async (req, res) => {
    try {
        const { tablet_id } = req.params;
        const { data_inicio, data_fim, limite = 100 } = req.query;

        console.log(`[${new Date()}] Obtendo histórico público do tablet ${tablet_id}`);

        // Construir query para registros do tablet
        let query = `
            SELECT 
                rp.id,
                rp.data_hora,
                rp.tipo_registro,
                rp.latitude,
                rp.longitude,
                rp.tablet_id,
                rp.tablet_name,
                rp.tablet_location,
                c.nome as colaborador_nome,
                c.cpf as colaborador_cpf
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE rp.tablet_id = $1
        `;
        const queryParams = [tablet_id];

        if (data_inicio) {
            query += ` AND rp.data_hora >= $${queryParams.length + 1}`;
            queryParams.push(data_inicio);
        }

        if (data_fim) {
            query += ` AND rp.data_hora <= $${queryParams.length + 1}`;
            queryParams.push(data_fim);
        }

        query += ` ORDER BY rp.data_hora DESC LIMIT $${queryParams.length + 1}`;
        queryParams.push(limite);

        const result = await db.query(query, queryParams);

        // Obter estatísticas do tablet
        const statsQuery = `
            SELECT 
                COUNT(*) as total_registros,
                COUNT(DISTINCT colaborador_id) as colaboradores_unicos,
                MIN(data_hora) as primeiro_registro,
                MAX(data_hora) as ultimo_registro
            FROM registros_ponto 
            WHERE tablet_id = $1
        `;
        const statsResult = await db.query(statsQuery, [tablet_id]);

        return res.status(200).json({
            success: true,
            registros: result.rows,
            total: result.rows.length,
            tablet_id: tablet_id,
            estatisticas: statsResult.rows[0] || {}
        });

    } catch (error) {
        console.error('Erro ao obter histórico público do tablet:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const gerarRelatorio = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { data_inicio, data_fim, colaborador_id, tablet_id } = req.query;
        
        console.log(`[${new Date()}] Gerando relatório de pontos`);
        
        // Validar parâmetros do relatório
        const reportsValidator = require('../utils/reportsValidator');
        const performanceOptimizer = require('../utils/performanceOptimizer');
        
        const validation = await reportsValidator.validateReportParams({
            data_inicio,
            data_fim,
            colaborador_id,
            tablet_id
        }, 'general');
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetros do relatório inválidos',
                errors: validation.errors,
                warnings: validation.warnings
            });
        }
        
        // Usar parâmetros normalizados
        const params = validation.normalizedParams;
        
        // Usar query otimizada
        const result = await performanceOptimizer.optimizeReportQueries(db, params);

        // Query otimizada já executada acima
        
        // Validar integridade do relatório gerado
        const integrityValidation = await reportsValidator.validateReportIntegrity(
            result.rows,
            params,
            'general'
        );
        
        // Gerar estatísticas do relatório
        const stats = {
            total_registros: result.rows.length,
            colaboradores_unicos: [...new Set(result.rows.map(r => r.colaborador_nome))].length,
            tablets_utilizados: [...new Set(result.rows.map(r => r.tablet_id).filter(Boolean))].length,
            periodo: {
                inicio: params.data_inicio || 'Não especificado',
                fim: params.data_fim || 'Não especificado'
            },
            validacao: {
                status: integrityValidation.valid ? 'VÁLIDO' : 'COM_PROBLEMAS',
                avisos: integrityValidation.warnings.length,
                duplicados: integrityValidation.integrity?.duplicates || 0
            }
        };
        
        const executionTime = Date.now() - startTime;
        
        // Gerar relatório de validação
        const validationReport = reportsValidator.generateValidationReport(
            { ...validation, ...integrityValidation },
            'general',
            executionTime
        );

        return res.status(200).json({
            success: true,
            relatorio: result.rows,
            estatisticas: stats,
            validacao: validationReport,
            gerado_em: new Date().toISOString(),
            tempo_execucao: executionTime
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};

const gerarRelatorioAFD = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;

        if (!data_inicio || !data_fim) {
            return res.status(400).json({
                success: false,
                error: 'Data de início e fim são obrigatórias'
            });
        }

        console.log(`[${new Date()}] Gerando relatório AFD de ${params.data_inicio} até ${params.data_fim}`);

        // Query para buscar registros no formato AFD (Portaria 671/2021)
        const query = `
            SELECT 
                c.pis_pasep,
                c.nome,
                rp.data_hora,
                'E' as tipo_registro,
                rp.tablet_id,
                rp.latitude,
                rp.longitude
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE rp.data_hora BETWEEN $1 AND $2
            ORDER BY c.pis_pasep, rp.data_hora
        `;

        const result = await db.query(query, [data_inicio, data_fim]);

        // Formatar dados no padrão AFD
        const registrosAFD = result.rows.map(row => {
            const dataHora = new Date(row.data_hora);
            return {
                pis: row.pis_pasep || '00000000000',
                nome: row.nome,
                data: dataHora.toISOString().slice(0, 10).replace(/-/g, ''),
                hora: dataHora.toTimeString().slice(0, 8).replace(/:/g, ''),
                tipo: row.tipo_registro,
                tablet_id: row.tablet_id,
                localizacao: `${row.latitude},${row.longitude}`
            };
        });

        // Validar integridade dos dados AFD
        const integrityValidation = await reportsValidator.validateReportIntegrity(
            result.rows,
            params,
            'afd'
        );
        
        // Gerar conteúdo do arquivo AFD
        let conteudoAFD = `000000000AFD${params.data_inicio.replace(/-/g, '')}${params.data_fim.replace(/-/g, '')}\n`;
        
        registrosAFD.forEach(reg => {
            conteudoAFD += `${reg.pis.padStart(11, '0')}${reg.data}${reg.hora}${reg.tipo}\n`;
        });

        conteudoAFD += `999999999999999999999999999999999999999999999`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="AFD_${data_inicio}_${data_fim}.txt"`);
        
        return res.status(200).send(conteudoAFD);

    } catch (error) {
        console.error('Erro ao gerar relatório AFD:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const gerarRelatorioACJEF = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;

        if (!data_inicio || !data_fim) {
            return res.status(400).json({
                success: false,
                error: 'Data de início e fim são obrigatórias'
            });
        }

        console.log(`[${new Date()}] Gerando relatório ACJEF de ${data_inicio} até ${data_fim}`);

        // Query para buscar dados para ACJEF
        const query = `
            SELECT 
                c.pis_pasep,
                c.nome,
                c.cpf,
                DATE(rp.data_hora) as data,
                ARRAY_AGG(
                    json_build_object(
                        'hora', EXTRACT(EPOCH FROM rp.data_hora),
                        'tipo', CASE 
                            WHEN EXTRACT(hour FROM rp.data_hora) < 12 THEN 'E'
                            ELSE 'S'
                        END
                    ) ORDER BY rp.data_hora
                ) as registros
            FROM registros_ponto rp
            JOIN colaboradores c ON rp.colaborador_id = c.id
            WHERE rp.data_hora BETWEEN $1 AND $2
            GROUP BY c.pis_pasep, c.nome, c.cpf, DATE(rp.data_hora)
            ORDER BY c.nome, DATE(rp.data_hora)
        `;

        const result = await db.query(query, [data_inicio, data_fim]);

        // Formatar dados para ACJEF (JSON)
        const dadosACJEF = {
            periodo: { inicio: data_inicio, fim: data_fim },
            empresa: "FG Services",
            cnpj: "00.000.000/0001-00",
            colaboradores: result.rows.map(row => ({
                pis: row.pis_pasep,
                nome: row.nome,
                cpf: row.cpf,
                registros: row.registros.map(reg => ({
                    data: row.data,
                    hora: new Date(reg.hora * 1000).toTimeString().slice(0, 8),
                    tipo: reg.tipo
                }))
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ACJEF_${data_inicio}_${data_fim}.json"`);
        
        return res.status(200).json(dadosACJEF);

    } catch (error) {
        console.error('Erro ao gerar relatório ACJEF:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Obter estatísticas do dia para um colaborador
const obterEstatisticasDia = async (req, res) => {
    try {
        const { colaborador_id } = req.params;
        const { data } = req.query;

        console.log(`[${new Date()}] Obtendo estatísticas do dia para colaborador ${colaborador_id}`);

        if (!colaborador_id) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador é obrigatório'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const estatisticas = await RegistroPonto.obterEstatisticasDoDia(colaborador_id, data);

        return res.status(200).json({
            success: true,
            colaborador_nome: colaborador.nome,
            data: data || new Date().toISOString().split('T')[0],
            estatisticas
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Validar se um tipo de registro é permitido
const validarTipoRegistro = async (req, res) => {
    try {
        const { colaborador_id } = req.params;
        const { tipo_registro } = req.body;

        console.log(`[${new Date()}] Validando tipo de registro ${tipo_registro} para colaborador ${colaborador_id}`);

        if (!colaborador_id || !tipo_registro) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador e tipo de registro são obrigatórios'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const validacao = await RegistroPonto.validarRegistroCompleto(colaborador_id, tipo_registro);

        return res.status(200).json({
            success: true,
            colaborador_nome: colaborador.nome,
            tipo_registro,
            validacao
        });

    } catch (error) {
        console.error('Erro ao validar tipo de registro:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// Obter registros do dia com validações
const obterRegistrosDiaCompleto = async (req, res) => {
    try {
        const { colaborador_id } = req.params;
        const { data } = req.query;

        console.log(`[${new Date()}] Obtendo registros completos do dia para colaborador ${colaborador_id}`);

        if (!colaborador_id) {
            return res.status(400).json({
                success: false,
                error: 'ID do colaborador é obrigatório'
            });
        }

        // Verificar se colaborador existe
        const colaborador = await Colaborador.findById(colaborador_id);
        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const registros = await RegistroPonto.getRegistrosDoDia(colaborador_id, data);
        const estatisticas = await RegistroPonto.obterEstatisticasDoDia(colaborador_id, data);
        
        // Verificar próximo tipo permitido
        let proximoTipo = null;
        let proximoTipoNome = null;
        let validacaoProximo = { valido: false, erros: [] };

        try {
            proximoTipo = await RegistroPonto.determinarProximoTipo(colaborador_id);
            if (proximoTipo) {
                validacaoProximo = await RegistroPonto.validarRegistroCompleto(colaborador_id, proximoTipo);
                
                const tiposNomes = {
                    'entrada': 'Entrada',
                    'parada_almoco': 'Parada para Almoço',
                    'volta_almoco': 'Volta do Almoço', 
                    'saida': 'Saída'
                };
                proximoTipoNome = tiposNomes[proximoTipo];
            }
        } catch (error) {
            console.log('Nenhum próximo tipo disponível:', error.message);
        }

        return res.status(200).json({
            success: true,
            colaborador_nome: colaborador.nome,
            data: data || new Date().toISOString().split('T')[0],
            registros,
            estatisticas,
            proximo_tipo: proximoTipo,
            proximo_tipo_nome: proximoTipoNome,
            validacao_proximo: validacaoProximo
        });

    } catch (error) {
        console.error('Erro ao obter registros do dia:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

// FUNÇÃO SIMULAR REGISTRO REMOVIDA - SISTEMA LIMPO
// Simulação removida para evitar dados de teste em produção

module.exports = {
    verificarProximoTipo,
    registrarPontoFacial,
    registrarPonto,
    obterHistorico,
    obterHistoricoTablet,
    listarRegistros,
    listarRegistrosPublic,
    obterHistoricoTabletPublic,
    gerarRelatorio,
    gerarRelatorioAFD,
    gerarRelatorioACJEF,
    obterEstatisticasDia,
    validarTipoRegistro,
    obterRegistrosDiaCompleto,
    obterInfoTurno
}; 