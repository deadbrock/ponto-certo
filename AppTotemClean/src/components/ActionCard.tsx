import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Dimensions,
  Animated,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

interface ActionCardProps {
  title: string;
  subtitle?: string;
  iconName: string;
  colors: string[];
  onPress: () => void;
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  iconName,
  colors,
  onPress,
  size = 'medium',
  disabled = false,
}) => {
  // Separar animações para evitar conflito nativo/JS
  const [scaleAnim] = useState(new Animated.Value(1));
  const [elevationAnim] = useState(new Animated.Value(6));

  const getCardStyle = (): ViewStyle => {
    switch (size) {
      case 'large':
        return {
          width: screenWidth > 768 ? '48%' as const : '90%' as const,
          height: 180,
        };
      case 'small':
        return {
          width: screenWidth > 768 ? '30%' as const : '42%' as const,
          height: 120,
        };
      default: // medium
        return {
          width: screenWidth > 768 ? '45%' as const : '85%' as const,
          height: 150,
        };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'large': return 52;
      case 'small': return 28;
      default: return 44;
    }
  };

  const handlePressIn = () => {
    if (!disabled) {
      // Separar animações para evitar conflitos
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: false, // Forcado para JS para eliminar conflitos
        tension: 300,
        friction: 10,
      }).start();
      
      Animated.timing(elevationAnim, {
        toValue: 12,
        duration: 150,
        useNativeDriver: false, // Elevation: JS apenas
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      // Separar animações para evitar conflitos
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false, // Forcado para JS para eliminar conflitos
        tension: 300,
        friction: 10,
      }).start();
      
      Animated.timing(elevationAnim, {
        toValue: 6,
        duration: 150,
        useNativeDriver: false, // Elevation: JS apenas
      }).start();
    }
  };

  const cardStyle = getCardStyle();

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [{ scale: scaleAnim }], // Nativo
          elevation: elevationAnim, // JS
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.cardContainer, cardStyle, disabled && styles.disabled]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={disabled ? ['#e9ecef', '#dee2e6'] : colors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Overlay sutil para melhor contraste */}
          <View style={[styles.overlay, disabled && styles.overlayDisabled]} />
          
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, disabled && styles.iconContainerDisabled]}>
              <Icon
                name={iconName}
                size={getIconSize()}
                color={disabled ? '#6c757d' : '#ffffff'}
                style={[styles.iconShadow, !disabled && styles.iconShadowActive]}
              />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[
                styles.title,
                size === 'small' && styles.titleSmall,
                disabled && styles.titleDisabled,
                !disabled && styles.titleWithShadow
              ]}>
                {title}
              </Text>
              
              {subtitle && (
                <Text style={[
                  styles.subtitle,
                  size === 'small' && styles.subtitleSmall,
                  disabled && styles.subtitleDisabled,
                  !disabled && styles.subtitleWithShadow
                ]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {/* Brilho sutil no canto */}
          {!disabled && (
            <View style={styles.shine} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 8,
    marginHorizontal: 4,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardContainer: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 18,
  },
  overlayDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iconContainerDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.2)',
    elevation: 0,
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconShadowActive: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  titleDisabled: {
    color: '#6c757d',
    textShadowColor: 'transparent',
  },
  titleWithShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitleSmall: {
    fontSize: 11,
    fontWeight: '500',
  },
  subtitleDisabled: {
    color: '#adb5bd',
    textShadowColor: 'transparent',
  },
  subtitleWithShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  shine: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ActionCard; 