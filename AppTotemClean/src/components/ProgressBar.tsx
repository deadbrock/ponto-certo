import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 a 100
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  showPercentage?: boolean;
  label?: string;
  style?: any;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 20,
  backgroundColor = '#E0E0E0',
  fillColor = '#4CAF50',
  showPercentage = true,
  label,
  style
}) => {
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.progressContainer, { height, backgroundColor }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: widthInterpolated,
              backgroundColor: fillColor,
            },
          ]}
        />
        {showPercentage && (
          <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  progressContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  percentageText: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});

export default ProgressBar; 