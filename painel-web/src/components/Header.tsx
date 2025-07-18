import React, { useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { notificationService } from '../services/notificationService';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { usuario } = useAuth();
  const toast = useToast();

  // Configurar o serviço de toasts na inicialização
  useEffect(() => {
    notificationService.setToastService(toast);
  }, [toast]);

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(90deg, #354a80 0%, #2a3a66 100%)',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar sx={{ minHeight: '70px !important' }}>
        {/* Logo e Marca */}
        <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
          {/* Logo da empresa */}
          <Box
            sx={{
              backgroundColor: '#ffffff',
              padding: '6px',
              borderRadius: '8px',
              marginRight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box
              component="img"
              src="/logo-fg.png"
              alt="Logo FG"
              sx={{
                height: '40px',
                maxHeight: '40px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </Box>
          
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: '#ffffff',
                fontSize: '22px',
                letterSpacing: '-0.5px'
              }}
            >
              Ponto Certo FG
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Sistema de Gestão Digital
            </Typography>
          </Box>
        </Box>

        {/* Info do Usuário e Notificações */}
        {usuario && (
          <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: '25px',
                padding: '8px 16px',
                mr: 2
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 500
                }}
              >
                {usuario.nome}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'capitalize'
                }}
              >
                {usuario.perfil}
              </Typography>
            </Box>
            
            {/* Centro de Notificações */}
            <NotificationCenter />
          </Box>
        )}

        <Button 
          color="inherit" 
          onClick={onLogout}
          sx={{
            backgroundColor: '#a2122a',
            '&:hover': {
              backgroundColor: '#8a0f23'
            },
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontWeight: 500,
            color: '#ffffff'
          }}
        >
          Sair
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 