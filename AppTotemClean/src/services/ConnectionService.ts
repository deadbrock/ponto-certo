export interface ConnectionStatus {
  isConnected: boolean;
  serverUrl: string | null;
  responseTime: number | null;
  error: string | null;
  lastChecked: Date;
  method?: string; // Método usado para conectar
}

import { getApiBaseUrl } from '../config/api';

export class ConnectionService {
  private static readonly TIMEOUT_MS = 5000; // 5 segundos
  private static readonly HEALTH_ENDPOINTS = ['/health', '/api/health', '/status']; // Múltiplos endpoints
  private static lastWorkingEndpoint: string | null = null; // Cache do endpoint que funciona

  /**
   * Testa conectividade com endpoint específico
   */
  static async testEndpoint(serverUrl: string, endpoint: string = ''): Promise<ConnectionStatus> {
    const startTime = Date.now();
    const fullUrl = serverUrl.replace(/\/+$/, '') + endpoint;
    
    const result: ConnectionStatus = {
      isConnected: false,
      serverUrl,
      responseTime: null,
      error: null,
      lastChecked: new Date(),
      method: endpoint || 'root',
    };

    try {
      console.log(`🔗 Testando: ${fullUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(fullUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      console.log(`📡 Resposta de ${endpoint || 'root'}:`, {
        status: response.status,
        responseTime: responseTime + 'ms',
      });

      // Aceitar respostas 200-299 como sucesso
      if (response.status >= 200 && response.status < 300) {
        result.isConnected = true;
        result.responseTime = responseTime;
        this.lastWorkingEndpoint = endpoint; // Cache do endpoint que funciona
        console.log(`✅ Conectado via ${endpoint || 'root'}!`);
      } else if (response.status === 404 && endpoint !== '') {
        // 404 em endpoint específico não é erro grave
        result.error = `Endpoint ${endpoint} não disponível`;
        console.log(`ℹ️ Endpoint ${endpoint} não encontrado (normal)`);
      } else {
        result.error = `Status ${response.status}`;
        console.warn(`⚠️ Resposta inesperada:`, result.error);
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;

      if (error.name === 'AbortError') {
        result.error = 'Timeout na conexão';
        console.warn('⏰ Timeout na conexão');
      } else if (error.message?.includes('Network request failed')) {
        result.error = 'Servidor inacessível';
        console.warn('🌐 Servidor inacessível');
      } else {
        result.error = error.message || 'Erro desconhecido';
        console.error('❌ Erro:', error);
      }
    }

    return result;
  }

  /**
   * Verificação inteligente com múltiplos endpoints
   */
  static async checkConnection(serverUrl?: string): Promise<ConnectionStatus> {
    // Se não fornecido, usar URL dinâmica da API
    if (!serverUrl || serverUrl.trim() === '') {
      try {
        serverUrl = await getApiBaseUrl();
        console.log('🔧 Usando URL dinâmica da API:', serverUrl);
      } catch (error) {
        console.error('Erro ao obter URL da API:', error);
        return {
          isConnected: false,
          serverUrl: null,
          responseTime: null,
          error: 'Falha ao configurar URL do servidor',
          lastChecked: new Date(),
        };
      }
    }

    console.log('🚀 Verificando conectividade inteligente...');

    // Se já sabemos que um endpoint funciona, testar ele primeiro
    if (this.lastWorkingEndpoint) {
      console.log(`🔄 Testando último endpoint que funcionou: ${this.lastWorkingEndpoint}`);
      const result = await this.testEndpoint(serverUrl, this.lastWorkingEndpoint);
      if (result.isConnected) {
        console.log('✅ Conexão via endpoint conhecido funcionou!');
        return result;
      }
    }

    // Teste direto na raiz primeiro (mais provável de funcionar)
    console.log('🔗 Testando conexão na raiz do servidor...');
    let result = await this.testEndpoint(serverUrl);
    
    if (result.isConnected) {
      console.log('✅ Conectado via raiz do servidor!');
      return result;
    }

    // Se raiz falhar, tentar endpoints de health
    console.log('🔄 Testando endpoints de health como fallback...');
    for (const endpoint of this.HEALTH_ENDPOINTS) {
      result = await this.testEndpoint(serverUrl, endpoint);
      if (result.isConnected) {
        console.log(`✅ Conectado via ${endpoint}!`);
        return result;
      }
    }

    // Se nenhum funcionar, retornar último resultado
    console.log('❌ Nenhum endpoint disponível');
    result.error = result.error || 'Servidor não responde';
    return result;
  }

  /**
   * Reset do cache de endpoint
   */
  static resetEndpointCache(): void {
    this.lastWorkingEndpoint = null;
    console.log('🔄 Cache de endpoint resetado');
  }
} 