import React, {useState, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {API_CONFIG, buildApiUrl, apiRequest} from '../config/api';

interface CadastroScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CadastroScreen: React.FC<CadastroScreenProps> = ({onBack, onSuccess}) => {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<RNCamera>(null);

  // Formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (text: string) => {
    const formatted = formatCPF(text);
    setCpf(formatted);
  };

  const validateForm = () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!cpf.trim() || cpf.length !== 14) {
      Alert.alert('Erro', 'CPF deve ter 11 dígitos');
      return false;
    }
    if (!capturedImage) {
      Alert.alert('Erro', 'Foto é obrigatória para cadastro');
      return false;
    }
    return true;
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsLoading(true);
      try {
        const options = {
          quality: 0.8,
          base64: true,
          skipProcessing: false,
          width: 300,
          height: 300,
        };
        
        const data = await cameraRef.current.takePictureAsync(options);
        console.log('Foto capturada:', { 
          uri: data.uri, 
          hasBase64: !!data.base64,
          base64Length: data.base64 ? data.base64.length : 0
        });
        
        if (!data.base64) {
          console.error('ERRO: Base64 não foi capturado!');
          Alert.alert('Erro', 'Falha ao capturar dados da imagem. Tente novamente.');
          return;
        }
        
        // Armazenar o base64 completo
        const fullBase64 = `data:image/jpeg;base64,${data.base64}`;
        console.log('Base64 preparado:', {
          length: fullBase64.length,
          preview: fullBase64.substring(0, 50) + '...'
        });
        
        setCapturedImage(fullBase64);
        setShowCamera(false);
      } catch (error) {
        console.error('Erro ao capturar foto:', error);
        Alert.alert('Erro', 'Falha ao capturar foto');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Extrair base64 da imagem
      let imageBase64 = capturedImage;
      if (capturedImage?.includes('data:image')) {
        imageBase64 = capturedImage.split(',')[1];
      }
      
      console.log('Dados do envio:', {
        name: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        hasImage: !!imageBase64,
        imageBase64Length: imageBase64 ? imageBase64.length : 0,
        imageBase64Preview: imageBase64 ? imageBase64.substring(0, 50) + '...' : 'NULL'
      });
      
      if (!imageBase64 || imageBase64.length < 100) {
        console.error('ERRO: Base64 inválido!', { imageBase64: imageBase64?.substring(0, 100) });
        Alert.alert('Erro', 'Dados da imagem inválidos. Tire a foto novamente.');
        return;
      }
      
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.ADD_PERSON);
      console.log('URL do cadastro:', url);
      
      // Criar FormData para envio multipart/form-data
      const formData = new FormData();
      formData.append('name', nome.trim());
      formData.append('cpf', cpf.replace(/\D/g, ''));
      
      // Adicionar a imagem como base64 diretamente
      const imageFile = {
        uri: `data:image/jpeg;base64,${imageBase64}`,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
      
      formData.append('image', imageFile as any);
      
      console.log('FormData preparado:', {
        name: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        imageType: imageFile.type,
        imageName: imageFile.name
      });
      
      // Enviar com fetch (não usar apiRequest para evitar JSON headers)
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          // Não definir Content-Type - deixar o browser definir com boundary
        },
      });

      console.log('Resposta status:', response.status);
      
      const result = await response.json();
      console.log('Resposta da API:', result);
      
      if (response.ok) {
        Alert.alert(
          'Sucesso!', 
          result.message || 'Cadastro realizado com sucesso!',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                resetForm();
              }
            }
          ]
        );
      } else {
        console.error('Erro na resposta:', result);
        Alert.alert('Erro no Cadastro', result.error || result.message || 'Falha no cadastro');
      }
    } catch (error) {
      console.error('Erro na API:', error);
      
      let errorMessage = 'Falha na comunicação com o servidor';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Erro de conexão: Verifique se o servidor está ativo';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Erro no formato da resposta do servidor';
        }
      }
      
      Alert.alert('Erro de Comunicação', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNome('');
    setCpf('');
    setCapturedImage(null);
    setShowCamera(false);
  };

  if (showCamera) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ponto Certo FG - Cadastro</Text>
        <Text style={styles.subtitle}>Capture uma foto para {nome}</Text>
        
        <RNCamera
          ref={cameraRef}
          style={styles.preview}
          type={RNCamera.Constants.Type.front}
          flashMode={RNCamera.Constants.FlashMode.auto}>
          
          <View style={styles.overlay}>
            <View style={styles.faceGuide} />
            <Text style={styles.instructionText}>
              Posicione o rosto dentro do círculo
            </Text>
          </View>
        </RNCamera>

        <View style={styles.bottomContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => setShowCamera(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.captureButton, isLoading && styles.disabledButton]} 
              onPress={takePicture}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>CAPTURAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <Text style={styles.title}>Ponto Certo FG - Cadastro</Text>
      
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nome Completo:</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Digite o nome completo"
            placeholderTextColor="#666"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>CPF:</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={handleCpfChange}
            placeholder="000.000.000-00"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={14}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Foto:</Text>
          {capturedImage ? (
            <View style={styles.imageContainer}>
              <Image source={{uri: capturedImage}} style={styles.capturedImage} />
              <TouchableOpacity 
                style={styles.retakeButton} 
                onPress={() => setShowCamera(true)}>
                <Text style={styles.retakeButtonText}>Tirar Nova Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.photoButton} 
              onPress={() => setShowCamera(true)}>
              <Text style={styles.photoButtonText}>📷 Tirar Foto</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={onBack}>
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.submitButton, isLoading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>CADASTRAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  photoButton: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
  },
  capturedImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  retakeButton: {
    backgroundColor: '#555',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
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
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  captureButton: {
    backgroundColor: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CadastroScreen; 