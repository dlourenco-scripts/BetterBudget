import {StatusBar} from 'react-native';
import {MessageType, showMessage} from 'react-native-flash-message';
import {wp} from '@/services/responsive';

export interface SnackbarOptions {
  title?: string;
  description?: string;
  duration?: number;
  autoHide?: boolean;
  hideOnPress?: boolean;
  floating?: boolean;
  position?: 'top' | 'bottom' | 'center';
  icon?: string | {icon: string; position: 'left' | 'right'};
}

const CONFIG = {
  default: {
    duration: 4000,
    autoHide: true,
    hideOnPress: true,
    floating: true,
    position: 'top' as const,
  },
  themes: {
    error: {
      type: 'danger' as MessageType,
      backgroundColor: '#DC2626',
      defaultTitle: 'Error',
    },
    success: {
      type: 'success' as MessageType,
      backgroundColor: '#059669',
      defaultTitle: 'Success',
    },
    info: {
      type: 'info' as MessageType,
      backgroundColor: '#2563EB',
      defaultTitle: 'Info',
    },
    warning: {
      type: 'warning' as MessageType,
      backgroundColor: '#D97706',
      defaultTitle: 'Warning',
    },
  },

  styles: {
    title: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    text: {
      fontSize: 14,
      color: '#FFFFFF',
    },
    container: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginHorizontal: wp(4),
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
};

const createSnackbar = (
  theme: keyof typeof CONFIG.themes,
  message: string,
  options: SnackbarOptions = {},
) => {
  const themeConfig = CONFIG.themes[theme];

  showMessage({
    message: options.title || themeConfig.defaultTitle,
    description: message,
    type: themeConfig.type,
    backgroundColor: themeConfig.backgroundColor,
    color: '#FFFFFF',
    titleStyle: CONFIG.styles.title,
    textStyle: CONFIG.styles.text,
    duration: options.duration || CONFIG.default.duration,
    autoHide: options.autoHide ?? CONFIG.default.autoHide,
    hideOnPress: options.hideOnPress ?? CONFIG.default.hideOnPress,
    floating: options.floating ?? CONFIG.default.floating,
    position: options.position || CONFIG.default.position,
    statusBarHeight: StatusBar.currentHeight || 50,
    style: {
      ...CONFIG.styles.container,
      marginTop: options.position === 'top' ? 50 : 0,
    },
  });
};

export const showError = (message: string, options?: SnackbarOptions) =>
  createSnackbar('error', message, options);

export const showSuccess = (message: string, options?: SnackbarOptions) =>
  createSnackbar('success', message, options);

export const showInfo = (message: string, options?: SnackbarOptions) =>
  createSnackbar('info', message, options);

export const showWarning = (message: string, options?: SnackbarOptions) =>
  createSnackbar('warning', message, options);

export const RedSnackbar = showError;
export const GreenSnackbar = showSuccess;
export const BlueSnackbar = showInfo;
export const YellowSnackbar = showWarning;

export const SNACKBARS = {
  // New clean API
  showError,
  showSuccess,
  showInfo,
  showWarning,

  // Backward compatibility
  RedSnackbar,
  GreenSnackbar,
  BlueSnackbar,
  YellowSnackbar,
};

export default SNACKBARS;
