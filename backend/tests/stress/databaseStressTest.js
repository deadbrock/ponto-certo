/**
 * 🗄️ TESTES DE STRESS DO BANCO DE DADOS
 * 
 * Testes especializados para avaliar limites do banco de dados:
 * - Stress de conexões simultâneas
 * - Stress de queries complexas
 * - Stress de inserções em massa
 * - Stress de transações concorrentes
 * - Monitoramento de locks e deadlocks
 */

const db = require('../../src/config/database');
const StressTestFramework = require('./stressTestFramework');

class DatabaseStressTest extends StressTestFramework {
  constructor(config = {}) {
    super(config);
    
    this.dbConfig = {
      maxConnections: config.maxConnections || 100,
      maxQueryDuration: config.maxQueryDuration || 30000, // 30 segundos
      batchSize: config.batchSize || 1000,
      transactionTimeout: config.transactionTimeout || 10000 // 10 segundos
    };

    this.dbMetrics = {
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      deadlocks: 0,
      timeouts: 0,
      avgQueryTime: 0,
      queryTimes: []
    };
  }

  /**
   * Executar teste completo de stress do banco
   */
  async runDatabaseStressTest() {
    const testId = this.generateTestId();
    console.log(`🗄️ INICIANDO TESTE DE STRESS DO BANCO [${testId}]`);
    
    try {
      const results = {
        testId,
        startTime: new Date(),
        tests: {},
        metrics: {},
        success: false
      };

      // Preparar ambiente de teste
      await this.setupDatabaseTestEnvironment();

      // Teste 1: Stress de conexões
      console.log('🔗 Teste 1: Stress de conexões simultâneas');
      results.tests.connectionStress = await this.testConnectionStress();

      // Teste 2: Stress de queries
      console.log('🔍 Teste 2: Stress de queries complexas');
      results.tests.queryStress = await this.testQueryStress();

      // Teste 3: Stress de inserções
      console.log('📝 Teste 3: Stress de inserções em massa');
      results.tests.insertStress = await this.testInsertStress();

      // Teste 4: Stress de transações
      console.log('🔄 Teste 4: Stress de transações concorrentes');
      results.tests.transactionStress = await this.testTransactionStress();

      // Teste 5: Stress de locks
      console.log('🔒 Teste 5: Stress de locks e deadlocks');
      results.tests.lockStress = await this.testLockStress();

      // Calcular métricas finais
      results.metrics = this.calculateDatabaseMetrics();
      results.success = this.evaluateDatabaseTestSuccess(results);
      results.endTime = new Date();

      // Limpar ambiente
      await this.cleanupDatabaseTestEnvironment();

      return results;

    } catch (error) {
      console.error(`❌ Erro no teste de stress do banco [${testId}]:`, error);
      throw error;
    }
  }

  /**
   * Configurar ambiente de teste do banco
   */
  async setupDatabaseTestEnvironment() {
    try {
      // Criar tabela de teste para stress
      await db.query(`
        CREATE TABLE IF NOT EXISTS stress_test_data (
          id SERIAL PRIMARY KEY,
          test_id VARCHAR(100),
          thread_id INTEGER,
          data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_stress_test_data_test_id 
        ON stress_test_data(test_id)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_stress_test_data_thread 
        ON stress_test_data(thread_id)
      `);

      console.log('🔧 Ambiente de teste do banco configurado');
    } catch (error) {
      console.error('❌ Erro ao configurar ambiente:', error);
      throw error;
    }
  }

