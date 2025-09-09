const axios = require('axios');

async function testeSimples() {
  try {
    console.log('🧪 Teste simples do endpoint de relatórios...');
    
    // Testar se o servidor está rodando
    const healthResponse = await axios.get('http://localhost:3333');
    console.log('✅ Servidor está rodando!');
    
    // Testar login
    const loginResponse = await axios.post('http://localhost:3333/api/auth/login-admin', {
      email: 'admin@teste.com',
      senha: 'admin123'
    });
    
    console.log('✅ Login bem-sucedido!');
    console.log('🔑 Token obtido:', loginResponse.data.token ? 'SIM' : 'NÃO');
    
    // Testar endpoint de listagem de arquivos
    const token = loginResponse.data.token;
    const arquivosResponse = await axios.get('http://localhost:3333/api/relatorios/arquivos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Endpoint de arquivos funcionando!');
    console.log('📊 Arquivos encontrados:', arquivosResponse.data.dados.length);
    
    console.log('\n🎉 Todos os testes básicos passaram!');
    console.log('📤 Para testar upload, use um cliente como Postman ou Insomnia');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📄 Status:', error.response.status);
      console.error('📋 Dados:', error.response.data);
    }
  }
}

testeSimples();