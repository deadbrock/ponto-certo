import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Analytics as AnalyticsIcon,
  EventNote as EventNoteIcon,
  Notifications as NotificationsIcon,
  Groups as GroupsIcon,
  Business as BusinessIcon,
  
} from '@mui/icons-material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 220;

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { usuario } = useAuth();

  // Debug logs para verificar usuário
  console.log('🔍 Sidebar: Usuario carregado:', usuario);
  console.log('🔍 Sidebar: Perfil do usuario:', usuario?.perfil);
  console.log('🔍 Sidebar: Pode ver mapa?', (usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH'));
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/dashboard"
            selected={location.pathname === '/dashboard'}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/analytics"
            selected={location.pathname === '/analytics'}
          >
            <ListItemIcon><AnalyticsIcon /></ListItemIcon>
            <ListItemText primary="Analytics" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/calendario"
            selected={location.pathname === '/calendario'}
          >
            <ListItemIcon><EventNoteIcon /></ListItemIcon>
            <ListItemText primary="Calendário" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/registros"
            selected={location.pathname === '/registros'}
          >
            <ListItemIcon><AccessTimeIcon /></ListItemIcon>
            <ListItemText primary="Registros de Ponto" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/frequencia"
            selected={location.pathname === '/frequencia'}
          >
            <ListItemIcon><BarChartIcon /></ListItemIcon>
            <ListItemText primary="Frequência" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/atestados"
            selected={location.pathname === '/atestados'}
          >
            <ListItemIcon><AssignmentTurnedInIcon /></ListItemIcon>
            <ListItemText primary="Atestados" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/escalas"
            selected={location.pathname === '/escalas'}
          >
            <ListItemIcon><CalendarMonthIcon /></ListItemIcon>
            <ListItemText primary="Escalas" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/relatorios-legais"
            selected={location.pathname === '/relatorios-legais'}
          >
            <ListItemIcon><DescriptionIcon /></ListItemIcon>
            <ListItemText primary="Relatórios Legais" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/integracoes"
            selected={location.pathname === '/integracoes'}
          >
            <ListItemIcon><IntegrationInstructionsIcon /></ListItemIcon>
            <ListItemText primary="Integrações" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/exportar-dominio"
            selected={location.pathname === '/exportar-dominio'}
          >
            <ListItemIcon><FileDownloadIcon /></ListItemIcon>
            <ListItemText primary="Exportar Domínio" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/contratos"
            selected={location.pathname === '/contratos'}
          >
            <ListItemIcon><BusinessIcon /></ListItemIcon>
            <ListItemText primary="Contratos" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/configuracoes-infra"
            selected={location.pathname === '/configuracoes-infra'}
          >
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary="Configurações" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/configuracoes-notificacoes"
            selected={location.pathname === '/configuracoes-notificacoes'}
          >
            <ListItemIcon><NotificationsIcon /></ListItemIcon>
            <ListItemText primary="Notificações" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/suporte"
            selected={location.pathname === '/suporte'}
          >
            <ListItemIcon><SupportAgentIcon /></ListItemIcon>
            <ListItemText primary="Suporte" />
          </ListItemButton>
        </ListItem>
        { /* Entradas de Mapa e Teste Excel removidas */ }
        {(usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH') && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/colaboradores"
                selected={location.pathname === '/colaboradores'}
              >
                <ListItemIcon><GroupsIcon /></ListItemIcon>
                <ListItemText primary="Colaboradores" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/usuarios"
                selected={location.pathname === '/usuarios'}
              >
                <ListItemIcon><PeopleIcon /></ListItemIcon>
                <ListItemText primary="Usuários" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/auditoria"
                selected={location.pathname === '/auditoria'}
              >
                <ListItemIcon><ListAltIcon /></ListItemIcon>
                <ListItemText primary="Auditoria" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Drawer>
  );
};

export default Sidebar; 