const secureLogger = require('./secureLogger');

/**
 * Sistema de Classificação Automática de Dados Sensíveis
 * Implementa categorização LGPD e controles de acesso granulares
 */

// Classificações LGPD
const DATA_CLASSIFICATIONS = {
  PUBLICO: {
    level: 0,
    label: 'Público',
    color: '#28a745',
    description: 'Dados que podem ser divulgados publicamente'
  },
  INTERNO: {
    level: 1,
    label: 'Interno',
    color: '#17a2b8',
    description: 'Dados para uso interno da organização'
  },
  CONFIDENCIAL: {
    level: 2,
    label: 'Confidencial',
    color: '#ffc107',
    description: 'Dados pessoais que requerem proteção'
  },
  SENSIVEL: {
    level: 3,
    label: 'Sensível',
    color: '#fd7e14',
    description: 'Dados sensíveis LGPD Art. 5º, II'
  },
  CRITICO: {
    level: 4,
    label: 'Crítico',
    color: '#dc3545',
    description: 'Dados biométricos e de alta sensibilidade'
  }
};

// Mapeamento de campos para classificações
const FIELD_CLASSIFICATIONS = {
  // Dados Críticos (Biométricos)
  'face_data': DATA_CLASSIFICATIONS.CRITICO,
  'biometric_hash': DATA_CLASSIFICATIONS.CRITICO,
  'caminho_foto': DATA_CLASSIFICATIONS.CRITICO,
  'face_image': DATA_CLASSIFICATIONS.CRITICO,
  
  // Dados Sensíveis (LGPD Art. 5º, II)
  'cpf': DATA_CLASSIFICATIONS.SENSIVEL,
  'rg': DATA_CLASSIFICATIONS.SENSIVEL,
  'data_nascimento': DATA_CLASSIFICATIONS.SENSIVEL,
  'motivo': DATA_CLASSIFICATIONS.SENSIVEL, // atestados médicos
  'arquivo_anexo': DATA_CLASSIFICATIONS.SENSIVEL, // atestados
  
  // Dados Confidenciais (Pessoais)
  'nome': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'email': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'telefone': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'endereco': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'salario': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'senha_hash': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'latitude': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  'longitude': DATA_CLASSIFICATIONS.CONFIDENCIAL,
  
  // Dados Internos
  'cargo': DATA_CLASSIFICATIONS.INTERNO,
  'departamento': DATA_CLASSIFICATIONS.INTERNO,
  'data_admissao': DATA_CLASSIFICATIONS.INTERNO,
  'horario_inicio': DATA_CLASSIFICATIONS.INTERNO,
  'horario_fim': DATA_CLASSIFICATIONS.INTERNO,
  
  // Dados Públicos
  'id': DATA_CLASSIFICATIONS.PUBLICO,
  'criado_em': DATA_CLASSIFICATIONS.PUBLICO,
  'atualizado_em': DATA_CLASSIFICATIONS.PUBLICO,
  'ativo': DATA_CLASSIFICATIONS.PUBLICO
};

class DataClassifier {
  constructor() {
    this.classifications = DATA_CLASSIFICATIONS;
    this.fieldMap = FIELD_CLASSIFICATIONS;
  }

  /**
   * Classificar um campo de dados
   * @param {string} fieldName - Nome do campo
   * @param {any} value - Valor do campo
   * @returns {Object} Classificação do campo
   */
  classifyField(fieldName, value = null) {
    const normalizedField = fieldName.toLowerCase();
    
    // Verificar mapeamento direto
    if (this.fieldMap[normalizedField]) {
      return {
        field: fieldName,
        classification: this.fieldMap[normalizedField],
        hasValue: value !== null && value !== undefined,
        requiresEncryption: this.fieldMap[normalizedField].level >= 3,
        requiresAudit: this.fieldMap[normalizedField].level >= 2
      };
    }
    
    // Classificação por padrões
    const classification = this.classifyByPattern(normalizedField, value);
    
    return {
      field: fieldName,
      classification,
      hasValue: value !== null && value !== undefined,
      requiresEncryption: classification.level >= 3,
      requiresAudit: classification.level >= 2
    };
  }

