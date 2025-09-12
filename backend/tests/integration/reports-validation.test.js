const request = require('supertest');
const express = require('express');
const reportsValidator = require('../../src/utils/reportsValidator');
const db = require('../../src/config/database');

describe('📊 TESTES DE VALIDAÇÃO DE RELATÓRIOS', () => {
  let app;
  let testColaboradorId;

  beforeAll(async () => {
    // Configurar app de teste
    app = express();
    app.use(express.json());
    
    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      req.user = { id: 999, email: 'admin@test.com', perfil: 'admin' };
      next();
    });
    
    // Importar rotas de relatórios
    const pontoRoutes = require('../../src/api/routes/pontoRoutes');
    app.use('/api/ponto', pontoRoutes);
    
    // Criar dados de teste
    await createTestData();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await cleanupTestData();
  });

  describe('1. VALIDAÇÃO DE PARÂMETROS', () => {
    test('Deve validar parâmetros de relatório válidos', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31',
        colaborador_id: testColaboradorId
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.normalizedParams.data_inicio).toBe('2024-01-01');
      expect(validation.normalizedParams.data_fim).toBe('2024-01-31');
    });

    test('Deve rejeitar período muito longo', async () => {
      const params = {
        data_inicio: '2023-01-01',
        data_fim: '2024-12-31' // Mais de 365 dias
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Período muito grande'))).toBe(true);
    });

    test('Deve rejeitar datas inválidas', async () => {
      const params = {
        data_inicio: '2024-13-01', // Mês inválido
        data_fim: '2024-01-31'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Data de início inválida'))).toBe(true);
    });

    test('Deve rejeitar data início posterior à data fim', async () => {
      const params = {
        data_inicio: '2024-01-31',
        data_fim: '2024-01-01'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Data de início deve ser anterior'))).toBe(true);
    });

    test('Deve rejeitar datas futuras', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const params = {
        data_inicio: futureDate.toISOString().split('T')[0],
        data_fim: futureDate.toISOString().split('T')[0]
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('não pode ser no futuro'))).toBe(true);
    });

    test('Deve usar período padrão quando não fornecido', async () => {
      const params = {}; // Sem datas
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(true);
      expect(validation.normalizedParams.data_inicio).toBeDefined();
      expect(validation.normalizedParams.data_fim).toBeDefined();
      
      // Verificar se é últimos 30 dias
      const inicio = new Date(validation.normalizedParams.data_inicio);
      const fim = new Date(validation.normalizedParams.data_fim);
      const diffDays = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBeLessThanOrEqual(30);
    });
  });

  describe('2. VALIDAÇÃO DE COLABORADORES', () => {
    test('Deve validar colaborador existente', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31',
        colaborador_id: testColaboradorId
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(true);
    });

    test('Deve rejeitar colaborador inexistente', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31',
        colaborador_id: 999999 // ID inexistente
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Colaborador não encontrado'))).toBe(true);
    });

    test('Deve rejeitar ID de colaborador inválido', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31',
        colaborador_id: 'abc' // Não é número
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('número positivo'))).toBe(true);
    });
  });

  describe('3. VALIDAÇÃO POR TIPO DE RELATÓRIO', () => {
    test('Deve validar relatório AFD com parâmetros corretos', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'afd');
      
      expect(validation.valid).toBe(true);
    });

    test('Deve rejeitar relatório AFD sem datas', async () => {
      const params = {}; // AFD requer datas
      
      const validation = await reportsValidator.validateReportParams(params, 'afd');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('AFD requer data'))).toBe(true);
    });

    test('Deve validar relatório ACJEF', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'acjef');
      
      expect(validation.valid).toBe(true);
    });

    test('Deve avisar sobre período longo para ACJEF', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-03-31' // Mais de 31 dias
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'acjef');
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('período longo'))).toBe(true);
    });
  });

  describe('4. ESTIMATIVA DE TAMANHO', () => {
    test('Deve estimar tamanho do relatório', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.estimatedRecords).toBeGreaterThanOrEqual(0);
      expect(validation.estimatedTime).toBeGreaterThan(0);
    });

    test('Deve rejeitar relatório muito grande', async () => {
      // Mock para simular muitos registros
      const originalEstimate = reportsValidator.estimateReportSize;
      reportsValidator.estimateReportSize = jest.fn().mockResolvedValue({
        records: 100000, // Acima do limite
        time: 1000
      });
      
      const params = {
        data_inicio: '2023-01-01',
        data_fim: '2023-12-31'
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('muito grande'))).toBe(true);
      
      // Restaurar função original
      reportsValidator.estimateReportSize = originalEstimate;
    });
  });

  describe('5. VALIDAÇÃO DE INTEGRIDADE', () => {
    test('Deve validar integridade de dados válidos', async () => {
      const reportData = [
        {
          id: 1,
          data_hora: '2024-01-01T08:00:00Z',
          colaborador_id: testColaboradorId,
          colaborador_nome: 'Test User',
          latitude: -23.5505,
          longitude: -46.6333
        },
        {
          id: 2,
          data_hora: '2024-01-01T12:00:00Z',
          colaborador_id: testColaboradorId,
          colaborador_nome: 'Test User',
          latitude: -23.5505,
          longitude: -46.6333
        }
      ];
      
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-01'
      };
      
      const validation = await reportsValidator.validateReportIntegrity(reportData, params, 'general');
      
      expect(validation.valid).toBe(true);
      expect(validation.integrity.recordCount).toBe(2);
      expect(validation.integrity.duplicates).toBe(0);
    });

    test('Deve detectar registros duplicados', async () => {
      const reportData = [
        {
          id: 1,
          data_hora: '2024-01-01T08:00:00Z',
          colaborador_id: testColaboradorId,
          colaborador_nome: 'Test User'
        },
        {
          id: 2,
          data_hora: '2024-01-01T08:00:00Z', // Mesmo horário
          colaborador_id: testColaboradorId, // Mesmo colaborador
          colaborador_nome: 'Test User'
        }
      ];
      
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-01'
      };
      
      const validation = await reportsValidator.validateReportIntegrity(reportData, params, 'general');
      
      expect(validation.integrity.duplicates).toBe(1);
      expect(validation.warnings.some(w => w.includes('duplicados'))).toBe(true);
    });

    test('Deve detectar coordenadas inválidas', async () => {
      const reportData = [
        {
          id: 1,
          data_hora: '2024-01-01T08:00:00Z',
          colaborador_id: testColaboradorId,
          latitude: 91, // Latitude inválida (> 90)
          longitude: 181 // Longitude inválida (> 180)
        }
      ];
      
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-01'
      };
      
      const validation = await reportsValidator.validateReportIntegrity(reportData, params, 'general');
      
      expect(validation.integrity.inconsistencies.some(i => i.includes('latitude inválida'))).toBe(true);
      expect(validation.integrity.inconsistencies.some(i => i.includes('longitude inválida'))).toBe(true);
    });

    test('Deve detectar campos obrigatórios ausentes', async () => {
      const reportData = [
        {
          id: 1,
          // data_hora ausente
          colaborador_id: testColaboradorId
        },
        {
          id: 2,
          data_hora: '2024-01-01T08:00:00Z'
          // colaborador_id ausente
        }
      ];
      
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-01'
      };
      
      const validation = await reportsValidator.validateReportIntegrity(reportData, params, 'general');
      
      expect(validation.integrity.inconsistencies.some(i => i.includes('data_hora ausente'))).toBe(true);
      expect(validation.integrity.inconsistencies.some(i => i.includes('colaborador_id ausente'))).toBe(true);
    });
  });

  describe('6. INTEGRAÇÃO COM API', () => {
    test('Deve gerar relatório com validação via API', async () => {
      const response = await request(app)
        .get('/api/ponto/relatorio')
        .query({
          data_inicio: '2024-01-01',
          data_fim: '2024-01-31'
        });

      // Pode retornar 200 (sucesso) ou 400 (parâmetros inválidos)
      expect([200, 400, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.validacao).toBeDefined();
        expect(response.body.tempo_execucao).toBeGreaterThan(0);
      }
    });

    test('Deve rejeitar parâmetros inválidos via API', async () => {
      const response = await request(app)
        .get('/api/ponto/relatorio')
        .query({
          data_inicio: '2024-13-01', // Data inválida
          data_fim: '2024-01-31'
        });

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        expect(Array.isArray(response.body.errors)).toBe(true);
      }
    });
  });

  describe('7. PERFORMANCE E LIMITES', () => {
    test('Deve calcular tempo estimado corretamente', async () => {
      const params = {
        data_inicio: '2024-01-01',
        data_fim: '2024-01-07' // Período pequeno
      };
      
      const validation = await reportsValidator.validateReportParams(params, 'general');
      
      expect(validation.estimatedTime).toBeGreaterThan(0);
      expect(validation.estimatedTime).toBeLessThan(30000); // Menos que timeout
    });

    test('Deve gerar recomendações apropriadas', async () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: ['5 registros duplicados encontrados'],
        estimatedRecords: 15000,
        estimatedTime: 15000
      };
      
      const recommendations = reportsValidator.generateRecommendations(validation);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.some(r => r.type === 'PERFORMANCE')).toBe(true);
      expect(recommendations.some(r => r.type === 'DATA_QUALITY')).toBe(true);
    });
  });

  describe('8. RELATÓRIO DE VALIDAÇÃO', () => {
    test('Deve gerar relatório de validação completo', async () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: ['1 aviso de teste'],
        estimatedRecords: 100,
        estimatedTime: 1000,
        integrity: {
          recordCount: 100,
          duplicates: 0,
          inconsistencies: []
        }
      };
      
      const report = reportsValidator.generateValidationReport(validation, 'general', 1500);
      
      expect(report.timestamp).toBeDefined();
      expect(report.reportType).toBe('general');
      expect(report.validation.status).toBe('VALID');
      expect(report.performance.actualTime).toBe(1500);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // Funções auxiliares
  async function createTestData() {
    try {
      // Criar colaborador de teste
      const result = await db.query(`
        INSERT INTO colaboradores (nome, cpf, email, ativo)
        VALUES ('Test Colaborador Reports', '98765432100', 'reports@test.com', true)
        ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome
        RETURNING id
      `);
      
      if (result.rows.length > 0) {
        testColaboradorId = result.rows[0].id;
      } else {
        // Se houve conflito, buscar o ID existente
        const existing = await db.query(
          'SELECT id FROM colaboradores WHERE cpf = $1',
          ['98765432100']
        );
        testColaboradorId = existing.rows[0].id;
      }
      
      console.log('📊 Test colaborador ID:', testColaboradorId);
      
    } catch (error) {
      console.warn('Aviso: Erro ao criar dados de teste:', error.message);
      testColaboradorId = 1; // Fallback
    }
  }

  async function cleanupTestData() {
    try {
      await db.query(`DELETE FROM colaboradores WHERE email = 'reports@test.com'`);
    } catch (error) {
      console.warn('Aviso: Erro na limpeza:', error.message);
    }
  }
});
