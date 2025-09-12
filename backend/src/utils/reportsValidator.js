const db = require('../config/database');
const auditLogger = require('./auditLogger');

/**
 * 📊 VALIDADOR DE RELATÓRIOS
 * 
 * Sistema completo de validação para geração de relatórios
 * com verificação de integridade, performance e segurança
 */

class ReportsValidator {
  constructor() {
    this.maxDateRange = 365; // Máximo 365 dias
    this.maxRecords = 50000; // Máximo 50k registros por relatório
    this.timeoutLimit = 30000; // 30 segundos timeout
    
    // Formatos de data aceitos
    this.dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format
      /^\d{2}\/\d{2}\/\d{4}$/ // DD/MM/YYYY
    ];
  }

  /**
   * Validar parâmetros de relatório
   */
  async validateReportParams(params, reportType = 'general') {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      normalizedParams: {},
      estimatedRecords: 0,
      estimatedTime: 0
    };

    try {
      // 1. Validar datas
      const dateValidation = this.validateDates(params);
      if (!dateValidation.valid) {
        validation.valid = false;
        validation.errors.push(...dateValidation.errors);
      } else {
        validation.normalizedParams = { ...validation.normalizedParams, ...dateValidation.normalized };
      }

      // 2. Validar colaborador_id se fornecido
      if (params.colaborador_id) {
        const colaboradorValidation = await this.validateColaboradorId(params.colaborador_id);
        if (!colaboradorValidation.valid) {
          validation.valid = false;
          validation.errors.push(...colaboradorValidation.errors);
        }
      }

      // 3. Validar tablet_id se fornecido
      if (params.tablet_id) {
        const tabletValidation = this.validateTabletId(params.tablet_id);
        if (!tabletValidation.valid) {
          validation.warnings.push(...tabletValidation.warnings);
        }
      }

      // 4. Estimar tamanho do relatório
      if (validation.valid) {
        const estimation = await this.estimateReportSize(validation.normalizedParams, reportType);
        validation.estimatedRecords = estimation.records;
        validation.estimatedTime = estimation.time;

        // Verificar limites
        if (estimation.records > this.maxRecords) {
          validation.valid = false;
          validation.errors.push(`Relatório muito grande: ${estimation.records} registros (máximo: ${this.maxRecords})`);
        }

        if (estimation.time > this.timeoutLimit) {
          validation.warnings.push(`Relatório pode demorar mais que ${this.timeoutLimit/1000}s para gerar`);
        }
      }

      // 5. Validações específicas por tipo
      const typeValidation = this.validateReportType(params, reportType);
      if (!typeValidation.valid) {
        validation.valid = false;
        validation.errors.push(...typeValidation.errors);
      }
      validation.warnings.push(...typeValidation.warnings);

      return validation;

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro na validação:', error);
      
      return {
        valid: false,
        errors: ['Erro interno na validação de parâmetros'],
        warnings: [],
        normalizedParams: {},
        estimatedRecords: 0,
        estimatedTime: 0
      };
    }
  }

  /**
   * Validar datas
   */
  validateDates(params) {
    const validation = {
      valid: true,
      errors: [],
      normalized: {}
    };

    const { data_inicio, data_fim } = params;

    // Verificar se datas foram fornecidas
    if (!data_inicio && !data_fim) {
      // Usar últimos 30 dias por padrão
      const fim = new Date();
      const inicio = new Date();
      inicio.setDate(fim.getDate() - 30);
      
      validation.normalized.data_inicio = inicio.toISOString().split('T')[0];
      validation.normalized.data_fim = fim.toISOString().split('T')[0];
      
      return validation;
    }

    // Validar formato das datas
    if (data_inicio && !this.isValidDate(data_inicio)) {
      validation.valid = false;
      validation.errors.push('Data de início inválida. Use formato YYYY-MM-DD');
    }

    if (data_fim && !this.isValidDate(data_fim)) {
      validation.valid = false;
      validation.errors.push('Data de fim inválida. Use formato YYYY-MM-DD');
    }

    if (!validation.valid) {
      return validation;
    }

    // Normalizar datas
    const startDate = data_inicio ? new Date(data_inicio) : new Date();
    const endDate = data_fim ? new Date(data_fim) : new Date();

    // Validar ordem das datas
    if (startDate > endDate) {
      validation.valid = false;
      validation.errors.push('Data de início deve ser anterior à data de fim');
      return validation;
    }

    // Validar range de datas
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > this.maxDateRange) {
      validation.valid = false;
      validation.errors.push(`Período muito grande: ${daysDiff} dias (máximo: ${this.maxDateRange})`);
      return validation;
    }

    // Validar datas futuras
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (startDate > today) {
      validation.valid = false;
      validation.errors.push('Data de início não pode ser no futuro');
    }

    if (endDate > today) {
      validation.valid = false;
      validation.errors.push('Data de fim não pode ser no futuro');
    }

    validation.normalized.data_inicio = startDate.toISOString().split('T')[0];
    validation.normalized.data_fim = endDate.toISOString().split('T')[0];

    return validation;
  }

  /**
   * Validar ID do colaborador
   */
  async validateColaboradorId(colaboradorId) {
    const validation = {
      valid: true,
      errors: []
    };

    try {
      // Verificar se é um número válido
      const id = parseInt(colaboradorId);
      if (isNaN(id) || id <= 0) {
        validation.valid = false;
        validation.errors.push('ID do colaborador deve ser um número positivo');
        return validation;
      }

      // Verificar se colaborador existe
      const result = await db.query(
        'SELECT id, nome, ativo FROM colaboradores WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        validation.valid = false;
        validation.errors.push('Colaborador não encontrado');
      } else if (!result.rows[0].ativo) {
        validation.valid = false;
        validation.errors.push('Colaborador inativo');
      }

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro ao validar colaborador:', error);
      validation.valid = false;
      validation.errors.push('Erro ao validar colaborador');
    }

    return validation;
  }

  /**
   * Validar ID do tablet
   */
  validateTabletId(tabletId) {
    const validation = {
      valid: true,
      warnings: []
    };

    // Validar formato do tablet_id
    if (typeof tabletId !== 'string' || tabletId.length < 3) {
      validation.warnings.push('ID do tablet muito curto, pode não existir');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(tabletId)) {
      validation.warnings.push('ID do tablet contém caracteres inválidos');
    }

    return validation;
  }

  /**
   * Estimar tamanho do relatório
   */
  async estimateReportSize(params, reportType) {
    try {
      let query = 'SELECT COUNT(*) as total FROM registros_ponto WHERE 1=1';
      const queryParams = [];

      if (params.data_inicio) {
        query += ` AND data_hora >= $${queryParams.length + 1}`;
        queryParams.push(params.data_inicio);
      }

      if (params.data_fim) {
        query += ` AND data_hora <= $${queryParams.length + 1}`;
        queryParams.push(params.data_fim + ' 23:59:59');
      }

      if (params.colaborador_id) {
        query += ` AND colaborador_id = $${queryParams.length + 1}`;
        queryParams.push(params.colaborador_id);
      }

      if (params.tablet_id) {
        query += ` AND tablet_id = $${queryParams.length + 1}`;
        queryParams.push(params.tablet_id);
      }

      const result = await db.query(query, queryParams);
      const recordCount = parseInt(result.rows[0].total);

      // Estimar tempo baseado no tipo de relatório e número de registros
      let estimatedTime = 0;
      
      switch (reportType) {
        case 'afd':
          estimatedTime = recordCount * 2; // 2ms por registro
          break;
        case 'acjef':
          estimatedTime = recordCount * 5; // 5ms por registro (mais complexo)
          break;
        default:
          estimatedTime = recordCount * 1; // 1ms por registro
      }

      return {
        records: recordCount,
        time: Math.max(estimatedTime, 100) // Mínimo 100ms
      };

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro ao estimar tamanho:', error);
      return {
        records: 0,
        time: 1000
      };
    }
  }

  /**
   * Validar tipo específico de relatório
   */
  validateReportType(params, reportType) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    switch (reportType) {
      case 'afd':
        // AFD requer período específico
        if (!params.data_inicio || !params.data_fim) {
          validation.valid = false;
          validation.errors.push('Relatório AFD requer data de início e fim');
        }
        break;

      case 'acjef':
        // ACJEF tem limitações específicas
        if (!params.data_inicio || !params.data_fim) {
          validation.valid = false;
          validation.errors.push('Relatório ACJEF requer data de início e fim');
        }
        
        // Verificar se período não é muito longo para ACJEF
        if (params.data_inicio && params.data_fim) {
          const start = new Date(params.data_inicio);
          const end = new Date(params.data_fim);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          
          if (days > 31) {
            validation.warnings.push('Relatório ACJEF com período longo pode ser muito grande');
          }
        }
        break;

      case 'frequencia':
        // Relatório de frequência precisa de colaborador
        if (!params.colaborador_id) {
          validation.warnings.push('Relatório de frequência é mais eficiente com colaborador específico');
        }
        break;

      default:
        // Relatório geral - sem validações específicas
        break;
    }

    return validation;
  }

  /**
   * Validar formato de data
   */
  isValidDate(dateString) {
    if (!dateString) return false;

    // Verificar formato
    const hasValidFormat = this.dateFormats.some(format => format.test(dateString));
    if (!hasValidFormat) return false;

    // Verificar se é uma data válida
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Validar integridade de relatório gerado
   */
  async validateReportIntegrity(reportData, params, reportType) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      integrity: {
        recordCount: 0,
        dateRange: null,
        duplicates: 0,
        inconsistencies: []
      }
    };

    try {
      if (!reportData || !Array.isArray(reportData)) {
        validation.valid = false;
        validation.errors.push('Dados do relatório inválidos');
        return validation;
      }

      validation.integrity.recordCount = reportData.length;

      // Verificar se há registros
      if (reportData.length === 0) {
        validation.warnings.push('Nenhum registro encontrado para o período solicitado');
        return validation;
      }

      // Verificar integridade das datas
      const dateValidation = this.validateReportDates(reportData, params);
      validation.integrity.dateRange = dateValidation.range;
      validation.warnings.push(...dateValidation.warnings);

      // Verificar duplicatas
      const duplicateValidation = this.checkDuplicates(reportData);
      validation.integrity.duplicates = duplicateValidation.count;
      if (duplicateValidation.count > 0) {
        validation.warnings.push(`${duplicateValidation.count} registros duplicados encontrados`);
      }

      // Verificar consistência dos dados
      const consistencyValidation = this.checkDataConsistency(reportData, reportType);
      validation.integrity.inconsistencies = consistencyValidation.issues;
      validation.warnings.push(...consistencyValidation.warnings);

      // Log de auditoria
      await auditLogger.security('REPORT_VALIDATED', {
        reportType,
        recordCount: validation.integrity.recordCount,
        duplicates: validation.integrity.duplicates,
        inconsistencies: validation.integrity.inconsistencies.length,
        valid: validation.valid
      });

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro na validação de integridade:', error);
      validation.valid = false;
      validation.errors.push('Erro na validação de integridade do relatório');
    }

    return validation;
  }

  /**
   * Validar datas no relatório
   */
  validateReportDates(reportData, params) {
    const validation = {
      range: null,
      warnings: []
    };

    try {
      const dates = reportData
        .map(record => new Date(record.data_hora))
        .filter(date => !isNaN(date));

      if (dates.length === 0) {
        validation.warnings.push('Nenhuma data válida encontrada nos registros');
        return validation;
      }

      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      validation.range = {
        inicio: minDate.toISOString().split('T')[0],
        fim: maxDate.toISOString().split('T')[0]
      };

      // Verificar se as datas estão dentro do período solicitado
      if (params.data_inicio) {
        const requestedStart = new Date(params.data_inicio);
        if (minDate < requestedStart) {
          validation.warnings.push('Encontrados registros anteriores ao período solicitado');
        }
      }

      if (params.data_fim) {
        const requestedEnd = new Date(params.data_fim);
        if (maxDate > requestedEnd) {
          validation.warnings.push('Encontrados registros posteriores ao período solicitado');
        }
      }

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro na validação de datas:', error);
      validation.warnings.push('Erro ao validar datas do relatório');
    }

    return validation;
  }

  /**
   * Verificar duplicatas
   */
  checkDuplicates(reportData) {
    const seen = new Set();
    let duplicates = 0;

    reportData.forEach(record => {
      const key = `${record.colaborador_id}-${record.data_hora}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });

    return {
      count: duplicates
    };
  }

  /**
   * Verificar consistência dos dados
   */
  checkDataConsistency(reportData, reportType) {
    const validation = {
      issues: [],
      warnings: []
    };

    try {
      reportData.forEach((record, index) => {
        // Verificar campos obrigatórios
        if (!record.data_hora) {
          validation.issues.push(`Registro ${index + 1}: data_hora ausente`);
        }

        if (!record.colaborador_id) {
          validation.issues.push(`Registro ${index + 1}: colaborador_id ausente`);
        }

        // Verificar coordenadas se presentes
        if (record.latitude && (record.latitude < -90 || record.latitude > 90)) {
          validation.issues.push(`Registro ${index + 1}: latitude inválida`);
        }

        if (record.longitude && (record.longitude < -180 || record.longitude > 180)) {
          validation.issues.push(`Registro ${index + 1}: longitude inválida`);
        }

        // Verificações específicas por tipo
        switch (reportType) {
          case 'afd':
            if (!record.colaborador_cpf && !record.pis_pasep) {
              validation.issues.push(`Registro ${index + 1}: CPF ou PIS necessário para AFD`);
            }
            break;

          case 'acjef':
            if (!record.colaborador_nome) {
              validation.issues.push(`Registro ${index + 1}: nome do colaborador necessário para ACJEF`);
            }
            break;
        }
      });

      // Resumir problemas
      if (validation.issues.length > 0) {
        validation.warnings.push(`${validation.issues.length} inconsistências encontradas nos dados`);
      }

    } catch (error) {
      console.error('❌ REPORTS VALIDATOR: Erro na verificação de consistência:', error);
      validation.warnings.push('Erro ao verificar consistência dos dados');
    }

    return validation;
  }

  /**
   * Gerar relatório de validação
   */
  generateValidationReport(validation, reportType, executionTime) {
    return {
      timestamp: new Date().toISOString(),
      reportType,
      validation: {
        status: validation.valid ? 'VALID' : 'INVALID',
        errors: validation.errors,
        warnings: validation.warnings
      },
      integrity: validation.integrity || {},
      performance: {
        estimatedRecords: validation.estimatedRecords || 0,
        estimatedTime: validation.estimatedTime || 0,
        actualTime: executionTime || 0
      },
      recommendations: this.generateRecommendations(validation)
    };
  }

  /**
   * Gerar recomendações baseadas na validação
   */
  generateRecommendations(validation) {
    const recommendations = [];

    if (validation.estimatedRecords > 10000) {
      recommendations.push({
        type: 'PERFORMANCE',
        message: 'Considere filtrar por colaborador ou reduzir o período para melhor performance'
      });
    }

    if (validation.warnings.some(w => w.includes('duplicados'))) {
      recommendations.push({
        type: 'DATA_QUALITY',
        message: 'Verificar causa dos registros duplicados no sistema'
      });
    }

    if (validation.estimatedTime > 10000) {
      recommendations.push({
        type: 'TIMEOUT',
        message: 'Relatório pode demorar muito. Considere executar em horário de menor uso'
      });
    }

    return recommendations;
  }
}

// Singleton instance
const reportsValidator = new ReportsValidator();

module.exports = reportsValidator;