  /**
   * Classificar por padrões de nome
   * @param {string} fieldName - Nome do campo
   * @param {any} value - Valor do campo
   * @returns {Object} Classificação
   */
  classifyByPattern(fieldName, value) {
    // Padrões para dados críticos
    if (fieldName.includes('biometric') || fieldName.includes('face') || 
        fieldName.includes('fingerprint') || fieldName.includes('foto')) {
      return DATA_CLASSIFICATIONS.CRITICO;
    }
    
    // Padrões para dados sensíveis
    if (fieldName.includes('cpf') || fieldName.includes('rg') || 
        fieldName.includes('nascimento') || fieldName.includes('saude') ||
        fieldName.includes('medico') || fieldName.includes('atestado')) {
      return DATA_CLASSIFICATIONS.SENSIVEL;
    }
    
    // Padrões para dados confidenciais
    if (fieldName.includes('nome') || fieldName.includes('email') || 
        fieldName.includes('telefone') || fieldName.includes('endereco') ||
        fieldName.includes('salario') || fieldName.includes('senha') ||
        fieldName.includes('latitude') || fieldName.includes('longitude')) {
      return DATA_CLASSIFICATIONS.CONFIDENCIAL;
    }
    
    // Padrões para dados internos
    if (fieldName.includes('cargo') || fieldName.includes('departamento') ||
        fieldName.includes('admissao') || fieldName.includes('horario')) {
      return DATA_CLASSIFICATIONS.INTERNO;
    }
    
    // Padrão: público
    return DATA_CLASSIFICATIONS.PUBLICO;
  }

  /**
   * Classificar um objeto completo
   * @param {Object} data - Objeto com dados
   * @returns {Object} Análise completa
   */
  classifyObject(data) {
    if (!data || typeof data !== 'object') {
      return { error: 'Dados inválidos para classificação' };
    }

    const fields = [];
    let maxLevel = 0;
    let requiresEncryption = false;
    let requiresAudit = false;

    for (const [key, value] of Object.entries(data)) {
      const fieldClassification = this.classifyField(key, value);
      fields.push(fieldClassification);
      
      if (fieldClassification.classification.level > maxLevel) {
        maxLevel = fieldClassification.classification.level;
      }
      
      if (fieldClassification.requiresEncryption) {
        requiresEncryption = true;
      }
      
      if (fieldClassification.requiresAudit) {
        requiresAudit = true;
      }
    }

    const overallClassification = Object.values(DATA_CLASSIFICATIONS)
      .find(c => c.level === maxLevel) || DATA_CLASSIFICATIONS.PUBLICO;

    return {
      overallClassification,
      maxLevel,
      requiresEncryption,
      requiresAudit,
      fields,
      summary: {
        total: fields.length,
        critico: fields.filter(f => f.classification.level === 4).length,
        sensivel: fields.filter(f => f.classification.level === 3).length,
        confidencial: fields.filter(f => f.classification.level === 2).length,
        interno: fields.filter(f => f.classification.level === 1).length,
        publico: fields.filter(f => f.classification.level === 0).length
      }
    };
  }

  /**
   * Verificar se usuário pode acessar dados
   * @param {Object} userProfile - Perfil do usuário
   * @param {Object} dataClassification - Classificação dos dados
   * @returns {Object} Resultado da verificação
   */
  checkAccess(userProfile, dataClassification) {
    const userLevel = this.getUserAccessLevel(userProfile.perfil);
    const requiredLevel = dataClassification.maxLevel;

    const hasAccess = userLevel >= requiredLevel;

    if (!hasAccess) {
      secureLogger.security('warning', 'Tentativa de acesso negado por classificação', {
        userId: userProfile.id,
        userLevel,
        requiredLevel,
        dataClassification: dataClassification.overallClassification.label
      });
    }

    return {
      hasAccess,
      userLevel,
      requiredLevel,
      reason: hasAccess ? 'Acesso autorizado' : 'Nível de acesso insuficiente'
    };
  }

