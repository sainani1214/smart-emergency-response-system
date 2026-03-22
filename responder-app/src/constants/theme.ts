export const API_BASE_URL = 'http://192.168.1.4:3000/api';

export const COLORS = {
  primary: '#111827',
  primaryMuted: '#1F2937',
  secondary: '#2563EB',
  accent: '#10B981',
  background: '#060B16',
  backgroundElevated: '#0F172A',
  surface: '#111C35',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
  badgeBlue: '#1D4ED8'
};

export const SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  padding: 16,
  paddingLg: 20,
  radius: 16,
  radiusLg: 24
};
// Default export for convenience
export const theme = {
  colors: COLORS,
  sizes: SIZES,
};

export default theme;
