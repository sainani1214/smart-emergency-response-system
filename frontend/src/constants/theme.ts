export const API_BASE_URL = 'http://192.168.1.4:3000/api';

// Modern Apple Emergency Dashboard Color Palette
export const COLORS = {
  // Primary Emergency colors
  primary: '#FF3B30',        // Emergency Red (iOS System Red)
  primaryLight: '#FF6259',   // Lighter Emergency Red
  primaryDark: '#D70015',    // Darker Emergency Red
  secondary: '#007AFF',      // iOS Blue
  accent: '#FF9500',         // iOS Orange
  
  // Semantic colors
  success: '#34C759',        // iOS Green
  warning: '#FF9500',        // iOS Orange
  danger: '#FF3B30',         // iOS Red
  info: '#007AFF',           // iOS Blue
  
  // Neutral colors (Apple style)
  background: '#F2F2F7',     // iOS System Background
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9F9',
  card: '#FFFFFF',
  border: '#E5E5EA',
  divider: '#D1D1D6',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Text colors (Apple Typography)
  text: '#000000',           // Primary Label
  textSecondary: '#8E8E93',  // Secondary Label
  textTertiary: '#C7C7CC',   // Tertiary Label
  textInverse: '#FFFFFF',
  textMuted: '#AEAEB2',
  
  // Dark/Light
  light: '#F2F2F7',
  dark: '#1C1C1E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8E8E93',
  grayLight: '#F2F2F7',
  
  // Severity colors (Emergency context)
  critical: '#FF3B30',       // Bright Red - Urgent
  high: '#FF9500',          // Orange - High Priority
  medium: '#FFCC00',        // Yellow - Medium Priority
  low: '#34C759',           // Green - Low Priority
  
  // Status colors
  open: '#FF3B30',          // Red - Needs attention
  assigned: '#007AFF',      // Blue - In process
  inProgress: '#5856D6',    // Purple - Being handled
  resolved: '#34C759',      // Green - Completed
  closed: '#8E8E93',        // Gray - Archived
  
  // Resource status
  available: '#34C759',     // Green - Ready
  dispatched: '#007AFF',    // Blue - En route
  busy: '#FF9500',          // Orange - Occupied
  offline: '#8E8E93',       // Gray - Unavailable
  
  // Map colors
  mapIncidentCritical: '#FF3B30',
  mapIncidentHigh: '#FF9500',
  mapIncidentMedium: '#FFCC00',
  mapIncidentLow: '#34C759',
  mapResourceAvailable: '#34C759',
  mapResourceBusy: '#007AFF',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  light: 'System',
};

// Apple Human Interface Guidelines - Typography Scale
export const SIZES = {
  // Font sizes (iOS Typography Scale)
  caption2: 11,    // Caption 2
  caption1: 12,    // Caption 1
  footnote: 13,    // Footnote
  subhead: 15,     // Subheadline
  callout: 16,     // Callout
  body: 17,        // Body (iOS default)
  headline: 17,    // Headline (semibold)
  title3: 20,      // Title 3
  title2: 22,      // Title 2
  title1: 28,      // Title 1
  largeTitle: 34,  // Large Title
  
  // Convenient aliases
  xs: 11,
  sm: 13,
  md: 15,
  base: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
  
  // Spacing (Apple 8pt grid system)
  spacing: 8,
  spacingSm: 4,
  spacingMd: 12,
  spacingLg: 16,
  spacingXl: 24,
  spacingXxl: 32,
  
  padding: 16,
  paddingSm: 12,
  paddingMd: 16,
  paddingLg: 20,
  paddingXl: 24,
  margin: 16,
  marginSm: 8,
  marginMd: 12,
  marginLg: 20,
  marginXl: 24,
  
  // Border radius (iOS style - more pronounced)
  radiusXs: 6,
  radiusSm: 10,
  radius: 14,
  radiusLg: 18,
  radiusXl: 24,
  borderRadius: 14,  // Default
  
  // Dimensions
  buttonHeight: 50,
  buttonHeightSm: 44,
  inputHeight: 44,
  iconSize: 24,
  iconSizeSm: 20,
  iconSizeLg: 28,
};

// Default export for convenience
export const theme = {
  colors: COLORS,
  fonts: FONTS,
  sizes: SIZES,
};

export default theme;
