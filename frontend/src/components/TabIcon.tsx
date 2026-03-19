import React from 'react';
import { View, Text } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
}

// Better emergency-themed tab icons using SF Symbols style
const TabIcon: React.FC<TabIconProps> = ({ name, focused, color }) => {
  const getIcon = () => {
    switch (name) {
      case 'Dashboard':
        return '🏥'; // Hospital - Emergency command center
      case 'Resources':
        return '🚑'; // Ambulance - Emergency vehicles
      case 'Map':
        return '🗺️'; // World map - Geographic view
      case 'Report':
        return '📋'; // Clipboard - Report incidents
      case 'Alerts':
        return '🚨'; // Police car light - Alert notifications
      default:
        return '📱';
    }
  };

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      transform: [{ scale: focused ? 1.1 : 1.0 }],
    }}>
      <Text style={{ 
        fontSize: focused ? 26 : 24,
        color: color,
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}>
        {getIcon()}
      </Text>
    </View>
  );
};

export default TabIcon;