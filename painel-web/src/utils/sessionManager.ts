/**
 * 🕐 GERENCIADOR DE SESSÕES - FRONTEND
 * 
 * Sistema completo de controle de sessões no frontend com:
 * - Timeout automático por inatividade
 * - Renovação automática de token
 * - Logout automático
 * - Monitoramento de atividade
 */

import { appConfig } from '../config/app';

interface SessionConfig {
  timeout: number;
  renewalThreshold: number;
  maxSessions: number;
  timeoutMinutes: number;
  renewalMinutes: number;
}

interface SessionStatus {
  id: string;
  active: boolean;
  expiresAt: string;
  timeToExpiry: number;
  needsRenewal: boolean;
  lastActivity: string;
  actionsCount: number;
}

class SessionManager {
  private config: SessionConfig | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private renewalTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private lastActivity: Date = new Date();
  private isActive: boolean = true;
  private onLogout: (() => void) | null = null;
  private onRenewal: ((token: string) => void) | null = null;
  
  // Eventos que resetam o timer de inatividade
  private activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  constructor() {
    this.setupActivityListeners();
    console.log('🕐 SessionManager: Inicializado');
  }

  /**
   * Inicializar sessão após login
   */
  async initializeSession(sessionData: any) {
    try {
      // Buscar configurações do backend
      await this.loadConfig();
      
      if (!this.config) {
        console.warn('⚠️ SessionManager: Configurações não carregadas, usando padrões');
        this.config = {
          timeout: 30 * 60 * 1000, // 30 minutos
          renewalThreshold: 5 * 60 * 1000, // 5 minutos
          maxSessions: 3,
          timeoutMinutes: 30,
          renewalMinutes: 5
        };
      }
      
      // Configurar timers
      this.setupTimeoutTimer();
      this.setupRenewalTimer();
      this.startActivityMonitoring();
      
      console.log('✅ SessionManager: Sessão inicializada', {
        timeout: `${this.config.timeoutMinutes} min`,
        renewal: `${this.config.renewalMinutes} min`
      });
      
    } catch (error) {
      console.error('❌ SessionManager: Erro ao inicializar sessão:', error);
    }
  }

  /**
   * Carregar configurações do backend
   */
  private async loadConfig(): Promise<void> {
    try {
      const response = await fetch(`${appConfig.BACKEND_URL}/session/config`);
      
      if (response.ok) {
        const data = await response.json();
        this.config = data.config;
        console.log('📋 SessionManager: Configurações carregadas', this.config);
      }
    } catch (error) {
      console.warn('⚠️ SessionManager: Falha ao carregar configurações:', error);
    }
  }

