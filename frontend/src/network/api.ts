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

const normalizeCycleFields = (cycle: any) => {
  if (!cycle || typeof cycle !== 'object') {
    return cycle;
  }

  return {
    ...cycle,
    spendableBalance: cycle.spendableBalance ?? cycle.spendableAmount,
  };
};

const normalizeBudgetData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(normalizeBudgetData);
  }
  if (!data || typeof data !== 'object') {
    return data;
  }

  const next = {
    ...data,
    currentCycle: normalizeCycleFields(data.currentCycle),
  };
  if (Array.isArray(data.cycles)) {
    next.cycles = data.cycles.map(normalizeCycleFields);
  }
  return normalizeCycleFields(next);
};

const normalizeBudgetResponse = async <T = any>(promise: Promise<ApiResponse<T>>) => {
  const response = await promise;
  return {
    ...response,
    data: normalizeBudgetData(response.data),
  } as ApiResponse<T>;
};

export const authApi = {
  signup: (body: {email: string; password: string; currency?: string}) =>
    callApiPromise(Method.POST, api.auth.signup, body),
  login: (body: {email: string; password: string}) =>
    callApiPromise(Method.POST, api.auth.login, body),
  socialLogin: (body: {
    provider: 'google' | 'apple';
    idToken: string;
    email?: string;
    fullName?: string;
    currency?: string;
  }) => callApiPromise(Method.POST, api.auth.socialLogin, body),
  verifyEmail: (body: {email: string; code: string}) =>
    callApiPromise(Method.POST, api.auth.verifyEmail, body),
  resendVerification: (body: {email: string}) =>
    callApiPromise(Method.POST, api.auth.resendVerification, body),
  forgotPassword: (body: {email: string}) =>
    callApiPromise(Method.POST, api.auth.forgotPassword, body),
  verifyResetCode: (body: {email: string; code: string}) =>
    callApiPromise(Method.POST, api.auth.verifyResetCode, body),
  resetPassword: (body: {email: string; code: string; password: string}) =>
    callApiPromise(Method.POST, api.auth.resetPassword, body),
};

export const userApi = {
  me: () => callApiPromise(Method.GET, api.users.me),
  update: (body: any) => callApiPromise(Method.PATCH, api.users.me, body),
};

export const budgetApi = {
  list: () => normalizeBudgetResponse(callApiPromise(Method.GET, api.budgets.root)),
  create: (body: any) =>
    normalizeBudgetResponse(callApiPromise(Method.POST, api.budgets.root, body)),
  get: (budgetId: string) =>
    normalizeBudgetResponse(callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}`)),
  cycles: (budgetId: string) =>
    normalizeBudgetResponse(callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}/cycles`)),
  currentCycle: (budgetId: string) =>
    normalizeBudgetResponse(
      callApiPromise(Method.GET, `${api.budgets.root}/${budgetId}/cycles/current`),
    ),
  updateCycle: (budgetId: string, cycleId: string, body: any) =>
    normalizeBudgetResponse(
      callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}/cycles/${cycleId}`, body),
    ),
  update: (budgetId: string, body: any) =>
    normalizeBudgetResponse(callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}`, body)),
  delete: (budgetId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}`),
  createIncome: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/incomes`, body),
  updateIncome: (budgetId: string, incomeId: string, body: any) =>
    callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}/incomes/${incomeId}`, body),
  deleteIncome: (budgetId: string, incomeId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}/incomes/${incomeId}`),
  createExpense: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/expenses`, body),
  updateExpense: (budgetId: string, expenseId: string, body: any) =>
    callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}/expenses/${expenseId}`, body),
  deleteExpense: (budgetId: string, expenseId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}/expenses/${expenseId}`),
  createDebt: (budgetId: string, body: any) =>
    callApiPromise(Method.POST, `${api.budgets.root}/${budgetId}/debts`, body),
  updateDebt: (budgetId: string, debtId: string, body: any) =>
    callApiPromise(Method.PATCH, `${api.budgets.root}/${budgetId}/debts/${debtId}`, body),
  deleteDebt: (budgetId: string, debtId: string) =>
    callApiPromise(Method.DELETE, `${api.budgets.root}/${budgetId}/debts/${debtId}`),
};
