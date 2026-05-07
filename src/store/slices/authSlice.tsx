import {create} from 'zustand';
import {persist} from 'zustand/middleware';

// import {Storage} from '@/services/storage';

interface AuthState {
  isLoggedIn: boolean;
  token?: string;
  userData?: any;
  refreshToken?: string;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUserData: (user: any) => void;
  updateUserData: (partialUser: Partial<any>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      token: '',
      refreshToken: '',
      userData: undefined,
      firstLogin: true,
      userGroups: [],
      activeAlert: null,
      setToken: (token: string) => set({token}),
      setRefreshToken: (refreshToken: string) => set({refreshToken}),
      setUserData: user => set({userData: user, isLoggedIn: true}),
      updateUserData: partialUser => {
        const current = get().userData;
        if (current) {
          set({
            userData: {
              ...current,
              ...partialUser,
            },
          });
        }
      },

      logout: () =>
        set({
          isLoggedIn: false,
          token: '',
          userData: undefined,
          refreshToken: '',
        }),
    }),
    {
      name: 'auth-storage',
      // storage: Storage,
    },
  ),
);