  /**
   * Obter nível de acesso do usuário
   * @param {string} perfil - Perfil do usuário
   * @returns {number} Nível de acesso
   */
  getUserAccessLevel(perfil) {
    const levels = {
      'ADMINISTRADOR': 4, // Acesso total
      'RH': 3,           // Até sensível
      'GESTOR': 2,       // Até confidencial
      'COLABORADOR': 1   // Apenas interno e próprios dados
    };

    return levels[perfil?.toUpperCase()] || 0;
  }

  /**
   * Filtrar dados baseado na classificação
   * @param {Object} data - Dados originais
   * @param {Object} userProfile - Perfil do usuário
   * @returns {Object} Dados filtrados
   */
  filterDataByAccess(data, userProfile) {
    const userLevel = this.getUserAccessLevel(userProfile.perfil);
    const filteredData = {};

    for (const [key, value] of Object.entries(data)) {
      const fieldClassification = this.classifyField(key, value);
      
      if (fieldClassification.classification.level <= userLevel) {
        filteredData[key] = value;
      } else {
        filteredData[key] = '[REDACTED]';
      }
    }

    // Log de filtragem
    secureLogger.audit('DATA_FILTER', userProfile.id, {
      originalFields: Object.keys(data).length,
      filteredFields: Object.keys(filteredData).filter(k => filteredData[k] !== '[REDACTED]').length,
      redactedFields: Object.keys(filteredData).filter(k => filteredData[k] === '[REDACTED]').length,
      userLevel
    });

    return filteredData;
  }

  /**
   * Gerar relatório de classificação
   * @param {string} tableName - Nome da tabela
   * @param {Array} records - Registros para análise
   * @returns {Object} Relatório detalhado
   */
  generateClassificationReport(tableName, records) {
    if (!records || records.length === 0) {
      return { error: 'Nenhum registro para análise' };
    }

    const sample = records[0];
    const classification = this.classifyObject(sample);
    
    const report = {
      table: tableName,
      timestamp: new Date().toISOString(),
      recordCount: records.length,
      overallClassification: classification.overallClassification,
      requiresEncryption: classification.requiresEncryption,
      requiresAudit: classification.requiresAudit,
      fieldAnalysis: classification.fields,
      summary: classification.summary,
      recommendations: this.generateRecommendations(classification),
      complianceStatus: this.assessCompliance(classification)
    };

    // Log do relatório
    secureLogger.audit('CLASSIFICATION_REPORT', null, {
      table: tableName,
      classification: classification.overallClassification.label,
      requiresEncryption: classification.requiresEncryption
    });

    return report;
  }

  /**
   * Gerar recomendações baseadas na classificação
   * @param {Object} classification - Classificação dos dados
   * @returns {Array} Lista de recomendações
   */
  generateRecommendations(classification) {
    const recommendations = [];

    if (classification.requiresEncryption) {
      recommendations.push({
        priority: 'HIGH',
        type: 'ENCRYPTION',
        message: 'Dados requerem criptografia AES-256 ou superior'
      });
    }

    if (classification.requiresAudit) {
      recommendations.push({
        priority: 'HIGH',
        type: 'AUDIT',
        message: 'Todos os acessos devem ser auditados'
      });
    }

    if (classification.summary.critico > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'BIOMETRIC',
        message: 'Dados biométricos requerem consentimento específico LGPD'
      });
    }

    if (classification.summary.sensivel > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'LGPD',
        message: 'Dados sensíveis requerem base legal específica'
      });
    }

    return recommendations;
  }

  /**
   * Avaliar compliance LGPD
   * @param {Object} classification - Classificação dos dados
   * @returns {Object} Status de compliance
   */
  assessCompliance(classification) {
    const issues = [];
    let score = 100;

    if (classification.requiresEncryption) {
      // Verificar se criptografia está implementada
      issues.push({
        severity: 'HIGH',
        issue: 'Verificar implementação de criptografia para dados sensíveis'
      });
      score -= 20;
    }

    if (classification.summary.critico > 0) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Dados biométricos requerem consentimento específico documentado'
      });
      score -= 30;
    }

    return {
      score: Math.max(0, score),
      level: score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR',
      issues
    };
  }
}

// Singleton
const dataClassifier = new DataClassifier();

module.exports = {
  dataClassifier,
  DATA_CLASSIFICATIONS,
  FIELD_CLASSIFICATIONS
};