  /**
   * Configurar listeners de atividade
   */
  private setupActivityListeners(): void {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), true);
    });
  }

  /**
   * Tratar atividade do usuário
   */
  private handleActivity(): void {
    if (!this.isActive) return;
    
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime();
    
    // Só atualizar se passou mais de 1 minuto desde última atividade
    if (timeSinceLastActivity > 60000) {
      this.lastActivity = now;
      this.resetTimeoutTimer();
      console.log('👆 SessionManager: Atividade detectada, timer resetado');
    }
  }

  /**
   * Configurar timer de timeout
   */
  private setupTimeoutTimer(): void {
    if (!this.config) return;
    
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeout);
    
    console.log(`⏰ SessionManager: Timer de timeout configurado (${this.config.timeoutMinutes} min)`);
  }

  /**
   * Resetar timer de timeout
   */
  private resetTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    this.setupTimeoutTimer();
  }

  /**
   * Configurar timer de renovação
   */
  private setupRenewalTimer(): void {
    if (!this.config) return;
    
    const renewalTime = this.config.timeout - this.config.renewalThreshold;
    
    this.renewalTimer = setTimeout(() => {
      this.handleRenewal();
    }, renewalTime);
    
    console.log(`🔄 SessionManager: Timer de renovação configurado (${Math.floor(renewalTime / 60000)} min)`);
  }

  /**
   * Tratar timeout de sessão
   */
  private async handleTimeout(): Promise<void> {
    console.warn('⏰ SessionManager: Timeout de sessão atingido');
    
    try {
      // Tentar fazer logout no backend
      await this.performLogout('timeout');
      
      // Notificar aplicação
      if (this.onLogout) {
        this.onLogout();
      }
      
      // Mostrar aviso ao usuário
      this.showTimeoutWarning();
      
    } catch (error) {
      console.error('❌ SessionManager: Erro no timeout:', error);
    }
    
    this.cleanup();
  }

  /**
   * Tratar renovação de token
   */
  private async handleRenewal(): Promise<void> {
    console.log('🔄 SessionManager: Iniciando renovação de token...');
    
    try {
      const token = localStorage.getItem(appConfig.AUTH_TOKEN_KEY);
      
      if (!token) {
        console.warn('⚠️ SessionManager: Token não encontrado para renovação');
        return;
      }
      
      const response = await fetch(`${appConfig.BACKEND_URL}/session/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Atualizar token no localStorage
        localStorage.setItem(appConfig.AUTH_TOKEN_KEY, data.token);
        
        // Notificar aplicação
        if (this.onRenewal) {
          this.onRenewal(data.token);
        }
        
        console.log('✅ SessionManager: Token renovado com sucesso');
        
        // Resetar timers com nova expiração
        this.resetTimers();
        
      } else {
        console.warn('⚠️ SessionManager: Falha na renovação, forçando logout');
        await this.handleTimeout();
      }
      
    } catch (error) {
      console.error('❌ SessionManager: Erro na renovação:', error);
      await this.handleTimeout();
    }
  }

  /**
   * Realizar logout no backend
   */
  private async performLogout(reason: string): Promise<void> {
    try {
      const token = localStorage.getItem(appConfig.AUTH_TOKEN_KEY);
      
      if (token) {
        await fetch(`${appConfig.BACKEND_URL}/session/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        });
      }
      
    } catch (error) {
      console.error('❌ SessionManager: Erro no logout:', error);
    }
  }

  /**
   * Mostrar aviso de timeout
   */
  private showTimeoutWarning(): void {
    // Criar modal de aviso
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏰</div>
        <h2 style="margin: 0 0 1rem 0; color: #d32f2f;">Sessão Expirada</h2>
        <p style="margin: 0 0 1.5rem 0; color: #666;">
          Sua sessão expirou por inatividade. Você será redirecionado para a página de login.
        </p>
        <button onclick="window.location.reload()" style="
          background: #1976d2;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        ">
          Fazer Login Novamente
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-reload após 5 segundos
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  /**
   * Resetar todos os timers
   */
  private resetTimers(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer);
    }
    
    this.setupTimeoutTimer();
    this.setupRenewalTimer();
  }

  /**
   * Iniciar monitoramento de atividade
   */
  private startActivityMonitoring(): void {
    // Verificar status da sessão a cada 2 minutos
    this.activityTimer = setInterval(async () => {
      await this.checkSessionStatus();
    }, 2 * 60 * 1000);
  }

  /**
   * Verificar status da sessão no backend
   */
  private async checkSessionStatus(): Promise<void> {
    try {
      const token = localStorage.getItem(appConfig.AUTH_TOKEN_KEY);
      
      if (!token) {
        console.warn('⚠️ SessionManager: Token não encontrado');
        return;
      }
      
      const response = await fetch(`${appConfig.BACKEND_URL}/session/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ SessionManager: Sessão inválida detectada');
          await this.handleTimeout();
        }
        return;
      }
      
      const data = await response.json();
      const status: SessionStatus = data.session;
      
      // Verificar se precisa de renovação
      if (status.needsRenewal && status.timeToExpiry > 0) {
        await this.handleRenewal();
      }
      
      console.log('📊 SessionManager: Status verificado', {
        timeToExpiry: Math.floor(status.timeToExpiry / 60000) + ' min',
        needsRenewal: status.needsRenewal
      });
      
    } catch (error) {
      console.error('❌ SessionManager: Erro ao verificar status:', error);
    }
  }

  /**
   * Configurar callbacks
   */
  public setCallbacks(onLogout: () => void, onRenewal?: (token: string) => void): void {
    this.onLogout = onLogout;
    this.onRenewal = onRenewal;
  }

  /**
   * Limpar recursos
   */
  public cleanup(): void {
    this.isActive = false;
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    
    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer);
      this.renewalTimer = null;
    }
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    // Remover listeners
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity.bind(this), true);
    });
    
    console.log('🧹 SessionManager: Recursos limpos');
  }

  /**
   * Obter status atual
   */
  public getStatus(): { isActive: boolean; lastActivity: Date; config: SessionConfig | null } {
    return {
      isActive: this.isActive,
      lastActivity: this.lastActivity,
      config: this.config
    };
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;
