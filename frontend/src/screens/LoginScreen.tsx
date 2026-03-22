import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { theme } from '../constants/theme';
import { authAPI } from '../services/api';
import { storage } from '../services/storage';
import { tokenStore } from '../services/tokenStore';

interface LoginScreenProps {
  navigation: any;
  onLoginSuccess: () => void;
}

export default function LoginScreen({ navigation, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const persistSessionIfPossible = async (token: string, user: { id: string; name: string; email: string; role: 'user' | 'responder' }) => {
    try {
      const tokenStored = await storage.setItemIfAvailable('userToken', token);
      const userStored = await storage.setItemIfAvailable('userData', JSON.stringify(user));
      return tokenStored && userStored;
    } catch {
      return false;
    }
  };

  const validate = () => {
    let valid = true;
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  };

  const getLoginErrorMessage = (error: unknown) => {
    const fallback = 'Unable to sign in right now. Please try again.';

    if (typeof error === 'object' && error && 'response' in error) {
      const axiosError = error as {
        response?: {
          data?: {
            error?: string;
            message?: string;
          };
          status?: number;
        };
        message?: string;
      };
      const apiError = axiosError.response?.data?.error || axiosError.response?.data?.message;
      if (apiError) {
        return apiError;
      }
      if (axiosError.response?.status === 401) {
        return 'Incorrect email or password';
      }
      if (axiosError.message?.includes('Network Error')) {
        return 'Cannot reach the server. Check that the backend is running and the API URL is correct.';
      }
      return axiosError.message || fallback;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const data = await authAPI.login({
        email: email.toLowerCase().trim(),
        password,
        role: 'user',
      });

      if (data.success && data.data && data.data.token && data.data.user) {
        console.log('[Login] ===== LOGIN SUCCESS =====');
        console.log('[Login] Token received, length:', data.data.token.length);
        console.log('[Login] User:', data.data.user.name, data.data.user.email);
        
        // STEP 1: Always store in memory first (immediate, never fails)
        tokenStore.setToken(data.data.token);
        tokenStore.setUserData(JSON.stringify(data.data.user));
        console.log('[Login] ✓ Memory storage complete');
        
        // STEP 2: Try to persist to AsyncStorage for next session
        let persistSuccess = false;
        if (storage.isAvailable()) {
          try {
            console.log('[Login] Attempting AsyncStorage persist...');
            await storage.setItem('userToken', data.data.token);
            await storage.setItem('userData', JSON.stringify(data.data.user));
            persistSuccess = true;
            console.log('[Login] ✓ AsyncStorage persist SUCCESS');
          } catch (storageError) {
            console.error('[Login] ✗ AsyncStorage persist FAILED:', storageError);
            console.warn('[Login] Session will work now but won\'t persist after app restart');
          }
        } else {
          console.warn('[Login] ✗ AsyncStorage not available, using memory-only session');
        }

        const message = persistSuccess
          ? `Welcome back, ${data.data.user.name}`
          : `Welcome back, ${data.data.user.name}. Note: Your session won't persist after closing the app.`;

        Alert.alert(
          'Signed in',
          message,
          [{ text: 'Continue', onPress: onLoginSuccess }]
        );
      } else {
        // Type narrowing: if not success, it's AuthErrorResponse
        const errorData = data as { success: false; error: string };
        Alert.alert('Sign in failed', errorData.error || 'Incorrect email or password');
      }
    } catch (error) {
      Alert.alert('Sign in failed', getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Emergency support</Text>
          </View>
          <Text style={styles.title}>Sign in instantly when every second matters</Text>
          <Text style={styles.subtitle}>
            Report emergencies faster, track responders live, and keep your family informed.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Use your account to continue into the response dashboard.</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) {
                  setEmailError('');
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, passwordError ? styles.inputError : null]}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((value) => !value)}>
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroCard: {
    backgroundColor: '#101828',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: 18,
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#DDE3EC',
    color: theme.colors.text,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#DDE3EC',
    color: theme.colors.text,
    paddingRight: 64,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  passwordToggleText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    marginTop: 4,
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  link: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
});