const db = require('../config/database');

const RegistroPonto = {
    // Configurações de turnos - HORÁRIOS ESPECÍFICOS DA EMPRESA
    configuracoesTurnos: {
        'diurno': {
            tipos_registro: ['entrada', 'parada_almoco', 'volta_almoco', 'saida'],
            horarios: {
                'entrada': { inicio: 6, fim: 10 }, // 6h às 10h - flexibilidade para chegada
                'parada_almoco': { inicio: 11.5, fim: 13.5 }, // 11h30 às 13h30 - horário flexível almoço
                'volta_almoco': { inicio: 12.5, fim: 14.5 }, // 12h30 às 14h30 - volta do almoço (respeitando 1h)
                'saida': { inicio: 17, fim: 23.5 } // 17h às 23h30 - fim expediente + horas extras
            },
            sequencias: {
                'entrada': ['parada_almoco', 'saida'],
                'parada_almoco': ['volta_almoco'],
                'volta_almoco': ['saida'],
                'saida': []
            },
            logica_pausa: {
                tipo_parada: 'parada_almoco',
                tipo_volta: 'volta_almoco',
                intervalo_min: 45, // Mínimo 45 minutos de almoço
                intervalo_max: 75, // Máximo 1h15 de almoço (tolerância)
                horario_sugestao: { inicio: 11.5, fim: 13 } // Sugestão: 11h30 às 13h
            }
        },
        'noturno': {
            tipos_registro: ['entrada', 'parada_descanso', 'volta_descanso', 'saida'],
            horarios: {
                'entrada': { inicio: 18, fim: 23.5 }, 
                'parada_descanso': { inicio: 0, fim: 8 }, 
                'volta_descanso': { inicio: 0.5, fim: 8.5 }, 
                'saida': { inicio: 4, fim: 10 } 
            },
            sequencias: {
                'entrada': ['parada_descanso', 'saida'],
                'parada_descanso': ['volta_descanso'],
                'volta_descanso': ['saida'],
                'saida': []
            },
            logica_pausa: {
                tipo_parada: 'parada_descanso',
                tipo_volta: 'volta_descanso',
                intervalo_min: 15, 
                intervalo_max: 90, 
                horario_sugestao: { inicio: 1, fim: 5 }
            }
        }
    },

    // 🎯 LÓGICA INTELIGENTE PARA SUA EMPRESA:
    // 
    // CENÁRIO 1: João chega às 08:00
    // - Sistema detecta: primeiro registro do dia
    // - Ação: registra "ENTRADA"
    //
    // CENÁRIO 2: João bate ponto às 11:30 (quer almoçar)
    // - Sistema verifica: último registro foi "entrada" às 08:00
    // - Horário atual: 11:30 (dentro do horário de almoço 11:30-13:30)
    // - Ação: registra "PARADA_ALMOCO"
    //
    // CENÁRIO 3: João volta às 12:30 (1 hora de almoço)
    // - Sistema verifica: último registro foi "parada_almoco" às 11:30
    // - Calcula: 1 hora de almoço (dentro dos limites 45min-1h15)
    // - Ação: registra "VOLTA_ALMOCO"
    //
    // CENÁRIO 4: Maria bate ponto às 12:30 (quer almoçar)
    // - Sistema detecta: horário de almoço válido
    // - Ação: registra "PARADA_ALMOCO"
    //
    // CENÁRIO 5: Maria volta às 13:30 (1 hora de almoço)
    // - Sistema verifica: 1 hora exata de almoço
    // - Ação: registra "VOLTA_ALMOCO"
    //
    // CENÁRIO 6: João sai às 17:00 (fim do expediente)
    // - Sistema detecta: horário de saída válido
    // - Ação: registra "SAIDA"
    //
    // CENÁRIO 7: Maria sai às 18:00 (hora extra)
    // - Sistema detecta: após 17:00 = hora extra
    // - Ação: registra "SAIDA" (com marcação de hora extra)

    async create({ colaborador_id, latitude, longitude, caminho_foto, tablet_id, tablet_name, tablet_location, tipo_registro = 'entrada' }) {
        const query = `
            INSERT INTO registros_ponto (
                colaborador_id, 
                data_hora, 
                tipo_registro,
                latitude, 
                longitude, 
                caminho_foto,
                tablet_id,
                tablet_name,
                tablet_location
            )
            VALUES ($1, NOW() AT TIME ZONE 'America/Sao_Paulo', $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [
            colaborador_id, 
            tipo_registro,
            latitude, 
            longitude, 
            caminho_foto,
            tablet_id,
            tablet_name,
            tablet_location
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    async getUltimoRegistro(colaborador_id) {
        const query = `
            SELECT * FROM registros_ponto 
            WHERE colaborador_id = $1 
            AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
            ORDER BY data_hora DESC 
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [colaborador_id]);
        return rows[0] || null;
    },

    async getRegistrosDoDia(colaborador_id, data = null) {
        // Para turno noturno, precisamos considerar registros que podem estar em dias diferentes
        const dataFiltro = data || 'CURRENT_DATE';
        
        // Se é turno noturno e está entre 0h-12h, buscar também registros do dia anterior
        const agora = new Date();
        const horaAtual = agora.getHours();
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        
        let query;
        let params;
        
        if (turno === 'noturno' && horaAtual >= 0 && horaAtual < 12) {
            // Buscar registros de ontem e hoje para turno noturno
            query = `
                SELECT *, data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_local FROM registros_ponto 
                WHERE colaborador_id = $1 
                AND (
                    DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = ${data ? '$2' : 'CURRENT_DATE'} 
                    OR DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = ${data ? '$3' : 'CURRENT_DATE - INTERVAL \'1 day\''}
                )
                AND data_hora AT TIME ZONE 'America/Sao_Paulo' >= ${data ? '$4' : 'CURRENT_DATE - INTERVAL \'1 day\' + TIME \'20:00:00\''}
                ORDER BY data_hora ASC;
            `;
            if (data) {
                const dataAnterior = new Date(data);
                dataAnterior.setDate(dataAnterior.getDate() - 1);
                const inicioTurno = `${data} 20:00:00`;
                params = [colaborador_id, data, dataAnterior.toISOString().split('T')[0], inicioTurno];
            } else {
                params = [colaborador_id];
            }
        } else {
            // Busca normal para turno diurno ou turno noturno antes da meia-noite
            query = `
                SELECT *, data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_local FROM registros_ponto 
                WHERE colaborador_id = $1 
                AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = ${data ? '$2' : 'CURRENT_DATE'}
                ORDER BY data_hora ASC;
            `;
            params = data ? [colaborador_id, data] : [colaborador_id];
        }
        
        const { rows } = await db.query(query, params);
        return rows;
    },

    async detectarTurnoColaborador(colaborador_id) {
        // Detectar turno baseado no último registro de entrada
        const query = `
            SELECT * FROM registros_ponto 
            WHERE colaborador_id = $1 
            AND tipo_registro = 'entrada'
            ORDER BY data_hora DESC 
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [colaborador_id]);
        
        if (rows.length === 0) {
            // Se não tem registros, detectar pelo horário atual
            const agora = new Date();
            const hora = agora.getHours();
            return (hora >= 20 || hora < 8) ? 'noturno' : 'diurno';
        }
        
        const ultimaEntrada = new Date(rows[0].data_hora);
        const horaEntrada = ultimaEntrada.getHours();
        
        return (horaEntrada >= 20 || horaEntrada < 8) ? 'noturno' : 'diurno';
    },

    async validarIntervaloMinimo(colaborador_id, minutos = 1) {
        const ultimoRegistro = await this.getUltimoRegistro(colaborador_id);
        if (!ultimoRegistro) return true;

        const agora = new Date();
        const ultimaDataHora = new Date(ultimoRegistro.data_hora);
        const diferencaMinutos = (agora - ultimaDataHora) / (1000 * 60);

        return diferencaMinutos >= minutos;
    },

    async validarHorarioPermitido(tipo_registro, colaborador_id) {
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        const config = this.configuracoesTurnos[turno];
        
        if (!config || !config.horarios[tipo_registro]) {
            return true; // Se não há regra específica, permite
        }

        const agora = new Date();
        let hora = agora.getHours();
        const minutos = agora.getMinutes();
        const horarioAtual = hora + (minutos / 60);

        const regra = config.horarios[tipo_registro];
        
        // Para turno noturno, tratar horários que cruzam a meia-noite
        if (turno === 'noturno') {
            if (regra.inicio > regra.fim) {
                // Horário cruza meia-noite (ex: 20h às 2h)
                return horarioAtual >= regra.inicio || horarioAtual <= regra.fim;
            }
        }
        
        return horarioAtual >= regra.inicio && horarioAtual <= regra.fim;
    },

    async validarSequenciaValida(colaborador_id, proximoTipo) {
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        const config = this.configuracoesTurnos[turno];
        
        if (!config) return false;

        const registrosHoje = await this.getRegistrosDoDia(colaborador_id);
        
        // Se não há registros, só pode ser entrada
        if (registrosHoje.length === 0) {
            return proximoTipo === 'entrada';
        }

        const ultimoTipo = registrosHoje[registrosHoje.length - 1].tipo_registro;
        const sequenciasValidas = config.sequencias;

        return sequenciasValidas[ultimoTipo]?.includes(proximoTipo) || false;
    },

    async validarIntervaloDescanso(colaborador_id) {
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        const config = this.configuracoesTurnos[turno];
        
        if (!config) return true;

        const registrosHoje = await this.getRegistrosDoDia(colaborador_id);
        
        const pausaInicio = registrosHoje.find(r => r.tipo_registro === config.logica_pausa.tipo_parada);
        const pausaFim = registrosHoje.find(r => r.tipo_registro === config.logica_pausa.tipo_volta);

        if (pausaInicio && pausaFim) {
            const inicio = new Date(pausaInicio.data_hora);
            const fim = new Date(pausaFim.data_hora);
            const diferencaMinutos = (fim - inicio) / (1000 * 60);

            return diferencaMinutos >= config.logica_pausa.intervalo_min && 
                   diferencaMinutos <= config.logica_pausa.intervalo_max;
        }

        return true;
    },

    async determinarProximoTipo(colaborador_id, modoEmergencia = false) {
        try {
            const intervaloOk = await this.validarIntervaloMinimo(colaborador_id, 1);
            if (!intervaloOk && !modoEmergencia) {
                throw new Error('Aguarde pelo menos 1 minuto entre registros');
            }

            const turno = await this.detectarTurnoColaborador(colaborador_id);
            const config = this.configuracoesTurnos[turno];
            
            if (!config) {
                throw new Error('Configuração de turno não encontrada');
            }

            const ultimoRegistro = await this.getUltimoRegistro(colaborador_id);
            const agora = new Date();
            const horaAtual = agora.getHours();
            const minutoAtual = agora.getMinutes();
            const horarioAtualDecimal = horaAtual + (minutoAtual / 60);
            
            // Se não há registros, sempre permite entrada (com validação flexível)
            if (!ultimoRegistro) {
                const entradaValida = await this.validarHorarioPermitido('entrada', colaborador_id);
                if (entradaValida || modoEmergencia) {
                    return 'entrada';
                }
                
                // Fornecer informação detalhada sobre horários
                const horarioEntrada = config.horarios.entrada;
                throw new Error(`Horário de entrada: ${horarioEntrada.inicio}h às ${horarioEntrada.fim}h. Atual: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);
            }

            const ultimoTipo = ultimoRegistro.tipo_registro;

            // 🚀 LÓGICA MELHORADA - Múltiplas opções e modo emergência
            switch (ultimoTipo) {
                case 'entrada':
                    // 1. Tentar pausa primeiro (se estiver no horário)
                    const pausaConfig = config.logica_pausa.horario_sugestao;
                    let dentroHorarioPausa = false;
                    
                    if (turno === 'noturno' && pausaConfig.inicio > pausaConfig.fim) {
                        dentroHorarioPausa = horaAtual >= pausaConfig.inicio || horaAtual <= pausaConfig.fim;
                    } else {
                        dentroHorarioPausa = horaAtual >= pausaConfig.inicio && horaAtual <= pausaConfig.fim;
                    }

                    if (dentroHorarioPausa || modoEmergencia) {
                        const proximoTipo = config.logica_pausa.tipo_parada;
                        const horarioValido = await this.validarHorarioPermitido(proximoTipo, colaborador_id);
                        const sequenciaValida = await this.validarSequenciaValida(colaborador_id, proximoTipo);
                        
                        if (horarioValido && sequenciaValida) {
                            return proximoTipo;
                        }
                    }
                    
                    // 2. Tentar saída se estiver no horário
                    const saidaValida = await this.validarSequenciaValida(colaborador_id, 'saida');
                    const horarioSaidaValido = await this.validarHorarioPermitido('saida', colaborador_id);
                    
                    if ((saidaValida && horarioSaidaValido) || modoEmergencia) {
                        return 'saida';
                    }
                    
                    // 3. Se modo emergência, permitir qualquer um
                    if (modoEmergencia) {
                        return config.logica_pausa.tipo_parada; // Priorizar pausa
                    }
                    
                    // 4. Fornecer orientação detalhada
                    const horarioPausa = config.horarios[config.logica_pausa.tipo_parada];
                    const horarioSaida = config.horarios.saida;
                    throw new Error(`Opções disponíveis: ${config.logica_pausa.tipo_parada} (${horarioPausa.inicio}h-${horarioPausa.fim}h) ou saída (${horarioSaida.inicio}h-${horarioSaida.fim}h). Atual: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);

                case 'parada_almoco':
                case 'parada_descanso':
                    const tipoVolta = config.logica_pausa.tipo_volta;
                    const voltaValida = await this.validarSequenciaValida(colaborador_id, tipoVolta);
                    const horarioVoltaValido = await this.validarHorarioPermitido(tipoVolta, colaborador_id);
                    
                    if ((voltaValida && horarioVoltaValido) || modoEmergencia) {
                        return tipoVolta;
                    }
                    
                    const horarioVolta = config.horarios[tipoVolta];
                    throw new Error(`${tipoVolta} disponível das ${horarioVolta.inicio}h às ${horarioVolta.fim}h. Atual: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);

                case 'volta_almoco':
                case 'volta_descanso':
                    const saidaFinalValida = await this.validarSequenciaValida(colaborador_id, 'saida');
                    const horarioSaidaFinalValido = await this.validarHorarioPermitido('saida', colaborador_id);
                    
                    if ((saidaFinalValida && horarioSaidaFinalValido) || modoEmergencia) {
                        return 'saida';
                    }
                    
                    const horarioSaidaFinal = config.horarios.saida;
                    throw new Error(`Saída disponível das ${horarioSaidaFinal.inicio}h às ${horarioSaidaFinal.fim}h. Atual: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);

                case 'saida':
                    throw new Error('Todos os registros do dia já foram realizados');

                default:
                    return 'entrada';
            }
        } catch (error) {
            console.error('Erro ao determinar próximo tipo:', error);
            throw error;
        }
    },

    // 🆘 NOVA FUNÇÃO: Modo de emergência
    async determinarProximoTipoEmergencia(colaborador_id) {
        return await this.determinarProximoTipo(colaborador_id, true);
    },

    async validarRegistroCompleto(colaborador_id, tipo_registro) {
        const validacoes = [];

        const intervaloOk = await this.validarIntervaloMinimo(colaborador_id, 1);
        if (!intervaloOk) {
            validacoes.push('Aguarde pelo menos 1 minuto entre registros');
        }

        const horarioOk = await this.validarHorarioPermitido(tipo_registro, colaborador_id);
        if (!horarioOk) {
            validacoes.push(`Horário não permitido para ${tipo_registro}`);
        }

        const sequenciaOk = await this.validarSequenciaValida(colaborador_id, tipo_registro);
        if (!sequenciaOk) {
            validacoes.push('Sequência de registro inválida');
        }

        // Validar intervalo de pausa
        if (tipo_registro === 'volta_almoco' || tipo_registro === 'volta_descanso') {
            const pausaOk = await this.validarIntervaloDescanso(colaborador_id);
            if (!pausaOk) {
                const turno = await this.detectarTurnoColaborador(colaborador_id);
                const config = this.configuracoesTurnos[turno];
                const min = config?.logica_pausa?.intervalo_min || 30;
                const max = config?.logica_pausa?.intervalo_max || 120;
                validacoes.push(`Intervalo de pausa deve ser entre ${min} e ${max} minutos`);
            }
        }

        return {
            valido: validacoes.length === 0,
            erros: validacoes
        };
    },

    async obterEstatisticasDoDia(colaborador_id, data = null) {
        const registros = await this.getRegistrosDoDia(colaborador_id, data);
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        const config = this.configuracoesTurnos[turno];
        
        const entrada = registros.find(r => r.tipo_registro === 'entrada');
        const pausaInicio = registros.find(r => r.tipo_registro === config?.logica_pausa?.tipo_parada);
        const pausaFim = registros.find(r => r.tipo_registro === config?.logica_pausa?.tipo_volta);
        const saida = registros.find(r => r.tipo_registro === 'saida');

        let horasTrabalhadas = 0;
        let tempoPausa = 0;

        if (entrada && saida) {
            const inicioTrabalho = new Date(entrada.data_hora);
            let fimTrabalho = new Date(saida.data_hora);
            
            // Para turno noturno, verificar se saída é no dia seguinte
            if (turno === 'noturno' && fimTrabalho < inicioTrabalho) {
                fimTrabalho.setDate(fimTrabalho.getDate() + 1);
            }
            
            horasTrabalhadas = (fimTrabalho - inicioTrabalho) / (1000 * 60 * 60);

            if (pausaInicio && pausaFim) {
                const inicioPausa = new Date(pausaInicio.data_hora);
                let fimPausa = new Date(pausaFim.data_hora);
                
                // Para turno noturno, verificar se fim da pausa é no dia seguinte
                if (turno === 'noturno' && fimPausa < inicioPausa) {
                    fimPausa.setDate(fimPausa.getDate() + 1);
                }
                
                tempoPausa = (fimPausa - inicioPausa) / (1000 * 60 * 60);
                horasTrabalhadas -= tempoPausa;
            }
        }

        return {
            turno,
            registros: registros.length,
            entrada: entrada?.data_hora || null,
            pausaInicio: pausaInicio?.data_hora || null,
            pausaFim: pausaFim?.data_hora || null,
            saida: saida?.data_hora || null,
            horasTrabalhadas: Math.round(horasTrabalhadas * 100) / 100,
            tempoPausa: Math.round(tempoPausa * 60), // em minutos
            status: this.calcularStatusDia(registros, turno)
        };
    },

    calcularStatusDia(registros, turno) {
        if (registros.length === 0) return 'não_iniciado';
        
        const tipos = registros.map(r => r.tipo_registro);
        
        if (tipos.includes('saida')) return 'completo';
        
        if (turno === 'noturno') {
            if (tipos.includes('volta_descanso')) return 'pos_descanso';
            if (tipos.includes('parada_descanso')) return 'descanso';
        } else {
            if (tipos.includes('volta_almoco')) return 'pos_almoco';
            if (tipos.includes('parada_almoco')) return 'almoco';
        }
        
        if (tipos.includes('entrada')) return 'trabalhando';
        
        return 'pendente';
    },

    // Método para obter informações do turno
    async obterInfoTurno(colaborador_id) {
        const turno = await this.detectarTurnoColaborador(colaborador_id);
        const config = this.configuracoesTurnos[turno];
        
        return {
            turno,
            tipos_registro: config?.tipos_registro || [],
            horarios: config?.horarios || {},
            logica_pausa: config?.logica_pausa || {}
        };
    }
};

module.exports = RegistroPonto; 