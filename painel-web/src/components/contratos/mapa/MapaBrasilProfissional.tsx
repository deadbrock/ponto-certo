import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from 'react-simple-maps';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import { EstadoContrato } from '../../../services/mapaService';

// TopoJSON do Brasil (URL pública confiável)
const BRAZIL_TOPOJSON = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const BRAZIL_STATES_TOPOJSON = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=uf";

interface MapaBrasilProfissionalProps {
  estados: EstadoContrato[];
  onEstadoClick: (uf: string) => void;
  onEstadoHover: (uf: string | null) => void;
  hoveredState: string | null;
  height?: number;
}

// Mapeamento de nomes de estados para siglas
const ESTADO_SIGLAS: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

// Coordenadas dos centros dos estados para labels
const ESTADO_CENTROS: Record<string, [number, number]> = {
  'AC': [-70.55, -9.0],
  'AL': [-36.7, -9.6],
  'AP': [-51.8, 1.4],
  'AM': [-64.0, -5.0],
  'BA': [-41.0, -12.0],
  'CE': [-39.5, -5.2],
  'DF': [-47.8, -15.8],
  'ES': [-40.3, -19.6],
  'GO': [-49.3, -16.0],
  'MA': [-45.0, -4.9],
  'MT': [-56.1, -12.6],
  'MS': [-54.6, -20.4],
  'MG': [-44.9, -18.5],
  'PA': [-52.0, -5.5],
  'PB': [-36.8, -7.1],
  'PR': [-51.2, -24.2],
  'PE': [-37.9, -8.8],
  'PI': [-42.7, -8.3],
  'RJ': [-42.6, -22.3],
  'RN': [-36.5, -5.8],
  'RS': [-53.0, -30.0],
  'RO': [-63.9, -11.2],
  'RR': [-61.0, 1.9],
  'SC': [-50.2, -27.2],
  'SP': [-48.6, -23.7],
  'SE': [-37.4, -10.6],
  'TO': [-48.2, -10.2]
};

