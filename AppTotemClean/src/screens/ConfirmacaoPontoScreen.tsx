import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { DeviceService } from '../services/DeviceService';
import { LocationService } from '../services/LocationService';
import { buildApiUrl } from '../config/api';

type Props = {
  navigation: any;
  route: {
    params: {
      id: number;
      name: string;
      cpf: string;
      proximo_tipo?: string;
      proximo_tipo_nome?: string;
      ultimo_registro?: any;
    };
  };
};

const ConfirmacaoPontoScreen = ({ navigation, route }: Props) => {
  const { id, name, cpf, proximo_tipo, proximo_tipo_nome, ultimo_registro } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<any>(null);

  useEffect(() => {
    // Capturar GPS automaticamente ao entrar na tela
    captureGPS();
  }, []);

  const captureGPS = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setGpsData(location);
      console.log('GPS capturado automaticamente:', location);
    } catch (error) {
      console.log('GPS não disponível:', error);
      setGpsData(null);
    }
  };

  const confirmarPonto = async () => {
    setIsLoading(true);
    
    try {
      // Obter dados do tablet
      const tabletData = await DeviceService.getTabletDataForServer();
      
      // Preparar dados para envio
      const pontoData = {
        colaborador_id: id,
        latitude: gpsData?.latitude || null,
        longitude: gpsData?.longitude || null,
        tablet_id: tabletData?.tablet_id || null,
        tablet_name: tabletData?.tablet_name || null,
        tablet_location: tabletData?.tablet_location || null,
      };

      console.log('Enviando dados do ponto:', pontoData);

      // Enviar para API
      const url = buildApiUrl('/api/ponto/registrar-facial');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pontoData),
      });

      const data = await response.json();
      console.log('Resposta da API:', data);

      if (response.ok && data.success) {
        let successMessage = `${data.message}`;
        
        // Adicionar informações de GPS se disponível
        if (gpsData) {
          successMessage += `\n\n📍 Localização registrada`;
        }

        Alert.alert(
          '✅ Sucesso!',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('FaceRecognition'),
            },
          ]
        );
      } else {
        Alert.alert(
          '❌ Erro',
          data.error || 'Falha ao registrar ponto'
        );
      }
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('❌ Erro', 'Falha na comunicação com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const formatarDataHora = (dataHora: string | null) => {
    if (!dataHora) return 'Nenhum registro hoje';
    
    const data = new Date(dataHora);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarTipoAnterior = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      'entrada': 'Entrada',
      'parada_almoco': 'Parada para Almoço',
      'volta_almoco': 'Volta do Almoço',
      'saida': 'Saída'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.userIcon}>
            <Text style={styles.userIconText}>👤</Text>
          </View>
          <Text style={styles.welcomeText}>Olá, {name}!</Text>
          <Text style={styles.cpfText}>CPF: {cpf}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.tipoRegistroTitle}>Próximo Registro:</Text>
          <Text style={styles.tipoRegistroText}>
            {proximo_tipo_nome || 'Entrada'}
          </Text>

          {ultimo_registro && (
            <View style={styles.ultimoRegistroContainer}>
              <Text style={styles.ultimoRegistroTitle}>Último registro hoje:</Text>
              <Text style={styles.ultimoRegistroTipo}>
                {formatarTipoAnterior(ultimo_registro.tipo_registro)}
              </Text>
              <Text style={styles.ultimoRegistroData}>
                {formatarDataHora(ultimo_registro.data_hora)}
              </Text>
            </View>
          )}

          {gpsData && (
            <View style={styles.gpsContainer}>
              <Text style={styles.gpsTitle}>📍 Localização GPS:</Text>
              <Text style={styles.gpsText}>
                Lat: {gpsData.latitude?.toFixed(6)}
              </Text>
              <Text style={styles.gpsText}>
                Lng: {gpsData.longitude?.toFixed(6)}
              </Text>
              <Text style={styles.gpsAccuracy}>
                Precisão: {gpsData.accuracy?.toFixed(1)}m
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton]}
            onPress={confirmarPonto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                Confirmar {proximo_tipo_nome || 'Registro'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  userIcon: {
    width: 100,
    height: 100,
    marginBottom: 20,
    backgroundColor: '#2196F3',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconText: {
    fontSize: 40,
    color: '#FFF',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cpfText: {
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipoRegistroTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  tipoRegistroText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 30,
  },
  ultimoRegistroContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
  },
  ultimoRegistroTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ultimoRegistroTipo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  ultimoRegistroData: {
    fontSize: 14,
    color: '#999',
  },
  gpsContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
  },
  gpsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  gpsText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  gpsAccuracy: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#999',
    elevation: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#999',
  },
});

export default ConfirmacaoPontoScreen; 