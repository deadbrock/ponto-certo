import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface AlertBannerProps {
  visible: boolean;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  onClose?: () => void;
  autoHide?: boolean;
  duration?: number;
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  visible,
  type,
  message,
  onClose,
  autoHide = false,
  duration = 3000,
}) => {
  const [slideAnim] = React.useState(new Animated.Value(-100));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false, // Alterado para false devido ao stopAnimation()
        tension: 100,
        friction: 8,
      }).start();

      if (autoHide && duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: false, // Alterado para false devido ao stopAnimation()
      }).start();
    }
    
    // Cleanup para evitar conflitos
    return () => {
      slideAnim.stopAnimation();
    };
  }, [visible, slideAnim, autoHide, duration]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: false, // Alterado para false devido ao stopAnimation()
    }).start(() => {
      if (onClose) onClose();
    });
  };

  const getAlertConfig = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: '#dc3545',
          iconName: 'error',
          textColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: '#ffc107',
          iconName: 'warning',
          textColor: '#212529',
        };
      case 'success':
        return {
          backgroundColor: '#28a745',
          iconName: 'check-circle',
          textColor: '#ffffff',
        };
      case 'info':
        return {
          backgroundColor: '#17a2b8',
          iconName: 'info',
          textColor: '#ffffff',
        };
      default:
        return {
          backgroundColor: '#6c757d',
          iconName: 'info',
          textColor: '#ffffff',
        };
    }
  };

  const config = getAlertConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Icon
          name={config.iconName}
          size={24}
          color={config.textColor}
          style={styles.icon}
        />
        
        <Text style={[styles.message, { color: config.textColor }]}>
          {message}
        </Text>
        
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name="close"
              size={20}
              color={config.textColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default AlertBanner; 