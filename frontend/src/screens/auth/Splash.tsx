import React, {useEffect} from 'react';
import {Image, TouchableOpacity} from 'react-native';
import {router} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

const Splash = ({fontLoading}: {fontLoading: boolean}) => {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const token = useAuthStore(state => state.token);
  const hasHydrated = useAuthStore(state => state.hasHydrated);

  useEffect(() => {
    if (fontLoading || !hasHydrated) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace(isLoggedIn && token ? '/(tabs)/HomeScreen' : '/auth/SignIn');
    }, 1200);

    return () => clearTimeout(timer);
  }, [fontLoading, hasHydrated, isLoggedIn, token]);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? colors.dark.bg : colors.light.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Image
          source={isDarkMode ? appImages.BudgetLogo : appImages.BudgetLogolight}
          style={{width: widthPixel(344), height: heightPixel(320)}}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </>
  );
};

export default Splash;
