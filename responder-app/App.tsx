import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { storage } from './src/services/storage';
import ResponderDashboard from './src/screens/ResponderDashboard';
import ResponderLoginScreen from './src/screens/ResponderLoginScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('responderToken');
      console.log('[App] Auth check - token exists:', !!token);
      setIsAuthenticated(!!token);
    } catch (error) {
      console.log('[App] Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const handleAuthSuccess = () => {
    console.log('[App] Auth success - setting authenticated state');
    setIsAuthenticated(true);
  };

  // Loading state
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {isAuthenticated ? (
        <ResponderDashboard />
      ) : (
        <ResponderLoginScreen onLoginSuccess={handleAuthSuccess} />
      )}
    </SafeAreaProvider>
  );
}