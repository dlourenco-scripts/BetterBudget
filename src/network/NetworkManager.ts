import axios, {AxiosError, AxiosResponse} from 'axios';
import {router} from 'expo-router';
import {getDeviceId} from 'react-native-device-info';
import {isNetworkAvailable} from '@/services/helpingMethods';
import SNACKBARS from '@/services/snackbar';
import {useAuthStore} from '@/store';
import {api, BASE_URL} from './Environment';

export const Method = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

export const Status = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type HttpMethod = keyof typeof Method;

// API Response type for NetworkManager
type ApiResponse<T = any> = {
  success?: boolean;
  status?: number;
  message?: string;
  data?: T;
  errorType?: string;
};

interface ApiCallParams {
  method: HttpMethod;
  endPoint: string;
  bodyParams?: any;
  onSuccess?: (response: ApiResponse) => void;
  onError?: (error: any) => void;
  count?: number;
  multipart?: boolean;
}

// Configure axios defaults
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.authorization = `Bearer ${token}`;
  }
  return config;
});

const handleAuthenticationError = (
  router: any,
  logout: () => void,
  message: string,
) => {
  if (typeof SNACKBARS !== 'undefined') {
    SNACKBARS.RedSnackbar(message);
  }
  logout();
  router?.navigate({
    pathname: '/auth/Login',
    params: {isFromSignup: true},
  });
};

export const callApi = async ({
  method,
  endPoint,
  bodyParams,
  onSuccess,
  onError,
  count = 0,
  multipart = false,
}: ApiCallParams): Promise<void> => {
  try {
    const isConnected = await isNetworkAvailable();
    if (!isConnected) {
      const errorMessage = 'No internet connection';
      onError && onError(errorMessage);
      if (typeof SNACKBARS !== 'undefined') {
        SNACKBARS.RedSnackbar(errorMessage);
      }
      return;
    }

    const token = useAuthStore.getState().token;
    const logout = useAuthStore.getState().logout;

    // console.log(
    //   "\n📦 API REQUEST DEBUG LOG 📦",
    //   "\n──────────────────────────────",
    //   `\n🔑 Access Token: ${token}`,
    //   `\n🌐 Request URL: ${BASE_URL}${endPoint}`,
    //   `\n📬 Request Method: ${method}`,
    //   `\n📝 Request Body: ${JSON.stringify(bodyParams, null, 2)}`,
    //   "\n──────────────────────────────"
    // );

    let response: AxiosResponse<ApiResponse>;

    const requestConfig: any = {};

    if (token) {
      requestConfig.headers = {
        ...requestConfig.headers,
        authorization: `Bearer ${token}`,
      };
    }
    if (multipart) {
      requestConfig.headers = {
        ...requestConfig.headers,
        'Content-Type': 'multipart/form-data',
      };
    } else {
      requestConfig.headers = {
        ...requestConfig.headers,
        'Content-Type': 'application/json',
      };
    }
    // console.log({ requestConfig });

    switch (method) {
      case 'GET':
        response = await axiosInstance.get(endPoint, requestConfig);
        break;
      case 'POST':
        response = await axiosInstance.post(
          endPoint,
          bodyParams,
          requestConfig,
        );
        break;
      case 'PUT':
        response = await axiosInstance.put(endPoint, bodyParams, requestConfig);
        break;
      case 'PATCH':
        response = await axiosInstance.patch(
          endPoint,
          bodyParams,
          requestConfig,
        );
        break;
      case 'DELETE':
        response = await axiosInstance.delete(endPoint, {
          ...requestConfig,
          data: bodyParams,
        });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    //   console.log(
    //   "\n📥 API RESPONSE DEBUG LOG 📥",
    //   "\n──────────────────────────────",
    //   `\n📊 Response Status: ${response.status}`,
    //   `\n📄 Response Data: ${JSON.stringify(response.data, null, 2)}`,
    //   "\n──────────────────────────────"
    // );

    const responseData: ApiResponse = response.data;

    if (
      responseData?.message ===
      'User recently changed password please login again!'
    ) {
      handleAuthenticationError(router, logout, responseData.message);
      return;
    }

    if (response.status >= 200 && response.status < 300) {
      onSuccess && onSuccess(responseData);

      if (responseData?.errorType) {
        console.warn('API Warning:', responseData.errorType);
      } else if (responseData?.message) {
        console.log('API Message:', responseData.message);
      }
    } else {
      onError && onError(responseData);

      if (responseData?.errorType) {
        console.error('API Error Type:', responseData.errorType);
      } else if (responseData?.message) {
        console.error('API Error Message:', responseData.message);
      }
    }
  } catch (error) {
    console.error('API Call Failed:', {
      endpoint: endPoint,
      method,
      bodyParams,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
      },
    });

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('Axios Error Details:', {
        code: axiosError.code,
        message: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
        },
      });

      if (axiosError.response?.status === 401) {
        const serverError = axiosError.response.data as ApiResponse;

        // Handle authentication errors by logging out user
        handleAuthenticationError(
          router,
          useAuthStore.getState().logout,
          serverError?.message || 'Authentication failed. Please login again.',
        );
        return;
      }

      if (axiosError.code === 'ECONNABORTED') {
        if (typeof SNACKBARS !== 'undefined') {
          SNACKBARS.RedSnackbar('Request timed out. Please try again.');
        }
      } else if (
        axiosError.code === 'NETWORK_ERROR' ||
        axiosError.message.includes('Network Error')
      ) {
        if (typeof SNACKBARS !== 'undefined') {
          SNACKBARS.RedSnackbar(
            'Network connection failed. Please check your internet connection.',
          );
        }
      } else if (axiosError.response) {
        const serverError = axiosError.response.data as ApiResponse;
        if (typeof SNACKBARS !== 'undefined') {
          SNACKBARS.RedSnackbar(
            serverError?.message || 'Server error occurred.',
          );
        }
        onError && onError(serverError);
        return;
      } else {
        if (typeof SNACKBARS !== 'undefined') {
          SNACKBARS.RedSnackbar('Request failed. Please try again.');
        }
      }
    } else {
      if (typeof SNACKBARS !== 'undefined') {
        SNACKBARS.RedSnackbar('An unexpected error occurred.');
      }
    }

    onError && onError(error);
  }
};

export const callApiLegacy = async (
  navigation: any,
  method: HttpMethod,
  endPoint: string,
  bodyParams?: any,
  onSuccess?: (response: ApiResponse) => void,
  onError?: (error: any) => void,
  count: number = 0,
  multipart: boolean = false,
) => {
  if (!onSuccess || !onError) {
    throw new Error('onSuccess and onError callbacks are required');
  }

  return callApi({
    method,
    endPoint,
    bodyParams,
    onSuccess,
    onError,
    count,
    multipart,
  });
};
