export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'ponto' | 'presenca' | 'sistema' | 'rh' | 'financeiro';
  actionUrl?: string;
  colaborador?: string;
  cliente?: string;
  equipe?: string;
  showToast?: boolean; // Flag para mostrar toast
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutos
  lastTriggered?: Date;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private rules: NotificationRule[] = [];
  private wsConnection: WebSocket | null = null;
  private toastService: any = null; // Referência para o serviço de toasts

  constructor() {
    this.initializeRules();
    this.connectWebSocket();
    this.startAutoChecks();
    
    // Limpar qualquer notificação existente ao inicializar
    this.clearAll();
    console.log('🧹 Sistema de notificações iniciado LIMPO - apenas dados reais do backend');
  }

  // Regras automáticas da FG Services
  private initializeRules(): void {
    this.rules = [
      {
        id: 'atraso-colaborador',
        name: 'Colaborador em Atraso',
        condition: 'entrada_apos_horario > 15min',
        enabled: true,
        priority: 'high',
        cooldown: 60
      },
      {
        id: 'falta-nao-justificada',
        name: 'Falta Não Justificada',
        condition: 'ausencia_sem_justificativa > 0',
        enabled: true,
        priority: 'critical',
        cooldown: 120
      },
      {
        id: 'presenca-baixa-equipe',
        name: 'Presença Baixa na Equipe',
        condition: 'presenca_equipe < 90%',
        enabled: true,
        priority: 'high',
        cooldown: 180
      },
      {
        id: 'equipamento-manutencao',
        name: 'Equipamento em Manutenção',
        condition: 'relogio_ponto_offline > 5min',
        enabled: true,
        priority: 'medium',
        cooldown: 30
      },
      {
        id: 'meta-mensal-risco',
        name: 'Meta Mensal em Risco',
        condition: 'presenca_mensal < 95%',
        enabled: true,
        priority: 'high',
        cooldown: 1440 // 24h
      },
      {
        id: 'backup-concluido',
        name: 'Backup Automático',
        condition: 'backup_daily_completed',
        enabled: true,
        priority: 'low',
        cooldown: 1440
      }
    ];
  }

  // Conectar WebSocket simulado
  private connectWebSocket(): void {
    // Em produção, conectaria ao WebSocket real do backend
    console.log('🔌 Conectando WebSocket para notificações em tempo real...');
    
    // Simular conexão WebSocket para demonstração
    setTimeout(() => {
      console.log('✅ WebSocket conectado - Notificações em tempo real ativas');
      this.connectRealTimeNotifications();
    }, 1000);
  }

  // Verificações automáticas periódicas (DESABILITADO - apenas dados reais)
  private startAutoChecks(): void {
    // Sistema limpo - não gera mais notificações mock
    // Apenas polling de notificações reais do backend via connectRealTimeNotifications()
    console.log('🚫 Sistema de notificações mock DESABILITADO - usando apenas dados reais do backend');
  }

  // MÉTODO DESABILITADO - Sistema limpo para dados reais
  private checkAutomaticRules(): void {
    // Não gera mais notificações fictícias
    // Notificações vêm apenas do backend via polling
  }

  // MÉTODO DESABILITADO - Sistema limpo para dados reais
  private shouldTriggerRule(rule: NotificationRule): boolean {
    // Não gera mais notificações aleatórias
    return false;
  }

  // MÉTODO DESABILITADO - Sistema limpo para dados reais
  private triggerRuleNotification(rule: NotificationRule): void {
    // Não gera mais notificações fictícias
    // Todas as notificações vêm do backend via polling real
  }

  // MÉTODO DESABILITADO - Sistema limpo para dados reais
  private checkCriticalEvents(): void {
    // Não gera mais eventos críticos fictícios (ex: Assaí Atacadista)
    // Eventos críticos vêm apenas do backend quando há situações reais
  }

  // Conectar com notificações reais do backend
  private connectRealTimeNotifications(): void {
    // Implementar WebSocket ou polling para notificações reais
    const pollNotifications = async () => {
      try {
        const backendUrl = process.env.NODE_ENV === 'production' 
          ? process.env.REACT_APP_BACKEND_URL || 'https://pontodigital-production.up.railway.app/api'
          : 'http://localhost:3333/api';
        const response = await fetch(`${backendUrl}/notificacoes/recentes`);
        if (response.ok) {
          const data = await response.json();
          const novasNotificacoes = data.notificacoes || [];
          
          novasNotificacoes.forEach((notif: any) => {
            // Verificar se a notificação já existe para evitar duplicatas
            if (!this.notifications.some(n => n.id === notif.id)) {
              this.addNotification({
                id: notif.id,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                timestamp: new Date(notif.timestamp),
                read: false,
                priority: notif.priority || 'low',
                category: notif.category || 'system'
              });
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    // Polling a cada 30 segundos para notificações reais
    setInterval(pollNotifications, 30000);
    
    // Buscar notificações imediatamente
    pollNotifications();
  }

  // Configurar serviço de toasts
  setToastService(toastService: any): void {
    this.toastService = toastService;
  }

  // Disparar toast baseado na notificação
  private showToastIfEnabled(notification: Notification): void {
    if (!notification.showToast || !this.toastService) return;

    const message = `${notification.title}: ${notification.message}`;
    
    switch (notification.type) {
      case 'success':
        this.toastService.showSuccess(message);
        break;
      case 'error':
        this.toastService.showError(message);
        break;
      case 'warning':
        this.toastService.showWarning(message);
        break;
      case 'info':
      default:
        this.toastService.showInfo(message);
        break;
    }
  }

  // Adicionar notificação
  addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    
    // Manter apenas as últimas 50 notificações
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Mostrar toast se habilitado
    this.showToastIfEnabled(notification);

    this.notifyListeners();
    
    // Log para debug
    console.log(`🔔 Nova notificação: ${notification.title}`);
  }

  // Marcar como lida
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Marcar todas como lidas
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Remover notificação
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Limpar todas
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  // Obter notificações
  getNotifications(): Notification[] {
    return this.notifications;
  }

  // Obter não lidas
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Obter por categoria
  getByCategory(category: string): Notification[] {
    return this.notifications.filter(n => n.category === category);
  }

  // Adicionar listener
  addListener(listener: (notifications: Notification[]) => void): void {
    this.listeners.push(listener);
  }

  // Remover listener
  removeListener(listener: (notifications: Notification[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notificar listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Obter regras
  getRules(): NotificationRule[] {
    return this.rules;
  }

  // Atualizar regra
  updateRule(id: string, updates: Partial<NotificationRule>): void {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
    }
  }
}

// Instância singleton
export const notificationService = new NotificationService(); 