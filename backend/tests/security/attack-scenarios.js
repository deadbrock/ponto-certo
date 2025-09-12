/**
 * 🎭 CENÁRIOS DE ATAQUE REALISTAS
 * 
 * Biblioteca de cenários de ataque baseados em ameaças reais
 * para testar as defesas do sistema de ponto digital
 */

const chalk = require('chalk');
const crypto = require('crypto');

class AttackScenarios {
  constructor() {
    this.scenarios = this.loadScenarios();
  }

  /**
   * Carregar todos os cenários de ataque
   */
  loadScenarios() {
    return {
      // 1. Cenário: Atacante Script Kiddie
      scriptKiddie: {
        name: 'Script Kiddie Attack',
        description: 'Atacante iniciante usando ferramentas automatizadas',
        profile: {
          skillLevel: 'BEGINNER',
          tools: ['sqlmap', 'nikto', 'dirb'],
          motivation: 'Curiosidade/Diversão',
          persistence: 'LOW'
        },
        attacks: [
          {
            type: 'SQL_INJECTION',
            payloads: [
              "' OR '1'='1",
              "'; DROP TABLE usuarios; --",
              "' UNION SELECT * FROM usuarios --"
            ],
            targets: ['/api/auth/login-admin', '/api/usuarios'],
            frequency: 'HIGH',
            randomization: 'LOW'
          },
          {
            type: 'XSS',
            payloads: [
              "<script>alert('XSS')</script>",
              "<img src=x onerror=alert('XSS')>"
            ],
            targets: ['/api/usuarios'],
            frequency: 'MEDIUM',
            randomization: 'LOW'
          }
        ],
        behavior: {
          requestDelay: [500, 2000], // ms
          userAgentRotation: false,
          ipRotation: false,
          sessionManagement: false
        }
      },

      // 2. Cenário: Atacante Experiente
      advancedAttacker: {
        name: 'Advanced Persistent Threat (APT)',
        description: 'Atacante experiente com técnicas avançadas',
        profile: {
          skillLevel: 'EXPERT',
          tools: ['burp-suite', 'custom-scripts', 'metasploit'],
          motivation: 'Dados/Financeiro',
          persistence: 'HIGH'
        },
        attacks: [
          {
            type: 'AUTHENTICATION_BYPASS',
            payloads: [
              "admin' OR '1'='1' /*",
              "'; UPDATE usuarios SET senha_hash='$2b$10$known_hash' WHERE email='admin@test.com'; --",
              "admin'/**/OR/**/1=1#"
            ],
            targets: ['/api/auth/login-admin'],
            frequency: 'MEDIUM',
            randomization: 'HIGH'
          },
          {
            type: 'PRIVILEGE_ESCALATION',
            payloads: [
              { perfil: 'ADMINISTRADOR', ativo: true },
              { role: 'admin', permissions: ['*'] }
            ],
            targets: ['/api/usuarios/profile'],
            frequency: 'LOW',
            randomization: 'HIGH'
          },
          {
            type: 'DATA_EXFILTRATION',
            payloads: [
              "'; SELECT * FROM usuarios WHERE perfil='ADMINISTRADOR'; --",
              "' UNION SELECT email, senha_hash FROM usuarios --"
            ],
            targets: ['/api/usuarios', '/api/colaboradores'],
            frequency: 'LOW',
            randomization: 'HIGH'
          }
        ],
        behavior: {
          requestDelay: [2000, 10000], // Mais lento para evitar detecção
          userAgentRotation: true,
          ipRotation: true, // Simular proxy/VPN
          sessionManagement: true,
          reconnaissance: true // Fase de reconhecimento
        }
      },

      // 3. Cenário: Insider Threat
      insiderThreat: {
        name: 'Insider Threat',
        description: 'Funcionário mal-intencionado com acesso legítimo',
        profile: {
          skillLevel: 'INTERMEDIATE',
          access: 'LEGITIMATE',
          motivation: 'Vingança/Financeiro',
          persistence: 'HIGH'
        },
        attacks: [
          {
            type: 'DATA_THEFT',
            payloads: [
              { export: 'all', format: 'csv' },
              { backup: true, include_personal_data: true }
            ],
            targets: ['/api/relatorios/gerar', '/api/backup/create'],
            frequency: 'LOW',
            randomization: 'MEDIUM'
          },
          {
            type: 'SABOTAGE',
            payloads: [
              { action: 'delete', confirm: true },
              { disable: true, reason: 'maintenance' }
            ],
            targets: ['/api/usuarios', '/api/colaboradores'],
            frequency: 'VERY_LOW',
            randomization: 'LOW'
          }
        ],
        behavior: {
          requestDelay: [5000, 30000], // Comportamento humano normal
          userAgentRotation: false,
          ipRotation: false,
          sessionManagement: true,
          workingHours: true // Apenas em horário comercial
        }
      },

      // 4. Cenário: Botnet/DDoS
      botnetAttack: {
        name: 'Botnet DDoS Attack',
        description: 'Ataque distribuído de negação de serviço',
        profile: {
          skillLevel: 'AUTOMATED',
          scale: 'MASSIVE',
          motivation: 'Disruption',
          persistence: 'MEDIUM'
        },
        attacks: [
          {
            type: 'VOLUMETRIC_ATTACK',
            payloads: ['GET', 'POST', 'HEAD'],
            targets: ['/', '/api/auth/login', '/api/ponto/registrar'],
            frequency: 'EXTREME',
            randomization: 'HIGH'
          },
          {
            type: 'APPLICATION_LAYER_ATTACK',
            payloads: [
              { search: 'a'.repeat(10000) },
              { data: 'x'.repeat(50000) }
            ],
            targets: ['/api/usuarios', '/api/colaboradores'],
            frequency: 'HIGH',
            randomization: 'MEDIUM'
          }
        ],
        behavior: {
          requestDelay: [10, 100], // Muito rápido
          userAgentRotation: true,
          ipRotation: true,
          sessionManagement: false,
          concurrent: 100 // Muitas conexões simultâneas
        }
      },

      // 5. Cenário: Ransomware Preparation
      ransomwarePrep: {
        name: 'Ransomware Preparation',
        description: 'Reconhecimento para ataque de ransomware',
        profile: {
          skillLevel: 'EXPERT',
          motivation: 'Financial',
          persistence: 'VERY_HIGH'
        },
        attacks: [
          {
            type: 'RECONNAISSANCE',
            payloads: [
              '../../../etc/passwd',
              '../../../../windows/system32/config/sam',
              '/proc/version'
            ],
            targets: ['/api/backup/download', '/api/relatorios/download'],
            frequency: 'LOW',
            randomization: 'HIGH'
          },
          {
            type: 'BACKUP_ENUMERATION',
            payloads: [
              { list: true, show_all: true },
              { path: '../', recursive: true }
            ],
            targets: ['/api/backup/list'],
            frequency: 'MEDIUM',
            randomization: 'HIGH'
          },
          {
            type: 'PRIVILEGE_MAPPING',
            payloads: [
              "'; SELECT * FROM usuarios WHERE perfil='ADMINISTRADOR'; --",
              { role: 'admin', action: 'enumerate' }
            ],
            targets: ['/api/usuarios', '/api/auth/check-permissions'],
            frequency: 'LOW',
            randomization: 'HIGH'
          }
        ],
        behavior: {
          requestDelay: [5000, 20000],
          userAgentRotation: true,
          ipRotation: true,
          sessionManagement: true,
          stealth: true, // Tentar evitar detecção
          timeSpread: true // Espalhar ataques ao longo do tempo
        }
      },

      // 6. Cenário: Competitor Espionage
      competitorEspionage: {
        name: 'Corporate Espionage',
        description: 'Espionagem corporativa para roubo de dados',
        profile: {
          skillLevel: 'EXPERT',
          motivation: 'Corporate Intelligence',
          persistence: 'VERY_HIGH'
        },
        attacks: [
          {
            type: 'DATA_RECONNAISSANCE',
            payloads: [
              { export: 'metadata', include_schema: true },
              { query: 'SHOW TABLES', format: 'json' }
            ],
            targets: ['/api/relatorios/structure', '/api/database/schema'],
            frequency: 'LOW',
            randomization: 'HIGH'
          },
          {
            type: 'EMPLOYEE_DATA_THEFT',
            payloads: [
              "'; SELECT nome, cpf, email, salario FROM colaboradores; --",
              { export: 'employees', include_sensitive: true }
            ],
            targets: ['/api/colaboradores', '/api/relatorios/funcionarios'],
            frequency: 'VERY_LOW',
            randomization: 'HIGH'
          }
        ],
        behavior: {
          requestDelay: [10000, 60000], // Muito devagar
          userAgentRotation: true,
          ipRotation: true,
          sessionManagement: true,
          businessHours: true,
          socialEngineering: true
        }
      }
    };
  }

