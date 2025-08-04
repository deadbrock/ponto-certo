import React from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { NavigateNext, Map } from '@mui/icons-material';
import MapaAtuacaoAvancado from '../components/contratos/mapa/MapaAtuacaoAvancado';

const MapaDeAtuacaoAvancadoPage: React.FC = () => {
  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Breadcrumbs */}
      <Box sx={{ p: 3, pb: 0 }}>
        <Breadcrumbs 
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 2 }}
        >
          <Link 
            underline="hover" 
            color="inherit" 
            href="/dashboard"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Dashboard
          </Link>
          <Link 
            underline="hover" 
            color="inherit" 
            href="/contratos"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Contratos
          </Link>
          <Typography 
            color="primary.main" 
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Map fontSize="small" />
            Mapa de Atuação Avançado
          </Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Componente Principal */}
      <MapaAtuacaoAvancado />
    </Box>
  );
};

export default MapaDeAtuacaoAvancadoPage;