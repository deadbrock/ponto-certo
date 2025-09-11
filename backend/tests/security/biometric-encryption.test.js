const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');

// Importar módulos de segurança biométrica
const {
  generateBiometricKey,
  encryptBiometricData,
  decryptBiometricData,
  encryptFaceImage,
  generateBiometricHash,
  validateBiometricIntegrity
} = require('../../src/utils/biometricSecurity');

const {
  getMasterBiometricKey,
  getDerivedKey,
  verifyKeyIntegrity
} = require('../../src/utils/biometricKeyManager');

describe('🔒 TESTES DE CRIPTOGRAFIA BIOMÉTRICA', () => {
  let testImagePath;
  let testKey;

  beforeAll(() => {
    // Criar imagem de teste
    testImagePath = path.join(__dirname, 'test-face.jpg');
    const testImageData = Buffer.from('fake-image-data-for-testing');
    fs.writeFileSync(testImagePath, testImageData);

    // Gerar chave de teste
    testKey = generateBiometricKey();
  });

  afterAll(() => {
    // Limpar arquivos de teste
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    const encryptedPath = testImagePath + '.enc';
    if (fs.existsSync(encryptedPath)) {
      fs.unlinkSync(encryptedPath);
    }
  });

  describe('1. GERAÇÃO DE CHAVES', () => {
    test('Deve gerar chave mestra biométrica', () => {
      const masterKey = getMasterBiometricKey();
      
      expect(masterKey).toBeDefined();
      expect(Buffer.isBuffer(masterKey)).toBe(true);
      expect(masterKey.length).toBe(32); // 256 bits
    });

    test('Deve gerar chaves derivadas únicas', () => {
      const key1 = getDerivedKey('test-purpose', 'user1');
      const key2 = getDerivedKey('test-purpose', 'user2');
      const key3 = getDerivedKey('different-purpose', 'user1');
      
      expect(Buffer.isBuffer(key1)).toBe(true);
      expect(Buffer.isBuffer(key2)).toBe(true);
      expect(Buffer.isBuffer(key3)).toBe(true);
      
      // Chaves devem ser diferentes
      expect(key1.equals(key2)).toBe(false);
      expect(key1.equals(key3)).toBe(false);
      expect(key2.equals(key3)).toBe(false);
    });

    test('Deve verificar integridade do sistema de chaves', () => {
      const integrity = verifyKeyIntegrity();
      expect(integrity).toBe(true);
    });
  });

  describe('2. CRIPTOGRAFIA DE DADOS', () => {
    test('Deve criptografar dados biométricos', () => {
      const testData = 'dados-biometricos-sensiveis';
      const encrypted = encryptBiometricData(testData, testKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    test('Deve descriptografar dados corretamente', () => {
      const originalData = 'dados-biometricos-para-teste';
      const encrypted = encryptBiometricData(originalData, testKey);
      const decrypted = decryptBiometricData(encrypted, testKey);
      
      expect(decrypted).toBe(originalData);
    });

    test('Deve falhar com chave incorreta', () => {
      const originalData = 'dados-secretos';
      const wrongKey = generateBiometricKey();
      const encrypted = encryptBiometricData(originalData, testKey);
      
      expect(() => {
        decryptBiometricData(encrypted, wrongKey);
      }).toThrow();
    });
  });

  describe('3. CRIPTOGRAFIA DE IMAGENS', () => {
    test('Deve criptografar arquivo de imagem', () => {
      const encryptedPath = encryptFaceImage(testImagePath, testKey);
      
      expect(encryptedPath).toBeDefined();
      expect(encryptedPath).toBe(testImagePath + '.enc');
      expect(fs.existsSync(encryptedPath)).toBe(true);
      
      // Arquivo original deve ter sido removido
      expect(fs.existsSync(testImagePath)).toBe(false);
    });

    test('Deve gerar hash único para dados', () => {
      const data1 = 'dados-teste-1';
      const data2 = 'dados-teste-2';
      
      const hash1 = generateBiometricHash(data1);
      const hash2 = generateBiometricHash(data2);
      const hash3 = generateBiometricHash(data1); // Mesmo dado
      
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2); // Hashes diferentes
      expect(hash1).toBe(hash3); // Hash consistente
    });

    test('Deve validar integridade de dados', () => {
      const testData = 'dados-para-validacao';
      const hash = generateBiometricHash(testData);
      
      expect(validateBiometricIntegrity(testData, hash)).toBe(true);
      expect(validateBiometricIntegrity('dados-alterados', hash)).toBe(false);
    });
  });

  describe('4. SEGURANÇA E PROTEÇÃO', () => {
    test('Deve usar algoritmo AES-256-GCM', () => {
      const testData = 'teste-algoritmo';
      const encrypted = encryptBiometricData(testData, testKey);
      
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    test('Deve gerar IV único para cada criptografia', () => {
      const testData = 'mesmo-dado';
      const encrypted1 = encryptBiometricData(testData, testKey);
      const encrypted2 = encryptBiometricData(testData, testKey);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    test('Deve incluir tag de autenticação', () => {
      const testData = 'dados-com-autenticacao';
      const encrypted = encryptBiometricData(testData, testKey);
      
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.tag.length).toBeGreaterThan(0);
    });

    test('Deve falhar com tag de autenticação inválida', () => {
      const testData = 'dados-teste';
      const encrypted = encryptBiometricData(testData, testKey);
      
      // Corromper tag
      encrypted.tag = 'tag-invalida';
      
      expect(() => {
        decryptBiometricData(encrypted, testKey);
      }).toThrow();
    });
  });

  describe('5. PERFORMANCE E LIMITES', () => {
    test('Deve processar dados grandes eficientemente', () => {
      const largeData = 'x'.repeat(10000); // 10KB de dados
      const startTime = Date.now();
      
      const encrypted = encryptBiometricData(largeData, testKey);
      const decrypted = decryptBiometricData(encrypted, testKey);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(decrypted).toBe(largeData);
      expect(processingTime).toBeLessThan(1000); // Menos de 1 segundo
    });

    test('Deve lidar com dados vazios', () => {
      const emptyData = '';
      const encrypted = encryptBiometricData(emptyData, testKey);
      const decrypted = decryptBiometricData(encrypted, testKey);
      
      expect(decrypted).toBe(emptyData);
    });
  });

  describe('6. INTEGRAÇÃO COM SISTEMA', () => {
    test('Deve gerar nomes de arquivo seguros', () => {
      const testInput = 'colaborador123_1234567890';
      const hash = generateBiometricHash(testInput);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(hash.length).toBe(64);
    });

    test('Deve derivar chaves consistentemente', () => {
      const key1 = getDerivedKey('face-recognition', '123');
      const key2 = getDerivedKey('face-recognition', '123');
      const key3 = getDerivedKey('face-recognition', '456');
      
      expect(key1.equals(key2)).toBe(true); // Mesma derivação
      expect(key1.equals(key3)).toBe(false); // Derivação diferente
    });
  });
});

describe('🔍 TESTES DE AUDITORIA BIOMÉTRICA', () => {
  test('Deve logar operações de criptografia', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const testData = 'dados-para-auditoria';
    encryptBiometricData(testData, generateBiometricKey());
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('Deve logar operações de chave', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    getDerivedKey('test-audit', 'user123');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('🚨 TESTES DE FALHAS E RECUPERAÇÃO', () => {
  test('Deve lidar com arquivo inexistente', () => {
    const nonExistentPath = '/path/que/nao/existe.jpg';
    
    expect(() => {
      encryptFaceImage(nonExistentPath, testKey);
    }).toThrow();
  });

  test('Deve lidar com dados corrompidos', () => {
    const corruptedData = {
      encrypted: 'dados-corrompidos',
      iv: 'iv-invalido',
      tag: 'tag-invalida',
      algorithm: 'aes-256-gcm'
    };
    
    expect(() => {
      decryptBiometricData(corruptedData, testKey);
    }).toThrow();
  });

  test('Deve validar entrada de dados', () => {
    expect(() => {
      encryptBiometricData(null, testKey);
    }).toThrow();
    
    expect(() => {
      encryptBiometricData('dados', null);
    }).toThrow();
  });
});
