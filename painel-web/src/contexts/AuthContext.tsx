import React, { createContext, useContext, useState } from 'react';
import { loginApi, UsuarioBackend } from '../services/api';

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

  const login = async (email: string, senha: string) => {
    try {
      console.log('🔑 AuthContext: Iniciando login...');
      const res = await loginApi(email, senha);
      
      console.log('📋 AuthContext: Resposta recebida:', res);
      
      if (res.success && res.token) {
        console.log('✅ AuthContext: Login bem-sucedido, salvando token...');
        console.log('🔑 Token recebido:', res.token.substring(0, 20) + '...');
        console.log('👤 Usuário recebido:', res.usuario);
        
        localStorage.setItem('token', res.token);
        setUsuario(res.usuario);
        
        console.log('💾 Token salvo no localStorage');
        console.log('🔄 Estado do usuário atualizado');
        console.log('🎯 Redirecionamento deve acontecer automaticamente agora!');
        
        return true;
      } else {
        console.warn('⚠️ AuthContext: Login falhou - sem token ou success=false');
        console.warn('📋 Resposta completa:', res);
        return false;
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 