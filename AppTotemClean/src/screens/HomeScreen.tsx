import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import {DeviceService, TabletConfig} from '../services/DeviceService';
import {ConnectionService, ConnectionStatus} from '../services/ConnectionService';
import HeaderTotem from '../components/HeaderTotem';
import ActionCard from '../components/ActionCard';
import StatusBar from '../components/StatusBar';
import AlertBanner from '../components/AlertBanner';
import FloatingConfigButton from '../components/FloatingConfigButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [tabletConfig, setTabletConfig] = useState<TabletConfig | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error' as 'error' | 'warning' | 'success' | 'info',
    message: '',
  });

  useEffect(() => {
    initializeApp();
  }, []);

  // Verificar conexão quando configuração mudar
  useEffect(() => {
    if (tabletConfig?.serverUrl) {
      checkConnectionStatus();
      
      // Verificar conexão a cada 30 segundos
      const connectionInterval = setInterval(checkConnectionStatus, 30000);
      
      return () => clearInterval(connectionInterval);
    } else {
      setIsOnline(false);
      setConnectionStatus(null);
    }
  }, [tabletConfig]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      const [config, device] = await Promise.all([
        DeviceService.getTabletConfig(),
        DeviceService.getDeviceInfo(),
      ]);

      setTabletConfig(config);
      setDeviceInfo(device);

      console.log('📱 Configuração carregada:', {
        name: config?.name,
        location: config?.location,
        serverUrl: config?.serverUrl,
        isConfigured: config?.isConfigured,
      });

      // Se tablet não está configurado, mostrar alerta
      if (!config?.isConfigured) {
        setAlertConfig({
          type: 'warning',
          message: '⚠️ Tablet não configurado. Configure agora para melhor funcionamento.',
        });
        setShowAlert(true);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar app:', error);
      setAlertConfig({
        type: 'error',
        message: '❌ Falha ao carregar configurações do tablet',
      });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    console.log('🔄 Verificando status de conexão...');
    
    if (!tabletConfig?.serverUrl) {
      console.log('⚠️ URL do servidor não configurada');
      setIsOnline(false);
      setConnectionStatus(null);
      return;
    }

    try {
      const status = await ConnectionService.checkConnection(tabletConfig.serverUrl);
      setConnectionStatus(status);
      setIsOnline(status.isConnected);

      console.log('📊 Status de conexão atualizado:', {
        isConnected: status.isConnected,
        responseTime: status.responseTime,
        error: status.error,
      });

      // Mostrar alerts baseados no status
      if (status.isConnected) {
        // Se acabou de conectar, mostrar sucesso
        if (!isOnline) {
          setAlertConfig({
            type: 'success',
            message: `✅ Conectado ao servidor! Tempo: ${status.responseTime}ms`,
          });
          setShowAlert(true);
        }
      } else {
        // Se estava conectado e agora perdeu conexão
        if (isOnline || !showAlert) {
          setAlertConfig({
            type: 'error',
            message: `🌐 Sem conexão: ${status.error}`,
          });
          setShowAlert(true);
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação de conexão:', error);
      setIsOnline(false);
      setConnectionStatus(null);
    }
  };

  const handleRegistrarPonto = () => {
    console.log('👆 Clique em Registrar Ponto:', { isOnline });
    
    if (!isOnline) {
      Alert.alert(
        'Sem Conexão',
        'É necessário estar conectado ao servidor para registrar ponto.\n\nVerifique as configurações de rede.',
        [
          { text: 'Configurações', onPress: handleConfiguracoes },
          { text: 'Tentar Novamente', onPress: checkConnectionStatus },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }

    console.log('🚀 Navegando para FaceRecognition...');
    navigation.navigate('FaceRecognition');
  };

  const handleCadastroFacial = () => {
    navigation.navigate('Cadastro');
  };

  const handleHistorico = () => {
    navigation.navigate('Historico');
  };

  const handleConfiguracoes = () => {
    navigation.navigate('Configuracoes');
  };

  const hideAlert = () => {
    setShowAlert(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>🚀 Inicializando Ponto Certo FG...</Text>
        <Text style={styles.loadingSubtext}>Carregando configurações do tablet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Alert Banner */}
      <AlertBanner
        visible={showAlert}
        type={alertConfig.type}
        message={alertConfig.message}
        onClose={hideAlert}
        autoHide={alertConfig.type === 'success'}
        duration={3000}
      />

      {/* Header Moderno */}
      <HeaderTotem
        tabletName={tabletConfig?.name || 'Tablet 3102'}
        location={tabletConfig?.location || 'Igarassu'}
        tabletId={deviceInfo?.deviceId || '89373102'}
        isOnline={isOnline}
        onConfigureLocation={handleConfiguracoes}
      />

      {/* Conteúdo Principal */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Grid de Cartões Principais */}
        <View style={styles.cardsGrid}>
          {/* Registrar Ponto - Ação Principal */}
          <ActionCard
            title="Registrar Ponto"
            subtitle="Reconhecimento facial"
            iconName="face"
            colors={['#007BFF', '#00AEEF']}
            onPress={handleRegistrarPonto}
            size="large"
            disabled={!isOnline}
          />

          {/* Cadastro Facial */}
          <ActionCard
            title="Cadastro Facial"
            subtitle="Primeira configuração"
            iconName="person-add"
            colors={['#28a745', '#20c997']}
            onPress={handleCadastroFacial}
            size="medium"
          />

          {/* Histórico - Ícone melhorado */}
          <ActionCard
            title="Histórico"
            subtitle="Registros deste tablet"
            iconName="description" 
            colors={['#fd7e14', '#ffb74d']}
            onPress={handleHistorico}
            size="medium"
          />
        </View>

        {/* Espaçamento extra */}
        <View style={styles.spacer} />

        {/* Configurações - Canto inferior discreto */}
        <View style={styles.configContainer}>
          <ActionCard
            title="Configurações"
            subtitle="Ajustes do tablet"
            iconName="settings"
            colors={['#6c757d', '#adb5bd']}
            onPress={handleConfiguracoes}
            size="small"
          />
        </View>

        {/* TODO: Funcionalidades Futuras */}
        {/* 
        <TouchableOpacity style={styles.hiddenSupportButton}>
          <Text style={styles.supportText}>🔧 Suporte Técnico</Text>
        </TouchableOpacity>
        */}
      </ScrollView>

      {/* Status Bar Moderno */}
      <StatusBar
        serverConnected={isOnline}
        tabletConfigured={tabletConfig?.isConfigured || false}
        appVersion="1.0.0"
        tabletId={deviceInfo?.deviceId || '89373102'}
        showAnimation={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007BFF',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  spacer: {
    height: 40,
  },
  configContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
  },
  // TODO: Estilos para funcionalidades futuras
  hiddenSupportButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderRadius: 8,
  },
  supportText: {
    fontSize: 12,
    color: '#6c757d',
  },
});

export default HomeScreen; 