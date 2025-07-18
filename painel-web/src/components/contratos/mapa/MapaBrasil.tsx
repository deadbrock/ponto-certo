import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { EstadoContrato } from '../../../services/mapaService';

interface MapaBrasilProps {
  estados: EstadoContrato[];
  onEstadoClick: (uf: string) => void;
  onEstadoHover: (uf: string | null) => void;
  cores: Record<string, string>;
  hoveredState: string | null;
}

const MapaBrasil: React.FC<MapaBrasilProps> = ({
  estados,
  onEstadoClick,
  onEstadoHover,
  cores,
  hoveredState
}) => {
  
  // Função para obter cor do estado
  const obterCorEstado = (uf: string): string => {
    const estado = estados.find(e => e.uf === uf);
    if (!estado) return cores['sem-contratos'];
    
    if (hoveredState === uf) return cores.hover;
    return cores[estado.statusContrato];
  };

  // Obter dados do estado para tooltip
  const obterDadosEstado = (uf: string): EstadoContrato | null => {
    return estados.find(e => e.uf === uf) || null;
  };

  // Componente de estado com tooltip
  const EstadoComTooltip: React.FC<{ 
    uf: string; 
    path: string; 
    nome: string; 
  }> = ({ uf, path, nome }) => {
    const dadosEstado = obterDadosEstado(uf);
    
    const tooltipContent = dadosEstado ? (
      <Box>
        <div><strong>{nome} ({uf})</strong></div>
        <div>Contratos: {dadosEstado.totalContratos}</div>
        <div>Funcionários: {dadosEstado.totalFuncionarios}</div>
        <div>Valor: {dadosEstado.valorTotal.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          notation: 'compact',
          maximumFractionDigits: 1
        })}</div>
        <div>Status: {dadosEstado.statusContrato}</div>
      </Box>
    ) : (
      <Box>
        <div><strong>{nome} ({uf})</strong></div>
        <div>Sem contratos</div>
      </Box>
    );

    return (
      <Tooltip title={tooltipContent} arrow placement="top">
        <path
          d={path}
          fill={obterCorEstado(uf)}
          stroke="#ffffff"
          strokeWidth="1"
          style={{
            cursor: dadosEstado && dadosEstado.statusContrato !== 'sem-contratos' ? 'pointer' : 'default',
            transition: 'fill 0.2s ease-in-out'
          }}
          onClick={() => {
            if (dadosEstado && dadosEstado.statusContrato !== 'sem-contratos') {
              onEstadoClick(uf);
            }
          }}
          onMouseEnter={() => onEstadoHover(uf)}
          onMouseLeave={() => onEstadoHover(null)}
        />
      </Tooltip>
    );
  };

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <svg 
        viewBox="0 0 800 600" 
        style={{ 
          width: '100%', 
          height: '100%',
          maxWidth: '800px',
          maxHeight: '600px'
        }}
      >
        {/* Acre */}
        <EstadoComTooltip
          uf="AC"
          nome="Acre"
          path="M150,350 L180,340 L190,370 L170,380 L150,370 Z"
        />
        
        {/* Alagoas */}
        <EstadoComTooltip
          uf="AL"
          nome="Alagoas"
          path="M620,380 L635,375 L640,390 L625,395 Z"
        />
        
        {/* Amapá */}
        <EstadoComTooltip
          uf="AP"
          nome="Amapá"
          path="M380,200 L400,190 L410,210 L390,220 Z"
        />
        
        {/* Amazonas */}
        <EstadoComTooltip
          uf="AM"
          nome="Amazonas"
          path="M100,280 L200,270 L220,300 L200,330 L150,340 L120,320 Z"
        />
        
        {/* Bahia */}
        <EstadoComTooltip
          uf="BA"
          nome="Bahia"
          path="M520,360 L580,350 L590,420 L530,430 L510,400 Z"
        />
        
        {/* Ceará */}
        <EstadoComTooltip
          uf="CE"
          nome="Ceará"
          path="M560,290 L590,285 L595,310 L565,315 Z"
        />
        
        {/* Distrito Federal */}
        <EstadoComTooltip
          uf="DF"
          nome="Distrito Federal"
          path="M480,380 L485,375 L490,385 L485,390 Z"
        />
        
        {/* Espírito Santo */}
        <EstadoComTooltip
          uf="ES"
          nome="Espírito Santo"
          path="M560,420 L575,415 L580,435 L565,440 Z"
        />
        
        {/* Goiás */}
        <EstadoComTooltip
          uf="GO"
          nome="Goiás"
          path="M460,380 L500,370 L510,410 L470,420 Z"
        />
        
        {/* Maranhão */}
        <EstadoComTooltip
          uf="MA"
          nome="Maranhão"
          path="M480,300 L520,290 L530,320 L490,330 Z"
        />
        
        {/* Mato Grosso */}
        <EstadoComTooltip
          uf="MT"
          nome="Mato Grosso"
          path="M380,360 L430,350 L440,390 L390,400 Z"
        />
        
        {/* Mato Grosso do Sul */}
        <EstadoComTooltip
          uf="MS"
          nome="Mato Grosso do Sul"
          path="M420,420 L460,410 L470,450 L430,460 Z"
        />
        
        {/* Minas Gerais */}
        <EstadoComTooltip
          uf="MG"
          nome="Minas Gerais"
          path="M500,420 L560,410 L570,460 L510,470 Z"
        />
        
        {/* Pará */}
        <EstadoComTooltip
          uf="PA"
          nome="Pará"
          path="M300,280 L400,270 L420,310 L320,320 Z"
        />
        
        {/* Paraíba */}
        <EstadoComTooltip
          uf="PB"
          nome="Paraíba"
          path="M600,300 L615,295 L620,315 L605,320 Z"
        />
        
        {/* Paraná */}
        <EstadoComTooltip
          uf="PR"
          nome="Paraná"
          path="M480,480 L520,470 L530,510 L490,520 Z"
        />
        
        {/* Pernambuco */}
        <EstadoComTooltip
          uf="PE"
          nome="Pernambuco"
          path="M580,320 L610,315 L620,345 L590,350 Z"
        />
        
        {/* Piauí */}
        <EstadoComTooltip
          uf="PI"
          nome="Piauí"
          path="M520,320 L550,315 L560,345 L530,350 Z"
        />
        
        {/* Rio de Janeiro */}
        <EstadoComTooltip
          uf="RJ"
          nome="Rio de Janeiro"
          path="M560,460 L580,455 L590,475 L570,480 Z"
        />
        
        {/* Rio Grande do Norte */}
        <EstadoComTooltip
          uf="RN"
          nome="Rio Grande do Norte"
          path="M590,285 L605,280 L610,300 L595,305 Z"
        />
        
        {/* Rio Grande do Sul */}
        <EstadoComTooltip
          uf="RS"
          nome="Rio Grande do Sul"
          path="M480,520 L520,510 L530,550 L490,560 Z"
        />
        
        {/* Rondônia */}
        <EstadoComTooltip
          uf="RO"
          nome="Rondônia"
          path="M300,350 L330,340 L340,370 L310,380 Z"
        />
        
        {/* Roraima */}
        <EstadoComTooltip
          uf="RR"
          nome="Roraima"
          path="M280,220 L310,210 L320,240 L290,250 Z"
        />
        
        {/* Santa Catarina */}
        <EstadoComTooltip
          uf="SC"
          nome="Santa Catarina"
          path="M500,510 L530,500 L540,530 L510,540 Z"
        />
        
        {/* São Paulo */}
        <EstadoComTooltip
          uf="SP"
          nome="São Paulo"
          path="M520,460 L560,450 L570,490 L530,500 Z"
        />
        
        {/* Sergipe */}
        <EstadoComTooltip
          uf="SE"
          nome="Sergipe"
          path="M610,370 L625,365 L630,385 L615,390 Z"
        />
        
        {/* Tocantins */}
        <EstadoComTooltip
          uf="TO"
          nome="Tocantins"
          path="M450,340 L480,330 L490,360 L460,370 Z"
        />
      </svg>
    </Box>
  );
};

export default MapaBrasil; 