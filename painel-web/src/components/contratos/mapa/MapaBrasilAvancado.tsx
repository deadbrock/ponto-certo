import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Tooltip, 
  Drawer,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong,
  Close,
  GetApp,
  PictureAsPdf,
  TableChart,
  Business,
  People,
  AttachMoney,
  LocationOn
} from '@mui/icons-material';
import { EstadoContrato } from '../../../services/mapaService';

interface MapaBrasilAvancadoProps {
  estados: EstadoContrato[];
  onEstadoClick: (uf: string) => void;
  onEstadoHover: (uf: string | null) => void;
  hoveredState: string | null;
}

const MapaBrasilAvancado: React.FC<MapaBrasilAvancadoProps> = ({
  estados,
  onEstadoClick,
  onEstadoHover,
  hoveredState
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [estadoSelecionado, setEstadoSelecionado] = useState<EstadoContrato | null>(null);
  const [showPainel, setShowPainel] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    estado: EstadoContrato | null;
  }>({ visible: false, x: 0, y: 0, estado: null });

  // Paleta de cores moderna e suave
  const cores = {
    ativo: '#4ade80',              // Verde suave moderno
    'proximo-vencimento': '#fbbf24', // Amarelo suave
    vencido: '#f87171',            // Vermelho suave
    'sem-contratos': '#f1f5f9',    // Cinza claro moderno
    hover: '#60a5fa',              // Azul suave para hover
    stroke: '#ffffff',             // Borda branca
    strokeHover: '#1e293b',        // Borda escura no hover
    selected: '#3b82f6'            // Azul para selecionado
  };

  // Estados brasileiros com coordenadas SVG precisas e proporcionais
  const estadosBrasil = [
    // Região Norte (maiores)
    { uf: 'AM', nome: 'Amazonas', path: 'M 60,280 L 220,270 L 250,320 L 230,380 L 160,390 L 90,360 L 60,320 Z', centro: [155, 335] },
    { uf: 'PA', nome: 'Pará', path: 'M 250,240 L 380,230 L 400,290 L 380,340 L 320,360 L 250,350 Z', centro: [325, 295] },
    { uf: 'MT', nome: 'Mato Grosso', path: 'M 320,360 L 450,350 L 470,420 L 440,460 L 360,470 L 320,430 Z', centro: [395, 410] },
    
    // Região Nordeste
    { uf: 'BA', nome: 'Bahia', path: 'M 470,380 L 580,370 L 600,470 L 570,510 L 490,500 L 470,450 Z', centro: [535, 440] },
    { uf: 'CE', nome: 'Ceará', path: 'M 530,280 L 580,275 L 590,320 L 560,330 L 530,315 Z', centro: [560, 300] },
    { uf: 'PE', nome: 'Pernambuco', path: 'M 560,330 L 600,325 L 615,365 L 585,375 L 560,355 Z', centro: [587, 350] },
    { uf: 'MA', nome: 'Maranhão', path: 'M 430,280 L 500,270 L 520,320 L 480,335 L 430,325 Z', centro: [475, 305] },
    { uf: 'PI', nome: 'Piauí', path: 'M 480,320 L 530,315 L 545,365 L 515,375 L 480,355 Z', centro: [512, 345] },
    { uf: 'RN', nome: 'Rio Grande do Norte', path: 'M 580,270 L 605,265 L 615,295 L 590,305 Z', centro: [597, 285] },
    { uf: 'PB', nome: 'Paraíba', path: 'M 590,295 L 615,290 L 625,320 L 600,325 Z', centro: [607, 307] },
    { uf: 'AL', nome: 'Alagoas', path: 'M 600,365 L 620,360 L 630,385 L 610,390 Z', centro: [615, 375] },
    { uf: 'SE', nome: 'Sergipe', path: 'M 610,380 L 625,375 L 635,400 L 620,405 Z', centro: [622, 390] },
    
    // Estados menores Norte
    { uf: 'RR', nome: 'Roraima', path: 'M 220,180 L 270,170 L 285,220 L 255,235 L 220,225 Z', centro: [252, 205] },
    { uf: 'AP', nome: 'Amapá', path: 'M 370,80 L 400,70 L 415,120 L 385,135 Z', centro: [392, 105] },
    { uf: 'AC', nome: 'Acre', path: 'M 60,380 L 130,370 L 145,420 L 120,445 L 75,435 Z', centro: [102, 407] },
    { uf: 'RO', nome: 'Rondônia', path: 'M 160,390 L 220,380 L 235,425 L 210,445 L 160,435 Z', centro: [197, 412] },
    { uf: 'TO', nome: 'Tocantins', path: 'M 400,340 L 450,330 L 470,390 L 440,410 L 400,395 Z', centro: [435, 370] },
    
    // Região Centro-Oeste
    { uf: 'GO', nome: 'Goiás', path: 'M 440,420 L 500,410 L 520,470 L 490,490 L 440,480 Z', centro: [480, 450] },
    { uf: 'MS', nome: 'Mato Grosso do Sul', path: 'M 360,470 L 440,460 L 460,530 L 430,560 L 360,550 Z', centro: [410, 515] },
    { uf: 'DF', nome: 'Distrito Federal', path: 'M 485,440 L 495,435 L 500,455 L 490,460 Z', centro: [492, 447] },
    
    // Região Sudeste
    { uf: 'MG', nome: 'Minas Gerais', path: 'M 490,470 L 570,460 L 590,530 L 560,560 L 490,550 Z', centro: [540, 515] },
    { uf: 'SP', nome: 'São Paulo', path: 'M 460,530 L 540,520 L 560,590 L 520,620 L 460,610 Z', centro: [510, 575] },
    { uf: 'RJ', nome: 'Rio de Janeiro', path: 'M 560,530 L 590,525 L 605,565 L 580,575 L 560,560 Z', centro: [582, 550] },
    { uf: 'ES', nome: 'Espírito Santo', path: 'M 570,500 L 590,495 L 600,525 L 580,535 Z', centro: [585, 515] },
    
    // Região Sul
    { uf: 'PR', nome: 'Paraná', path: 'M 430,560 L 490,550 L 510,610 L 480,640 L 430,630 Z', centro: [470, 600] },
    { uf: 'SC', nome: 'Santa Catarina', path: 'M 470,610 L 520,605 L 535,645 L 505,660 L 470,650 Z', centro: [502, 632] },
    { uf: 'RS', nome: 'Rio Grande do Sul', path: 'M 430,630 L 480,625 L 500,695 L 470,720 L 430,710 Z', centro: [465, 667] }
  ];

  // Obter dados do estado
  const obterDadosEstado = (uf: string): EstadoContrato | null => {
    return estados.find(e => e.uf === uf) || null;
  };

  // Obter cor do estado
  const obterCorEstado = (uf: string): string => {
    const estado = obterDadosEstado(uf);
    if (!estado) return cores['sem-contratos'];
    
    if (estadoSelecionado?.uf === uf) return cores.selected;
    if (hoveredState === uf) return cores.hover;
    return cores[estado.statusContrato] || cores['sem-contratos'];
  };

  // Handlers de zoom e pan
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.5));
  const resetarVisao = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setEstadoSelecionado(null);
    setShowPainel(false);
  };

  // Handlers de mouse para pan
  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: event.clientX - position.x,
      y: event.clientY - position.y
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handlers para estados
  const handleEstadoMouseEnter = (uf: string, event: React.MouseEvent) => {
    onEstadoHover(uf);
    const estado = obterDadosEstado(uf);
    if (estado) {
      setTooltipData({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        estado
      });
    }
  };

  const handleEstadoMouseLeave = () => {
    onEstadoHover(null);
    setTooltipData(prev => ({ ...prev, visible: false }));
  };

  const handleEstadoClick = (uf: string) => {
    const estado = obterDadosEstado(uf);
    if (estado && estado.statusContrato !== 'sem-contratos') {
      setEstadoSelecionado(estado);
      setShowPainel(true);
      onEstadoClick(uf);
    }
  };

  // Exportar dados
  const exportarCSV = () => {
    if (!estadoSelecionado) return;
    
    const csvContent = `Estado,Contratos,Funcionários,Valor Total\n${estadoSelecionado.nomeEstado},${estadoSelecionado.totalContratos},${estadoSelecionado.totalFuncionarios},${estadoSelecionado.valorTotal}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dados-${estadoSelecionado.uf}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    if (!estadoSelecionado) return;
    // Implementação do PDF seria feita aqui
    console.log('Exportar PDF:', estadoSelecionado);
  };

  return (
    <Box position="relative">
      {/* Container do Mapa */}
      <Paper
        elevation={8}
        sx={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: 4,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          height: isMobile ? 500 : isTablet ? 600 : 700,
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        {/* Controles de Zoom - Canto Superior Direito */}
        <Box
          position="absolute"
          top={16}
          right={16}
          zIndex={1000}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          <Tooltip title="Aumentar zoom" arrow>
            <IconButton
              size="medium"
              onClick={handleZoomIn}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': { 
                  backgroundColor: '#f8fafc', 
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Diminuir zoom" arrow>
            <IconButton
              size="medium"
              onClick={handleZoomOut}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': { 
                  backgroundColor: '#f8fafc', 
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Título do Mapa - Canto Superior Esquerdo */}
        <Fade in timeout={800}>
          <Box
            position="absolute"
            top={16}
            left={16}
            zIndex={1000}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 3,
              p: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              🇧🇷 Brasil - Mapa de Atuação
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {estadosBrasil.length} Estados + DF
            </Typography>
          </Box>
        </Fade>

        {/* Mapa SVG */}
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg 
            viewBox="0 0 700 750" 
            style={{ 
              width: '90%', 
              height: '90%',
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))'
            }}
          >
            {/* Estados do Brasil */}
            {estadosBrasil.map((estado) => {
              const dadosEstado = obterDadosEstado(estado.uf);
              const isHovered = hoveredState === estado.uf;
              const isSelected = estadoSelecionado?.uf === estado.uf;
              
              return (
                <g key={estado.uf}>
                  {/* Polígono do Estado com animações */}
                  <path
                    d={estado.path}
                    fill={obterCorEstado(estado.uf)}
                    stroke={isSelected ? cores.selected : isHovered ? cores.strokeHover : cores.stroke}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                    style={{
                      cursor: dadosEstado && dadosEstado.statusContrato !== 'sem-contratos' ? 'pointer' : 'default',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: isHovered ? 'brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.2))' : 
                              isSelected ? 'brightness(1.05) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))' : 'none',
                      transformOrigin: 'center',
                      transform: isHovered ? 'scale(1.02)' : isSelected ? 'scale(1.01)' : 'scale(1)'
                    }}
                    onMouseEnter={(e) => handleEstadoMouseEnter(estado.uf, e)}
                    onMouseLeave={handleEstadoMouseLeave}
                    onClick={() => handleEstadoClick(estado.uf)}
                  />
                  
                  {/* Sigla do Estado (sempre visível) */}
                  <text
                    x={estado.centro[0]}
                    y={estado.centro[1] + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: Math.min(18, Math.max(12, zoom * 14)),
                      fontWeight: 'bold',
                      fontFamily: 'Inter, Arial, sans-serif',
                      fill: isSelected ? '#ffffff' : '#1e293b',
                      pointerEvents: 'none',
                      textShadow: isSelected ? '1px 1px 2px rgba(0,0,0,0.5)' : '1px 1px 2px rgba(255,255,255,0.8)',
                      userSelect: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {estado.uf}
                  </text>

                  {/* Nome completo do estado (quando zoom > 1.5) */}
                  {zoom > 1.5 && (
                    <text
                      x={estado.centro[0]}
                      y={estado.centro[1] + 20}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: Math.max(10, zoom * 10),
                        fontWeight: 'normal',
                        fontFamily: 'Inter, Arial, sans-serif',
                        fill: '#64748b',
                        pointerEvents: 'none',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                        userSelect: 'none',
                        opacity: zoom > 2 ? 1 : 0.7,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {estado.nome}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </Box>

        {/* Legenda Fixa - Canto Inferior Esquerdo */}
        <Fade in timeout={1000}>
          <Box
            position="absolute"
            bottom={16}
            left={16}
            zIndex={1000}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 3,
              p: 2.5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              maxWidth: 280
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary.main">
              📊 Legenda de Status
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {Object.entries(cores).map(([status, cor]) => {
                if (['hover', 'stroke', 'strokeHover', 'selected'].includes(status)) return null;
                
                const label = {
                  'ativo': 'Contratos Ativos',
                  'proximo-vencimento': 'Próximos ao Vencimento',
                  'vencido': 'Contratos Vencidos',
                  'sem-contratos': 'Sem Contratos'
                }[status] || status;

                return (
                  <Box key={status} display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: cor,
                        border: '1px solid #e2e8f0',
                        borderRadius: 1.5,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Typography variant="body2" color="text.primary" fontWeight={500}>
                      {label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Fade>

        {/* Botão Resetar Visão - Canto Inferior Direito */}
        <Zoom in timeout={800}>
          <Box
            position="absolute"
            bottom={16}
            right={16}
            zIndex={1000}
          >
            <Tooltip title="Resetar Visão" arrow>
              <IconButton
                onClick={resetarVisao}
                size="large"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { 
                    backgroundColor: '#f8fafc', 
                    transform: 'scale(1.05)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
          </Box>
        </Zoom>
      </Paper>

      {/* Painel Lateral com Detalhes do Estado */}
      <Drawer
        anchor="right"
        open={showPainel}
        onClose={() => setShowPainel(false)}
        PaperProps={{ 
          sx: { 
            width: isMobile ? '100%' : isTablet ? 400 : 500,
            backgroundColor: '#f8fafc'
          } 
        }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {estadoSelecionado && (
            <>
              {/* Cabeçalho do Painel */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {estadoSelecionado.nomeEstado}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {estadoSelecionado.uf}
                  </Typography>
                </Box>
                <IconButton 
                  onClick={() => setShowPainel(false)}
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                  }}
                >
                  <Close />
                </IconButton>
              </Box>

              {/* Cards de Estatísticas */}
              <Box display="flex" flexDirection="column" gap={2} mb={3}>
                <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Business sx={{ color: 'white', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h4" color="white" fontWeight="bold">
                        {estadoSelecionado.totalContratos}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Contratos Ativos
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <People sx={{ color: 'white', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h4" color="white" fontWeight="bold">
                        {estadoSelecionado.totalFuncionarios.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Funcionários
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AttachMoney sx={{ color: 'white', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h4" color="white" fontWeight="bold">
                        {estadoSelecionado.valorTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          notation: 'compact',
                          maximumFractionDigits: 1
                        })}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Faturamento Total
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* Lista de Clientes */}
              <Paper sx={{ p: 2, mb: 3, flex: 1 }}>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Clientes no Estado
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {estadoSelecionado.clientes.length} clientes únicos
                </Typography>
                <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {estadoSelecionado.clientes.map((cliente, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      <ListItemIcon>
                        <LocationOn color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={cliente} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {/* Botões de Exportação */}
              <Box display="flex" gap={1}>
                <Button
                  startIcon={<TableChart />}
                  variant="outlined"
                  fullWidth
                  onClick={exportarCSV}
                  sx={{ borderRadius: 2 }}
                >
                  Exportar CSV
                </Button>
                <Button
                  startIcon={<PictureAsPdf />}
                  variant="contained"
                  fullWidth
                  onClick={exportarPDF}
                  sx={{ borderRadius: 2 }}
                >
                  Exportar PDF
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Tooltip Customizado */}
      {tooltipData.visible && tooltipData.estado && (
        <Fade in timeout={200}>
          <Paper
            elevation={12}
            sx={{
              position: 'fixed',
              left: tooltipData.x + 15,
              top: tooltipData.y - 10,
              zIndex: 2000,
              p: 2,
              maxWidth: 320,
              backgroundColor: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
              {estadosBrasil.find(e => e.uf === tooltipData.estado?.uf)?.nome} ({tooltipData.estado.uf})
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="body2">
                📋 <strong>Contratos:</strong> {tooltipData.estado.totalContratos}
              </Typography>
              <Typography variant="body2">
                👥 <strong>Funcionários:</strong> {tooltipData.estado.totalFuncionarios.toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="body2">
                💰 <strong>Valor Total:</strong> {tooltipData.estado.valorTotal.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                  maximumFractionDigits: 1
                })}
              </Typography>
              <Chip
                label={tooltipData.estado.statusContrato.replace('-', ' ').toUpperCase()}
                size="small"
                color={
                  tooltipData.estado.statusContrato === 'ativo' ? 'success' :
                  tooltipData.estado.statusContrato === 'proximo-vencimento' ? 'warning' : 'error'
                }
                sx={{ mt: 1, alignSelf: 'flex-start' }}
              />
            </Box>
            
            {tooltipData.estado.statusContrato !== 'sem-contratos' && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 Clique para ver detalhes completos
              </Typography>
            )}
          </Paper>
        </Fade>
      )}
    </Box>
  );
};

export default MapaBrasilAvancado;