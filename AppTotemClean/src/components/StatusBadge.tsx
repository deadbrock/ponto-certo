import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'gps' | 'offline';
  text: string;
  icon?: string;
  style?: any;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, icon, style }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'success':
        return { backgroundColor: '#4CAF50', color: '#ffffff' };
      case 'warning':
        return { backgroundColor: '#FF9800', color: '#ffffff' };
      case 'error':
        return { backgroundColor: '#f44336', color: '#ffffff' };
      case 'info':
        return { backgroundColor: '#2196F3', color: '#ffffff' };
      case 'gps':
        return { backgroundColor: '#4CAF50', color: '#ffffff' };
      case 'offline':
        return { backgroundColor: '#9E9E9E', color: '#ffffff' };
      default:
        return { backgroundColor: '#2196F3', color: '#ffffff' };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <View style={[styles.badge, { backgroundColor: statusStyle.backgroundColor }, style]}>
      <Text style={[styles.text, { color: statusStyle.color }]}>
        {icon && `${icon} `}{text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatusBadge; 