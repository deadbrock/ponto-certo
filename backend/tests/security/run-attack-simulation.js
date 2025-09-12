#!/usr/bin/env node

/**
 * 🎯 EXECUTOR DE SIMULAÇÃO DE ATAQUES
 * 
 * Script para executar simulações completas de ataques
 * contra o sistema de ponto digital
 */

const chalk = require('chalk');
const AttackSimulator = require('./attack-simulator');
const AttackScenarios = require('./attack-scenarios');
const fs = require('fs');
const path = require('path');

class AttackSimulationRunner {
  constructor() {
    this.results = {
      basicAttacks: null,
      scenarioAttacks: [],
      summary: null
    };
  }

  /**
   * Executar simulação completa
   */
  async runCompleteSimulation(options = {}) {
    const {
      target = 'http://localhost:3333',
      includeBasicAttacks = true,
      includeScenarios = true,
      scenarios = ['scriptKiddie', 'advancedAttacker'],
      verbose = true
    } = options;

    console.log(chalk.red.bold('🎯 INICIANDO SIMULAÇÃO COMPLETA DE ATAQUES'));
    console.log(chalk.red('=========================================='));
    console.log(chalk.yellow(`🎯 Alvo: ${target}`));
    console.log(chalk.yellow(`📋 Ataques Básicos: ${includeBasicAttacks ? 'SIM' : 'NÃO'}`));
    console.log(chalk.yellow(`🎭 Cenários: ${includeScenarios ? scenarios.join(', ') : 'NENHUM'}`));
    console.log(chalk.yellow('⚠️  SIMULAÇÃO EM AMBIENTE CONTROLADO'));
    console.log();

    const startTime = Date.now();

    try {
      // 1. Executar ataques básicos
      if (includeBasicAttacks) {
        await this.runBasicAttacks(target, verbose);
      }

      // 2. Executar cenários de ataque
      if (includeScenarios) {
        await this.runAttackScenarios(target, scenarios, verbose);
      }

      const totalTime = Date.now() - startTime;

      // 3. Gerar relatório consolidado
      const consolidatedReport = this.generateConsolidatedReport(totalTime);

      // 4. Salvar e exibir resultados
      this.saveAndDisplayResults(consolidatedReport);

      return consolidatedReport;

    } catch (error) {
      console.error(chalk.red.bold('❌ ERRO DURANTE SIMULAÇÃO:'), error);
      throw error;
    }
  }