const MapaBrasilProfissional: React.FC<MapaBrasilProfissionalProps> = ({
  estados,
  onEstadoClick,
  onEstadoHover,
  hoveredState,
  height = 600
}) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({ 
    coordinates: [-54, -14], 
    zoom: 1 
  });
  const [tooltipContent, setTooltipContent] = useState<{
    content: React.ReactNode;
    x: number;
    y: number;
    visible: boolean;
  }>({
    content: null,
    x: 0,
    y: 0,
    visible: false
  });

  // Cores melhoradas e mais contrastantes
  const cores = {
    ativo: '#2ecc71',              // Verde vibrante
    'proximo-vencimento': '#f39c12', // Laranja vibrante (não amarelo)
    vencido: '#e74c3c',            // Vermelho forte
    'sem-contratos': '#ecf0f1',    // Cinza muito claro
    hover: '#3498db',              // Azul para hover
    stroke: '#ffffff',             // Borda branca
    strokeHover: '#2c3e50'         // Borda escura no hover
  };

  // Carregar dados geográficos do Brasil
  useEffect(() => {
    const carregarGeoData = async () => {
      try {
        // Usar dados GeoJSON do IBGE para maior precisão
        const response = await fetch(BRAZIL_STATES_TOPOJSON);
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error('Erro ao carregar dados geográficos:', error);
        // Fallback para dados locais simples se necessário
        setGeoData({
          type: "FeatureCollection",
          features: [] // Dados de fallback poderiam ir aqui
        });
      } finally {
        setLoading(false);
      }
    };

    carregarGeoData();
  }, []);

  // Obter dados do estado
  const obterDadosEstado = (nomeEstado: string): EstadoContrato | null => {
    // Tentar encontrar por sigla primeiro
    const sigla = ESTADO_SIGLAS[nomeEstado] || nomeEstado;
    const estado = estados.find(e => e.uf === sigla || e.uf === nomeEstado);
    
    return estado || null;
  };

  // Obter cor do estado
  const obterCorEstado = (nomeEstado: string): string => {
    const estado = obterDadosEstado(nomeEstado);
    if (!estado) return cores['sem-contratos'];
    
    if (hoveredState && (estado.uf === hoveredState || estado.nomeEstado === hoveredState)) {
      return cores.hover;
    }
    
    return cores[estado.statusContrato] || cores['sem-contratos'];
  };

  // Manipular hover
  const handleMouseEnter = (geo: { properties: { sigla?: string; UF?: string; ISO_A2?: string; NAME?: string; NAME_1?: string; name?: string; NM_UF?: string } }, event: React.MouseEvent) => {
    const nomeEstado = geo.properties.NAME_1 || geo.properties.name || geo.properties.NM_UF || '';
    if (!nomeEstado) return;
    const estado = obterDadosEstado(nomeEstado);
    
    if (estado) {
      onEstadoHover(estado.uf);
      
      // Criar tooltip
      setTooltipContent({
        content: (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
                              {estado.nomeEstado} ({estado.uf})
            </Typography>
            <Typography variant="body2">
              Contratos: {estado.totalContratos}
            </Typography>
            <Typography variant="body2">
              Funcionários: {estado.totalFuncionarios.toLocaleString('pt-BR')}
            </Typography>
            <Typography variant="body2">
              Valor: {estado.valorTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1
              })}
            </Typography>
            <Typography variant="body2" color="primary">
              Status: {estado.statusContrato.replace('-', ' ')}
            </Typography>
          </Box>
        ),
        x: event.clientX,
        y: event.clientY,
        visible: true
      });
    }
  };

  const handleMouseLeave = () => {
    onEstadoHover(null);
    setTooltipContent(prev => ({ ...prev, visible: false }));
  };

  const handleClick = (geo: { properties: { sigla?: string; UF?: string; ISO_A2?: string; NAME?: string; NAME_1?: string; name?: string; NM_UF?: string } }) => {
    const nomeEstado = geo.properties.NAME_1 || geo.properties.name || geo.properties.NM_UF || '';
    if (!nomeEstado) return;
    const estado = obterDadosEstado(nomeEstado);
    
    if (estado && estado.statusContrato !== 'sem-contratos') {
      onEstadoClick(estado.uf);
    }
  };

  // Controles de zoom
  const handleZoomIn = () => {
    setPosition(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 8)
    }));
  };

  const handleZoomOut = () => {
    setPosition(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.5, 1)
    }));
  };

  const handleResetZoom = () => {
    setPosition({ coordinates: [-54, -14], zoom: 1 });
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height={height}
        bgcolor="#f8f9fa"
        borderRadius={2}
      >
        <Typography>Carregando mapa do Brasil...</Typography>
      </Box>
    );
  }

  return (
    <Box position="relative">
      {/* Container do Mapa com melhor visual */}
      <Paper
        elevation={3}
        sx={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: 2,
          border: '2px solid #e1e5e9',
          overflow: 'hidden',
          height: height
        }}
      >
        {/* Controles de Zoom */}
        <Box
          position="absolute"
          top={16}
          right={16}
          zIndex={1000}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          <IconButton
            size="small"
            onClick={handleZoomIn}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
            }}
          >
            <ZoomIn />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleZoomOut}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
            }}
          >
            <ZoomOut />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleResetZoom}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
            }}
          >
            <CenterFocusStrong />
          </IconButton>
        </Box>

        {/* Mapa */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 700,
            center: [-54, -14]
          }}
          width={800}
          height={height}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
            minZoom={0.5}
            maxZoom={8}
          >
            {geoData && (
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const nomeEstado = geo.properties.NAME_1 || geo.properties.name || geo.properties.NM_UF || '';
                    const estado = obterDadosEstado(nomeEstado);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={obterCorEstado(nomeEstado)}
                        stroke={hoveredState === estado?.uf ? cores.strokeHover : cores.stroke}
                        strokeWidth={hoveredState === estado?.uf ? 2 : 1}
                        style={{
                          default: {
                            transition: 'all 0.2s ease-in-out'
                          },
                          hover: {
                            cursor: estado && estado.statusContrato !== 'sem-contratos' ? 'pointer' : 'default'
                          },
                          pressed: {
                            fill: cores.hover
                          }
                        }}
                        onMouseEnter={(event) => handleMouseEnter(geo, event)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick(geo)}
                      />
                    );
                  })
                }
              </Geographies>
            )}

            {/* Labels dos Estados */}
            {Object.entries(ESTADO_CENTROS).map(([sigla, [lng, lat]]) => {
              const estado = estados.find(e => e.uf === sigla);
              if (!estado || position.zoom < 1.5) return null;

              return (
                <Marker key={sigla} coordinates={[lng, lat]}>
                  <text
                    textAnchor="middle"
                    style={{
                      fontFamily: 'Arial',
                      fontSize: Math.max(10, position.zoom * 8),
                      fontWeight: 'bold',
                      fill: estado.statusContrato === 'sem-contratos' ? '#7f8c8d' : '#2c3e50',
                      pointerEvents: 'none',
                      textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                    }}
                  >
                    {sigla}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </Paper>

      {/* Tooltip customizado */}
      {tooltipContent.visible && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            left: tooltipContent.x + 10,
            top: tooltipContent.y - 10,
            zIndex: 2000,
            p: 2,
            maxWidth: 300,
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e1e5e9'
          }}
        >
          {tooltipContent.content}
        </Paper>
      )}
    </Box>
  );
};

export default MapaBrasilProfissional; 