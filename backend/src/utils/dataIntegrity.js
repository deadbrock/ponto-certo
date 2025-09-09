const crypto = require('crypto');
const secureLogger = require('./secureLogger');

/**
 * Utilitários para Validação de Integridade de Dados
 * Implementa checksums, assinaturas e validações para dados críticos
 */

class DataIntegrityValidator {
  constructor() {
    // Chave para assinatura de dados críticos
    this.signingKey = process.env.DATA_SIGNING_KEY || 'fg-services-data-integrity-2024';
  }

  /**
   * Gerar hash SHA-256 para integridade de dados
   * @param {any} data - Dados para gerar hash
   * @returns {string} Hash SHA-256
   */
  generateDataHash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Gerar assinatura HMAC para dados críticos
   * @param {any} data - Dados para assinar
   * @returns {string} Assinatura HMAC
   */
  signData(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHmac('sha256', this.signingKey)
      .update(dataString)
      .digest('hex');
  }

  /**
   * Verificar assinatura de dados
   * @param {any} data - Dados originais
   * @param {string} signature - Assinatura para verificar
   * @returns {boolean} Verdadeiro se assinatura é válida
   */
  verifyDataSignature(data, signature) {
    const expectedSignature = this.signData(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Criar registro de ponto com integridade
   * @param {Object} pontoData - Dados do registro de ponto
   * @returns {Object} Registro com hash de integridade
   */
  createIntegrityRecord(pontoData) {
    const timestamp = new Date().toISOString();
    const recordWithTimestamp = {
      ...pontoData,
      timestamp,
      source: 'ponto-digital-system'
    };

    const dataHash = this.generateDataHash(recordWithTimestamp);
    const signature = this.signData(recordWithTimestamp);

    return {
      data: recordWithTimestamp,
      integrity: {
        hash: dataHash,
        signature,
        algorithm: 'SHA-256-HMAC',
        createdAt: timestamp
      }
    };
  }

  /**
   * Validar integridade de registro
   * @param {Object} record - Registro com dados de integridade
   * @returns {Object} Resultado da validação
   */
  validateRecord(record) {
    try {
      if (!record.data || !record.integrity) {
        return {
          valid: false,
          error: 'Registro não contém dados de integridade'
        };
      }

      const { data, integrity } = record;
      
      // Verificar hash
      const expectedHash = this.generateDataHash(data);
      const hashValid = expectedHash === integrity.hash;

      // Verificar assinatura
      const signatureValid = this.verifyDataSignature(data, integrity.signature);

      if (!hashValid || !signatureValid) {
        secureLogger.security('critical', 'Falha na validação de integridade de dados', {
          hashValid,
          signatureValid,
          recordId: data.id || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      return {
        valid: hashValid && signatureValid,
        hashValid,
        signatureValid,
        timestamp: integrity.createdAt
      };

    } catch (error) {
      secureLogger.error(error, {
        context: 'dataIntegrityValidation',
        recordId: record?.data?.id || 'unknown'
      });

      return {
        valid: false,
        error: 'Erro na validação de integridade'
      };
    }
  }

  /**
   * Validar arquivo uploadado
   * @param {Object} file - Arquivo multer
   * @returns {Object} Resultado da validação
   */
  validateUploadedFile(file) {
    try {
      const fs = require('fs');
      const path = require('path');

      if (!file || !file.path) {
        return {
          valid: false,
          error: 'Arquivo inválido'
        };
      }

      // Verificar se arquivo existe
      if (!fs.existsSync(file.path)) {
        return {
          valid: false,
          error: 'Arquivo não encontrado'
        };
      }

      // Gerar hash do arquivo
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Verificar tipo MIME
      const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/jpg',
        'text/plain', 'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      const mimeTypeValid = allowedMimeTypes.includes(file.mimetype);

      // Verificar tamanho (máximo 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      const sizeValid = file.size <= maxSize;

      // Verificar extensão
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.txt', '.pdf', '.xls', '.xlsx'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const extensionValid = allowedExtensions.includes(fileExtension);

      const valid = mimeTypeValid && sizeValid && extensionValid;

      if (!valid) {
        secureLogger.security('warning', 'Arquivo rejeitado na validação', {
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          extension: fileExtension,
          mimeTypeValid,
          sizeValid,
          extensionValid
        });
      }

      return {
        valid,
        fileHash,
        mimeTypeValid,
        sizeValid,
        extensionValid,
        size: file.size,
        mimeType: file.mimetype
      };

    } catch (error) {
      secureLogger.error(error, {
        context: 'fileValidation',
        fileName: file?.originalname || 'unknown'
      });

      return {
        valid: false,
        error: 'Erro na validação do arquivo'
      };
    }
  }

  /**
   * Criar backup de dados críticos com integridade
   * @param {string} tableName - Nome da tabela
   * @param {Array} data - Dados para backup
   * @returns {Object} Backup com integridade
   */
  createBackup(tableName, data) {
    const timestamp = new Date().toISOString();
    const backupData = {
      table: tableName,
      data: data,
      timestamp,
      count: data.length,
      version: '1.0'
    };

    const dataHash = this.generateDataHash(backupData);
    const signature = this.signData(backupData);

    return {
      backup: backupData,
      integrity: {
        hash: dataHash,
        signature,
        algorithm: 'SHA-256-HMAC',
        createdAt: timestamp
      }
    };
  }

  /**
   * Detectar alterações não autorizadas em dados
   * @param {Object} originalData - Dados originais
   * @param {Object} currentData - Dados atuais
   * @returns {Object} Resultado da detecção
   */
  detectUnauthorizedChanges(originalData, currentData) {
    const originalHash = this.generateDataHash(originalData);
    const currentHash = this.generateDataHash(currentData);
    
    const changed = originalHash !== currentHash;
    
    if (changed) {
      secureLogger.security('warning', 'Alteração detectada em dados críticos', {
        originalHash: originalHash.substring(0, 16) + '...',
        currentHash: currentHash.substring(0, 16) + '...',
        timestamp: new Date().toISOString()
      });
    }

    return {
      changed,
      originalHash,
      currentHash,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton
const dataIntegrityValidator = new DataIntegrityValidator();

module.exports = dataIntegrityValidator;
