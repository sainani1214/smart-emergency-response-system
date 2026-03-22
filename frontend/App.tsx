import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CreateIncidentScreen from './src/screens/CreateIncidentScreen';

import MyIncidentsScreen from './src/screens/MyIncidentsScreen';
import NearbyIncidentsScreen from './src/screens/NearbyIncidentsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { COLORS } from './src/constants/theme';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import { storage } from './src/services/storage';
import { tokenStore } from './src/services/tokenStore';
import './src/services/storageDebug'; // Load debug utilities

export type UserAppStackParamList = {
  Login: undefined;
  Signup: undefined;
  ReportIncident: undefined;
  MyReports: undefined;
  NearbyIncidents: undefined;
  Settings: undefined;
  LiveTracking: {
    incidentId: string;
    simulationId?: string;
  };
};

const Stack = createNativeStackNavigator<UserAppStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.backgroundElevated,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      let token: string | null = null;
      
      // Try AsyncStorage first
      try {
        if (storage.isAvailable()) {
          token = await storage.getItem('userToken');
        }
      } catch (storageError) {
        console.warn('[App] AsyncStorage read failed:', storageError);
      }
      
      // Check memory store as fallback
      if (!token || typeof token !== 'string') {
        token = tokenStore.getToken();
      }
      
      const isAuthenticated = !!(token && token.trim());
      console.log('[App] Auth check - token exists:', isAuthenticated);
      setIsAuthenticated(isAuthenticated);
    } catch (error) {
      console.log('[App] Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const handleAuthSuccess = async () => {
    console.log('[App] Auth success - setting authenticated state');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    console.log('[App] Logging out - clearing session');
    try {
      if (storage.isAvailable()) {
        await storage.removeItem('userToken');
        await storage.removeItem('userData');
      }
    } catch (error) {
      console.log('[App] Logout storage clear error:', error);
    }
    tokenStore.clear();
    setIsAuthenticated(false);
  };

  // Loading state
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'ReportIncident' : 'Login'}
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTitleStyle: {
              color: COLORS.text,
              fontWeight: '700',
            },
            headerTintColor: COLORS.text,
            contentStyle: {
              backgroundColor: COLORS.background,
            },
          }}
        >
          {!isAuthenticated ? (
            <>
              <Stack.Screen
                name="Login"
                options={{ title: 'Login', headerShown: false }}
              >
                {(props) => <LoginScreen {...props} onLoginSuccess={handleAuthSuccess} />}
              </Stack.Screen>
              <Stack.Screen
                name="Signup"
                options={{ title: 'Sign Up', headerShown: false }}
              >
                {(props) => <SignupScreen {...props} onSignupSuccess={handleAuthSuccess} />}
              </Stack.Screen>
            </>
          ) : (
            <>
              <Stack.Screen
                name="ReportIncident"
                options={{ title: 'Report emergency' }}
              >
                {(props) => <CreateIncidentScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="MyReports"
                options={{ title: 'My reports' }}
              >
                {(props) => <MyIncidentsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="NearbyIncidents"
                component={NearbyIncidentsScreen}
                options={{ title: 'Nearby incidents' }}
              />
              <Stack.Screen
                name="Settings"
                options={{ title: 'Settings' }}
              >
                {(props) => <SettingsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="LiveTracking"
                component={LiveTrackingScreen}
                options={{ title: 'Live help tracking' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
