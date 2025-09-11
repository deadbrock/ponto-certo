/**
 * SISTEMA DE MASCARAMENTO DE DADOS SENSÍVEIS
 * Implementação LGPD compliant para proteção de dados pessoais em logs
 */

class DataMasking {
  constructor() {
    // Padrões para identificação de dados sensíveis
    this.patterns = {
      cpf: /(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/g,
      cnpj: /(\d{2})\.?(\d{3})\.?(\d{3})\/?(\d{4})-?(\d{2})/g,
      rg: /(\d{1,2})\.?(\d{3})\.?(\d{3})-?([0-9X])/g,
      email: /([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      phone: /(\+?55\s?)?\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})/g,
      creditCard: /(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})/g,
      password: /(senha|password|pwd|pass)[\s]*[=:]\s*['"]*([^'"\s,}]+)/gi,
      token: /(token|jwt|bearer)[\s]*[=:]\s*['"]*([a-zA-Z0-9._-]+)/gi
    };

    // Campos sensíveis que devem ser mascarados automaticamente
    this.sensitiveFields = [
      'cpf', 'rg', 'cnpj', 'senha', 'password', 'token', 'jwt',
      'biometric', 'face_data', 'authorization', 'cookie', 'session',
      'telefone', 'celular', 'email', 'endereco', 'cep'
    ];
  }

  /**
   * Mascara CPF mantendo apenas os primeiros 3 e últimos 2 dígitos
   * @param {string} cpf - CPF a ser mascarado
   * @returns {string} - CPF mascarado
   */
  maskCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') return cpf;
    
    // Remove formatação
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return cpf; // CPF inválido, retorna original
    
    // Mascara: 123.***.**-45
    return `${cleanCPF.substring(0, 3)}.***.**-${cleanCPF.substring(9, 11)}`;
  }

  /**
   * Mascara CNPJ mantendo apenas os primeiros 2 e últimos 2 dígitos
   * @param {string} cnpj - CNPJ a ser mascarado
   * @returns {string} - CNPJ mascarado
   */
  maskCNPJ(cnpj) {
    if (!cnpj || typeof cnpj !== 'string') return cnpj;
    
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) return cnpj;
    
    // Mascara: 12.***/****-**
    return `${cleanCNPJ.substring(0, 2)}.***/****-${cleanCNPJ.substring(12, 14)}`;
  }

  /**
   * Mascara email mantendo apenas primeira letra e domínio
   * @param {string} email - Email a ser mascarado
   * @returns {string} - Email mascarado
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string') return email;
    
    const emailRegex = /^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    const match = email.match(emailRegex);
    
    if (!match) return email;
    
    const [, localPart, domain] = match;
    
    if (localPart.length <= 2) {
      return `${localPart.charAt(0)}***@${domain}`;
    }
    
    // Mascara: j***@domain.com
    return `${localPart.charAt(0)}***@${domain}`;
  }

  /**
   * Mascara telefone mantendo apenas DDD e últimos 2 dígitos
   * @param {string} phone - Telefone a ser mascarado
   * @returns {string} - Telefone mascarado
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) return phone;
    
    // Para celular (11 dígitos): (11) ****-**34
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.substring(0, 2)}) ****-**${cleanPhone.substring(9, 11)}`;
    }
    
    // Para fixo (10 dígitos): (11) ***-**34
    return `(${cleanPhone.substring(0, 2)}) ***-**${cleanPhone.substring(8, 10)}`;
  }

  /**
   * Mascara string completa identificando padrões automaticamente
   * @param {string} text - Texto a ser mascarado
   * @returns {string} - Texto mascarado
   */
  maskSensitiveData(text) {
    if (!text || typeof text !== 'string') return text;
    
    let maskedText = text;
    
    // Aplicar mascaramento por padrões
    maskedText = maskedText.replace(this.patterns.cpf, (match, p1, p2, p3, p4) => {
      return `${p1}.***.**-${p4}`;
    });
    
    maskedText = maskedText.replace(this.patterns.cnpj, (match, p1, p2, p3, p4, p5) => {
      return `${p1}.***/****-${p5}`;
    });
    
    maskedText = maskedText.replace(this.patterns.email, (match, local, domain) => {
      return `${local.charAt(0)}***@${domain}`;
    });
    
    maskedText = maskedText.replace(this.patterns.phone, (match, country, area, num1, num2) => {
      return `${country || ''}(${area}) ****-**${num2.slice(-2)}`;
    });
    
    maskedText = maskedText.replace(this.patterns.password, (match, field, value) => {
      return `${field}: ***MASKED***`;
    });
    
    maskedText = maskedText.replace(this.patterns.token, (match, field, value) => {
      return `${field}: ***TOKEN***`;
    });
    
    return maskedText;
  }

