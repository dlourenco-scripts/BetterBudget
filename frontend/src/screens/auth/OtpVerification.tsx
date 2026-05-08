import React, {useState} from 'react';
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
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

const OtpVerification = () => {
  const color = useThemeColor();
  const {from, email} = useLocalSearchParams();
  const isFromSignUp = from === 'SignUp';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Please go back and enter your email first.');
      return;
    }

    if (otp.length < 6) {
      Alert.alert('Invalid code', 'Please enter the full 6-digit verification code.');
      return;
    }

    if (isFromSignUp) {
      setLoading(true);
      try {
        const response = await authApi.verifyEmail({email, code: otp});
        if (response.success) {
          router.replace('/auth/SelectCurrency');
          return;
        }
        Alert.alert('Verification failed', response.message || 'The code is invalid.');
      } catch (error: any) {
        Alert.alert('Verification failed', error?.message || 'Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      router.navigate({
        pathname: '/auth/NewPassword',
        params: {email, code: otp},
      });
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
        {`A verification code has been sent to ${email || 'your email address'}.`}
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
