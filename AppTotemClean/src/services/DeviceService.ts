import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { getApiBaseUrl } from '../config/api';

export interface TabletConfig {
  id: string;
  name: string;
  location: string;
  serverUrl: string;
  isConfigured: boolean;
}

export class DeviceService {
  private static readonly STORAGE_KEYS = {
    TABLET_CONFIG: '@tablet_config',
    DEVICE_ID: '@device_id',
  };

  // Gerar ID único do tablet
  static async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.STORAGE_KEYS.DEVICE_ID);
      
      if (!deviceId) {
        // Usar ID único do dispositivo
        const uniqueId = await DeviceInfo.getUniqueId();
        const deviceName = await DeviceInfo.getDeviceName();
        
        // Criar ID personalizado
        deviceId = `TABLET_${uniqueId.slice(-8).toUpperCase()}_${Date.now()}`;
        
        await AsyncStorage.setItem(this.STORAGE_KEYS.DEVICE_ID, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Erro ao obter ID do dispositivo:', error);
      // Fallback para ID baseado em timestamp
      return `TABLET_${Date.now()}`;
    }
  }

  // Obter informações do dispositivo
  static async getDeviceInfo() {
    try {
      const [
        deviceId,
        deviceName,
        model,
        brand,
        systemVersion,
        buildNumber,
        bundleId,
        version,
      ] = await Promise.all([
        this.getDeviceId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.getModel(),
        DeviceInfo.getBrand(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
        DeviceInfo.getVersion(),
      ]);

      return {
        deviceId,
        deviceName,
        model,
        brand,
        systemVersion,
        buildNumber,
        bundleId,
        version,
        platform: DeviceInfo.getSystemName(),
      };
    } catch (error) {
      console.error('Erro ao obter informações do dispositivo:', error);
      return null;
    }
  }

  // Salvar configuração do tablet
  static async saveTabletConfig(config: TabletConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.TABLET_CONFIG,
        JSON.stringify(config)
      );
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      throw error;
    }
  }

  // Obter configuração do tablet
  static async getTabletConfig(): Promise<TabletConfig | null> {
    try {
      const configString = await AsyncStorage.getItem(this.STORAGE_KEYS.TABLET_CONFIG);
      
      if (configString) {
        return JSON.parse(configString);
      }
      
      // Configuração padrão se não existir
      const deviceId = await this.getDeviceId();
      const defaultServerUrl = await getApiBaseUrl(); // URL dinâmica
      
      return {
        id: deviceId,
        name: `Tablet ${deviceId.slice(-4)}`,
        location: 'Não configurado',
        serverUrl: defaultServerUrl,
        isConfigured: false,
      };
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      return null;
    }
  }

  // Verificar se tablet está configurado
  static async isTabletConfigured(): Promise<boolean> {
    try {
      const config = await this.getTabletConfig();
      return config?.isConfigured || false;
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      return false;
    }
  }

  // Resetar configuração
  static async resetTabletConfig(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.TABLET_CONFIG,
        this.STORAGE_KEYS.DEVICE_ID,
      ]);
    } catch (error) {
      console.error('Erro ao resetar configuração:', error);
      throw error;
    }
  }

  // Obter dados para envio ao servidor
  static async getTabletDataForServer() {
    try {
      const [deviceInfo, config] = await Promise.all([
        this.getDeviceInfo(),
        this.getTabletConfig(),
      ]);

      return {
        tablet_id: deviceInfo?.deviceId,
        tablet_name: config?.name,
        tablet_location: config?.location,
        device_info: deviceInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao obter dados do tablet:', error);
      return null;
    }
  }
} 