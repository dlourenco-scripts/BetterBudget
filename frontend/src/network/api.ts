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
  update: (body: any) => callApiPromise(Method.PATCH, api.users.me, body),
};

export const budgetApi = {
  list: () => callApiPromise(Method.GET, api.budgets.root),
  create: (body: any) => callApiPromise(Method.POST, api.budgets.root, body),
  get: (budgetId: string) =>
    callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}`),
  cycles: (budgetId: string) =>
    callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}/cycles`),
  currentCycle: (budgetId: string) =>
    callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}/cycles/current`),
  updateCycle: (budgetId: string, cycleId: string, body: any) =>
    callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}/cycles/${cycleId}`, body),
  update: (budgetId: string, body: any) =>
    callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}`, body),
  delete: (budgetId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}`),
  createIncome: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/incomes`, body),
  createExpense: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/expenses`, body),
  deleteExpense: (budgetId: string, expenseId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}/expenses/${expenseId}`),
  createDebt: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/debts`, body),
  deleteDebt: (budgetId: string, debtId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}/debts/${debtId}`),
};
