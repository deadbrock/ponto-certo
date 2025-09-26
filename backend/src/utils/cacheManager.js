/**
 * 🧠 GERENCIADOR DE CACHE INTELIGENTE
 * 
 * Sistema avançado de cache multi-camada com invalidação inteligente,
 * compressão, persistência e análise de padrões de uso
 */

const NodeCache = require('node-cache');
let Redis = null;
try {
  // Carrega redis apenas se o módulo existir no ambiente
  // Evita quebra em ambientes sem Redis
  Redis = require('redis');
} catch (e) {
  Redis = null;
}
const crypto = require('crypto');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

class CacheManager {
  constructor() {
    // Cache L1 - Memória local (mais rápido)
    this.l1Cache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 60,
      useClones: false,
      maxKeys: 2000
    });

    // Cache L2 - Redis (compartilhado entre instâncias)
    this.l2Cache = null;
    this.redisConnected = false;

    // Cache L3 - Disco (persistente)
    this.l3CachePath = path.join(__dirname, '..', 'cache');
    this.ensureCacheDirectory();

    // Configurações por tipo de cache
    this.cacheConfigs = {
      dashboard: {
        ttl: 60, // 1 minuto
        compress: false,
        persistent: false,
        invalidateOn: ['registros_ponto', 'colaboradores']
      },
      reports: {
        ttl: 900, // 15 minutos
        compress: true,
        persistent: true,
        invalidateOn: ['registros_ponto']
      },
      analytics: {
        ttl: 600, // 10 minutos
        compress: true,
        persistent: true,
        invalidateOn: ['registros_ponto', 'colaboradores']
      },
      auth: {
        ttl: 1800, // 30 minutos
        compress: false,
        persistent: false,
        invalidateOn: ['usuarios', 'sessions']
      },
      static: {
        ttl: 3600, // 1 hora
        compress: true,
        persistent: true,
        invalidateOn: []
      },
      queries: {
        ttl: 300, // 5 minutos
        compress: true,
        persistent: false,
        invalidateOn: ['*'] // Invalidado por qualquer mudança
      }
    };

    // Métricas de cache
    this.metrics = {
      l1: { hits: 0, misses: 0, sets: 0 },
      l2: { hits: 0, misses: 0, sets: 0 },
      l3: { hits: 0, misses: 0, sets: 0 },
      compressionRatio: 0,
      totalSize: 0
    };

    // Padrões de uso
    this.usagePatterns = new Map();
    this.hotKeys = new Set();

    // Inicializar sistema
    this.initialize();
  }

  /**
   * Inicializar sistema de cache
   */
  async initialize() {
    try {
      // Tentar conectar ao Redis
      await this.initializeRedis();
      
      // Configurar limpeza automática
      this.setupCleanupTasks();
      
      // Carregar padrões de uso salvos
      this.loadUsagePatterns();
      
      console.log('🧠 Cache Manager inicializado com sucesso');
    } catch (error) {
      console.warn('⚠️ Cache Manager inicializado sem Redis:', error.message);
    }
  }

  /**
   * Inicializar Redis
   */
  async initializeRedis() {
    try {
      if (!Redis) {
        throw new Error('módulo redis não instalado');
      }
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.l2Cache = Redis.createClient({ url: redisUrl });
      
      // Rate limiting para erros de Redis
      let lastRedisErrorAt = 0;
      this.l2Cache.on('error', (err) => {
        const now = Date.now();
        if (now - lastRedisErrorAt > 5000) { // no máximo 1 log a cada 5s
          console.warn('⚠️ Redis error:', err?.code || err?.message || err);
          lastRedisErrorAt = now;
        }
        // Desabilita L2 se conexão recusada
        if (err && (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED'))) {
          this.redisConnected = false;
          // Tenta um backoff simples: desconecta cliente
          try { this.l2Cache.disconnect().catch(()=>{}); } catch(e) {}
          this.l2Cache = null;
        }
      });

      this.l2Cache.on('connect', () => {
        console.log('🔗 Redis conectado');
        this.redisConnected = true;
      });

      await this.l2Cache.connect();
    } catch (error) {
      // Silenciar ruído em produção e seguir sem Redis
      console.warn('⚠️ Redis não disponível:', error?.code || error?.message || String(error));
      this.l2Cache = null;
      this.redisConnected = false;
    }
  }

  /**
   * Obter dados do cache (multi-camada)
   */
  async get(key, type = 'default') {
    const config = this.cacheConfigs[type] || this.cacheConfigs.queries;
    const startTime = Date.now();

    try {
      // Registrar padrão de uso
      this.recordUsagePattern(key, 'get');

      // L1 Cache (memória local)
      const l1Data = this.l1Cache.get(key);
      if (l1Data !== undefined) {
        this.metrics.l1.hits++;
        this.updateHotKeys(key);
        return this.deserializeData(l1Data);
      }
      this.metrics.l1.misses++;

      // L2 Cache (Redis)
      if (this.redisConnected && this.l2Cache) {
        try {
          const l2Data = await this.l2Cache.get(key);
          if (l2Data) {
            this.metrics.l2.hits++;
            
            // Promover para L1
            const deserializedData = this.deserializeData(l2Data);
            this.l1Cache.set(key, l2Data, config.ttl);
            
            this.updateHotKeys(key);
            return deserializedData;
          }
        } catch (error) {
          console.warn('⚠️ Erro no L2 cache:', error);
        }
      }
      this.metrics.l2.misses++;

      // L3 Cache (disco) - apenas se persistente
      if (config.persistent) {
        const l3Data = await this.getFromDisk(key);
        if (l3Data) {
          this.metrics.l3.hits++;
          
          // Promover para L1 e L2
          const serializedData = this.serializeData(l3Data);
          this.l1Cache.set(key, serializedData, config.ttl);
          
          if (this.redisConnected && this.l2Cache) {
            await this.l2Cache.setEx(key, config.ttl, serializedData);
          }
          
          return l3Data;
        }
      }
      this.metrics.l3.misses++;

      return null;

    } catch (error) {
      console.error('❌ Erro ao obter do cache:', error);
      return null;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 50) { // Log apenas operações lentas
        console.warn(`🐌 Cache GET lento: ${key} (${duration}ms)`);
      }
    }
  }

  /**
   * Armazenar dados no cache (multi-camada)
   */
  async set(key, data, type = 'default', customTTL = null) {
    const config = this.cacheConfigs[type] || this.cacheConfigs.queries;
    const ttl = customTTL || config.ttl;
    const startTime = Date.now();

    try {
      // Registrar padrão de uso
      this.recordUsagePattern(key, 'set');

      // Serializar dados
      const serializedData = this.serializeData(data);
      const compressedData = config.compress ? 
        await this.compressData(serializedData) : serializedData;

      // L1 Cache (sempre)
      this.l1Cache.set(key, compressedData, ttl);
      this.metrics.l1.sets++;

      // L2 Cache (Redis se disponível)
      if (this.redisConnected && this.l2Cache) {
        try {
          await this.l2Cache.setEx(key, ttl, compressedData);
          this.metrics.l2.sets++;
        } catch (error) {
          console.warn('⚠️ Erro ao salvar no L2 cache:', error);
        }
      }

      // L3 Cache (disco se persistente)
      if (config.persistent) {
        await this.saveToDisk(key, data, ttl);
        this.metrics.l3.sets++;
      }

      // Atualizar métricas de tamanho
      this.updateSizeMetrics(key, serializedData, compressedData);

      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar no cache:', error);
      return false;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 100) { // Log apenas operações lentas
        console.warn(`🐌 Cache SET lento: ${key} (${duration}ms)`);
      }
    }
  }

  /**
   * Invalidar cache por padrão ou tipo
   */
  async invalidate(pattern = null, type = null, table = null) {
    try {
      let keysToDelete = [];

      if (table) {
        // Invalidar baseado em mudanças na tabela
        keysToDelete = this.getKeysToInvalidateByTable(table);
      } else if (pattern) {
        // Invalidar por padrão
        keysToDelete = this.getKeysByPattern(pattern);
      } else if (type) {
        // Invalidar por tipo
        keysToDelete = this.getKeysByType(type);
      } else {
        // Invalidar tudo
        keysToDelete = [...this.l1Cache.keys()];
      }

      // Invalidar em todas as camadas
      for (const key of keysToDelete) {
        // L1
        this.l1Cache.del(key);
        
        // L2
        if (this.redisConnected && this.l2Cache) {
          await this.l2Cache.del(key);
        }
        
        // L3
        await this.deleteFromDisk(key);
      }

      console.log(`🗑️ Cache invalidado: ${keysToDelete.length} chaves`);
      return keysToDelete.length;

    } catch (error) {
      console.error('❌ Erro ao invalidar cache:', error);
      return 0;
    }
  }

  /**
   * Middleware de cache para Express
   */
  middleware(type = 'default', customTTL = null) {
    return async (req, res, next) => {
      const cacheKey = this.generateCacheKey(req, type);
      
      try {
        // Tentar obter do cache
        const cachedData = await this.get(cacheKey, type);
        
        if (cachedData) {
          // Cache hit
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-Type': type
          });
          
          return res.json(cachedData);
        }

        // Cache miss - interceptar resposta
        const originalJson = res.json;
        res.json = async (data) => {
          // Cachear apenas respostas de sucesso
          if (res.statusCode === 200 && data && data.success !== false) {
            await this.set(cacheKey, data, type, customTTL);
          }
          
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'X-Cache-Type': type
          });
          
          return originalJson.call(res, data);
        };

        next();

      } catch (error) {
        console.error('❌ Erro no middleware de cache:', error);
        next();
      }
    };
  }

  /**
   * Gerar chave de cache
   */
  generateCacheKey(req, type) {
    const baseKey = `${type}_${req.method}_${req.path}`;
    const queryString = JSON.stringify(req.query || {});
    const bodyString = req.method !== 'GET' ? JSON.stringify(req.body || {}) : '';
    const userContext = req.user?.id || 'anonymous';
    
    const hash = crypto
      .createHash('md5')
      .update(baseKey + queryString + bodyString + userContext)
      .digest('hex');
      
    return `${baseKey}_${hash}`.substring(0, 64);
  }

  /**
   * Serializar dados
   */
  serializeData(data) {
    try {
      return JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      });
    } catch (error) {
      console.error('❌ Erro ao serializar dados:', error);
      return null;
    }
  }

  /**
   * Deserializar dados
   */
  deserializeData(serializedData) {
    try {
      if (typeof serializedData === 'string') {
        const parsed = JSON.parse(serializedData);
        return parsed.data;
      }
      return serializedData;
    } catch (error) {
      console.error('❌ Erro ao deserializar dados:', error);
      return null;
    }
  }

  /**
   * Comprimir dados
   */
  async compressData(data) {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * Descomprimir dados
   */
  async decompressData(compressedData) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressedData, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed.toString());
      });
    });
  }

  /**
   * Salvar no disco (L3)
   */
  async saveToDisk(key, data, ttl) {
    try {
      const filePath = path.join(this.l3CachePath, `${key}.cache`);
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl: ttl * 1000, // Converter para ms
        expiresAt: Date.now() + (ttl * 1000)
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ Erro ao salvar cache no disco:', error);
    }
  }

  /**
   * Obter do disco (L3)
   */
  async getFromDisk(key) {
    try {
      const filePath = path.join(this.l3CachePath, `${key}.cache`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const cacheData = JSON.parse(fileContent);
      
      // Verificar se não expirou
      if (Date.now() > cacheData.expiresAt) {
        await this.deleteFromDisk(key);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error('❌ Erro ao ler cache do disco:', error);
      return null;
    }
  }

  /**
   * Deletar do disco
   */
  async deleteFromDisk(key) {
    try {
      const filePath = path.join(this.l3CachePath, `${key}.cache`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar cache do disco:', error);
    }
  }

  /**
   * Obter chaves por padrão
   */
  getKeysByPattern(pattern) {
    const allKeys = this.l1Cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Obter chaves por tipo
   */
  getKeysByType(type) {
    const allKeys = this.l1Cache.keys();
    return allKeys.filter(key => key.startsWith(`${type}_`));
  }

  /**
   * Obter chaves para invalidar por tabela
   */
  getKeysToInvalidateByTable(table) {
    const keysToInvalidate = [];
    
    for (const [type, config] of Object.entries(this.cacheConfigs)) {
      if (config.invalidateOn.includes(table) || config.invalidateOn.includes('*')) {
        keysToInvalidate.push(...this.getKeysByType(type));
      }
    }
    
    return [...new Set(keysToInvalidate)]; // Remover duplicatas
  }

  /**
   * Registrar padrão de uso
   */
  recordUsagePattern(key, operation) {
    if (!this.usagePatterns.has(key)) {
      this.usagePatterns.set(key, {
        gets: 0,
        sets: 0,
        lastAccess: Date.now(),
        frequency: 0
      });
    }
    
    const pattern = this.usagePatterns.get(key);
    pattern[operation === 'get' ? 'gets' : 'sets']++;
    pattern.lastAccess = Date.now();
    pattern.frequency = pattern.gets + pattern.sets;
  }

  /**
   * Atualizar chaves quentes
   */
  updateHotKeys(key) {
    const pattern = this.usagePatterns.get(key);
    if (pattern && pattern.frequency > 10) {
      this.hotKeys.add(key);
    }
  }

  /**
   * Atualizar métricas de tamanho
   */
  updateSizeMetrics(key, original, compressed) {
    if (compressed && compressed !== original) {
      const originalSize = Buffer.byteLength(original, 'utf8');
      const compressedSize = Buffer.byteLength(compressed);
      
      this.metrics.compressionRatio = compressedSize / originalSize;
      this.metrics.totalSize += compressedSize;
    }
  }

  /**
   * Configurar tarefas de limpeza
   */
  setupCleanupTasks() {
    // Limpeza de cache L3 expirado a cada hora
    setInterval(async () => {
      await this.cleanupExpiredDiskCache();
    }, 3600000); // 1 hora

    // Salvar padrões de uso a cada 10 minutos
    setInterval(() => {
      this.saveUsagePatterns();
    }, 600000); // 10 minutos

    // Otimização de hot keys a cada 5 minutos
    setInterval(() => {
      this.optimizeHotKeys();
    }, 300000); // 5 minutos
  }

  /**
   * Limpar cache L3 expirado
   */
  async cleanupExpiredDiskCache() {
    try {
      const files = await fs.promises.readdir(this.l3CachePath);
      let cleanedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.l3CachePath, file);
          const stats = await fs.promises.stat(filePath);
          
          try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const cacheData = JSON.parse(content);
            
            if (Date.now() > cacheData.expiresAt) {
              await fs.promises.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // Arquivo corrompido, deletar
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cache L3 limpo: ${cleanedCount} arquivos removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza do cache L3:', error);
    }
  }

  /**
   * Salvar padrões de uso
   */
  saveUsagePatterns() {
    try {
      const patternsPath = path.join(this.l3CachePath, 'usage-patterns.json');
      const patternsData = {
        patterns: Object.fromEntries(this.usagePatterns),
        hotKeys: Array.from(this.hotKeys),
        timestamp: Date.now()
      };
      
      fs.writeFileSync(patternsPath, JSON.stringify(patternsData, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar padrões de uso:', error);
    }
  }

  /**
   * Carregar padrões de uso
   */
  loadUsagePatterns() {
    try {
      const patternsPath = path.join(this.l3CachePath, 'usage-patterns.json');
      
      if (fs.existsSync(patternsPath)) {
        const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
        
        this.usagePatterns = new Map(Object.entries(patternsData.patterns));
        this.hotKeys = new Set(patternsData.hotKeys);
        
        console.log(`📊 Padrões de uso carregados: ${this.usagePatterns.size} chaves`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar padrões de uso:', error);
    }
  }

  /**
   * Otimizar hot keys
   */
  optimizeHotKeys() {
    // Aumentar TTL para chaves quentes
    for (const hotKey of this.hotKeys) {
      const data = this.l1Cache.get(hotKey);
      if (data) {
        this.l1Cache.ttl(hotKey, 600); // 10 minutos para hot keys
      }
    }
  }

  /**
   * Garantir diretório de cache
   */
  ensureCacheDirectory() {
    if (!fs.existsSync(this.l3CachePath)) {
      fs.mkdirSync(this.l3CachePath, { recursive: true });
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    const l1Stats = this.l1Cache.getStats();
    
    return {
      l1: {
        ...this.metrics.l1,
        keys: this.l1Cache.keys().length,
        ksize: l1Stats.ksize,
        vsize: l1Stats.vsize
      },
      l2: {
        ...this.metrics.l2,
        connected: this.redisConnected
      },
      l3: this.metrics.l3,
      overall: {
        hitRate: this.calculateOverallHitRate(),
        compressionRatio: this.metrics.compressionRatio,
        totalSize: this.metrics.totalSize,
        hotKeys: this.hotKeys.size
      },
      patterns: {
        totalKeys: this.usagePatterns.size,
        mostUsed: this.getMostUsedKeys(5)
      }
    };
  }

  /**
   * Calcular taxa de hit geral
   */
  calculateOverallHitRate() {
    const totalHits = this.metrics.l1.hits + this.metrics.l2.hits + this.metrics.l3.hits;
    const totalMisses = this.metrics.l1.misses + this.metrics.l2.misses + this.metrics.l3.misses;
    const total = totalHits + totalMisses;
    
    return total > 0 ? Math.round((totalHits / total) * 100) : 0;
  }

  /**
   * Obter chaves mais usadas
   */
  getMostUsedKeys(limit = 5) {
    return Array.from(this.usagePatterns.entries())
      .sort(([,a], [,b]) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(([key, pattern]) => ({ key, frequency: pattern.frequency }));
  }

  /**
   * Limpar todas as camadas de cache
   */
  async clear() {
    try {
      // L1
      this.l1Cache.flushAll();
      
      // L2
      if (this.redisConnected && this.l2Cache) {
        await this.l2Cache.flushDb();
      }
      
      // L3
      const files = await fs.promises.readdir(this.l3CachePath);
      for (const file of files) {
        if (file.endsWith('.cache')) {
          await fs.promises.unlink(path.join(this.l3CachePath, file));
        }
      }
      
      console.log('🗑️ Todas as camadas de cache foram limpas');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
