import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export class LocationService {
  
  /**
   * Solicita permissões de localização
   */
  static async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineLocationGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseLocationGranted = granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        
        return fineLocationGranted || coarseLocationGranted;
      } catch (error) {
        console.warn('Erro ao solicitar permissões de localização:', error);
        return false;
      }
    }
    return true; // iOS
  }

  /**
   * Verifica se as permissões de localização estão concedidas
   */
  static async hasLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const fineLocationGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        const coarseLocationGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        
        return fineLocationGranted || coarseLocationGranted;
      } catch (error) {
        console.warn('Erro ao verificar permissões de localização:', error);
        return false;
      }
    }
    return true; // iOS
  }

  /**
   * Obtém a localização atual do dispositivo
   */
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // Verificar permissões
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Permissão Necessária',
            'Para registrar o ponto é necessário permitir o acesso à localização do tablet.\n\nVá em Configurações > Aplicativos > Ponto Certo FG > Permissões > Localização',
            [{ text: 'OK' }]
          );
          return null;
        }
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              timestamp: position.timestamp,
            };
            
            console.log('Localização obtida:', locationData);
            resolve(locationData);
          },
          (error) => {
            console.error('Erro ao obter localização:', error);
            
            let errorMessage = 'Não foi possível obter a localização do tablet.';
            
            switch (error.code) {
              case 1: // PERMISSION_DENIED
                errorMessage = 'Permissão de localização foi negada. Verifique as configurações do tablet.';
                break;
              case 2: // POSITION_UNAVAILABLE
                errorMessage = 'Localização não disponível. Verifique se o GPS está ativado.';
                break;
              case 3: // TIMEOUT
                errorMessage = 'Timeout ao obter localização. Tente novamente.';
                break;
            }
            
            Alert.alert('Erro de GPS', errorMessage);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      });
      
    } catch (error) {
      console.error('Erro no serviço de localização:', error);
      return null;
    }
  }

  /**
   * Verifica se o GPS está ativado (configuração manual necessária)
   */
  static showGPSAlert(): void {
    Alert.alert(
      'GPS Necessário',
      'Para registrar o ponto com localização precisa, ative o GPS do tablet.\n\nVá em: Configurações > Localização > Ativar',
      [
        {
          text: 'Continuar sem GPS',
          style: 'cancel',
        },
        {
          text: 'Abrir Configurações',
          onPress: () => {
            // Não há forma programática confiável de abrir configurações de GPS
            // O usuário precisa fazer manualmente
          },
        },
      ]
    );
  }
} 