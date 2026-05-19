import React, {useState} from 'react';
import {Alert, Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {Formik} from 'formik';
import {Button, Spacer, Text, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {useAuthStore} from '@/store';
import {authApi} from '@/network/api';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {signInValidationSchema} from '@/services/validators';

const SignIn = () => {
  const color = useThemeColor();
  const styles = createStyles(color);
  const [ShowPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const setSession = useAuthStore(state => state.setSession);

  const getApiMessage = (error: any, fallback: string) =>
    typeof error === 'string' ? error : error?.message || fallback;

  const openVerification = (email: string) => {
    router.navigate({
      pathname: '/auth/OtpVerification',
      params: {from: 'SignUp', email},
    });
  };

  const handleSignIn = async (values: {email: string; password: string}) => {
    setLoading(true);
    try {
      const response = await authApi.login(values);
      if (response.success && response.data) {
        setSession({
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
        });
        router.replace('/(tabs)/HomeScreen');
        return;
      }
      if (response.data?.verified === false) {
        Alert.alert(
          'Verify your email',
          response.message || 'Please verify your email before logging in.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Enter Code', onPress: () => openVerification(values.email)},
          ],
        );
        return;
      }
      Alert.alert('Login failed', response.message || 'Unable to sign in.');
    } catch (error: any) {
      if (error?.data?.verified === false) {
        Alert.alert(
          'Verify your email',
          error.message || 'Please verify your email before logging in.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Enter Code', onPress: () => openVerification(values.email)},
          ],
        );
        return;
      }
      Alert.alert('Login failed', getApiMessage(error, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <StatusBar style={color.bg === '#121212' ? 'light' : 'dark'} />
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
      <Text
        size={12}
        variant="regular"
        color={color.tabicon}
        style={styles.description}>
        Build it yourself, stay private, and take charge – your money, your
        rules.
      </Text>
      <Spacer height={15} />
      <Formik
        initialValues={{email: '', password: ''}}
        validationSchema={signInValidationSchema}
        onSubmit={handleSignIn}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <>
            <TextInput
              title="Email"
              placeholder="example@gmail.com"
              value={values.email}
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              error={errors.email}
              touched={touched.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Spacer height={8} />
            <TextInput
              title="Password"
              placeholder="Enter your password"
              secureTextEntry={!ShowPassword}
              rightIcon={ShowPassword ? appImages.EyeOn : appImages.EyePass}
              rightIconPress={() => setShowPassword(!ShowPassword)}
              value={values.password}
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              error={errors.password}
              touched={touched.password}
            />
            <Spacer height={18} />
            <TouchableOpacity
              onPress={() => router.navigate('/auth/ForgetPassword')}
              activeOpacity={0.7}
              style={styles.forgotText}>
              <Text size={15} variant="regular" color={color.black}>
                Forgot Password
              </Text>
            </TouchableOpacity>
            <Spacer height={26} />
            <Button title="Log In" onPress={handleSubmit} isLoading={loading} />
          </>
        )}
      </Formik>
      <Spacer height={16} />
      <View style={styles.signupRow}>
        <Text size={16} variant="regular" color={color.black}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity
          onPress={() => router.navigate('/auth/WelcomeScreen')}>
          <Text size={16} variant="regular" color={color.primary}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
      <Spacer height={15} />
      <View style={styles.dividerRow}>
        <Image source={appImages.HorizontalLine} style={styles.line} />
        <Text size={20} variant="regular" color={color.black}>
          or
        </Text>
        <Image source={appImages.HorizontalLine} style={styles.line} />
      </View>
      <Spacer height={20} />
      <Text color={color.black} style={styles.centerText}>
        Continue with
      </Text>
      <Spacer height={50} />
      <View style={styles.socialRow}>
        <TouchableOpacity
          style={{
            borderColor: color.border,
            borderWidth: 1,
            borderRadius: 50,
            padding: 10,
          }}
          activeOpacity={0.8}>
          <Image source={appImages.Googleimg} style={styles.socialIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            borderColor: color.border,
            borderWidth: 1,
            borderRadius: 50,
            padding: 10,
          }}
          activeOpacity={0.8}>
          <Image
            source={
              color.bg === '#121212'
                ? appImages.Applelogodarkmode
                : appImages.Applelogolightmode
            }
            style={styles.socialIcon}
          />
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
};

const createStyles = (color: any) =>
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
      gap: widthPixel(10),
    },
    privacyIcon: {
      width: widthPixel(21),
      height: heightPixel(24),
      resizeMode: 'contain',
    },
    centerText: {
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      marginHorizontal: widthPixel(35),
    },
    forgotText: {
      alignSelf: 'flex-end',
      marginRight: widthPixel(10),
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // gap: 10,
    },
    line: {
      width: widthPixel(173),
      height: heightPixel(2),
      resizeMode: 'contain',
      tintColor: color.bg === '#121212' ? '#7A7F8C' : undefined,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 30,
      alignItems: 'center',
    },
    socialIcon: {
      width: widthPixel(35),
      height: heightPixel(35),
      resizeMode: 'contain',
    },
  });

export default SignIn;
