import DeviceInfo from 'react-native-device-info';

// Função para detectar se está rodando em emulador
const getServerUrl = async (): Promise<string> => {
  try {
    const isEmulator = await DeviceInfo.isEmulator();
    
    if (isEmulator) {
      // Para emulador Android: usar 10.0.2.2 (mapeia para localhost do host)
      return 'http://10.0.2.2:3333';
    } else {
      // Para dispositivo físico: usar IP da rede local
      return 'http://192.168.1.99:3333';
    }
  } catch (error) {
    console.warn('Erro ao detectar emulador, usando IP da rede local:', error);
    return 'http://192.168.1.99:3333';
  }
};

// Configurações da API Backend
export const API_CONFIG = {
  // Backend Node.js/Express com PostgreSQL
  BASE_URL: 'http://192.168.1.99:3333', // Será sobrescrito dinamicamente
  
  ENDPOINTS: {
    FACE_RECOGNITION: '/api/face/face-recognition/',
    REGISTER_POINT: '/api/face/register-point/',
    ADD_PERSON: '/api/face/add-person/',
    LIST_PERSONS: '/api/face/list-persons/',
    AUTH_LOGIN: '/api/auth/login/',
    AUTH_REGISTER: '/api/auth/register/',
    PONTO_HISTORY: '/api/ponto/history/',
  },
  
  // Configurações de timeout
  TIMEOUT: 30000, // 30 segundos
  
  // Headers padrão
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Inicializar URL correta baseada no tipo de dispositivo
let isUrlInitialized = false;

const initializeApiUrl = async () => {
  if (!isUrlInitialized) {
    API_CONFIG.BASE_URL = await getServerUrl();
    isUrlInitialized = true;
    console.log('🔧 URL da API configurada:', API_CONFIG.BASE_URL);
  }
};

// Função helper para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Função helper para fazer requisições com timeout e inicialização automática
export const apiRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Garantir que a URL está configurada corretamente
  await initializeApiUrl();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Função para obter URL configurada dinamicamente
export const getApiBaseUrl = async (): Promise<string> => {
  await initializeApiUrl();
  return API_CONFIG.BASE_URL;
};

// Exportar função para forçar reconfiguração (útil para testes)
export const reconfigureApiUrl = async (): Promise<void> => {
  isUrlInitialized = false;
  await initializeApiUrl();
}; 