  /**
   * Executar ataques básicos
   */
  async runBasicAttacks(target, verbose) {
    console.log(chalk.cyan.bold('📋 FASE 1: ATAQUES BÁSICOS AUTOMATIZADOS'));
    console.log(chalk.cyan('========================================='));

    try {
      const simulator = new AttackSimulator(target);
      this.results.basicAttacks = await simulator.runCompleteSimulation();
      
      if (verbose) {
        console.log(chalk.green('✅ Ataques básicos concluídos'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Erro nos ataques básicos:'), error.message);
      this.results.basicAttacks = { error: error.message };
    }
  }

  /**
   * Executar cenários de ataque
   */
  async runAttackScenarios(target, scenarios, verbose) {
    console.log(chalk.magenta.bold('\n🎭 FASE 2: CENÁRIOS DE ATAQUE REALISTAS'));
    console.log(chalk.magenta('======================================='));

    const scenarioRunner = new AttackScenarios();

    for (const scenarioName of scenarios) {
      try {
        console.log(chalk.blue.bold(`\n🎭 Executando cenário: ${scenarioName}`));
        
        const scenarioResult = await scenarioRunner.executeScenario(
          scenarioName, 
          target, 
          { verbose }
        );
        
        this.results.scenarioAttacks.push(scenarioResult);
        
        if (verbose) {
          console.log(chalk.green(`✅ Cenário ${scenarioName} concluído`));
        }
        
        // Delay entre cenários para evitar sobrecarga
        await this.sleep(2000);
        
      } catch (error) {
        console.error(chalk.red(`❌ Erro no cenário ${scenarioName}:`), error.message);
        this.results.scenarioAttacks.push({
          scenario: { name: scenarioName },
          error: error.message
        });
      }
    }
  }

  /**
   * Gerar relatório consolidado
   */
  generateConsolidatedReport(totalTime) {
    console.log(chalk.blue('📊 Gerando relatório consolidado...'));

    const report = {
      timestamp: new Date().toISOString(),
      totalExecutionTime: totalTime,
      summary: {
        totalAttacks: 0,
        totalBlocked: 0,
        totalSuccessful: 0,
        overallScore: 0,
        status: 'UNKNOWN'
      },
      basicAttacks: this.results.basicAttacks,
      scenarioAttacks: this.results.scenarioAttacks,
      analysis: this.generateAnalysis(),
      recommendations: this.generateConsolidatedRecommendations(),
      riskAssessment: this.generateRiskAssessment()
    };

    // Calcular métricas consolidadas
    this.calculateConsolidatedMetrics(report);

    return report;
  }

  /**
   * Calcular métricas consolidadas
   */
  calculateConsolidatedMetrics(report) {
    let totalAttacks = 0;
    let totalBlocked = 0;
    let totalSuccessful = 0;
    let scores = [];

    // Métricas dos ataques básicos
    if (this.results.basicAttacks && !this.results.basicAttacks.error) {
      const basic = this.results.basicAttacks.summary;
      totalAttacks += basic.totalAttacks || 0;
      totalBlocked += basic.blockedAttacks || 0;
      totalSuccessful += basic.successfulAttacks || 0;
      
      if (basic.securityScore !== undefined) {
        scores.push(basic.securityScore);
      }
    }

    // Métricas dos cenários
    for (const scenario of this.results.scenarioAttacks) {
      if (!scenario.error && scenario.execution) {
        totalAttacks += scenario.execution.totalAttacks || 0;
        
        if (scenario.defense) {
          const blocked = Math.round((scenario.defense.blockingRate / 100) * scenario.execution.totalAttacks);
          const successful = Math.round((scenario.defense.successRate / 100) * scenario.execution.totalAttacks);
          
          totalBlocked += blocked;
          totalSuccessful += successful;
          
          if (scenario.defense.defenseScore !== undefined) {
            scores.push(scenario.defense.defenseScore);
          }
        }
      }
    }

    // Calcular score geral
    const overallScore = scores.length > 0 ? 
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    report.summary = {
      totalAttacks,
      totalBlocked,
      totalSuccessful,
      blockingRate: totalAttacks > 0 ? Math.round((totalBlocked / totalAttacks) * 100) : 0,
      successRate: totalAttacks > 0 ? Math.round((totalSuccessful / totalAttacks) * 100) : 0,
      overallScore,
      status: this.getOverallStatus(overallScore, totalSuccessful)
    };
  }

  /**
   * Gerar análise detalhada
   */
  generateAnalysis() {
    const analysis = {
      strengths: [],
      weaknesses: [],
      patterns: [],
      trends: []
    };

    // Analisar ataques básicos
    if (this.results.basicAttacks && !this.results.basicAttacks.error) {
      const basic = this.results.basicAttacks;
      
      if (basic.summary.blockingRate > 80) {
        analysis.strengths.push('Alta taxa de bloqueio em ataques básicos');
      } else {
        analysis.weaknesses.push('Taxa de bloqueio baixa em ataques básicos');
      }

      // Analisar tipos de ataque mais bem-sucedidos
      if (basic.attacksByType) {
        for (const [type, stats] of Object.entries(basic.attacksByType)) {
          if (stats.successful > 0) {
            analysis.weaknesses.push(`Vulnerável a ${type}: ${stats.successful} sucessos`);
          }
        }
      }
    }

    // Analisar cenários
    for (const scenario of this.results.scenarioAttacks) {
      if (!scenario.error && scenario.defense) {
        const defenseScore = scenario.defense.defenseScore;
        const scenarioName = scenario.scenario.name;
        
        if (defenseScore >= 80) {
          analysis.strengths.push(`Boa defesa contra ${scenarioName} (${defenseScore}/100)`);
        } else if (defenseScore < 60) {
          analysis.weaknesses.push(`Defesa fraca contra ${scenarioName} (${defenseScore}/100)`);
        }

        // Analisar padrões de ataque
        if (scenario.defense.detectionRate < 70) {
          analysis.patterns.push(`Baixa detecção em ${scenarioName}: ${scenario.defense.detectionRate}%`);
        }
      }
    }

    return analysis;
  }

  /**
   * Gerar recomendações consolidadas
   */
  generateConsolidatedRecommendations() {
    const recommendations = [];

    // Recomendações baseadas em sucessos
    const totalSuccessful = this.results.basicAttacks?.summary?.successfulAttacks || 0;
    const scenarioSuccesses = this.results.scenarioAttacks
      .filter(s => !s.error && s.defense?.successRate > 0).length;

    if (totalSuccessful > 0 || scenarioSuccesses > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Vulnerabilidades',
        action: 'Corrigir imediatamente vulnerabilidades identificadas',
        impact: 'Sistema comprometido por ataques bem-sucedidos',
        urgency: 'IMEDIATA'
      });
    }

    // Recomendações baseadas em detecção
    const lowDetectionScenarios = this.results.scenarioAttacks
      .filter(s => !s.error && s.defense?.detectionRate < 70);

    if (lowDetectionScenarios.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Detecção',
        action: 'Melhorar sistema de detecção de ameaças',
        impact: 'Ataques podem passar despercebidos',
        urgency: '24-48 HORAS'
      });
    }

