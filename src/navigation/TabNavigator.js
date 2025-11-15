/**
 * Bottom Tab Navigator
 * Main navigation for the app
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { theme } from '../theme';
import GlassTabBar from '../components/GlassTabBar';
import TabIcon from '../components/TabIcon';
import ReportScreen from '../screens/ReportScreen';
import CasesScreen from '../screens/CasesScreen';
import CaseDetailsScreen from '../screens/CaseDetailsScreen';
import AddStatusUpdateScreen from '../screens/AddStatusUpdateScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Helper function to determine if tab bar should be visible
function getTabBarVisibility(route) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'CasesList';
  
  // Hide tab bar on these screens
  const hideTabBarScreens = ['CaseDetails', 'AddStatusUpdate'];
  
  return !hideTabBarScreens.includes(routeName);
}

// Cases Stack Navigator
function CasesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="CasesList" component={CasesScreen} />
      <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
      <Stack.Screen name="AddStatusUpdate" component={AddStatusUpdateScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.bold,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Cases"
        component={CasesStack}
        options={{
          title: 'Animalbook',
          headerShown: false,
          tabBarIcon: (props) => <TabIcon icon="home" {...props} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: (props) => <TabIcon icon="search" {...props} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          title: 'Report Animal',
          headerShown: false,
          tabBarIcon: (props) => <TabIcon icon="add" {...props} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          headerShown: false,
          tabBarIcon: (props) => <TabIcon icon="bell" {...props} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerShown: false,
          tabBarIcon: (props) => <TabIcon icon="user" {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}
