import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginApi, UsuarioBackend } from '../services/api';
import sessionManager from '../utils/sessionManager';

export type Perfil = 'administrador' | 'Administrador' | 'Gestor' | 'RH';

interface AuthContextProps {
  usuario: UsuarioBackend | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  usuario: null,
  login: async () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioBackend | null>(null);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [loginInFlight, setLoginInFlight] = useState<boolean>(false);

  useEffect(() => {
    // Configurar callbacks do SessionManager
    sessionManager.setCallbacks(
      () => {
        // Callback de logout por timeout
        console.log('🕐 AuthContext: Logout automático por timeout');
        handleLogout();
      },
      (newToken: string) => {
        // Callback de renovação de token
        console.log('🔄 AuthContext: Token renovado automaticamente');
        localStorage.setItem('token', newToken);
      }
    );

    return () => {
      sessionManager.cleanup();
    };
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      if (loginInFlight) {
        console.warn('⏳ AuthContext: Login já em andamento, ignorando nova tentativa');
        return false;
      }

      // backoff exponencial simples: 0s, 2s, 4s, 8s, máx 15s
      const clampedAttempts = Math.min(loginAttempts, 3);
      const delayMs = clampedAttempts === 0 ? 0 : Math.min(15000, 2000 * Math.pow(2, clampedAttempts - 1));
      if (delayMs > 0) {
        console.log(`⏱️ AuthContext: Aguardando backoff de ${delayMs}ms antes do login`);
        await new Promise(res => setTimeout(res, delayMs));
      }

      setLoginInFlight(true);
      console.log('🔑 AuthContext: Iniciando login...');
      const res = await loginApi(email, senha);
      
      console.log('📋 AuthContext: Resposta recebida:', res);
      
      if (res.success && res.token) {
        console.log('✅ AuthContext: Login bem-sucedido, salvando token...');
        console.log('🔑 Token recebido:', res.token.substring(0, 20) + '...');
        console.log('👤 Usuário recebido:', res.usuario);
        
        localStorage.setItem('token', res.token);
        setUsuario(res.usuario);
        
        // Inicializar SessionManager com dados da sessão
        if (res.session) {
          await sessionManager.initializeSession(res.session);
        }
        
        console.log('💾 Token salvo no localStorage');
        console.log('🔄 Estado do usuário atualizado');
        console.log('🕐 SessionManager inicializado');
        console.log('🎯 Redirecionamento deve acontecer automaticamente agora!');
        
        // resetar backoff
        setLoginAttempts(0);
        setLoginInFlight(false);
        return true;
      } else {
        console.warn('⚠️ AuthContext: Login falhou - sem token ou success=false');
        console.warn('📋 Resposta completa:', res);
        setLoginAttempts(prev => Math.min(prev + 1, 4));
        setLoginInFlight(false);
        return false;
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Erro no login:', error);
      setLoginAttempts(prev => Math.min(prev + 1, 4));
      setLoginInFlight(false);
      return false;
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('token');
    sessionManager.cleanup();
  };

  const logout = () => {
    handleLogout();
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 