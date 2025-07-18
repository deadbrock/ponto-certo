import React, {useState, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {API_CONFIG, buildApiUrl, apiRequest} from '../config/api';
import {DeviceService} from '../services/DeviceService';

interface FaceRecognitionScreenProps {
  navigation: any;
}

const FaceRecognitionScreen: React.FC<FaceRecognitionScreenProps> = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const cameraRef = useRef<RNCamera>(null);

  // Solicitar permissões da câmera
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permissão da Câmera',
            message: 'Este app precisa acessar sua câmera para capturar fotos.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Capturar foto
  const takePicture = async () => {
    if (cameraRef.current) {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão da câmera negada');
        return;
      }

      setIsLoading(true);
      try {
        const options = {
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        };
        
        const data = await cameraRef.current.takePictureAsync(options);
        setCapturedImage(data.uri);
        
        // Enviar para API de reconhecimento facial
        await sendToFaceRecognitionAPI(data.uri);
        
      } catch (error) {
        console.error('Erro ao capturar foto:', error);
        Alert.alert('Erro', 'Falha ao capturar foto');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Enviar para API Backend
  const sendToFaceRecognitionAPI = async (imageUri: string) => {
    try {
      // Obter dados do tablet
      const tabletData = await DeviceService.getTabletDataForServer();
      
      // Criar FormData para envio
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'face_recognition.jpg',
      } as any);

      // Adicionar dados do tablet
      if (tabletData) {
        formData.append('tablet_id', tabletData.tablet_id);
        formData.append('tablet_name', tabletData.tablet_name);
        formData.append('tablet_location', tabletData.tablet_location);
        formData.append('timestamp', tabletData.timestamp);
      }

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.FACE_RECOGNITION);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      setLastResult(result);
      
      if (response.ok) {
        if (result.recognized && result.person) {
          // Pessoa reconhecida - verificar próximo tipo de registro
          await verificarProximoTipoENavegar(result.person);
        } else {
          // Pessoa não reconhecida - sugerir cadastro
          Alert.alert(
            '❌ Pessoa Não Reconhecida',
            'Não foi possível identificar seu rosto.\n\nDeseja fazer o cadastro facial?',
            [
              {
                text: 'Fazer Cadastro',
                onPress: () => {
                  resetCapture();
                  navigation.navigate('Cadastro');
                },
              },
              {
                text: 'Tentar Novamente',
                onPress: () => resetCapture(),
              },
            ]
          );
        }
      } else {
        Alert.alert('Erro', result.message || 'Falha no reconhecimento facial');
      }
    } catch (error) {
      console.error('Erro na API:', error);
      Alert.alert('Erro', 'Falha na comunicação com o servidor');
    }
  };

  // Verificar próximo tipo de registro e navegar
  const verificarProximoTipoENavegar = async (person: any) => {
    try {
      console.log('Verificando próximo tipo de registro para:', person.name);
      
      const url = buildApiUrl(`/api/ponto/proximo-tipo/${person.id}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Navegar para confirmação com informações do próximo tipo
        navigation.navigate('ConfirmacaoPonto', {
          id: person.id,
          name: person.name,
          cpf: person.cpf,
          proximo_tipo: data.proximo_tipo,
          proximo_tipo_nome: data.proximo_tipo_nome,
          ultimo_registro: data.ultimo_registro
        });
        resetCapture();
      } else {
        // Todos os registros do dia já foram feitos ou erro
        Alert.alert(
          '⚠️ Registro não permitido',
          data.error || 'Não é possível registrar ponto neste momento.',
          [
            {
              text: 'OK',
              onPress: () => resetCapture(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao verificar próximo tipo:', error);
      Alert.alert(
        'Erro', 
        'Falha ao verificar tipo de registro. Tente novamente.',
        [
          {
            text: 'OK',
            onPress: () => resetCapture(),
          },
        ]
      );
    }
  };

  // Resetar captura
  const resetCapture = () => {
    setCapturedImage(null);
    setLastResult(null);
  };

  // Renderizar resultado da captura
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Menu</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Processando...</Text>
        </View>

        <View style={styles.resultContainer}>
          <Image source={{uri: capturedImage}} style={styles.capturedImage} />
          
          {isLoading ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>
                Analisando reconhecimento facial...
              </Text>
            </View>
          ) : (
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.button} onPress={resetCapture}>
                <Text style={styles.buttonText}>Capturar Nova Foto</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Renderizar câmera
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Registrar Ponto</Text>
        <Text style={styles.subtitle}>Posicione seu rosto na câmera</Text>
      </View>
      
      <RNCamera
        ref={cameraRef}
        style={styles.preview}
        type={RNCamera.Constants.Type.front}
        flashMode={RNCamera.Constants.FlashMode.auto}
        androidCameraPermissionOptions={{
          title: 'Permissão para usar câmera',
          message: 'Precisamos da sua permissão para usar a câmera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancelar',
        }}>
        
        {/* Overlay para guiar o usuário */}
        <View style={styles.overlay}>
          <View style={styles.faceGuide} />
          <Text style={styles.instructionText}>
            Posicione seu rosto dentro do círculo
          </Text>
          <Text style={styles.helpText}>
            Mantenha o rosto bem iluminado e olhe diretamente para a câmera
          </Text>
        </View>
      </RNCamera>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.captureButton, isLoading && styles.disabledButton]} 
          onPress={takePicture}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.captureButtonText}>REGISTRAR PONTO</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.bottomHelpText}>
          Toque no botão para capturar e registrar seu ponto
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 40,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  bottomContainer: {
    padding: 30,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomHelpText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 15,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  capturedImage: {
    width: 300,
    height: 400,
    borderRadius: 15,
    marginBottom: 30,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  actionContainer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FaceRecognitionScreen; 