    // Recomendações baseadas em bloqueio
    const overallBlockingRate = this.results.basicAttacks?.summary?.blockingRate || 0;
    if (overallBlockingRate < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Bloqueio',
        action: 'Implementar mecanismos de bloqueio mais efetivos',
        impact: 'Taxa de bloqueio insuficiente',
        urgency: '1 SEMANA'
      });
    }

    // Recomendações gerais
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Monitoramento',
      action: 'Implementar monitoramento contínuo de ameaças',
      impact: 'Detecção precoce de novos padrões de ataque',
      urgency: '2 SEMANAS'
    });

    recommendations.push({
      priority: 'LOW',
      category: 'Treinamento',
      action: 'Treinar equipe em resposta a incidentes',
      impact: 'Melhor resposta a ataques reais',
      urgency: '1 MÊS'
    });

    return recommendations;
  }

  /**
   * Gerar avaliação de risco
   */
  generateRiskAssessment() {
    const overallScore = this.calculateOverallScore();
    const successfulAttacks = this.countSuccessfulAttacks();
    
    let riskLevel = 'LOW';
    let riskScore = 0;

    // Calcular nível de risco
    if (successfulAttacks > 5) {
      riskLevel = 'CRITICAL';
      riskScore = 90 + Math.min(successfulAttacks, 10);
    } else if (successfulAttacks > 2) {
      riskLevel = 'HIGH';
      riskScore = 70 + (successfulAttacks * 5);
    } else if (overallScore < 70) {
      riskLevel = 'MEDIUM';
      riskScore = 100 - overallScore;
    } else {
      riskLevel = 'LOW';
      riskScore = Math.max(0, 40 - overallScore);
    }

    return {
      level: riskLevel,
      score: Math.min(riskScore, 100),
      factors: this.getRiskFactors(),
      mitigation: this.getMitigationStrategies(riskLevel),
      timeline: this.getRecommendedTimeline(riskLevel)
    };
  }

  /**
   * Obter fatores de risco
   */
  getRiskFactors() {
    const factors = [];

    if (this.results.basicAttacks?.summary?.successfulAttacks > 0) {
      factors.push({
        factor: 'Ataques básicos bem-sucedidos',
        impact: 'HIGH',
        description: 'Sistema vulnerável a ataques automatizados'
      });
    }

    const expertScenarios = this.results.scenarioAttacks
      .filter(s => !s.error && s.scenario?.profile?.skillLevel === 'EXPERT' && s.defense?.successRate > 0);

    if (expertScenarios.length > 0) {
      factors.push({
        factor: 'Vulnerável a atacantes experientes',
        impact: 'CRITICAL',
        description: 'Sistema pode ser comprometido por APTs'
      });
    }

    return factors;
  }

  /**
   * Obter estratégias de mitigação
   */
  getMitigationStrategies(riskLevel) {
    const strategies = {
      'CRITICAL': [
        'Implementar WAF (Web Application Firewall)',
        'Habilitar monitoramento 24/7',
        'Implementar resposta automática a incidentes',
        'Realizar auditoria de segurança completa'
      ],
      'HIGH': [
        'Corrigir vulnerabilidades identificadas',
        'Implementar detecção avançada de ameaças',
        'Configurar alertas em tempo real',
        'Treinar equipe de resposta'
      ],
      'MEDIUM': [
        'Melhorar sistema de logging',
        'Implementar rate limiting mais rigoroso',
        'Configurar monitoramento básico',
        'Revisar políticas de segurança'
      ],
      'LOW': [
        'Manter monitoramento atual',
        'Realizar testes regulares',
        'Atualizar documentação de segurança',
        'Treinar usuários em segurança'
      ]
    };

    return strategies[riskLevel] || strategies['LOW'];
  }

  /**
   * Obter timeline recomendado
   */
  getRecommendedTimeline(riskLevel) {
    const timelines = {
      'CRITICAL': 'Ação imediata - 24 horas',
      'HIGH': 'Ação urgente - 1 semana',
      'MEDIUM': 'Ação necessária - 1 mês',
      'LOW': 'Ação recomendada - 3 meses'
    };

    return timelines[riskLevel] || timelines['LOW'];
  }

  /**
   * Salvar e exibir resultados
   */
  saveAndDisplayResults(report) {
    // Exibir resumo
    this.displayExecutiveSummary(report);

    // Salvar relatório
    const reportPath = path.join(__dirname, `attack-simulation-complete-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(chalk.blue(`\n📄 Relatório completo salvo em: ${reportPath}`));
  }

  /**
   * Exibir resumo executivo
   */
  displayExecutiveSummary(report) {
    console.log(chalk.cyan.bold('\n🎯 RESUMO EXECUTIVO DA SIMULAÇÃO'));
    console.log(chalk.cyan('=================================='));
    
    const { summary, riskAssessment } = report;
    
    // Score geral
    const scoreColor = this.getScoreColor(summary.overallScore);
    console.log(chalk.bold(`📊 Score de Segurança: ${scoreColor(summary.overallScore + '/100')} (${scoreColor(summary.status)})`));
    
    // Métricas principais
    console.log(chalk.bold('\n📋 MÉTRICAS PRINCIPAIS:'));
    console.log(`   🎯 Total de Ataques: ${summary.totalAttacks}`);
    console.log(`   🛡️ Bloqueados: ${summary.totalBlocked} (${summary.blockingRate}%)`);
    console.log(`   💥 Bem-sucedidos: ${summary.totalSuccessful} (${summary.successRate}%)`);
    
    // Avaliação de risco
    const riskColor = this.getRiskColor(riskAssessment.level);
    console.log(chalk.bold(`\n🚨 Nível de Risco: ${riskColor(riskAssessment.level)} (${riskAssessment.score}/100)`));
    console.log(`   ⏰ Timeline: ${riskAssessment.timeline}`);
    
    // Análise
    if (report.analysis.strengths.length > 0) {
      console.log(chalk.bold('\n✅ PONTOS FORTES:'));
      for (const strength of report.analysis.strengths.slice(0, 3)) {
        console.log(`   ✅ ${strength}`);
      }
    }
    
    if (report.analysis.weaknesses.length > 0) {
      console.log(chalk.bold('\n❌ PONTOS FRACOS:'));
      for (const weakness of report.analysis.weaknesses.slice(0, 3)) {
        console.log(`   ❌ ${weakness}`);
      }
    }
    
    // Recomendações principais
    console.log(chalk.bold('\n🎯 AÇÕES PRIORITÁRIAS:'));
    for (const rec of report.recommendations.slice(0, 3)) {
      const priorityColor = rec.priority === 'CRITICAL' ? chalk.red : 
                           rec.priority === 'HIGH' ? chalk.yellow : chalk.blue;
      console.log(`   ${priorityColor(rec.priority)}: ${rec.action}`);
    }
    
    console.log(chalk.gray(`\n⏱️ Tempo total de execução: ${report.totalExecutionTime}ms`));
  }

  // Funções auxiliares
  calculateOverallScore() {
    const scores = [];
    
    if (this.results.basicAttacks?.summary?.securityScore) {
      scores.push(this.results.basicAttacks.summary.securityScore);
    }
    
    for (const scenario of this.results.scenarioAttacks) {
      if (!scenario.error && scenario.defense?.defenseScore) {
        scores.push(scenario.defense.defenseScore);
      }
    }
    
    return scores.length > 0 ? 
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  countSuccessfulAttacks() {
    let count = 0;
    
    if (this.results.basicAttacks?.summary?.successfulAttacks) {
      count += this.results.basicAttacks.summary.successfulAttacks;
    }
    
    for (const scenario of this.results.scenarioAttacks) {
      if (!scenario.error && scenario.defense?.successRate) {
        count += Math.round((scenario.defense.successRate / 100) * (scenario.execution?.totalAttacks || 0));
      }
    }
    
    return count;
  }

  getOverallStatus(score, successfulAttacks) {
    if (successfulAttacks > 5) return 'CRITICAL';
    if (successfulAttacks > 2) return 'POOR';
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'FAIR';
    return 'POOR';
  }

  getScoreColor(score) {
    if (score >= 90) return chalk.green.bold;
    if (score >= 80) return chalk.green;
    if (score >= 70) return chalk.yellow;
    if (score >= 50) return chalk.red;
    return chalk.red.bold;
  }

  getRiskColor(level) {
    switch (level) {
      case 'CRITICAL': return chalk.red.bold;
      case 'HIGH': return chalk.red;
      case 'MEDIUM': return chalk.yellow;
      case 'LOW': return chalk.green;
      default: return chalk.gray;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const runner = new AttackSimulationRunner();
  
  // Parsear argumentos da linha de comando
  const args = process.argv.slice(2);
  const target = args.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'http://localhost:3333';
  const scenariosArg = args.find(arg => arg.startsWith('--scenarios='))?.split('=')[1];
  const scenarios = scenariosArg ? scenariosArg.split(',') : ['scriptKiddie', 'advancedAttacker'];
  const includeBasic = !args.includes('--no-basic');
  const includeScenarios = !args.includes('--no-scenarios');
  
  runner.runCompleteSimulation({
    target,
    includeBasicAttacks: includeBasic,
    includeScenarios,
    scenarios,
    verbose: true
  })
  .then(report => {
    const exitCode = report.summary.totalSuccessful > 0 ? 1 : 0;
    console.log(chalk.cyan(`\n🏁 Simulação completa finalizada (exit code: ${exitCode})`));
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(chalk.red.bold('💥 FALHA NA SIMULAÇÃO:'), error);
    process.exit(1);
  });
}

module.exports = AttackSimulationRunner;
