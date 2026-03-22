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

interface SignupScreenProps {
  navigation: any;
  onSignupSuccess: () => void;
}

export default function SignupScreen({ navigation, onSignupSuccess }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Full name is required';
    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) nextErrors.email = 'Enter a valid email address';

    const sanitizedPhone = phone.replace(/\D/g, '');
    if (!sanitizedPhone) nextErrors.phone = 'Phone number is required';
    else if (sanitizedPhone.length < 10) nextErrors.phone = 'Enter a valid phone number';

    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';

    if (!city.trim()) nextErrors.city = 'City is required';
    if (!state.trim()) nextErrors.state = 'State is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getSignupErrorMessage = (error: unknown) => {
    const fallback = 'Unable to create your account right now. Please try again.';

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
      if (axiosError.response?.status === 400) {
        return 'Please review your details and try again.';
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

  const handleSignup = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const data = await authAPI.registerUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        city: city.trim(),
        state: state.trim(),
      });

      if (data.success && data.data && data.data.token && data.data.user) {
        console.log('[Signup] ===== SIGNUP SUCCESS =====');
        console.log('[Signup] Token received, length:', data.data.token.length);
        console.log('[Signup] User:', data.data.user.name, data.data.user.email);
        
        // STEP 1: Always store in memory first (immediate, never fails)
        tokenStore.setToken(data.data.token);
        tokenStore.setUserData(JSON.stringify(data.data.user));
        console.log('[Signup] ✓ Memory storage complete');
        
        // STEP 2: Try to persist to AsyncStorage for next session
        let persistSuccess = false;
        if (storage.isAvailable()) {
          try {
            console.log('[Signup] Attempting AsyncStorage persist...');
            await storage.setItem('userToken', data.data.token);
            await storage.setItem('userData', JSON.stringify(data.data.user));
            persistSuccess = true;
            console.log('[Signup] ✓ AsyncStorage persist SUCCESS');
          } catch (storageError) {
            console.error('[Signup] ✗ AsyncStorage persist FAILED:', storageError);
            console.warn('[Signup] Session will work now but won\'t persist after app restart');
          }
        } else {
          console.warn('[Signup] ✗ AsyncStorage not available, using memory-only session');
        }

        const message = persistSuccess
          ? `Welcome, ${data.data.user.name}. Your emergency profile is ready.`
          : `Welcome, ${data.data.user.name}. Your profile is ready. Note: Your session won't persist after closing the app.`;

        Alert.alert(
          'Account created',
          message,
          [{ text: 'OK', onPress: onSignupSuccess }]
        );
      } else {
        // Type narrowing: if not success, it's AuthErrorResponse
        const errorData = data as { success: false; error: string };
        Alert.alert('Sign up failed', errorData.error || 'Could not create account');
      }
    } catch (error) {
      Alert.alert('Sign up failed', getSignupErrorMessage(error));
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
            <Text style={styles.badgeText}>Fast onboarding</Text>
          </View>
          <Text style={styles.title}>Create your emergency access profile</Text>
          <Text style={styles.subtitle}>
            Set up once, then report incidents faster with live response tracking and cleaner updates.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create account</Text>
          <Text style={styles.formSubtitle}>Make sure your contact details are accurate so responders can reach you quickly.</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="John Doe"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (errors.name) {
                  setErrors((current) => ({ ...current, name: '' }));
                }
              }}
              editable={!loading}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((current) => ({ ...current, email: '' }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="+1234567890"
              placeholderTextColor={theme.colors.textMuted}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                if (errors.phone) {
                  setErrors((current) => ({ ...current, phone: '' }));
                }
              }}
              keyboardType="phone-pad"
              editable={!loading}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, errors.password ? styles.inputError : null]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) {
                    setErrors((current) => ({ ...current, password: '' }));
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((value) => !value)}>
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, errors.city ? styles.inputError : null]}
                placeholder="Pune"
                placeholderTextColor={theme.colors.textMuted}
                value={city}
                onChangeText={(value) => {
                  setCity(value);
                  if (errors.city) {
                    setErrors((current) => ({ ...current, city: '' }));
                  }
                }}
                editable={!loading}
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={[styles.input, errors.state ? styles.inputError : null]}
                placeholder="Maharashtra"
                placeholderTextColor={theme.colors.textMuted}
                value={state}
                onChangeText={(value) => {
                  setState(value);
                  if (errors.state) {
                    setErrors((current) => ({ ...current, state: '' }));
                  }
                }}
                editable={!loading}
              />
              {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: '#0F172A',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
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