  /**
   * Mascara objeto recursivamente
   * @param {any} obj - Objeto a ser mascarado
   * @returns {any} - Objeto mascarado
   */
  maskObject(obj) {
    if (obj === null || obj === undefined) return obj;
    
    // Se for string, aplicar mascaramento
    if (typeof obj === 'string') {
      return this.maskSensitiveData(obj);
    }
    
    // Se for array, processar cada item
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item));
    }
    
    // Se for objeto, processar cada propriedade
    if (typeof obj === 'object') {
      const maskedObj = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Verificar se é campo sensível
        if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
          // Aplicar mascaramento específico baseado no tipo
          if (lowerKey.includes('cpf')) {
            maskedObj[key] = this.maskCPF(value);
          } else if (lowerKey.includes('cnpj')) {
            maskedObj[key] = this.maskCNPJ(value);
          } else if (lowerKey.includes('email')) {
            maskedObj[key] = this.maskEmail(value);
          } else if (lowerKey.includes('telefone') || lowerKey.includes('celular')) {
            maskedObj[key] = this.maskPhone(value);
          } else if (lowerKey.includes('senha') || lowerKey.includes('password')) {
            maskedObj[key] = '***SENHA***';
          } else if (lowerKey.includes('token') || lowerKey.includes('jwt')) {
            maskedObj[key] = '***TOKEN***';
          } else {
            maskedObj[key] = '***MASKED***';
          }
        } else {
          // Processar recursivamente
          maskedObj[key] = this.maskObject(value);
        }
      }
      
      return maskedObj;
    }
    
    return obj;
  }

  /**
   * Função principal para mascaramento seguro
   * @param {any} data - Dados a serem mascarados
   * @returns {any} - Dados mascarados
   */
  mask(data) {
    try {
      return this.maskObject(data);
    } catch (error) {
      console.error('Erro ao mascarar dados:', error);
      return '[ERRO_MASCARAMENTO]';
    }
  }

  /**
   * Verifica se um texto contém dados sensíveis
   * @param {string} text - Texto a ser verificado
   * @returns {boolean} - True se contém dados sensíveis
   */
  containsSensitiveData(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Verificar padrões conhecidos
    for (const pattern of Object.values(this.patterns)) {
      if (pattern.test(text)) return true;
    }
    
    // Verificar campos sensíveis
    const lowerText = text.toLowerCase();
    return this.sensitiveFields.some(field => lowerText.includes(field));
  }
}

// Instância singleton
const dataMasking = new DataMasking();

module.exports = {
  DataMasking,
  dataMasking,
  
  // Funções de conveniência
  maskCPF: (cpf) => dataMasking.maskCPF(cpf),
  maskCNPJ: (cnpj) => dataMasking.maskCNPJ(cnpj),
  maskEmail: (email) => dataMasking.maskEmail(email),
  maskPhone: (phone) => dataMasking.maskPhone(phone),
  maskSensitiveData: (text) => dataMasking.maskSensitiveData(text),
  maskObject: (obj) => dataMasking.maskObject(obj),
  mask: (data) => dataMasking.mask(data),
  containsSensitiveData: (text) => dataMasking.containsSensitiveData(text)
};
