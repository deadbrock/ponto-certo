import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

interface FloatingConfigButtonProps {
  onPress: () => void;
}

const FloatingConfigButton: React.FC<FloatingConfigButtonProps> = ({
  onPress,
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  const handlePressIn = () => {
    // Separar animações para evitar conflitos
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: false, // Forcado para JS para eliminar conflitos
      tension: 300,
      friction: 10,
    }).start();
    
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false, // Alterado para false devido ao interpolate()
    }).start();
  };

  const handlePressOut = () => {
    // Separar animações para evitar conflitos
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: false, // Forcado para JS para eliminar conflitos
      tension: 300,
      friction: 10,
    }).start();
    
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false, // Alterado para false devido ao interpolate()
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['#6c757d', '#495057']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon
              name="settings"
              size={24}
              color="#ffffff"
              style={styles.icon}
            />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Acima do StatusBar
    right: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default FloatingConfigButton; 