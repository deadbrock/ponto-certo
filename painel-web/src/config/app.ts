// Configurações globais da aplicação
export const appConfig = {
  // Modo de desenvolvimento - configurar para false em produção
  MOCK_DATA_ENABLED: false, // ✅ DESABILITADO - usando dados reais
  
  // URLs do backend
  BACKEND_URL: 'http://localhost:3333/api',
  
  // Configurações de autenticação
  AUTH_TOKEN_KEY: 'token',
  
  // Configurações de interface
  APP_NAME: 'Ponto Certo FG',
  APP_DESCRIPTION: 'Sistema de Gestão Digital',
  
  // Configurações de desenvolvimento
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  
  // Configurações de dados reais
  USE_REAL_BACKEND: true, // ✅ ATIVADO - conectar com backend real
  
  // Timeouts e configurações de rede
  API_TIMEOUT: 10000, // 10 segundos
  
  // Mensagens para o usuário
  MESSAGES: {
    LOADING: 'Carregando dados...',
    ERROR_LOADING: 'Erro ao carregar dados do servidor',
    NO_DATA: 'Nenhum dado disponível',
    CONNECTION_ERROR: 'Erro de conexão com o servidor'
  }
};

// Função utilitária para verificar se deve usar dados mock
export const shouldUseMockData = (): boolean => {
  return appConfig.MOCK_DATA_ENABLED && !appConfig.USE_REAL_BACKEND;
};

// Função para obter a URL base da API
export const getApiBaseUrl = (): string => {
  return appConfig.BACKEND_URL;
};

// Função para verificar se está em modo debug
export const isDebugMode = (): boolean => {
  return appConfig.DEBUG_MODE;
}; 