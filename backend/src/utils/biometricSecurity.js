const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configurações de segurança para dados biométricos
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Gerar chave de criptografia segura para dados biométricos
 * LGPD Art. 46: Medidas técnicas adequadas para proteção de dados sensíveis
 */
function generateBiometricKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Criptografar dados biométricos sensíveis
 * @param {string} data - Dados a serem criptografados
 * @param {Buffer} key - Chave de criptografia
 * @returns {object} Dados criptografados com IV e tag
 */
function encryptBiometricData(data, key) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('biometric-data'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: ENCRYPTION_ALGORITHM
    };
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro ao criptografar dados biométricos:', error);
    throw new Error('Falha na criptografia de dados sensíveis');
  }
}

/**
 * Descriptografar dados biométricos
 * @param {object} encryptedData - Dados criptografados
 * @param {Buffer} key - Chave de descriptografia
 * @returns {string} Dados descriptografados
 */
function decryptBiometricData(encryptedData, key) {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipherGCM(encryptedData.algorithm, key, iv);
    decipher.setAAD(Buffer.from('biometric-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro ao descriptografar dados biométricos:', error);
    throw new Error('Falha na descriptografia de dados sensíveis');
  }
}

/**
 * Criptografar arquivo de imagem facial
 * @param {string} imagePath - Caminho da imagem
 * @param {Buffer} key - Chave de criptografia
 * @returns {string} Caminho do arquivo criptografado
 */
function encryptFaceImage(imagePath, key) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Arquivo de imagem não encontrado');
    }
    
    const imageData = fs.readFileSync(imagePath);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(imageData),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Salvar arquivo criptografado
    const encryptedPath = imagePath + '.enc';
    const encryptedFileData = Buffer.concat([iv, tag, encrypted]);
    
    fs.writeFileSync(encryptedPath, encryptedFileData);
    
    // Remover arquivo original não criptografado
    fs.unlinkSync(imagePath);
    
    console.log('🔒 SEGURANÇA: Imagem facial criptografada com sucesso');
    return encryptedPath;
    
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro ao criptografar imagem facial:', error);
    throw new Error('Falha na criptografia de imagem biométrica');
  }
}

/**
 * Gerar hash seguro para identificação de dados biométricos
 * Usado para comparação sem expor dados originais
 */
function generateBiometricHash(data) {
  return crypto.createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Validar integridade de dados biométricos
 * @param {string} data - Dados originais
 * @param {string} hash - Hash para validação
 * @returns {boolean} Verdadeiro se íntegro
 */
function validateBiometricIntegrity(data, hash) {
  const calculatedHash = generateBiometricHash(data);
  return calculatedHash === hash;
}

/**
 * Configurar permissões seguras para diretório de dados biométricos
 * @param {string} dirPath - Caminho do diretório
 */
function secureBiometricDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 }); // Apenas owner
    } else {
      fs.chmodSync(dirPath, 0o700); // Apenas owner pode ler/escrever
    }
    
    console.log('🔒 SEGURANÇA: Diretório biométrico protegido');
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro ao proteger diretório biométrico:', error);
  }
}

/**
 * Log de auditoria para operações com dados biométricos
 * LGPD Art. 37: Registro de operações com dados pessoais
 */
function logBiometricOperation(operation, userId, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation: operation,
    user_id: userId,
    details: details,
    ip_address: 'system', // Será preenchido pelo middleware
    data_type: 'biometric',
    sensitivity_level: 'high'
  };
  
  console.log('🔍 AUDITORIA BIOMÉTRICA:', JSON.stringify(logEntry));
  
  // Salvar em arquivo de auditoria específico
  const auditPath = path.join(__dirname, '../logs/biometric_audit.log');
  const logDir = path.dirname(auditPath);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
  }
  
  fs.appendFileSync(auditPath, JSON.stringify(logEntry) + '\n', { mode: 0o600 });
}

module.exports = {
  generateBiometricKey,
  encryptBiometricData,
  decryptBiometricData,
  encryptFaceImage,
  generateBiometricHash,
  validateBiometricIntegrity,
  secureBiometricDirectory,
  logBiometricOperation
};
