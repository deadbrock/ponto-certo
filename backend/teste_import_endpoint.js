const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testarImportEndpoint() {
  try {
    console.log('🧪 Testando endpoint de importação de relatórios...');
    
    // Configurações
    const baseUrl = 'http://localhost:3333';
    const arquivoTeste = path.join(__dirname, 'teste_exemplo_ponto.txt');
    
    // Verificar se arquivo existe
    if (!fs.existsSync(arquivoTeste)) {
      console.error('❌ Arquivo de teste não encontrado:', arquivoTeste);
      process.exit(1);
    }
    
    console.log('📄 Arquivo de teste:', arquivoTeste);
    console.log('📊 Tamanho do arquivo:', fs.statSync(arquivoTeste).size, 'bytes');
    
    // Primeiro, vamos fazer login como admin para obter token
    console.log('\n🔐 Fazendo login como admin...');
    
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login-admin`, {
      email: 'admin@teste.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido! Token obtido.');
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('arquivo', fs.createReadStream(arquivoTeste), {
      filename: 'teste_ponto.txt',
      contentType: 'text/plain'
    });
    
    console.log('\n📤 Enviando arquivo para importação...');
    
    // Fazer request para importar arquivo
    const importResponse = await axios.post(
      `${baseUrl}/api/relatorios/importar-txt`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('\n🎉 Importação realizada com sucesso!');
    console.log('📊 Resultado:', JSON.stringify(importResponse.data, null, 2));
    
    // Buscar registros importados
    console.log('\n🔍 Verificando registros importados...');
    
    const registrosResponse = await axios.get(
      `${baseUrl}/api/relatorios/registros?origem=arquivo_txt&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('📋 Registros encontrados:', registrosResponse.data.dados.length);
    console.log('📊 Dados dos registros:');
    registrosResponse.data.dados.forEach((registro, index) => {
      console.log(`  ${index + 1}. ${registro.colaborador_nome} - ${registro.data_hora} (${registro.origem})`);
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    
    if (error.response) {
      console.error('📄 Resposta do servidor:', error.response.status);
      console.error('📋 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(() => {
  testarImportEndpoint();
}, 3000);