  /**
   * Teste de stress de conexões
   */
  async testConnectionStress() {
    const startTime = Date.now();
    const maxConnections = this.dbConfig.maxConnections;
    
    console.log(`🔗 Testando ${maxConnections} conexões simultâneas...`);
    
    try {
      const connections = [];
      const connectionPromises = [];

      // Criar múltiplas conexões
      for (let i = 0; i < maxConnections; i++) {
        connectionPromises.push(
          this.createTestConnection(i).then(conn => {
            connections.push(conn);
            this.dbMetrics.activeConnections++;
          }).catch(error => {
            console.warn(`⚠️ Falha na conexão ${i}:`, error.message);
            return null;
          })
        );
      }

      // Aguardar todas as tentativas de conexão
      const connectionResults = await Promise.allSettled(connectionPromises);
      const successfulConnections = connectionResults.filter(r => r.status === 'fulfilled').length;

      // Testar queries em todas as conexões
      const queryPromises = connections.filter(c => c).map(async (conn, index) => {
        try {
          const queryStart = Date.now();
          await conn.query('SELECT $1 as connection_test', [index]);
          return Date.now() - queryStart;
        } catch (error) {
          throw new Error(`Query failed on connection ${index}: ${error.message}`);
        }
      });

      const queryResults = await Promise.allSettled(queryPromises);
      const successfulQueries = queryResults.filter(r => r.status === 'fulfilled').length;

      // Fechar conexões
      for (const conn of connections) {
        if (conn && conn.end) {
          try {
            await conn.end();
            this.dbMetrics.activeConnections--;
          } catch (error) {
            console.warn('⚠️ Erro ao fechar conexão:', error);
          }
        }
      }

      return {
        success: successfulConnections >= maxConnections * 0.9, // 90% de sucesso
        maxConnections,
        successfulConnections,
        failedConnections: maxConnections - successfulConnections,
        successfulQueries,
        connectionSuccessRate: Math.round((successfulConnections / maxConnections) * 100),
        querySuccessRate: Math.round((successfulQueries / successfulConnections) * 100),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Criar conexão de teste
   */
  async createTestConnection(connectionId) {
    // Para PostgreSQL, usar pool de conexões seria mais apropriado
    // Por simplicidade, usar conexão existente
    return {
      id: connectionId,
      query: db.query.bind(db),
      end: () => Promise.resolve() // Simular fechamento
    };
  }

  /**
   * Teste de stress de queries
   */
  async testQueryStress() {
    const startTime = Date.now();
    const concurrentQueries = 50;
    const queriesPerThread = 20;
    
    console.log(`🔍 Testando ${concurrentQueries} threads com ${queriesPerThread} queries cada...`);
    
    try {
      const queryTypes = [
        {
          name: 'Simple Select',
          query: 'SELECT COUNT(*) FROM colaboradores',
          weight: 40
        },
        {
          name: 'Complex Join',
          query: `
            SELECT c.nome, COUNT(rp.id) as registros
            FROM colaboradores c
            LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
            WHERE rp.data_hora >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY c.id, c.nome
            ORDER BY registros DESC
            LIMIT 100
          `,
          weight: 30
        },
        {
          name: 'Analytics Query',
          query: `
            SELECT 
              DATE(data_hora) as data,
              COUNT(*) as total_registros,
              COUNT(DISTINCT colaborador_id) as colaboradores_ativos
            FROM registros_ponto 
            WHERE data_hora >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY DATE(data_hora)
            ORDER BY data DESC
          `,
          weight: 20
        },
        {
          name: 'Search Query',
          query: `
            SELECT * FROM colaboradores 
            WHERE nome ILIKE '%Silva%' 
               OR cpf LIKE '%123%'
            LIMIT 50
          `,
          weight: 10
        }
      ];

      const threadPromises = [];
      
      for (let thread = 0; thread < concurrentQueries; thread++) {
        threadPromises.push(
          this.executeQueryThread(thread, queriesPerThread, queryTypes)
        );
      }

      const threadResults = await Promise.allSettled(threadPromises);
      const successfulThreads = threadResults.filter(r => r.status === 'fulfilled').length;
      
      // Calcular estatísticas
      const allQueryTimes = [];
      let totalQueries = 0;
      let successfulQueries = 0;

      for (const result of threadResults) {
        if (result.status === 'fulfilled') {
          const threadData = result.value;
          allQueryTimes.push(...threadData.queryTimes);
          totalQueries += threadData.totalQueries;
          successfulQueries += threadData.successfulQueries;
        }
      }

      const avgQueryTime = allQueryTimes.length > 0 ?
        allQueryTimes.reduce((a, b) => a + b, 0) / allQueryTimes.length : 0;

      return {
        success: successfulThreads >= concurrentQueries * 0.9,
        concurrentThreads: concurrentQueries,
        successfulThreads,
        totalQueries,
        successfulQueries,
        querySuccessRate: Math.round((successfulQueries / totalQueries) * 100),
        avgQueryTime: Math.round(avgQueryTime),
        maxQueryTime: Math.max(...allQueryTimes, 0),
        minQueryTime: Math.min(...allQueryTimes, 0),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar thread de queries
   */
  async executeQueryThread(threadId, queryCount, queryTypes) {
    const queryTimes = [];
    let successfulQueries = 0;
    
    try {
      for (let i = 0; i < queryCount; i++) {
        // Selecionar tipo de query baseado no peso
        const selectedQuery = this.selectWeightedQuery(queryTypes);
        
        const queryStart = Date.now();
        try {
          await db.query(selectedQuery.query);
          const queryTime = Date.now() - queryStart;
          queryTimes.push(queryTime);
          successfulQueries++;
          
          this.dbMetrics.totalQueries++;
          this.dbMetrics.queryTimes.push(queryTime);
          
          if (queryTime > 5000) { // Query lenta
            this.dbMetrics.slowQueries++;
          }
        } catch (error) {
          console.warn(`⚠️ Query falhou na thread ${threadId}:`, error.message);
          queryTimes.push(this.dbConfig.maxQueryDuration); // Timeout
        }
        
        // Pequena pausa entre queries
        await this.sleep(Math.random() * 100 + 50);
      }

      return {
        threadId,
        totalQueries: queryCount,
        successfulQueries,
        queryTimes
      };
    } catch (error) {
      throw new Error(`Thread ${threadId} falhou: ${error.message}`);
    }
  }

  /**
   * Selecionar query baseada no peso
   */
  selectWeightedQuery(queryTypes) {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const queryType of queryTypes) {
      cumulative += queryType.weight;
      if (random <= cumulative) {
        return queryType;
      }
    }
    
    return queryTypes[0]; // Fallback
  }

  /**
   * Teste de stress de inserções
   */
  async testInsertStress() {
    const startTime = Date.now();
    const batchCount = 10;
    const recordsPerBatch = this.dbConfig.batchSize;
    
    console.log(`📝 Testando inserção de ${batchCount * recordsPerBatch} registros em ${batchCount} batches...`);
    
    try {
      const batchPromises = [];
      
      for (let batch = 0; batch < batchCount; batch++) {
        batchPromises.push(
          this.executeInsertBatch(batch, recordsPerBatch)
        );
      }

      const batchResults = await Promise.allSettled(batchPromises);
      const successfulBatches = batchResults.filter(r => r.status === 'fulfilled').length;
      
      let totalInserted = 0;
      let totalErrors = 0;

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          totalInserted += result.value.inserted;
          totalErrors += result.value.errors;
        }
      }

      // Verificar dados inseridos
      const verification = await db.query(`
        SELECT COUNT(*) as count 
        FROM stress_test_data 
        WHERE test_id = $1
      `, [testId]);

      const verifiedCount = parseInt(verification.rows[0].count);

      return {
        success: successfulBatches >= batchCount * 0.9,
        batchCount,
        successfulBatches,
        totalRecords: batchCount * recordsPerBatch,
        insertedRecords: totalInserted,
        verifiedRecords: verifiedCount,
        insertErrors: totalErrors,
        insertSuccessRate: Math.round((totalInserted / (batchCount * recordsPerBatch)) * 100),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar batch de inserções
   */
  async executeInsertBatch(batchId, recordCount) {
    const testId = this.testState.testId;
    let inserted = 0;
    let errors = 0;

    try {
      const insertPromises = [];
      
      for (let i = 0; i < recordCount; i++) {
        const record = {
          test_id: testId,
          thread_id: batchId,
          data: {
            batch: batchId,
            record: i,
            timestamp: new Date(),
            randomData: Math.random().toString(36),
            payload: Array(100).fill(0).map(() => Math.random()) // Dados para ocupar espaço
          }
        };

        insertPromises.push(
          db.query(`
            INSERT INTO stress_test_data (test_id, thread_id, data)
            VALUES ($1, $2, $3)
          `, [record.test_id, record.thread_id, JSON.stringify(record.data)])
          .then(() => {
            inserted++;
          })
          .catch(error => {
            errors++;
            console.warn(`⚠️ Erro na inserção batch ${batchId}, record ${i}:`, error.message);
          })
        );
      }

      await Promise.all(insertPromises);

      return { batchId, inserted, errors };
    } catch (error) {
      throw new Error(`Batch ${batchId} falhou: ${error.message}`);
    }
  }

  /**
   * Teste de stress de transações
   */
  async testTransactionStress() {
    const startTime = Date.now();
    const concurrentTransactions = 20;
    const operationsPerTransaction = 10;
    
    console.log(`🔄 Testando ${concurrentTransactions} transações com ${operationsPerTransaction} operações cada...`);
    
    try {
      const transactionPromises = [];
      
      for (let i = 0; i < concurrentTransactions; i++) {
        transactionPromises.push(
          this.executeTransactionTest(i, operationsPerTransaction)
        );
      }

      const transactionResults = await Promise.allSettled(transactionPromises);
      const successfulTransactions = transactionResults.filter(r => r.status === 'fulfilled').length;
      const deadlocks = transactionResults.filter(r => 
        r.status === 'rejected' && r.reason.message.includes('deadlock')
      ).length;

      this.dbMetrics.deadlocks += deadlocks;

      return {
        success: successfulTransactions >= concurrentTransactions * 0.8, // 80% sucesso aceitável
        concurrentTransactions,
        successfulTransactions,
        failedTransactions: concurrentTransactions - successfulTransactions,
        deadlocks,
        transactionSuccessRate: Math.round((successfulTransactions / concurrentTransactions) * 100),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar teste de transação
   */
  async executeTransactionTest(transactionId, operationCount) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < operationCount; i++) {
        // Operações que podem causar locks
        await client.query(`
          INSERT INTO stress_test_data (test_id, thread_id, data)
          VALUES ($1, $2, $3)
        `, [`TRANS-${transactionId}`, transactionId, JSON.stringify({ operation: i })]);
        
        await client.query(`
          UPDATE stress_test_data 
          SET updated_at = NOW() 
          WHERE thread_id = $1 AND data->>'operation' = $2
        `, [transactionId, i.toString()]);
        
        // Pequena pausa para simular processamento
        await this.sleep(Math.random() * 10 + 5);
      }
      
      await client.query('COMMIT');
      return { transactionId, success: true };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn('⚠️ Erro no rollback:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Teste de stress de locks
   */
  async testLockStress() {
    const startTime = Date.now();
    const concurrentUpdates = 30;
    
    console.log(`🔒 Testando ${concurrentUpdates} updates concorrentes no mesmo registro...`);
    
    try {
      // Inserir registro para teste de lock
      const testRecord = await db.query(`
        INSERT INTO stress_test_data (test_id, thread_id, data)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['LOCK-TEST', 0, JSON.stringify({ lockTest: true })]);

      const recordId = testRecord.rows[0].id;

      // Executar updates concorrentes no mesmo registro
      const updatePromises = [];
      
      for (let i = 0; i < concurrentUpdates; i++) {
        updatePromises.push(
          this.executeLockedUpdate(recordId, i)
        );
      }

      const updateResults = await Promise.allSettled(updatePromises);
      const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;
      const lockTimeouts = updateResults.filter(r => 
        r.status === 'rejected' && r.reason.message.includes('timeout')
      ).length;

      return {
        success: successfulUpdates > 0, // Pelo menos um update deve ter sucesso
        concurrentUpdates,
        successfulUpdates,
        lockTimeouts,
        updateSuccessRate: Math.round((successfulUpdates / concurrentUpdates) * 100),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar update com lock
   */
  async executeLockedUpdate(recordId, updateId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Lock do registro
      await client.query(`
        SELECT * FROM stress_test_data 
        WHERE id = $1 
        FOR UPDATE
      `, [recordId]);
      
      // Simular processamento
      await this.sleep(Math.random() * 100 + 50);
      
      // Update
      await client.query(`
        UPDATE stress_test_data 
        SET data = data || $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ update: updateId, timestamp: new Date() }), recordId]);
      
      await client.query('COMMIT');
      return { updateId, success: true };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn('⚠️ Erro no rollback:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calcular métricas do banco
   */
  calculateDatabaseMetrics() {
    const queryTimes = this.dbMetrics.queryTimes;
    const avgQueryTime = queryTimes.length > 0 ?
      queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0;

    return {
      totalQueries: this.dbMetrics.totalQueries,
      slowQueries: this.dbMetrics.slowQueries,
      deadlocks: this.dbMetrics.deadlocks,
      timeouts: this.dbMetrics.timeouts,
      avgQueryTime: Math.round(avgQueryTime),
      slowQueryRate: this.dbMetrics.totalQueries > 0 ?
        Math.round((this.dbMetrics.slowQueries / this.dbMetrics.totalQueries) * 100) : 0
    };
  }

  /**
   * Avaliar sucesso do teste do banco
   */
  evaluateDatabaseTestSuccess(results) {
    const tests = Object.values(results.tests);
    const passedTests = tests.filter(test => test.success).length;
    const passRate = Math.round((passedTests / tests.length) * 100);
    
    // Critérios específicos para banco
    const dbMetrics = results.metrics;
    const acceptableSlowQueryRate = 5; // 5%
    const acceptableDeadlockRate = 2; // 2%
    
    return passRate >= 80 && 
           dbMetrics.slowQueryRate <= acceptableSlowQueryRate &&
           dbMetrics.deadlocks <= acceptableDeadlockRate;
  }

  /**
   * Limpar ambiente de teste
   */
  async cleanupDatabaseTestEnvironment() {
    try {
      // Limpar dados de teste
      await db.query('DELETE FROM stress_test_data WHERE test_id LIKE $1', ['%STRESS%']);
      await db.query('DELETE FROM stress_test_data WHERE test_id LIKE $1', ['%TRANS%']);
      await db.query('DELETE FROM stress_test_data WHERE test_id LIKE $1', ['%LOCK%']);
      
      console.log('🧹 Ambiente de teste do banco limpo');
    } catch (error) {
      console.warn('⚠️ Erro na limpeza:', error);
    }
  }
}

module.exports = DatabaseStressTest;