  /**
   * Executar cenário específico
   */
  async executeScenario(scenarioName, target, options = {}) {
    const scenario = this.scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Cenário '${scenarioName}' não encontrado`);
    }

    console.log(chalk.red.bold(`🎭 EXECUTANDO CENÁRIO: ${scenario.name}`));
    console.log(chalk.yellow(`📝 ${scenario.description}`));
    console.log(chalk.gray(`🎯 Perfil: ${scenario.profile.skillLevel} - ${scenario.profile.motivation}`));
    console.log();

    const results = {
      scenario: scenarioName,
      startTime: Date.now(),
      attacks: [],
      detections: [],
      blocks: [],
      successes: []
    };

    // Executar reconhecimento se necessário
    if (scenario.behavior.reconnaissance) {
      await this.performReconnaissance(target, results);
    }

    // Executar ataques do cenário
    for (const attack of scenario.attacks) {
      await this.executeAttackPhase(attack, scenario, target, results, options);
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return this.generateScenarioReport(scenario, results);
  }

  /**
   * Executar reconhecimento
   */
  async performReconnaissance(target, results) {
    console.log(chalk.blue('🔍 Fase de Reconhecimento...'));

    const reconEndpoints = [
      '/robots.txt',
      '/sitemap.xml',
      '/.well-known/security.txt',
      '/api',
      '/api/docs',
      '/api/swagger',
      '/admin',
      '/dashboard'
    ];

    for (const endpoint of reconEndpoints) {
      try {
        // Simular requisição de reconhecimento
        const result = {
          type: 'RECONNAISSANCE',
          endpoint,
          timestamp: Date.now(),
          status: Math.random() > 0.7 ? 200 : 404,
          detected: Math.random() > 0.9
        };

        results.attacks.push(result);

        if (result.detected) {
          results.detections.push(result);
          console.log(chalk.yellow(`⚠️ Reconhecimento detectado: ${endpoint}`));
        }

        await this.sleep(this.randomDelay([1000, 3000]));
      } catch (error) {
        console.log(chalk.gray(`❌ Erro no reconhecimento: ${endpoint}`));
      }
    }
  }

  /**
   * Executar fase de ataque
   */
  async executeAttackPhase(attack, scenario, target, results, options) {
    console.log(chalk.red(`⚔️ Executando: ${attack.type}`));

    const attackCount = this.getAttackCount(attack.frequency);
    const delay = scenario.behavior.requestDelay;

    for (let i = 0; i < attackCount; i++) {
      for (const targetEndpoint of attack.targets) {
        const payload = this.selectPayload(attack.payloads, attack.randomization);
        
        try {
          const result = await this.executeAttackAttempt({
            type: attack.type,
            endpoint: targetEndpoint,
            payload,
            scenario: scenario.name,
            userAgent: this.getUserAgent(scenario.behavior),
            timestamp: Date.now()
          });

          results.attacks.push(result);

          // Analisar resultado
          this.analyzeAttackResult(result, results);

          // Exibir resultado
          this.displayAttackResult(result);

          // Delay baseado no comportamento do atacante
          const delayTime = this.randomDelay(delay);
          await this.sleep(delayTime);

        } catch (error) {
          console.log(chalk.gray(`❌ Erro no ataque: ${targetEndpoint} - ${error.message}`));
        }
      }
    }
  }

  /**
   * Executar tentativa de ataque
   */
  async executeAttackAttempt(config) {
    // Simular execução de ataque
    const responses = [
      { status: 200, blocked: false, detected: false },
      { status: 400, blocked: false, detected: true },
      { status: 401, blocked: false, detected: true },
      { status: 403, blocked: true, detected: true },
      { status: 429, blocked: true, detected: true },
      { status: 500, blocked: false, detected: false }
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      ...config,
      ...response,
      successful: response.status === 200 && this.isAttackSuccessful(config.type),
      responseTime: Math.random() * 1000 + 100
    };
  }

  /**
   * Analisar resultado do ataque
   */
  analyzeAttackResult(result, results) {
    if (result.blocked) {
      results.blocks.push(result);
    }

    if (result.detected) {
      results.detections.push(result);
    }

    if (result.successful) {
      results.successes.push(result);
    }
  }

  /**
   * Exibir resultado do ataque
   */
  displayAttackResult(result) {
    const emoji = result.blocked ? '🛡️' : 
                 result.successful ? '💥' : 
                 result.detected ? '👁️' : '❓';
    
    const status = result.blocked ? chalk.green('BLOCKED') :
                  result.successful ? chalk.red('SUCCESS') :
                  result.detected ? chalk.yellow('DETECTED') :
                  chalk.gray('FAILED');

    console.log(`${emoji} ${result.endpoint} - ${status} (${result.status})`);
  }

  /**
   * Gerar relatório do cenário
   */
  generateScenarioReport(scenario, results) {
    const totalAttacks = results.attacks.length;
    const blocks = results.blocks.length;
    const detections = results.detections.length;
    const successes = results.successes.length;

    const blockingRate = totalAttacks > 0 ? Math.round((blocks / totalAttacks) * 100) : 0;
    const detectionRate = totalAttacks > 0 ? Math.round((detections / totalAttacks) * 100) : 0;
    const successRate = totalAttacks > 0 ? Math.round((successes / totalAttacks) * 100) : 0;

    // Calcular score baseado no perfil do atacante
    let defenseScore = 100;
    
    // Penalizar mais para atacantes mais sofisticados
    const skillMultiplier = {
      'BEGINNER': 1,
      'INTERMEDIATE': 1.5,
      'EXPERT': 2,
      'AUTOMATED': 0.8
    }[scenario.profile.skillLevel] || 1;

    defenseScore -= (successes * 15 * skillMultiplier);
    defenseScore -= ((totalAttacks - detections) * 2);
    defenseScore = Math.max(0, defenseScore);

    const report = {
      scenario: {
        name: scenario.name,
        description: scenario.description,
        profile: scenario.profile
      },
      execution: {
        duration: results.duration,
        totalAttacks,
        attackTypes: this.getAttackTypeStats(results.attacks)
      },
      defense: {
        blockingRate,
        detectionRate,
        successRate,
        defenseScore,
        status: this.getDefenseStatus(defenseScore, scenario.profile.skillLevel)
      },
      timeline: this.generateTimeline(results.attacks),
      recommendations: this.generateScenarioRecommendations(scenario, results),
      details: results
    };

    this.printScenarioReport(report);
    return report;
  }

  /**
   * Gerar timeline dos ataques
   */
  generateTimeline(attacks) {
    return attacks.map(attack => ({
      timestamp: attack.timestamp,
      type: attack.type,
      endpoint: attack.endpoint,
      result: attack.blocked ? 'BLOCKED' : 
              attack.successful ? 'SUCCESS' : 
              attack.detected ? 'DETECTED' : 'FAILED'
    }));
  }

  /**
   * Gerar recomendações específicas do cenário
   */
  generateScenarioRecommendations(scenario, results) {
    const recommendations = [];

    if (results.successes.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: `Corrigir vulnerabilidades exploradas pelo perfil ${scenario.profile.skillLevel}`,
        context: scenario.name
      });
    }

    if (results.detections.length < results.attacks.length * 0.8) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Melhorar capacidade de detecção para este perfil de atacante',
        context: scenario.profile.motivation
      });
    }

    if (scenario.profile.persistence === 'HIGH' && results.blocks.length < results.attacks.length * 0.9) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implementar bloqueio mais agressivo para atacantes persistentes',
        context: 'Persistence Management'
      });
    }

    return recommendations;
  }

  /**
   * Imprimir relatório do cenário
   */
  printScenarioReport(report) {
    console.log(chalk.cyan.bold(`\n🎭 RELATÓRIO DO CENÁRIO: ${report.scenario.name}`));
    console.log(chalk.cyan('================================================'));
    
    console.log(chalk.bold(`🎯 Perfil do Atacante: ${report.scenario.profile.skillLevel}`));
    console.log(chalk.bold(`💰 Motivação: ${report.scenario.profile.motivation}`));
    console.log(chalk.bold(`⏱️ Duração: ${report.execution.duration}ms`));
    console.log(chalk.bold(`🎯 Total de Ataques: ${report.execution.totalAttacks}`));
    
    console.log(chalk.bold('\n📊 EFETIVIDADE DA DEFESA:'));
    console.log(`   🛡️ Taxa de Bloqueio: ${report.defense.blockingRate}%`);
    console.log(`   👁️ Taxa de Detecção: ${report.defense.detectionRate}%`);
    console.log(`   💥 Taxa de Sucesso do Atacante: ${report.defense.successRate}%`);
    console.log(`   📊 Score de Defesa: ${report.defense.defenseScore}/100 (${report.defense.status})`);

    if (report.recommendations.length > 0) {
      console.log(chalk.bold('\n🎯 RECOMENDAÇÕES:'));
      for (const rec of report.recommendations) {
        const color = rec.priority === 'CRITICAL' ? chalk.red : chalk.yellow;
        console.log(`   ${color(rec.priority)}: ${rec.action}`);
      }
    }
  }

  // Funções auxiliares
  getAttackCount(frequency) {
    const counts = {
      'VERY_LOW': 1,
      'LOW': 3,
      'MEDIUM': 5,
      'HIGH': 10,
      'EXTREME': 50
    };
    return counts[frequency] || 3;
  }

  selectPayload(payloads, randomization) {
    if (randomization === 'HIGH') {
      return payloads[Math.floor(Math.random() * payloads.length)];
    } else if (randomization === 'MEDIUM') {
      // Preferir payloads mais comuns
      return payloads[Math.floor(Math.random() * Math.min(3, payloads.length))];
    } else {
      // Sempre usar o primeiro payload (LOW randomization)
      return payloads[0];
    }
  }

  getUserAgent(behavior) {
    const userAgents = {
      normal: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      suspicious: 'sqlmap/1.0-dev',
      bot: 'python-requests/2.25.1'
    };

    if (behavior.userAgentRotation) {
      return Object.values(userAgents)[Math.floor(Math.random() * 3)];
    } else {
      return userAgents.normal;
    }
  }

  randomDelay(range) {
    const [min, max] = range;
    return Math.random() * (max - min) + min;
  }

  isAttackSuccessful(type) {
    // Simular taxa de sucesso baseada no tipo de ataque
    const successRates = {
      'SQL_INJECTION': 0.1,
      'XSS': 0.15,
      'AUTHENTICATION_BYPASS': 0.05,
      'PRIVILEGE_ESCALATION': 0.03,
      'DATA_EXFILTRATION': 0.02,
      'RECONNAISSANCE': 0.8,
      'VOLUMETRIC_ATTACK': 0.3
    };

    return Math.random() < (successRates[type] || 0.1);
  }

  getAttackTypeStats(attacks) {
    const stats = {};
    for (const attack of attacks) {
      if (!stats[attack.type]) {
        stats[attack.type] = 0;
      }
      stats[attack.type]++;
    }
    return stats;
  }

  getDefenseStatus(score, attackerSkill) {
    // Ajustar status baseado no nível do atacante
    const thresholds = {
      'BEGINNER': { excellent: 95, good: 85, fair: 70 },
      'INTERMEDIATE': { excellent: 90, good: 80, fair: 65 },
      'EXPERT': { excellent: 85, good: 75, fair: 60 },
      'AUTOMATED': { excellent: 98, good: 90, fair: 80 }
    };

    const threshold = thresholds[attackerSkill] || thresholds['INTERMEDIATE'];

    if (score >= threshold.excellent) return 'EXCELLENT';
    if (score >= threshold.good) return 'GOOD';
    if (score >= threshold.fair) return 'FAIR';
    return score >= 50 ? 'POOR' : 'CRITICAL';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Listar todos os cenários disponíveis
   */
  listScenarios() {
    console.log(chalk.cyan.bold('🎭 CENÁRIOS DE ATAQUE DISPONÍVEIS:'));
    console.log(chalk.cyan('================================'));

    for (const [key, scenario] of Object.entries(this.scenarios)) {
      console.log(chalk.bold(`\n${key}:`));
      console.log(`   📝 ${scenario.name}`);
      console.log(`   🎯 ${scenario.description}`);
      console.log(`   💪 Nível: ${scenario.profile.skillLevel}`);
      console.log(`   💰 Motivação: ${scenario.profile.motivation}`);
      console.log(`   🔥 Persistência: ${scenario.profile.persistence}`);
      console.log(`   ⚔️ Ataques: ${scenario.attacks.length} tipos`);
    }
  }
}

module.exports = AttackScenarios;
