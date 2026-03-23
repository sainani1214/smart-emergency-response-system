import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CreateIncidentScreen from './src/screens/CreateIncidentScreen';

import MyIncidentsScreen from './src/screens/MyIncidentsScreen';
import NearbyIncidentsScreen from './src/screens/NearbyIncidentsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { COLORS } from './src/constants/theme';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import { notificationsAPI } from './src/services/api';
import { storage } from './src/services/storage';
import { tokenStore } from './src/services/tokenStore';
import './src/services/storageDebug'; // Load debug utilities

export type UserAppStackParamList = {
  Login: undefined;
  Signup: undefined;
  ReportIncident: undefined;
  MyReports: undefined;
  NearbyIncidents: undefined;
  Notifications: undefined;
  Settings: undefined;
  LiveTracking: {
    incidentId: string;
    simulationId?: string;
  };
};

const Stack = createNativeStackNavigator<UserAppStackParamList>();

function HeaderNotificationBell({ onPress }: { onPress: () => void }) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const rawUser = await storage.getItem('userData').catch(() => null);
      if (!rawUser) {
        setCount(0);
        return;
      }

      const user = JSON.parse(rawUser);
      const recipient = user.id || user.email;
      if (!recipient) {
        setCount(0);
        return;
      }

      const unread = await notificationsAPI.unreadCount(recipient);
      setCount(unread);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  return (
    <Pressable style={styles.bellButton} onPress={onPress} hitSlop={10}>
      <Text style={styles.bellIcon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

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

  const authenticatedHeaderOptions = ({ navigation }: { navigation: { navigate: (screen: string) => void } }) => ({
    headerRight: () => <HeaderNotificationBell onPress={() => navigation.navigate('Notifications')} />,
  });

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
                options={({ navigation }) => ({
                  title: 'Report emergency',
                  ...authenticatedHeaderOptions({ navigation }),
                })}
              >
                {(props) => <CreateIncidentScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="MyReports"
                options={({ navigation }) => ({
                  title: 'My reports',
                  ...authenticatedHeaderOptions({ navigation }),
                })}
              >
                {(props) => <MyIncidentsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="NearbyIncidents"
                component={NearbyIncidentsScreen}
                options={({ navigation }) => ({
                  title: 'Nearby incidents',
                  ...authenticatedHeaderOptions({ navigation }),
                })}
              />
              <Stack.Screen
                name="Notifications"
                options={{ title: 'Notifications' }}
              >
                {(props) => <NotificationsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="Settings"
                options={({ navigation }) => ({
                  title: 'Settings',
                  ...authenticatedHeaderOptions({ navigation }),
                })}
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

const styles = StyleSheet.create({
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  bellBadge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: '800',
  },
});
