import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {API_CONFIG, buildApiUrl, apiRequest} from '../config/api';
import {DeviceService} from '../services/DeviceService';

interface RegistroPonto {
  id: number;
  colaborador_nome: string;
  colaborador_cpf: string;
  data_hora: string;
  latitude?: number | null;
  longitude?: number | null;
  tablet_id: string;
  tipo_registro: 'entrada' | 'parada_almoco' | 'volta_almoco' | 'saida';
}

interface HistoricoScreenProps {
  navigation: any;
}

const HistoricoScreen: React.FC<HistoricoScreenProps> = ({navigation}) => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabletId, setTabletId] = useState<string>('');
  const [filtroData, setFiltroData] = useState<'hoje' | 'semana' | 'mes'>('hoje');

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const deviceId = await DeviceService.getDeviceId();
      setTabletId(deviceId);
      await loadHistorico();
    } catch (error) {
      console.error('Erro ao inicializar tela:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do tablet');
    }
  };

  const loadHistorico = async () => {
    try {
      const deviceId = await DeviceService.getDeviceId();
      const tabletData = await DeviceService.getTabletDataForServer();
      
      // Usar endpoint público que não requer autenticação JWT
      const url = buildApiUrl(`/api/ponto/historico-tablet-public/${deviceId}`);
      const response = await apiRequest(url, {
        method: 'GET',
        headers: {
          'X-Tablet-ID': deviceId,
          'X-Tablet-Data': JSON.stringify(tabletData),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const registrosFiltrados = filtrarRegistrosPorData(data.registros || []);
        setRegistros(registrosFiltrados);
      } else {
        const error = await response.json();
        console.error('Erro ao carregar histórico:', error);
        Alert.alert('Erro', error.message || 'Falha ao carregar histórico');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      Alert.alert('Erro', 'Falha na comunicação com o servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtrarRegistrosPorData = (registros: RegistroPonto[]) => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    switch (filtroData) {
      case 'hoje':
        return registros.filter(registro => {
          const dataRegistro = new Date(registro.data_hora);
          return dataRegistro >= hoje;
        });
      
      case 'semana':
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        return registros.filter(registro => {
          const dataRegistro = new Date(registro.data_hora);
          return dataRegistro >= inicioSemana;
        });
      
      case 'mes':
        const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
        return registros.filter(registro => {
          const dataRegistro = new Date(registro.data_hora);
          return dataRegistro >= inicioMes;
        });
      
      default:
        return registros;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistorico();
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const renderRegistro = ({item}: {item: RegistroPonto}) => {
    const {data, hora} = formatarDataHora(item.data_hora);
    
    // Mapear tipos para display e estilos
    const getTipoInfo = (tipo: string) => {
      switch (tipo) {
        case 'entrada':
          return { label: 'ENTRADA', style: styles.entradaBadge };
        case 'parada_almoco':
          return { label: 'PARADA ALMOÇO', style: styles.paradaAlmocoBadge };
        case 'volta_almoco':
          return { label: 'VOLTA ALMOÇO', style: styles.voltaAlmocoBadge };
        case 'saida':
          return { label: 'SAÍDA', style: styles.saidaBadge };
        default:
          return { label: tipo.toUpperCase(), style: styles.entradaBadge };
      }
    };

    const tipoInfo = getTipoInfo(item.tipo_registro);
    
    return (
      <View style={styles.registroCard}>
        <View style={styles.registroHeader}>
          <Text style={styles.colaboradorNome}>{item.colaborador_nome}</Text>
          <View style={[styles.tipoRegistroBadge, tipoInfo.style]}>
            <Text style={styles.tipoRegistroText}>
              {tipoInfo.label}
            </Text>
          </View>
        </View>
        
        <Text style={styles.colaboradorCpf}>CPF: {item.colaborador_cpf}</Text>
        
        <View style={styles.registroInfo}>
          <Text style={styles.dataHora}>{data} às {hora}</Text>
          {item.latitude != null && item.longitude != null && 
           typeof item.latitude === 'number' && typeof item.longitude === 'number' && (
            <Text style={styles.localizacao}>
              📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderFiltroButtons = () => (
    <View style={styles.filtroContainer}>
      {(['hoje', 'semana', 'mes'] as const).map((filtro) => (
        <TouchableOpacity
          key={filtro}
          style={[
            styles.filtroButton,
            filtroData === filtro && styles.filtroButtonActive
          ]}
          onPress={() => {
            setFiltroData(filtro);
            setLoading(true);
            loadHistorico();
          }}>
          <Text style={[
            styles.filtroButtonText,
            filtroData === filtro && styles.filtroButtonTextActive
          ]}>
            {filtro === 'hoje' ? 'Hoje' : filtro === 'semana' ? 'Semana' : 'Mês'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Histórico de Registros</Text>
        <Text style={styles.tabletInfo}>Tablet: {tabletId.slice(-8)}</Text>
      </View>

      {renderFiltroButtons()}

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total de registros: {registros.length}
        </Text>
      </View>

      <FlatList
        data={registros}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRegistro}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhum registro encontrado para o período selecionado
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tabletInfo: {
    fontSize: 14,
    color: '#ccc',
  },
  filtroContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    justifyContent: 'space-around',
  },
  filtroButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filtroButtonActive: {
    backgroundColor: '#007AFF',
  },
  filtroButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filtroButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  registroCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  colaboradorNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  tipoRegistroBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  entradaBadge: {
    backgroundColor: '#4CAF50',
  },
  paradaAlmocoBadge: {
    backgroundColor: '#9C27B0',
  },
  voltaAlmocoBadge: {
    backgroundColor: '#2196F3',
  },
  saidaBadge: {
    backgroundColor: '#FF9800',
  },
  tipoRegistroText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  colaboradorCpf: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  registroInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  dataHora: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  localizacao: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default HistoricoScreen; 