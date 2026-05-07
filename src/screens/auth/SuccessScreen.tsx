import React, {useEffect} from 'react';
import {Image, View} from 'react-native';
import {router} from 'expo-router';
import {Text, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

const SuccessScreen = () => {
  const color = useThemeColor();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate back or to another screen after 3 seconds
      router.replace('/auth/SignIn');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Wrapper backgroundColor={color.successbg}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
        }}>
        <Image
          source={appImages.Successimg}
          style={{
            height: heightPixel(142),
            width: widthPixel(142),
            resizeMode: 'contain',
          }}
        />
        <Text
          size={20}
          variant="semibold"
          color={color.white}
          style={{textAlign: 'center', marginHorizontal: widthPixel(60)}}>
          Password Has been Changed successfully
        </Text>
      </View>
    </Wrapper>
  );
};

export default SuccessScreen;
