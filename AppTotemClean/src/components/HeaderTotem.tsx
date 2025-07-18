import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

interface HeaderTotemProps {
  tabletName?: string;
  location?: string;
  tabletId?: string;
  isOnline: boolean;
  onConfigureLocation?: () => void; // Callback para configurar local
}

const HeaderTotem: React.FC<HeaderTotemProps> = ({
  tabletName = 'Tablet FG',
  location = 'Local não configurado',
  tabletId = '0000',
  isOnline = false,
  onConfigureLocation,
}) => {
  const formatTabletId = (id: string): string => {
    if (id.length >= 8) {
      return id.slice(-8);
    }
    return id.padStart(8, '0');
  };

  const isLocationConfigured = location && location !== 'Não configurado' && location !== 'Local não configurado';

  return (
    <LinearGradient
      colors={['#003087', '#007BFF']}
      style={styles.headerContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {/* Logo FG - Aumentado e Centralizado */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>FG</Text>
        </View>
      </View>

      {/* Título Central */}
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>Ponto Certo FG</Text>
        <Text style={styles.subtitle}>Sistema de Controle de Ponto</Text>
        
        {/* Local do Tablet - Destaque */}
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={18} color="#ffffff" style={styles.locationIcon} />
          {isLocationConfigured ? (
            <Text style={styles.locationText}>{location}</Text>
          ) : (
            <TouchableOpacity 
              style={styles.configureButton}
              onPress={onConfigureLocation}
              activeOpacity={0.8}
            >
              <Icon name="settings" size={16} color="#ffffff" style={styles.configureIcon} />
              <Text style={styles.configureText}>Configurar local</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Informações do Tablet - Compactas */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="tablet-android" size={14} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.infoText}>{tabletName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="fingerprint" size={14} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.infoText}>ID: {formatTabletId(tabletId)}</Text>
        </View>

        {/* Status de Conexão - Animado */}
        <View style={[styles.infoRow, styles.statusRow]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isOnline ? '#28a745' : '#dc3545' }
          ]} />
          <Text style={[
            styles.statusText,
            { color: isOnline ? '#d4edda' : '#f8d7da' }
          ]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 40,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  logoContainer: {
    flex: 0.8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 60, // Aumentado de 50 para 60
    height: 60, // Aumentado de 50 para 60
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 22, // Aumentado de 18 para 22
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleContainer: {
    flex: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: screenWidth > 768 ? 28 : 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: screenWidth > 768 ? 16 : 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  locationIcon: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  configureIcon: {
    marginRight: 4,
  },
  configureText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
    fontWeight: '500',
  },
  statusRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusDotPulse: {
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HeaderTotem; 