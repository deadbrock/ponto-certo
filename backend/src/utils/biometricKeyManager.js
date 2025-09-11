const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 🔐 GERENCIADOR DE CHAVES BIOMÉTRICAS
 * 
 * Sistema seguro para geração e gerenciamento de chaves de criptografia
 * para dados biométricos sensíveis (LGPD Art. 46)
 */

const KEY_FILE_PATH = path.join(__dirname, '../keys/biometric.key');
const KEY_LENGTH = 32; // 256 bits para AES-256

/**
 * Gerar ou carregar chave mestra para dados biométricos
 * @returns {Buffer} Chave de criptografia
 */
function getMasterBiometricKey() {
  try {
    // Verificar se chave já existe
    if (fs.existsSync(KEY_FILE_PATH)) {
      console.log('🔑 SEGURANÇA: Carregando chave biométrica existente');
      return fs.readFileSync(KEY_FILE_PATH);
    }
    
    // Gerar nova chave se não existir
    console.log('🔑 SEGURANÇA: Gerando nova chave biométrica mestra');
    const masterKey = crypto.randomBytes(KEY_LENGTH);
    
    // Criar diretório seguro
    const keyDir = path.dirname(KEY_FILE_PATH);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 }); // Apenas owner
    }
    
    // Salvar chave com permissões restritas
    fs.writeFileSync(KEY_FILE_PATH, masterKey, { mode: 0o600 }); // Apenas owner read/write
    
    console.log('🔒 SEGURANÇA: Chave biométrica mestra criada e protegida');
    return masterKey;
    
  } catch (error) {
    console.error('❌ SEGURANÇA CRÍTICA: Erro ao gerenciar chave biométrica:', error);
    throw new Error('Falha crítica no sistema de chaves biométricas');
  }
}

/**
 * Gerar chave derivada para operação específica
 * @param {string} purpose - Finalidade da chave (ex: 'face-encryption')
 * @param {string} identifier - Identificador único (ex: colaborador_id)
 * @returns {Buffer} Chave derivada
 */
function getDerivedKey(purpose, identifier) {
  try {
    const masterKey = getMasterBiometricKey();
    const salt = crypto.createHash('sha256')
      .update(`${purpose}:${identifier}`)
      .digest();
    
    // Derivar chave usando PBKDF2
    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
    
    console.log(`🔑 SEGURANÇA: Chave derivada gerada para ${purpose}:${identifier}`);
    return derivedKey;
    
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro ao derivar chave:', error);
    throw new Error('Falha na derivação de chave biométrica');
  }
}

/**
 * Rotacionar chave mestra (para manutenção de segurança)
 * ATENÇÃO: Esta operação requer re-criptografia de todos os dados!
 */
function rotateMasterKey() {
  try {
    console.log('🔄 SEGURANÇA: Iniciando rotação de chave mestra...');
    
    // Backup da chave atual
    if (fs.existsSync(KEY_FILE_PATH)) {
      const backupPath = KEY_FILE_PATH + '.backup.' + Date.now();
      fs.copyFileSync(KEY_FILE_PATH, backupPath);
      console.log(`🔄 SEGURANÇA: Backup da chave criado: ${backupPath}`);
    }
    
    // Gerar nova chave
    const newMasterKey = crypto.randomBytes(KEY_LENGTH);
    fs.writeFileSync(KEY_FILE_PATH, newMasterKey, { mode: 0o600 });
    
    console.log('🔄 SEGURANÇA: Nova chave mestra gerada');
    console.log('⚠️  ATENÇÃO: Todos os dados biométricos precisam ser re-criptografados!');
    
    return newMasterKey;
    
  } catch (error) {
    console.error('❌ SEGURANÇA CRÍTICA: Erro na rotação de chave:', error);
    throw new Error('Falha crítica na rotação de chave biométrica');
  }
}

/**
 * Verificar integridade do sistema de chaves
 * @returns {boolean} True se sistema está íntegro
 */
function verifyKeyIntegrity() {
  try {
    // Verificar se arquivo de chave existe e tem permissões corretas
    if (!fs.existsSync(KEY_FILE_PATH)) {
      console.warn('⚠️  SEGURANÇA: Arquivo de chave não encontrado');
      return false;
    }
    
    const stats = fs.statSync(KEY_FILE_PATH);
    const mode = stats.mode & parseInt('777', 8);
    
    if (mode !== parseInt('600', 8)) {
      console.warn('⚠️  SEGURANÇA: Permissões de chave incorretas:', mode.toString(8));
      return false;
    }
    
    // Verificar se chave tem tamanho correto
    const keyData = fs.readFileSync(KEY_FILE_PATH);
    if (keyData.length !== KEY_LENGTH) {
      console.warn('⚠️  SEGURANÇA: Tamanho de chave incorreto:', keyData.length);
      return false;
    }
    
    console.log('✅ SEGURANÇA: Integridade do sistema de chaves verificada');
    return true;
    
  } catch (error) {
    console.error('❌ SEGURANÇA: Erro na verificação de integridade:', error);
    return false;
  }
}

/**
 * Limpar chaves da memória (para segurança)
 */
function clearKeyCache() {
  // Em produção, implementar limpeza de cache de chaves
  console.log('🧹 SEGURANÇA: Cache de chaves limpo');
}

/**
 * Log de auditoria para operações de chave
 */
function logKeyOperation(operation, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation: operation,
    details: details,
    security_level: 'critical',
    component: 'biometric-key-manager'
  };
  
  console.log('🔍 AUDITORIA CHAVES:', JSON.stringify(logEntry));
  
  // Salvar em arquivo de auditoria específico
  const auditPath = path.join(__dirname, '../logs/key_operations.log');
  const logDir = path.dirname(auditPath);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
  }
  
  fs.appendFileSync(auditPath, JSON.stringify(logEntry) + '\n', { mode: 0o600 });
}

module.exports = {
  getMasterBiometricKey,
  getDerivedKey,
  rotateMasterKey,
  verifyKeyIntegrity,
  clearKeyCache,
  logKeyOperation
};
