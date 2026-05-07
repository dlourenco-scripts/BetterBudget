import {useThemeStore} from '@/store';

export function useColorScheme() {
  const theme = useThemeStore(state => state.theme);
  return theme;
}
