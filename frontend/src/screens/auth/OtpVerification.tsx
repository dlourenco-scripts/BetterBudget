import React, {useEffect, useState} from 'react';
import {Alert, Image, Platform, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {
  Button,
  FullFlex,
  Header,
  OtpField,
  Spacer,
  Text,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {authApi} from '@/network/api';
import {useAuthStore} from '@/store';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

const OtpVerification = () => {
  const color = useThemeColor();
  const {from, email} = useLocalSearchParams();
  const emailAddress = Array.isArray(email) ? email[0] : email;
  const isFromSignUp = from === 'SignUp';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const setToken = useAuthStore(state => state.setToken);
  const setRefreshToken = useAuthStore(state => state.setRefreshToken);
  const setUserData = useAuthStore(state => state.setUserData);

  const getApiMessage = (error: any, fallback: string) =>
    typeof error === 'string' ? error : error?.message || fallback;

  const updateCooldownFromResponse = (response: any) => {
    const retryAfterSeconds =
      response?.data?.retryAfterSeconds ||
      response?.data?.resendCooldownSeconds;
    if (typeof retryAfterSeconds === 'number') {
      setResendCooldown(Math.max(0, Math.ceil(retryAfterSeconds)));
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setResendCooldown(current => Math.max(0, current - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendCode = async () => {
    if (!emailAddress || resendCooldown > 0) {
      return;
    }

    setResending(true);
    try {
      const response = isFromSignUp
        ? await authApi.resendVerification({email: emailAddress})
        : await authApi.forgotPassword({email: emailAddress});
      if (response.success) {
        setOtp('');
        updateCooldownFromResponse(response);
        if (!response.data?.resendCooldownSeconds) {
          setResendCooldown(60);
        }
        const devCode =
          response.data?.devVerificationCode || response.data?.devResetCode;
        Alert.alert(
          devCode
            ? 'Dev verification code'
            : 'Code sent',
          devCode
            ? String(devCode)
            : response.message || 'A new code was sent.',
        );
        return;
      }
      updateCooldownFromResponse(response);
      Alert.alert('Unable to resend code', response.message || 'Please try again.');
    } catch (error: any) {
      updateCooldownFromResponse(error);
      Alert.alert('Unable to resend code', getApiMessage(error, 'Please try again.'));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (!emailAddress) {
      Alert.alert('Missing email', 'Please go back and enter your email first.');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the full 6-digit verification code.');
      return;
    }

    if (isFromSignUp) {
      setLoading(true);
      try {
        const response = await authApi.verifyEmail({email: emailAddress, code: otp});
        if (response.success) {
          if (response.data?.token) {
            setToken(response.data.token);
            setRefreshToken(response.data.refreshToken ?? '');
            setUserData(response.data.user);
          }
          router.replace('/auth/SelectCurrency');
          return;
        }
        Alert.alert('Verification failed', response.message || 'The code is invalid.');
      } catch (error: any) {
        Alert.alert('Verification failed', getApiMessage(error, 'Please try again.'));
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const response = await authApi.verifyResetCode({email: emailAddress, code: otp});
        if (response.success) {
          router.navigate({
            pathname: '/auth/NewPassword',
            params: {email: emailAddress, code: otp},
          });
          return;
        }
        Alert.alert('Verification failed', response.message || 'The code is invalid.');
      } catch (error: any) {
        Alert.alert('Verification failed', getApiMessage(error, 'Please try again.'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Wrapper>
      <Header title="Verify Your Email Address" canGoBack={false} />
      <Spacer height={20} />
      <Text
        size={16}
        color={color.tabicon}
        style={{
          textAlign: 'center',
        }}>
        {`A verification code has been sent to ${emailAddress || 'your email address'}.`}
      </Text>
      <Spacer height={40} />
      <Text
        size={16}
        color={color.tabicon}
        style={{
          textAlign: 'center',
        }}>
        Enter the 6-digit code from your email to continue.
      </Text>
      <Spacer height={40} />
      <OtpField otp={otp} setOtp={setOtp} />
      <Spacer height={40} />
      <Button title="Verify Code" onPress={handleSubmit} isLoading={loading} />
      <Spacer height={20} />
      <Button
        title={
          resendCooldown > 0
            ? `Resend Code (${resendCooldown}s)`
            : 'Resend Code'
        }
        onPress={handleResendCode}
        isLoading={resending}
        disabled={resendCooldown > 0}
        variant="outline"
        titleStyle={{
          color: resendCooldown > 0 ? color.disabled : color.primary,
        }}
      />
      <Spacer height={10} />
      <Button
        title={isFromSignUp ? 'Back to sign up options' : 'Back to Log In'}
        onPress={() =>
          isFromSignUp
            ? router.navigate('/auth/WelcomeScreen')
            : router.navigate('/auth/SignIn')
        }
        variant="outline"
        titleStyle={{
          color: color.primary,
        }}
        style={{marginBottom: 20}}
      />
      <FullFlex />
      <Image
        source={appImages.TwoFactorAuthentication}
        style={{
          width: widthPixel(318),
          height: heightPixel(318),
          resizeMode: 'contain',
          alignSelf: 'center',
        }}
      />
      <Spacer height={Platform.OS === 'ios' ? 15 : 0} />
    </Wrapper>
  );
};

export default OtpVerification;
