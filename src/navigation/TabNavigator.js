/**
 * Bottom Tab Navigator
 * Main navigation for the app
 */
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';
import ReportScreen from '../screens/ReportScreen';
import CasesScreen from '../screens/CasesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.semibold,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.bold,
        },
      }}
    >
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          title: '🐾 Report Animal',
          tabBarIcon: ({ size }) => (
            <Text style={{ fontSize: size * 1.2 }}>📝</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Cases"
        component={CasesScreen}
        options={{
          title: '🐾 Active Cases',
          tabBarIcon: ({ size }) => (
            <Text style={{ fontSize: size * 1.2 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '🐾 My Profile',
          tabBarIcon: ({ size }) => (
            <Text style={{ fontSize: size * 1.2 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
