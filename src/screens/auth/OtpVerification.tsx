import React, {useEffect, useState} from 'react';
import {Image, Platform} from 'react-native';
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
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

const OtpVerification = () => {
  const color = useThemeColor();
  const {from} = useLocalSearchParams();
  const isFromSignUp = from === 'SignUp';

  useEffect(() => {
    setTimeout(() => {
      if (isFromSignUp) {
        router.replace('/auth/SelectCurrency');
      } else {
        router.navigate('/auth/NewPassword');
      }
    }, 3000);
  }, []);

  return (
    <Wrapper>
      <Header title="Verify Your email Address" canGoBack={false} />
      <Spacer height={20} />
      <Text
        size={16}
        color={color.tabicon}
        style={{
          textAlign: 'center',
        }}>
        We have sent a verification to abc@gmail.com
      </Text>
      <Spacer height={40} />
      <Text
        size={16}
        color={color.tabicon}
        style={{
          textAlign: 'center',
        }}>
        Click on the link to complete the verification process. you might need
        to check you email.
      </Text>
      <Spacer height={70} />
      <Image
        source={appImages.TwoFactorAuthentication}
        style={{
          width: widthPixel(318),
          height: heightPixel(318),
          resizeMode: 'contain',
          alignSelf: 'center',
        }}
      />
      <FullFlex />
      <Button title="Resend Email" onPress={() => {}} variant="primary" />
      <Spacer height={Platform.OS === 'ios' ? 15 : 0} />
      <Button
        title={isFromSignUp ? 'Back to sign up options' : 'Back to Log In'}
        {...(isFromSignUp
          ? {
              onPress: () => router.navigate('/auth/WelcomeScreen'),
            }
          : {
              onPress: () => router.navigate('/auth/SignIn'),
            })}
        variant="outline"
        titleStyle={{
          color: color.primary,
        }}
        style={{marginBottom: 20}}
      />
    </Wrapper>
  );
};

export default OtpVerification;
