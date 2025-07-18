// 💡 Criar componente MapaDeAtuacaoReal para substituir o atual
// Usar biblioteca `react-simple-maps` com dados reais do Brasil (GeoJSON)
// GeoJSON recomendado: https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson

import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const MapaDeAtuacaoReal = () => {
  const [estados, setEstados] = useState<any[]>([]);
  const [contratos, setContratos] = useState<{ [sigla: string]: string }>({});

  useEffect(() => {
    // Exemplo: carregar status dos contratos por estado (ativo, vencido, etc.)
    axios.get("/api/contratos/estados").then(res => setContratos(res.data));
  }, []);

  const getCorPorStatus = (sigla: string) => {
    switch (contratos[sigla]) {
      case "ativo": return "#28a745"; // verde
      case "vencido": return "#dc3545"; // vermelho
      case "proximo": return "#ffc107"; // amarelo
      default: return "#e9ecef"; // cinza claro
    }
  };

  return (
    <div style={{ width: "100%", height: 500 }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 750, center: [-52, -15] }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const sigla = geo.properties.sigla || (geo.properties.name?.slice(0, 2).toUpperCase()) || '';
              return (
                <Tooltip title={`${geo.properties.name || 'Estado'} - ${contratos[sigla] || 'Sem contrato'}`} key={geo.rsmKey}>
                  <Geography
                    geography={geo}
                    fill={getCorPorStatus(sigla)}
                    stroke="#FFF"
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#007bff", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                </Tooltip>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
};

export default MapaDeAtuacaoReal; 