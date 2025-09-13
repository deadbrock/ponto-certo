/**
 * 🚀 EXECUTOR DE TESTES DE SEGURANÇA RBAC
 * 
 * Script para executar e reportar testes de segurança do sistema RBAC
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const RBACSecurityTester = require('./rbac-security-tests');

// Configurar ambiente de teste
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-rbac-testing';

async function runRBACSecurityTests() {
  console.log('🛡️ INICIANDO TESTES DE SEGURANÇA RBAC');
  console.log('=====================================');
  
  let app;
  let server;
  
  try {
    // Configurar aplicação de teste
    app = express();
    app.use(express.json());
    
    // Importar middlewares e rotas necessários
    const authMiddleware = require('../../src/api/middlewares/authMiddleware');
    const rbacRoutes = require('../../src/api/routes/rbacRoutes');
    
    // Configurar rotas de teste
    app.use('/api/rbac', rbacRoutes);
    
    // Iniciar servidor de teste
    server = app.listen(0, () => {
      console.log(`🔧 Servidor de teste iniciado na porta ${server.address().port}`);
    });
    
    // Executar testes
    const tester = new RBACSecurityTester(app);
    const report = await tester.runAllTests();
    
    // Exibir resultados
    displayResults(report);
    
    // Salvar relatório
    await saveReport(report);
    
    // Verificar se passou nos testes críticos
    const criticalVulns = report.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    if (criticalVulns.length > 0) {
      console.log('❌ TESTES FALHARAM - Vulnerabilidades críticas encontradas');
      process.exit(1);
    } else {
      console.log('✅ TODOS OS TESTES PASSARAM');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução dos testes:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

/**
 * Exibir resultados dos testes
 */
function displayResults(report) {
  console.log('\n📊 RESULTADOS DOS TESTES RBAC');
  console.log('=============================');
  
  // Resumo geral
  console.log(`\n📈 RESUMO GERAL:`);
  console.log(`   Total de testes: ${report.summary.totalTests}`);
  console.log(`   Testes aprovados: ${report.summary.passedTests}`);
  console.log(`   Testes falhados: ${report.summary.failedTests}`);
  console.log(`   Taxa de aprovação: ${report.summary.passRate}%`);
  console.log(`   Vulnerabilidades encontradas: ${report.summary.vulnerabilitiesFound}`);
  
  // Breakdown por severidade
  if (report.summary.vulnerabilitiesFound > 0) {
    console.log(`\n🚨 VULNERABILIDADES POR SEVERIDADE:`);
    Object.entries(report.summary.severityBreakdown).forEach(([severity, count]) => {
      const icon = {
        'CRITICAL': '🔴',
        'HIGH': '🟠', 
        'MEDIUM': '🟡',
        'LOW': '🟢'
      }[severity] || '⚪';
      console.log(`   ${icon} ${severity}: ${count}`);
    });
  }
  
  // Detalhes das vulnerabilidades
  if (report.vulnerabilities.length > 0) {
    console.log(`\n🔍 DETALHES DAS VULNERABILIDADES:`);
    report.vulnerabilities.forEach((vuln, index) => {
      const icon = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡', 
        'LOW': '🟢'
      }[vuln.severity] || '⚪';
      
      console.log(`\n   ${index + 1}. ${icon} ${vuln.severity} - ${vuln.type}`);
      console.log(`      ${vuln.description}`);
    });
  }
  
  // Resultados por categoria
  console.log(`\n📋 RESULTADOS POR CATEGORIA:`);
  const categories = [...new Set(report.testResults.map(t => t.category))];
  
  categories.forEach(category => {
    const categoryTests = report.testResults.filter(t => t.category === category);
    const passed = categoryTests.filter(t => t.passed).length;
    const total = categoryTests.length;
    const rate = Math.round((passed / total) * 100);
    
    const status = rate === 100 ? '✅' : rate >= 80 ? '⚠️' : '❌';
    console.log(`   ${status} ${category}: ${passed}/${total} (${rate}%)`);
    
    // Mostrar testes falhados
    const failed = categoryTests.filter(t => !t.passed);
    if (failed.length > 0) {
      failed.forEach(test => {
        console.log(`      ❌ ${test.testName}`);
      });
    }
  });
  
  // Recomendações
  if (report.recommendations.length > 0) {
    console.log(`\n💡 RECOMENDAÇÕES:`);
    report.recommendations.forEach((rec, index) => {
      const icon = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢',
        'INFO': 'ℹ️'
      }[rec.priority] || '📌';
      
      console.log(`   ${index + 1}. ${icon} ${rec.message}`);
      if (rec.action) {
        console.log(`      Ação: ${rec.action}`);
      }
    });
  }
}

/**
 * Salvar relatório em arquivo
 */
async function saveReport(report) {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rbac-security-test-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Relatório salvo em: ${filepath}`);
    
    // Também salvar versão resumida em texto
    const textReport = generateTextReport(report);
    const textFilename = `rbac-security-test-${timestamp}.txt`;
    const textFilepath = path.join(reportsDir, textFilename);
    
    fs.writeFileSync(textFilepath, textReport);
    console.log(`📄 Relatório em texto salvo em: ${textFilepath}`);
    
  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error);
  }
}

/**
 * Gerar relatório em texto
 */
function generateTextReport(report) {
  const lines = [];
  
  lines.push('🛡️ RELATÓRIO DE TESTES DE SEGURANÇA RBAC');
  lines.push('==========================================');
  lines.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');
  
  // Resumo
  lines.push('📊 RESUMO EXECUTIVO:');
  lines.push(`- Total de testes executados: ${report.summary.totalTests}`);
  lines.push(`- Testes aprovados: ${report.summary.passedTests}`);
  lines.push(`- Testes falhados: ${report.summary.failedTests}`);
  lines.push(`- Taxa de aprovação: ${report.summary.passRate}%`);
  lines.push(`- Vulnerabilidades encontradas: ${report.summary.vulnerabilitiesFound}`);
  lines.push('');
  
  // Vulnerabilidades
  if (report.vulnerabilities.length > 0) {
    lines.push('🚨 VULNERABILIDADES IDENTIFICADAS:');
    report.vulnerabilities.forEach((vuln, index) => {
      lines.push(`${index + 1}. [${vuln.severity}] ${vuln.type}`);
      lines.push(`   ${vuln.description}`);
      lines.push('');
    });
  }
  
  // Recomendações
  if (report.recommendations.length > 0) {
    lines.push('💡 RECOMENDAÇÕES:');
    report.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. [${rec.priority}] ${rec.message}`);
      if (rec.action) {
        lines.push(`   Ação: ${rec.action}`);
      }
      lines.push('');
    });
  }
  
  // Detalhes por categoria
  lines.push('📋 DETALHES POR CATEGORIA:');
  const categories = [...new Set(report.testResults.map(t => t.category))];
  
  categories.forEach(category => {
    const categoryTests = report.testResults.filter(t => t.category === category);
    const passed = categoryTests.filter(t => t.passed).length;
    const total = categoryTests.length;
    
    lines.push(`\n${category}:`);
    lines.push(`- Aprovados: ${passed}/${total}`);
    
    const failed = categoryTests.filter(t => !t.passed);
    if (failed.length > 0) {
      lines.push('- Falhados:');
      failed.forEach(test => {
        lines.push(`  * ${test.testName}`);
      });
    }
  });
  
  return lines.join('\n');
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runRBACSecurityTests().catch(console.error);
}

module.exports = { runRBACSecurityTests };
