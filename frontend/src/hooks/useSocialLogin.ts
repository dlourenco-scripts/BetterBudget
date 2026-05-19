import {useCallback, useEffect, useState} from 'react';
import {Alert, Platform} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {router} from 'expo-router';
import {authApi} from '@/network/api';
import {useAuthStore} from '@/store';

WebBrowser.maybeCompleteAuthSession();

function getApiMessage(error: any, fallback: string) {
  return typeof error === 'string' ? error : error?.message || fallback;
}

function formatAppleName(fullName?: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) {
    return '';
  }

  return [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
}

export function useSocialLogin() {
  const setSession = useAuthStore(state => state.setSession);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleClientIdForPlatform = Platform.select({
    ios: googleIosClientId,
    android: googleAndroidClientId,
    default: googleWebClientId,
  });
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: googleClientIdForPlatform ? googleIosClientId : 'disabled-google-ios-client-id',
    androidClientId: googleClientIdForPlatform ? googleAndroidClientId : 'disabled-google-android-client-id',
    webClientId: googleClientIdForPlatform ? googleWebClientId : 'disabled-google-web-client-id',
    scopes: ['openid', 'profile', 'email'],
  });

  const completeSocialLogin = useCallback(
    async (body: {
      provider: 'google' | 'apple';
      idToken: string;
      email?: string;
      fullName?: string;
    }) => {
      const response = await authApi.socialLogin({...body, currency: 'USD'});
      if (!response.success || !response.data?.token) {
        throw new Error(response.message || 'Social login failed.');
      }

      setSession({
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
      });

      router.replace(
        response.data.isNewUser || !response.data.user?.onboardingComplete
          ? '/auth/SelectCurrency'
          : '/(tabs)/HomeScreen',
      );
    },
    [setSession],
  );

  useEffect(() => {
    if (!googleResponse) {
      return;
    }

    if (googleResponse.type !== 'success') {
      setLoadingProvider(null);
      return;
    }

    const idToken =
      googleResponse.authentication?.idToken || googleResponse.params.id_token;

    if (!idToken) {
      setLoadingProvider(null);
      Alert.alert('Google login failed', 'Google did not return an identity token.');
      return;
    }

    completeSocialLogin({provider: 'google', idToken})
      .catch(error => {
        Alert.alert(
          'Google login failed',
          getApiMessage(error, 'Please try again.'),
        );
      })
      .finally(() => setLoadingProvider(null));
  }, [completeSocialLogin, googleResponse]);

  const signInWithGoogle = useCallback(async () => {
    if (!googleClientIdForPlatform || !googleRequest) {
      Alert.alert(
        'Google login unavailable',
        'Google login is not configured for this build.',
      );
      return;
    }

    setLoadingProvider('google');
    try {
      await promptGoogleAsync();
    } catch (error) {
      setLoadingProvider(null);
      Alert.alert(
        'Google login failed',
        getApiMessage(error, 'Please try again.'),
      );
    }
  }, [googleClientIdForPlatform, googleRequest, promptGoogleAsync]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple login unavailable', 'Apple login is only available on iOS.');
      return;
    }

    setLoadingProvider('apple');
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Apple login unavailable', 'Apple login is not available on this device.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Apple login failed', 'Apple did not return an identity token.');
        return;
      }

      await completeSocialLogin({
        provider: 'apple',
        idToken: credential.identityToken,
        email: credential.email || undefined,
        fullName: formatAppleName(credential.fullName),
      });
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          'Apple login failed',
          getApiMessage(error, 'Please try again.'),
        );
      }
    } finally {
      setLoadingProvider(null);
    }
  }, [completeSocialLogin]);

  return {
    loadingProvider,
    signInWithApple,
    signInWithGoogle,
  };
}
