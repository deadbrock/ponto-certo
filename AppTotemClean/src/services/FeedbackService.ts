import { Vibration, Alert } from 'react-native';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export class FeedbackService {
  /**
   * Feedback tátil baseado no tipo
   */
  static vibrate(type: FeedbackType): void {
    try {
      switch (type) {
        case 'success':
          // Vibração dupla para sucesso
          Vibration.vibrate([0, 200, 100, 200]);
          break;
        case 'error':
          // Vibração longa para erro
          Vibration.vibrate(500);
          break;
        case 'warning':
          // Vibração tripla para aviso
          Vibration.vibrate([0, 100, 50, 100, 50, 100]);
          break;
        case 'info':
          // Vibração curta para info
          Vibration.vibrate(100);
          break;
        default:
          Vibration.vibrate(100);
      }
    } catch (error) {
      console.warn('Erro na vibração:', error);
    }
  }

  /**
   * Feedback sonoro simulado (usando Alert com sons do sistema)
   */
  static playSound(type: FeedbackType, message?: string): void {
    try {
      // Em uma implementação real, usaria react-native-sound ou similar
      const sounds = {
        success: '🔔 Sucesso!',
        error: '⚠️ Erro!',
        warning: '⚡ Atenção!',
        info: 'ℹ️ Informação',
      };

      if (message) {
        // Som do sistema via Alert
        Alert.alert(
          sounds[type],
          message,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.warn('Erro no som:', error);
    }
  }

  /**
   * Feedback completo: som + vibração
   */
  static complete(type: FeedbackType, message?: string): void {
    this.vibrate(type);
    
    // Delay pequeno para não conflitar
    if (message) {
      setTimeout(() => {
        this.playSound(type, message);
      }, 100);
    }
  }

  /**
   * Feedback específico para registro de ponto
   */
  static pontoRegistrado(colaboradorNome?: string): void {
    const message = colaboradorNome 
      ? `Ponto registrado com sucesso!\n\nColaborador: ${colaboradorNome}`
      : 'Ponto registrado com sucesso!';
    
    this.complete('success', message);
  }

  /**
   * Feedback para erro de reconhecimento
   */
  static erroReconhecimento(): void {
    this.complete('error', 'Falha no reconhecimento facial.\nTente novamente.');
  }

  /**
   * Feedback para conexão perdida
   */
  static conexaoPerdida(): void {
    this.complete('warning', 'Conexão perdida com servidor.\nVerifique a rede.');
  }

  /**
   * Feedback para configuração
   */
  static configuracaoSalva(): void {
    this.complete('info', 'Configurações salvas com sucesso!');
  }

  /**
   * Apenas vibração sutil (para botões)
   */
  static subtleHaptic(): void {
    try {
      Vibration.vibrate(50);
    } catch (error) {
      console.warn('Erro na vibração sutil:', error);
    }
  }
} 