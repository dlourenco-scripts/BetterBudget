import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import {Button, Spacer, Text, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {useSocialLogin} from '@/hooks/useSocialLogin';
import {heightPixel, widthPixel} from '@/services/responsive';

const WelcomeScreen = () => {
  const color = useThemeColor();
  const isDarkMode = color.bg === '#121212';
  const styles = createStyles(color, isDarkMode);
  const {loadingProvider, signInWithApple, signInWithGoogle} = useSocialLogin();

  return (
    <Wrapper keyboadEnabled={false}>
      <Spacer height={20} />
      <Image
        source={
          color.bg === '#121212'
            ? appImages.BudgetLogo
            : appImages.BudgetLogolight
        }
        style={styles.logo}
      />
      <Spacer height={32} />
      <View style={styles.privacyRow}>
        <Image source={appImages.PrivacyImg} style={styles.privacyIcon} />
        <Text size={16} variant="medium" color={color.primary}>
          PRIVACY FIRST
        </Text>
      </View>
      <Spacer height={15} />
      <Text
        size={18}
        variant="semibold"
        color={color.black}
        style={styles.centerText}>
        No Bank Linking Required
      </Text>
      <Spacer height={10} />
      <Text size={12} color={color.black} style={styles.description}>
        Build it yourself, stay private, and take charge – your money, your
        rules.
      </Text>
      <Spacer height={54} />
      <Text size={14} variant="medium" color={color.black}>
        Select the sign-up option
      </Text>
      <Spacer height={20} />
      <Button
        title="Email"
        titleStyle={styles.buttonTitle}
        leftIcon={
          <Image source={appImages.Emailimg} style={styles.emailIcon} />
        }
        onPress={() => router.navigate('/auth/Signup')}
        style={styles.button}
        containerStyle={styles.buttonContainer}
      />
      <Spacer height={Platform.OS === 'ios' ? 15 : 0} />
      <Button
        title="Google"
        titleStyle={styles.buttonTitle}
        leftIcon={
          <Image source={appImages.Googleimg} style={styles.googleIcon} />
        }
        onPress={signInWithGoogle}
        isLoading={loadingProvider === 'google'}
        disabled={Boolean(loadingProvider)}
        style={styles.button}
        containerStyle={styles.buttonContainer}
      />
      <Spacer height={Platform.OS === 'ios' ? 15 : 0} />
      <Button
        title="Apple"
        titleStyle={styles.buttonTitle}
        leftIcon={
          <Image
            source={
              color.bg === '#121212'
                ? appImages.Applelogodarkmode
                : appImages.Applelogolightmode
            }
            style={styles.appleIcon}
          />
        }
        onPress={signInWithApple}
        isLoading={loadingProvider === 'apple'}
        disabled={Boolean(loadingProvider)}
        style={styles.button}
        containerStyle={styles.buttonContainer}
      />
      <Spacer height={50} />
      <TouchableOpacity onPress={() => router.navigate('/auth/SignIn')}>
        <Text
          // variant="medium"
          // size={14}
          color={color.primary}
          style={styles.loginText}>
          Already have an account
        </Text>
      </TouchableOpacity>
    </Wrapper>
  );
};

const createStyles = (color: any, isDarkMode?: boolean) =>
  StyleSheet.create({
    logo: {
      width: widthPixel(264),
      height: heightPixel(93),
      resizeMode: 'contain',
      alignSelf: 'center',
    },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    privacyIcon: {
      width: widthPixel(21),
      height: heightPixel(28),
      resizeMode: 'contain',
    },
    centerText: {
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      marginHorizontal: widthPixel(35),
    },
    buttonTitle: {
      fontSize: 15,
      fontWeight: 'medium',
      color: color.black,
    },
    button: {
      backgroundColor: isDarkMode ? '#171A21' : '#F7EBDF3D',
      borderWidth: 1,
      borderRadius: 18,
      borderColor: isDarkMode ? '#7A7F8C' : '#FFAF3F',
    },
    buttonContainer: {
      width: widthPixel(390),
    },
    emailIcon: {
      width: widthPixel(23),
      height: heightPixel(23),
      resizeMode: 'contain',
    },
    googleIcon: {
      width: widthPixel(25),
      height: heightPixel(25),
      resizeMode: 'contain',
      marginLeft: widthPixel(15),
    },
    appleIcon: {
      width: widthPixel(25),
      height: heightPixel(25),
      resizeMode: 'contain',
      marginLeft: widthPixel(8),
    },
    loginText: {
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
  });

export default WelcomeScreen;
