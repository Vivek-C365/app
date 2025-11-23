/**
 * Tab Icon component
 * Material Design icons for navigation with badge support
 */
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function TabIcon({ icon, size, color, badge }) {
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
      case 'sparkles':
        return <Ionicons name="sparkles" size={size} color={color} />;
      case 'user':
        return <MaterialIcons name="person" size={size} color={color} />;
      default:
        return <MaterialIcons name="circle" size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {getIcon()}
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
