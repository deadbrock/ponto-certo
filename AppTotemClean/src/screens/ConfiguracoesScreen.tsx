import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {DeviceService, TabletConfig} from '../services/DeviceService';

interface ConfiguracoesScreenProps {
  navigation: any;
}

const ConfiguracoesScreen: React.FC<ConfiguracoesScreenProps> = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [config, setConfig] = useState<TabletConfig | null>(null);
  
  // Estados para edição
  const [tabletName, setTabletName] = useState('');
  const [tabletLocation, setTabletLocation] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      
      const [deviceData, tabletConfig] = await Promise.all([
        DeviceService.getDeviceInfo(),
        DeviceService.getTabletConfig(),
      ]);

      setDeviceInfo(deviceData);
      setConfig(tabletConfig);

      if (tabletConfig) {
        setTabletName(tabletConfig.name);
        setTabletLocation(tabletConfig.location);
        setServerUrl(tabletConfig.serverUrl);
        setIsConfigured(tabletConfig.isConfigured);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveConfigurations = async () => {
    try {
      setSaving(true);

      if (!tabletName.trim()) {
        Alert.alert('Erro', 'Nome do tablet é obrigatório');
        return;
      }

      if (!tabletLocation.trim()) {
        Alert.alert('Erro', 'Localização do tablet é obrigatória');
        return;
      }

      if (!serverUrl.trim()) {
        Alert.alert('Erro', 'URL do servidor é obrigatória');
        return;
      }

      const newConfig: TabletConfig = {
        id: config?.id || await DeviceService.getDeviceId(),
        name: tabletName.trim(),
        location: tabletLocation.trim(),
        serverUrl: serverUrl.trim(),
        isConfigured: isConfigured,
      };

      await DeviceService.saveTabletConfig(newConfig);
      setConfig(newConfig);

      Alert.alert(
        'Sucesso',
        'Configurações salvas com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const resetConfigurations = () => {
    Alert.alert(
      'Resetar Configurações',
      'Tem certeza que deseja resetar todas as configurações? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeviceService.resetTabletConfig();
              Alert.alert(
                'Sucesso',
                'Configurações resetadas com sucesso!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{name: 'Home'}],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Erro ao resetar:', error);
              Alert.alert('Erro', 'Falha ao resetar configurações');
            }
          },
        },
      ]
    );
  };

  const testConnection = async () => {
    try {
      setSaving(true);
      
      if (!serverUrl.trim()) {
        Alert.alert('Erro', 'URL do servidor não pode estar vazia');
        return;
      }
      
      // Usar endpoint específico da API para teste
      const testUrl = serverUrl.trim() + '/api/face/list-persons/';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log('Testando conexão com:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('Resposta do servidor:', data);
        Alert.alert(
          'Sucesso', 
          `Conexão estabelecida!\nServidor respondeu: ${data.success ? 'API funcionando' : 'API com problemas'}`
        );
      } else {
        Alert.alert('Erro', `Servidor retornou status: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      
      let errorMessage = 'Falha na conexão com o servidor';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout: Servidor demorou muito para responder';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Falha de rede: Verifique se o tablet e servidor estão na mesma rede';
        }
      }
      
      Alert.alert('Erro de Conexão', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configurações do Tablet</Text>
      </View>

      {/* Informações do Dispositivo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Dispositivo</Text>
        
        {deviceInfo && (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID do Tablet:</Text>
              <Text style={styles.infoValue}>{deviceInfo.deviceId}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome do Dispositivo:</Text>
              <Text style={styles.infoValue}>{deviceInfo.deviceName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modelo:</Text>
              <Text style={styles.infoValue}>{deviceInfo.model}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Marca:</Text>
              <Text style={styles.infoValue}>{deviceInfo.brand}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plataforma:</Text>
              <Text style={styles.infoValue}>{deviceInfo.platform}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão do Sistema:</Text>
              <Text style={styles.infoValue}>{deviceInfo.systemVersion}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão do App:</Text>
              <Text style={styles.infoValue}>{deviceInfo.version}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Configurações do Tablet */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações do Tablet</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nome do Tablet</Text>
          <TextInput
            style={styles.textInput}
            value={tabletName}
            onChangeText={setTabletName}
            placeholder="Ex: Tablet Recepção 01"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Localização</Text>
          <TextInput
            style={styles.textInput}
            value={tabletLocation}
            onChangeText={setTabletLocation}
            placeholder="Ex: Recepção Principal"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>URL do Servidor</Text>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.100:3333"
            placeholderTextColor="#999"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Tablet Configurado</Text>
          <Switch
            value={isConfigured}
            onValueChange={setIsConfigured}
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={isConfigured ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Ações */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testConnection}
          disabled={saving}>
          <Text style={styles.testButtonText}>
            {saving ? 'Testando...' : 'Testar Conexão'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveConfigurations}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetConfigurations}
          disabled={saving}>
          <Text style={styles.resetButtonText}>Resetar Configurações</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ponto Certo FG - Versão 1.0.0
        </Text>
        <Text style={styles.footerText}>
          Tablet ID: {deviceInfo?.deviceId?.slice(-8)}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionsSection: {
    margin: 15,
  },
  testButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ConfiguracoesScreen; 