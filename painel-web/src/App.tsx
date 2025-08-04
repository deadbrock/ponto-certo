import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegistrosPage from './pages/RegistrosPage';
import UsuariosPage from './pages/UsuariosPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import AuditoriaPage from './pages/AuditoriaPage';
import FrequenciaPage from './pages/FrequenciaPage';
import AtestadosPage from './pages/AtestadosPage';
import RelatoriosLegaisPage from './pages/RelatoriosLegaisPage';
import IntegracoesPage from './pages/IntegracoesPage';
import EscalasPage from './pages/EscalasPage';
import ConfiguracoesInfraPage from './pages/ConfiguracoesInfraPage';
import SuportePage from './pages/SuportePage';
import DashboardPage from './pages/DashboardPage';
import DashboardAnalytics from './pages/DashboardAnalytics';
import CalendarioPage from './pages/CalendarioPage';
import TesteExcelPage from './pages/TesteExcelPage';
import ConfiguracoesNotificacoes from './pages/ConfiguracoesNotificacoes';
import ContratosPage from './pages/ContratosPage';
import ContratoDetalhesPage from './pages/ContratoDetalhesPage';
import MapaDeAtuacaoPage from './pages/MapaDeAtuacaoPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f57c00',
      light: '#ffb74d',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          borderRadius: 16,
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.9rem',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#f1f5f9',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
  },
});

const AppContent: React.FC = () => {
  const { usuario } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  if (!usuario) {
    return <LoginPage />;
  }

  return (
    <Box display="flex" minHeight="100vh">
      <Sidebar />
      <Box flexGrow={1} display="flex" flexDirection="column">
        <Header onLogout={handleLogout} />
        <Box component="main" flexGrow={1} overflow="auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<DashboardAnalytics />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/colaboradores" element={<ColaboradoresPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/registros" element={<RegistrosPage />} />
            <Route path="/atestados" element={<AtestadosPage />} />
            <Route path="/escalas" element={<EscalasPage />} />
            <Route path="/frequencia" element={<FrequenciaPage />} />
            <Route path="/relatorios-legais" element={<RelatoriosLegaisPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/integracoes" element={<IntegracoesPage />} />
            <Route path="/contratos" element={<ContratosPage />} />
            <Route path="/contratos/:id" element={<ContratoDetalhesPage />} />
            <Route path="/contratos/mapa" element={<MapaDeAtuacaoPage />} />
            <Route path="/configuracoes-infra" element={<ConfiguracoesInfraPage />} />
            <Route path="/configuracoes-notificacoes" element={<ConfiguracoesNotificacoes />} />
            <Route path="/suporte" element={<SuportePage />} />
            <Route path="/teste-excel" element={<TesteExcelPage />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
