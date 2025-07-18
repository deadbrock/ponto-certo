import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import {
  Box,
  Paper,
  Typography,
  Drawer,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Tooltip as MuiTooltip
} from '@mui/material';
import { Close as CloseIcon, ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import axios from 'axios';

// GeoJSON do Brasil - URL específica para estados brasileiros
const BRAZIL_GEOJSON = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface ContractStatus {
  uf: string;
  estado: string;
  totalContratos: number;
  valorTotal: number;
  status: 'ativo' | 'vencido' | 'proximo-vencimento' | 'sem-contratos';
  contratos: Array<{
    id: string;
    nome: string;
    cliente: string;
    valor: number;
    vigenciaFim: string;
  }>;
}

interface TooltipState {
  content: string;
  x: number;
  y: number;
}

// DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
const contractData: ContractStatus[] = [
  // Sistema iniciando vazio - dados serão carregados do backend real
];

const MapaDeAtuacao: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<ContractStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({ 
    coordinates: [-54, -15], 
    zoom: 1 
  });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Cores para diferentes status
  const statusColors = {
    'ativo': '#4CAF50',
    'vencido': '#F44336',
    'proximo-vencimento': '#FF9800',
    'sem-contratos': '#E0E0E0'
  };

  // Carregar GeoJSON do Brasil
  useEffect(() => {
    const carregarGeoData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(BRAZIL_GEOJSON);
        setGeoData(response.data);
      } catch (error) {
        console.error('Erro ao carregar GeoJSON:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarGeoData();
  }, []);

  // Função para obter cor do estado baseado no status
  const getStateColor = (uf: string): string => {
    const stateData = contractData.find(item => item.uf === uf);
    return stateData ? statusColors[stateData.status] : statusColors['sem-contratos'];
  };

  // Função para formatar moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter informações do status
  const getStatusInfo = (status: string) => {
    const statusMap = {
      'ativo': { label: 'Ativo', color: 'success' },
      'vencido': { label: 'Vencido', color: 'error' },
      'proximo-vencimento': { label: 'Próximo ao Vencimento', color: 'warning' },
      'sem-contratos': { label: 'Sem Contratos', color: 'default' }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap['sem-contratos'];
  };

  // Controles de zoom
  const handleZoomIn = () => {
    if (position.zoom >= 8) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [-54, -15] as [number, number], zoom: 1 });
  };

  // Lidar com clique no estado
  const handleStateClick = (geo: { properties: { sigla?: string; UF?: string; ISO_A2?: string; NAME?: string; NAME_1?: string; name?: string; NM_UF?: string } }) => {
    const uf = geo.properties.sigla || geo.properties.UF || geo.properties.ISO_A2 || ''; 
    const stateData = contractData.find(item => item.uf === uf);
    
    if (stateData) {
      setSelectedState(stateData);
      setDrawerOpen(true);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Typography>Carregando mapa...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* Container do Mapa */}
      <Paper
        elevation={3}
        sx={{
          height: '500px',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 6px 25px rgba(0,0,0,0.15)'
          }
        }}
      >
        {/* Controles de Zoom */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <MuiTooltip title="Ampliar">
            <IconButton
              onClick={handleZoomIn}
              size="small"
              sx={{ bgcolor: 'white', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
            >
              <ZoomIn />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Reduzir">
            <IconButton
              onClick={handleZoomOut}
              size="small"
              sx={{ bgcolor: 'white', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
            >
              <ZoomOut />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Centralizar">
            <IconButton
              onClick={handleReset}
              size="small"
              sx={{ bgcolor: 'white', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
            >
              <CenterFocusStrong />
            </IconButton>
          </MuiTooltip>
        </Box>

        {/* Mapa */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 700,
            center: [-54, -15]
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
          >
            {geoData && (
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo: any) => {
                    const uf = geo.properties.sigla || geo.properties.UF || geo.properties.ISO_A2 || '';
                    const stateData = contractData.find(item => item.uf === uf);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getStateColor(uf)}
                        stroke="#ffffff"
                        strokeWidth={0.5}
                        style={{
                          default: { 
                            outline: 'none',
                            transition: 'all 0.2s ease-in-out'
                          },
                          hover: {
                            fill: '#34495e',
                            outline: 'none',
                            cursor: 'pointer',
                            stroke: '#ffffff',
                            strokeWidth: 1
                          },
                          pressed: { outline: 'none' }
                        }}
                        onMouseEnter={(evt: any) => {
                          if (stateData) {
                            setTooltip({
                              content: `${stateData.estado} (${stateData.uf})
Total de Contratos: ${stateData.totalContratos}
Valor Total: ${formatCurrency(stateData.valorTotal)}
Status: ${getStatusInfo(stateData.status).label}`,
                              x: evt.clientX,
                              y: evt.clientY
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => handleStateClick(geo)}
                      />
                    );
                  })
                }
              </Geographies>
            )}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <Paper
            sx={{
              position: 'fixed',
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              zIndex: 2000,
              p: 1,
              maxWidth: 250,
              fontSize: '0.875rem',
              whiteSpace: 'pre-line',
              pointerEvents: 'none',
              bgcolor: 'rgba(0,0,0,0.87)',
              color: 'white',
              borderRadius: 1
            }}
            elevation={6}
          >
            {tooltip.content}
          </Paper>
        )}
      </Paper>

      {/* Legenda */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Legenda
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(statusColors).map(([status, color]) => (
            <Grid item xs={6} sm={3} key={status}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: color,
                    borderRadius: 0.5,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                />
                <Typography variant="body2">
                  {getStatusInfo(status).label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Drawer com detalhes do estado */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: isMobile ? '100%' : 400, p: 2 }
        }}
      >
        {selectedState && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                {selectedState.estado} ({selectedState.uf})
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2} mb={3}>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Contratos
                    </Typography>
                    <Typography variant="h4">
                      {selectedState.totalContratos}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Valor Total
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(selectedState.valorTotal)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box mb={2}>
              <Chip
                label={getStatusInfo(selectedState.status).label}
                color={getStatusInfo(selectedState.status).color as any}
                variant="filled"
              />
            </Box>

            {selectedState.contratos.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Contratos Ativos
                </Typography>
                {selectedState.contratos.map((contrato) => (
                  <Card key={contrato.id} sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        {contrato.nome}
                      </Typography>
                      <Typography color="textSecondary">
                        Cliente: {contrato.cliente}
                      </Typography>
                      <Typography color="textSecondary">
                        Valor: {formatCurrency(contrato.valor)}
                      </Typography>
                      <Typography color="textSecondary">
                        Vigência: {contrato.vigenciaFim}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            <Box mt={3}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => console.log('Navegar para detalhes do estado:', selectedState.uf)}
              >
                Ver Todos os Contratos
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default MapaDeAtuacao; 