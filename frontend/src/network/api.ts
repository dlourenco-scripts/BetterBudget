import {callApi, Method} from './NetworkManager';
import {api} from './Environment';

type ApiResponse<T = any> = {
  success?: boolean;
  status?: number;
  message?: string;
  data?: T;
};

const callApiPromise = <T = any>(
  method: keyof typeof Method,
  endPoint: string,
  bodyParams?: any,
): Promise<ApiResponse<T>> => {
  return new Promise((resolve, reject) => {
    callApi({
      method,
      endPoint,
      bodyParams,
      onSuccess: response => resolve(response as ApiResponse<T>),
      onError: error => reject(error),
    });
  });
};

export const authApi = {
  signup: (body: {email: string; password: string; currency?: string}) =>
    callApiPromise(Method.POST, api.auth.signup, body),
  login: (body: {email: string; password: string}) =>
    callApiPromise(Method.POST, api.auth.login, body),
  verifyEmail: (body: {email: string; code: string}) =>
    callApiPromise(Method.POST, api.auth.verifyEmail, body),
  forgotPassword: (body: {email: string}) =>
    callApiPromise(Method.POST, api.auth.forgotPassword, body),
  resetPassword: (body: {email: string; code: string; password: string}) =>
    callApiPromise(Method.POST, api.auth.resetPassword, body),
};

export const userApi = {
  me: () => callApiPromise(Method.GET, api.users.me),
};

export const budgetApi = {
  list: () => callApiPromise(Method.GET, api.budgets.root),
  create: (body: any) => callApiPromise(Method.POST, api.budgets.root, body),
};
