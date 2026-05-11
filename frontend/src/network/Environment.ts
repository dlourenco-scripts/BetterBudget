import {Platform} from 'react-native';

const defaultBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000/api/v1',
  default: 'http://localhost:4000/api/v1',
});

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl;
export const SOCKETS_URL = BASE_URL.replace('http://', 'ws://');

export const api = {
  auth: {
    signup: '/auth/signup',
    login: '/auth/login',
    verifyEmail: '/auth/verify-email',
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
