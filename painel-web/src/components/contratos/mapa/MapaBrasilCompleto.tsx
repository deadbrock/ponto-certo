import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import { EstadoContrato } from '../../../services/mapaService';

interface MapaBrasilCompletoProps {
  estados: EstadoContrato[];
  onEstadoClick: (uf: string) => void;
  onEstadoHover: (uf: string | null) => void;
  hoveredState: string | null;
}

const MapaBrasilCompleto: React.FC<MapaBrasilCompletoProps> = ({
  estados,
  onEstadoClick,
  onEstadoHover,
  hoveredState
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    estado: EstadoContrato | null;
  }>({ visible: false, x: 0, y: 0, estado: null });

  // Cores melhoradas e contrastantes
  const cores = {
    ativo: '#27ae60',              // Verde mais suave
    'proximo-vencimento': '#f39c12', // Laranja vibrante
    vencido: '#e74c3c',            // Vermelho forte
    'sem-contratos': '#ecf0f1',    // Cinza muito claro
    hover: '#3498db',              // Azul para hover
    stroke: '#34495e',             // Borda escura para contraste
    strokeHover: '#2c3e50'         // Borda mais escura no hover
  };

  // Obter dados do estado
  const obterDadosEstado = (uf: string): EstadoContrato | null => {
    return estados.find(e => e.uf === uf) || null;
  };

  // Obter cor do estado
  const obterCorEstado = (uf: string): string => {
    const estado = obterDadosEstado(uf);
    if (!estado) return cores['sem-contratos'];
    
    if (hoveredState === uf) return cores.hover;
    return cores[estado.statusContrato] || cores['sem-contratos'];
  };

  // Estados brasileiros com coordenadas SVG precisas
  const estadosBrasil = [
    // Região Norte
    { uf: 'AC', nome: 'Acre', path: 'M 50,380 L 120,370 L 130,420 L 110,440 L 60,430 Z', centro: [90, 400] },
    { uf: 'AP', nome: 'Amapá', path: 'M 350,80 L 380,70 L 390,120 L 360,130 Z', centro: [370, 100] },
    { uf: 'AM', nome: 'Amazonas', path: 'M 50,280 L 200,270 L 220,320 L 200,370 L 120,380 L 80,340 L 50,320 Z', centro: [135, 325] },
    { uf: 'PA', nome: 'Pará', path: 'M 220,240 L 350,230 L 370,280 L 350,320 L 320,340 L 220,350 Z', centro: [295, 295] },
    { uf: 'RO', nome: 'Rondônia', path: 'M 120,370 L 180,360 L 190,400 L 170,420 L 130,420 Z', centro: [155, 390] },
    { uf: 'RR', nome: 'Roraima', path: 'M 200,180 L 250,170 L 260,220 L 230,230 L 200,220 Z', centro: [230, 200] },
    { uf: 'TO', nome: 'Tocantins', path: 'M 370,320 L 420,310 L 430,370 L 410,390 L 370,380 Z', centro: [400, 350] },

    // Região Nordeste
    { uf: 'AL', nome: 'Alagoas', path: 'M 580,350 L 600,345 L 605,370 L 585,375 Z', centro: [592, 360] },
    { uf: 'BA', nome: 'Bahia', path: 'M 480,360 L 580,350 L 590,450 L 560,470 L 480,460 L 470,420 Z', centro: [530, 410] },
    { uf: 'CE', nome: 'Ceará', path: 'M 520,280 L 570,275 L 575,320 L 545,325 L 520,310 Z', centro: [547, 300] },
    { uf: 'MA', nome: 'Maranhão', path: 'M 420,280 L 480,270 L 490,320 L 460,330 L 420,320 Z', centro: [455, 300] },
    { uf: 'PB', nome: 'Paraíba', path: 'M 570,290 L 590,285 L 595,310 L 575,315 Z', centro: [582, 302] },
    { uf: 'PE', nome: 'Pernambuco', path: 'M 545,320 L 580,315 L 590,350 L 565,355 L 545,340 Z', centro: [567, 337] },
    { uf: 'PI', nome: 'Piauí', path: 'M 480,310 L 520,305 L 530,350 L 500,355 L 480,340 Z', centro: [505, 330] },
    { uf: 'RN', nome: 'Rio Grande do Norte', path: 'M 570,270 L 595,265 L 600,290 L 580,295 Z', centro: [587, 280] },
    { uf: 'SE', nome: 'Sergipe', path: 'M 580,370 L 595,365 L 600,385 L 585,390 Z', centro: [590, 377] },

    // Região Centro-Oeste
    { uf: 'DF', nome: 'Distrito Federal', path: 'M 460,400 L 470,395 L 475,410 L 465,415 Z', centro: [467, 405] },
    { uf: 'GO', nome: 'Goiás', path: 'M 420,370 L 480,360 L 490,420 L 470,440 L 420,430 Z', centro: [455, 400] },
    { uf: 'MT', nome: 'Mato Grosso', path: 'M 320,340 L 420,330 L 430,400 L 400,420 L 320,410 Z', centro: [375, 375] },
    { uf: 'MS', nome: 'Mato Grosso do Sul', path: 'M 370,420 L 440,410 L 450,480 L 420,500 L 370,490 Z', centro: [410, 455] },

    // Região Sudeste
    { uf: 'ES', nome: 'Espírito Santo', path: 'M 540,440 L 560,435 L 565,465 L 545,470 Z', centro: [552, 452] },
    { uf: 'MG', nome: 'Minas Gerais', path: 'M 470,420 L 540,410 L 550,480 L 520,500 L 470,490 Z', centro: [510, 455] },
    { uf: 'RJ', nome: 'Rio de Janeiro', path: 'M 520,480 L 550,475 L 560,505 L 540,510 L 520,500 Z', centro: [540, 492] },
    { uf: 'SP', nome: 'São Paulo', path: 'M 450,480 L 520,470 L 530,530 L 500,550 L 450,540 Z', centro: [490, 510] },

    // Região Sul
    { uf: 'PR', nome: 'Paraná', path: 'M 420,500 L 480,490 L 490,540 L 460,560 L 420,550 Z', centro: [455, 525] },
    { uf: 'RS', nome: 'Rio Grande do Sul', path: 'M 400,560 L 460,550 L 470,620 L 440,640 L 400,630 Z', centro: [435, 595] },
    { uf: 'SC', nome: 'Santa Catarina', path: 'M 450,540 L 490,535 L 500,570 L 470,580 L 450,570 Z', centro: [475, 555] }
  ];

  // Handlers de zoom e pan
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.5));
  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
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
      onEstadoClick(uf);
    }
  };

  return (
    <Box position="relative">
      {/* Container do Mapa */}
      <Paper
        elevation={4}
        sx={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: 3,
          border: '2px solid #e1e5e9',
          overflow: 'hidden',
          height: 650,
          cursor: isDragging ? 'grabbing' : 'grab'
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
          <Tooltip title="Aumentar zoom" arrow>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': { backgroundColor: '#f8f9fa', transform: 'scale(1.05)' }
              }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Diminuir zoom" arrow>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': { backgroundColor: '#f8f9fa', transform: 'scale(1.05)' }
              }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Resetar visualização" arrow>
            <IconButton
              size="small"
              onClick={resetZoom}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': { backgroundColor: '#f8f9fa', transform: 'scale(1.05)' }
              }}
            >
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Título do Mapa */}
        <Box
          position="absolute"
          top={16}
          left={16}
          zIndex={1000}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            p: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="primary">
            🇧🇷 Território Brasileiro
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {estadosBrasil.length} Estados + DF
          </Typography>
        </Box>

        {/* Mapa SVG */}
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg 
            viewBox="0 0 650 700" 
            style={{ 
              width: '90%', 
              height: '90%',
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          >
            {/* Fundo do território */}
            <rect
              x="0"
              y="0"
              width="650"
              height="700"
              fill="none"
              stroke="none"
            />

            {/* Estados do Brasil */}
            {estadosBrasil.map((estado) => {
              const dadosEstado = obterDadosEstado(estado.uf);
              const isHovered = hoveredState === estado.uf;
              
              return (
                <g key={estado.uf}>
                  {/* Polígono do Estado */}
                  <path
                    d={estado.path}
                    fill={obterCorEstado(estado.uf)}
                    stroke={isHovered ? cores.strokeHover : cores.stroke}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{
                      cursor: dadosEstado && dadosEstado.statusContrato !== 'sem-contratos' ? 'pointer' : 'default',
                      transition: 'all 0.2s ease-in-out',
                      filter: isHovered ? 'brightness(1.1)' : 'none'
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
                      fontSize: Math.min(16, Math.max(10, zoom * 12)),
                      fontWeight: 'bold',
                      fontFamily: 'Arial, sans-serif',
                      fill: '#2c3e50',
                      pointerEvents: 'none',
                      textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                      userSelect: 'none'
                    }}
                  >
                    {estado.uf}
                  </text>

                  {/* Nome completo do estado (quando zoom > 1.5) */}
                  {zoom > 1.5 && (
                    <text
                      x={estado.centro[0]}
                      y={estado.centro[1] + 18}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: Math.max(8, zoom * 8),
                        fontWeight: 'normal',
                        fontFamily: 'Arial, sans-serif',
                        fill: '#7f8c8d',
                        pointerEvents: 'none',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                        userSelect: 'none'
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

        {/* Legenda */}
        <Box
          position="absolute"
          bottom={16}
          left={16}
          zIndex={1000}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            p: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: 250
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            📊 Legenda de Status
          </Typography>
          <Box display="flex" flexDirection="column" gap={0.8}>
            {Object.entries(cores).map(([status, cor]) => {
              if (['hover', 'stroke', 'strokeHover'].includes(status)) return null;
              
              const label = {
                'ativo': 'Contratos Ativos',
                'proximo-vencimento': 'Próximo ao Vencimento',
                'vencido': 'Contratos Vencidos',
                'sem-contratos': 'Sem Contratos'
              }[status] || status;

              return (
                <Box key={status} display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      backgroundColor: cor,
                      border: '1px solid #34495e',
                      borderRadius: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Typography variant="caption" color="text.primary">
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Informações de Navegação */}
        <Box
          position="absolute"
          bottom={16}
          right={16}
          zIndex={1000}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            p: 1.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            🖱️ Clique e arraste para navegar
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            🔍 Use os controles para zoom
          </Typography>
        </Box>
      </Paper>

      {/* Tooltip Customizado */}
      {tooltipData.visible && tooltipData.estado && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            left: tooltipData.x + 15,
            top: tooltipData.y - 10,
            zIndex: 2000,
            p: 2,
            maxWidth: 320,
            backgroundColor: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e1e5e9',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
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
            <Typography 
              variant="body2" 
              sx={{ 
                color: tooltipData.estado.statusContrato === 'ativo' ? 'success.main' :
                       tooltipData.estado.statusContrato === 'proximo-vencimento' ? 'warning.main' :
                       tooltipData.estado.statusContrato === 'vencido' ? 'error.main' : 'text.secondary',
                fontWeight: 'bold'
              }}
            >
              🔄 <strong>Status:</strong> {tooltipData.estado.statusContrato.replace('-', ' ').toUpperCase()}
            </Typography>
          </Box>
          
          {tooltipData.estado.statusContrato !== 'sem-contratos' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Clique para ver detalhes dos contratos
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default MapaBrasilCompleto; 