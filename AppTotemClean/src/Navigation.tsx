import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

// Importar todas as telas
import HomeScreen from './screens/HomeScreen';
import FaceRecognitionScreen from './screens/FaceRecognitionScreen';
import ConfirmacaoPontoScreen from './screens/ConfirmacaoPontoScreen';
import CadastroScreen from './screens/CadastroScreen';
import HistoricoScreen from './screens/HistoricoScreen';
import ConfiguracoesScreen from './screens/ConfiguracoesScreen';

const Stack = createStackNavigator();

// Wrapper para CadastroScreen que converte navigation props
const CadastroScreenWrapper: React.FC = () => {
  const navigation = useNavigation();
  
  return (
    <CadastroScreen
      onBack={() => navigation.goBack()}
      onSuccess={() => navigation.goBack()}
    />
  );
};

const Navigation: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false, // Desabilita o header padrão já que as telas têm seus próprios headers
        }}>
        
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
        />
        
        <Stack.Screen 
          name="FaceRecognition" 
          component={FaceRecognitionScreen} 
        />
        
        <Stack.Screen 
          name="ConfirmacaoPonto" 
          component={ConfirmacaoPontoScreen} 
        />
        
        <Stack.Screen 
          name="Cadastro" 
          component={CadastroScreenWrapper} 
        />
        
        <Stack.Screen 
          name="Historico" 
          component={HistoricoScreen} 
        />
        
        <Stack.Screen 
          name="Configuracoes" 
          component={ConfiguracoesScreen} 
        />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation; 