import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

interface StatusBarProps {
  serverConnected: boolean;
  tabletConfigured: boolean;
  appVersion: string;
  tabletId: string;
  showAnimation?: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  serverConnected,
  tabletConfigured,
  appVersion,
  tabletId,
  showAnimation = true,
}) => {
  // Apenas rotação para evitar conflitos de animação
  const [rotateAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (showAnimation && serverConnected) {
      // Mudança para useNativeDriver: false devido ao uso de setValue()
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: false, // Alterado para false devido ao setValue()
        })
      );

      rotate.start();
      
      return () => {
        rotate.stop();
        rotateAnim.setValue(0);
      };
    } else {
      // Parar animação quando offline
      rotateAnim.stopAnimation(() => rotateAnim.setValue(0));
    }
  }, [serverConnected, showAnimation, rotateAnim]);

  const formatTabletId = (id: string): string => {
    if (id.length >= 8) {
      return id.slice(-4);
    }
    return id.padStart(4, '0');
  };

  const getStatusColor = (status: boolean): string => {
    return status ? '#28a745' : '#dc3545';
  };

  const getStatusText = (connected: boolean, configured: boolean): string => {
    if (connected && configured) return 'Operacional';
    if (!connected) return 'Offline';
    if (!configured) return 'Configuração';
    return 'Indefinido';
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Status Principal - Destaque */}
      <View style={styles.primaryStatus}>
        {/* Ícone de Conexão com animações separadas */}
        <View style={styles.connectionIconContainer}>
          {serverConnected ? (
            <Animated.View style={{
              transform: [{ rotate: spin }]
            }}>
              <Icon 
                name="wifi" 
                size={18} 
                color="#28a745"
                style={styles.connectionIcon}
              />
            </Animated.View>
          ) : (
            <Icon 
              name="wifi-off" 
              size={18} 
              color="#dc3545"
              style={styles.connectionIcon}
            />
          )}
        </View>

        <View style={styles.primaryStatusText}>
          <Text style={[
            styles.primaryLabel,
            { color: getStatusColor(serverConnected) }
          ]}>
            {getStatusText(serverConnected, tabletConfigured)}
          </Text>
          <Text style={styles.primarySubtext}>
            {serverConnected ? 'Sistema conectado' : 'Verificar conexão'}
          </Text>
        </View>
      </View>

      {/* Informações Secundárias */}
      <View style={styles.secondaryInfo}>
        {/* Versão */}
        <View style={styles.infoItem}>
          <Icon name="info-outline" size={14} color="#adb5bd" />
          <Text style={styles.infoLabel}>v{appVersion}</Text>
        </View>

        {/* Separador sutil */}
        <View style={styles.dot} />

        {/* ID do Tablet - Discreto */}
        <View style={styles.infoItem}>
          <Icon name="smartphone" size={14} color="#adb5bd" />
          <Text style={styles.idLabel}>{formatTabletId(tabletId)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseOverlay: {
    width: 18,
    height: 18,
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderRadius: 9,
  },
  connectionIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  primaryStatusText: {
    flex: 1,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  primarySubtext: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  secondaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
    fontWeight: '500',
  },
  idLabel: {
    fontSize: 11,
    color: '#adb5bd',
    marginLeft: 4,
    fontWeight: '400',
    fontFamily: 'monospace',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dee2e6',
    marginHorizontal: 8,
  },
});

export default StatusBar; 