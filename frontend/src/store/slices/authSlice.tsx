import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  token?: string;
  userData?: any;
  refreshToken?: string;
  firstLogin?: boolean;
  userGroups?: string[];
  activeAlert?: string | null;
  setHasHydrated: (hasHydrated: boolean) => void;
  setSession: (session: {token: string; refreshToken?: string; user: any}) => void;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUserData: (user: any) => void;
  updateUserData: (partialUser: Partial<any>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      isLoggedIn: false,
      token: '',
      refreshToken: '',
      userData: undefined,
      firstLogin: true,
      userGroups: [],
      activeAlert: null,
      setHasHydrated: hasHydrated => set({hasHydrated}),
      setSession: ({token, refreshToken = '', user}) =>
        set({
          isLoggedIn: true,
          token,
          refreshToken,
          userData: user,
        }),
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
          firstLogin: true,
          userGroups: [],
          activeAlert: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        isLoggedIn: state.isLoggedIn,
        token: state.token,
        refreshToken: state.refreshToken,
        userData: state.userData,
        firstLogin: state.firstLogin,
        userGroups: state.userGroups,
        activeAlert: state.activeAlert,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
