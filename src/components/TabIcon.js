/**
 * Tab Icon component
 * Material Design icons for navigation
 */
import { View, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function TabIcon({ icon, size, color }) {
  const getIcon = () => {
    switch (icon) {
      case 'home':
        return <MaterialIcons name="home" size={size} color={color} />;
      case 'search':
        return <MaterialIcons name="search" size={size} color={color} />;
      case 'add':
        return <MaterialIcons name="add" size={size + 4} color={color} />;
      case 'bell':
        return <Ionicons name="notifications-outline" size={size} color={color} />;
      case 'user':
        return <MaterialIcons name="person" size={size} color={color} />;
      default:
        return <MaterialIcons name="circle" size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {getIcon()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});
