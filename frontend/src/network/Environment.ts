import {Platform} from 'react-native';

const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const BASE_URL = `http://${host}:4000/api/v1`;
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
