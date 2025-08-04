import React from 'react';
import { Box, Typography } from '@mui/material';
import MapaAtuacao from '../components/contratos/mapa/MapaAtuacao';

const MapaDeAtuacaoPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🗺️ Mapa de Atuação
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Visualização geográfica dos contratos ativos por estado brasileiro
      </Typography>
      
      <MapaAtuacao />
    </Box>
  );
};

export default MapaDeAtuacaoPage;