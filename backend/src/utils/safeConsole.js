/**
 * CONSOLE SEGURO COM MASCARAMENTO AUTOMÁTICO
 * Substitui console.log/error/warn com versão LGPD compliant
 */

const { mask, containsSensitiveData } = require('./dataMasking');

class SafeConsole {
  constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    // Flag para desenvolvimento (permite logs mais detalhados)
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Processa argumentos aplicando mascaramento quando necessário
   * @param {Array} args - Argumentos do console
   * @returns {Array} - Argumentos mascarados
   */
  processArgs(args) {
    return args.map(arg => {
      // Se for string e contém dados sensíveis, mascarar
      if (typeof arg === 'string' && containsSensitiveData(arg)) {
        return mask(arg);
      }
      
      // Se for objeto, mascarar completamente
      if (typeof arg === 'object' && arg !== null) {
        return mask(arg);
      }
      
      return arg;
    });
  }

  /**
   * Log seguro
   * @param {...any} args - Argumentos a serem logados
   */
  log(...args) {
    const maskedArgs = this.processArgs(args);
    this.originalConsole.log(...maskedArgs);
  }

  /**
   * Error seguro
   * @param {...any} args - Argumentos a serem logados
   */
  error(...args) {
    const maskedArgs = this.processArgs(args);
    this.originalConsole.error(...maskedArgs);
  }

  /**
   * Warn seguro
   * @param {...any} args - Argumentos a serem logados
   */
  warn(...args) {
    const maskedArgs = this.processArgs(args);
    this.originalConsole.warn(...maskedArgs);
  }

  /**
   * Info seguro
   * @param {...any} args - Argumentos a serem logados
   */
  info(...args) {
    const maskedArgs = this.processArgs(args);
    this.originalConsole.info(...maskedArgs);
  }

  /**
   * Debug seguro (apenas em desenvolvimento)
   * @param {...any} args - Argumentos a serem logados
   */
  debug(...args) {
    if (this.isDevelopment) {
      const maskedArgs = this.processArgs(args);
      this.originalConsole.debug(...maskedArgs);
    }
  }

  /**
   * Log de desenvolvimento (sem mascaramento, apenas em dev)
   * @param {...any} args - Argumentos a serem logados
   */
  devLog(...args) {
    if (this.isDevelopment) {
      this.originalConsole.log('[DEV]', ...args);
    }
  }

  /**
   * Log de CPF mascarado (função de conveniência)
   * @param {string} message - Mensagem
   * @param {string} cpf - CPF a ser mascarado
   * @param {...any} args - Outros argumentos
   */
  logCPF(message, cpf, ...args) {
    const maskedArgs = this.processArgs([message, cpf, ...args]);
    this.originalConsole.log(...maskedArgs);
  }

  /**
   * Restaurar console original (para casos específicos)
   */
  restore() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  /**
   * Substituir console global por versão segura
   */
  override() {
    console.log = this.log.bind(this);
    console.error = this.error.bind(this);
    console.warn = this.warn.bind(this);
    console.info = this.info.bind(this);
    console.debug = this.debug.bind(this);
    
    // Adicionar métodos seguros
    console.logCPF = this.logCPF.bind(this);
    console.devLog = this.devLog.bind(this);
    
    console.log('🔒 Console seguro ativado - dados sensíveis serão mascarados');
  }
}

// Instância singleton
const safeConsole = new SafeConsole();

module.exports = {
  SafeConsole,
  safeConsole,
  
  // Funções de conveniência
  enableSafeConsole: () => safeConsole.override(),
  disableSafeConsole: () => safeConsole.restore(),
  
  // Logs seguros diretos
  safeLog: (...args) => safeConsole.log(...args),
  safeError: (...args) => safeConsole.error(...args),
  safeWarn: (...args) => safeConsole.warn(...args),
  safeInfo: (...args) => safeConsole.info(...args),
  safeDebug: (...args) => safeConsole.debug(...args),
  logCPF: (message, cpf, ...args) => safeConsole.logCPF(message, cpf, ...args)
};
