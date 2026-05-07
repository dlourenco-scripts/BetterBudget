import 'react-native-gesture-handler';
import {Stack} from 'expo-router';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {CurrencyProvider} from '@/context/CurrencyProvider';
import {WalkthroughProvider} from '@/context/WalkthroughProvider';
import {useFonts} from '@/hooks/useFonts';
import Splash from './auth/Splash';

export default function Layout() {
  const fontsLoaded = useFonts();

  if (!fontsLoaded) {
    return <Splash fontLoading={true} />;
  }

  return (
    <KeyboardProvider>
      <CurrencyProvider>
        <WalkthroughProvider>
          <Stack screenOptions={{headerShown: false}}>
            <Stack.Screen name={'auth'} />
            <Stack.Screen name={'(tabs)'} />
          </Stack>
        </WalkthroughProvider>
      </CurrencyProvider>
    </KeyboardProvider>
  );
}
