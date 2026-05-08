import {colors} from '@/constants/colors';
import {useColorScheme} from '@/hooks/useColorScheme';

export function useThemeColor() {
  const theme = useColorScheme() ?? 'light';
  return colors[theme];
}
