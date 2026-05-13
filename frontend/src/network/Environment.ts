import Constants from 'expo-constants';
import {Platform} from 'react-native';

const defaultBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000/api/v1',
  default: 'http://localhost:4000/api/v1',
});

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  return typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
}

const expoHost = getExpoHost();
const localBaseUrl = expoHost ? `http://${expoHost}:4000/api/v1` : defaultBaseUrl;

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  localBaseUrl;
export const SOCKETS_URL = BASE_URL.replace(/^http/, 'ws');

export const api = {
  auth: {
    signup: '/auth/signup',
    login: '/auth/login',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    me: '/users/me',
  },
  budgets: {
    root: '/budgets',
  },
};
