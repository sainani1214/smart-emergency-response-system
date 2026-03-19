import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DashboardScreen from './src/screens/DashboardScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import IncidentDetailScreen from './src/screens/IncidentDetailScreen';
import CreateIncidentScreen from './src/screens/CreateIncidentScreen';
import TabIcon from './src/components/TabIcon';
import { COLORS, SIZES } from './src/constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundElevated,
          borderTopWidth: 0,
          paddingBottom: 12,
          paddingTop: 10,
          height: 92,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontSize: SIZES.caption2,
          fontWeight: '600',
          marginTop: 6,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="Dashboard" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="Resources" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="Map" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={CreateIncidentScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="Report" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="Alerts" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="IncidentDetail"
            component={IncidentDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateIncident"
            component={CreateIncidentScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
