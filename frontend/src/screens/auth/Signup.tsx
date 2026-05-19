import React, {useState} from 'react';
import {Alert, Image, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {Formik} from 'formik';
import {Button, Spacer, Text, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {authApi} from '@/network/api';
import {useThemeColor} from '@/hooks/useThemeColor';
import {useSocialLogin} from '@/hooks/useSocialLogin';
import {heightPixel, widthPixel} from '@/services/responsive';
import {signUpValidationSchema} from '@/services/validators';
import {useAuthStore} from '@/store';

const Signup = () => {
  const color = useThemeColor();
  const isDarkMode = color.bg === '#121212';
  const [ShowPassword, setShowPassword] = useState(false);
  const [ShowRetypePassword, setShowRetypePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {loadingProvider, signInWithApple, signInWithGoogle} = useSocialLogin();
  const setSession = useAuthStore(state => state.setSession);

  const getApiMessage = (error: any, fallback: string) =>
    typeof error === 'string' ? error : error?.message || fallback;

  const handleSignUp = async (values: {
    email: string;
    password: string;
    retypePassword: string;
  }) => {
    setLoading(true);
    try {
      const response = await authApi.signup({
        email: values.email,
        password: values.password,
        currency: 'USD',
      });
      if (response.success) {
        if (response.data?.user?.verified) {
          if (response.data?.token) {
            setSession({
              token: response.data.token,
              refreshToken: response.data.refreshToken,
              user: response.data.user,
            });
            router.replace('/auth/SelectCurrency');
            return;
          }
          router.replace('/auth/SignIn');
          return;
        }
        if (response.data?.devVerificationCode) {
          Alert.alert(
            'Dev verification code',
            String(response.data.devVerificationCode),
          );
        }
        router.replace(
          `/auth/OtpVerification?from=SignUp&email=${encodeURIComponent(
            values.email,
          )}`,
        );
        return;
      }
      Alert.alert('Signup failed', response.message || 'Unable to sign up.');
    } catch (error: any) {
      Alert.alert('Signup failed', getApiMessage(error, 'Unable to sign up.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Formik
      initialValues={{email: '', password: '', retypePassword: ''}}
      validationSchema={signUpValidationSchema}
      onSubmit={handleSignUp}>
      {({handleChange, handleBlur, handleSubmit, values, errors, touched}) => (
        <Wrapper>
          <Spacer height={20} />
          {/* <Image
            source={appImages.BudgetLogo}
            style={{
              width: widthPixel(264),
              height: heightPixel(93),
              resizeMode: 'contain',
              alignSelf: 'center',
            }}
          /> */}
          <Image
            source={
              color.bg === '#121212'
                ? appImages.BudgetLogo
                : appImages.BudgetLogolight
            }
            style={{
              width: widthPixel(264),
              height: heightPixel(93),
              resizeMode: 'contain',
              alignSelf: 'center',
            }}
          />
          <Spacer height={32} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
            <Image
              source={appImages.PrivacyImg}
              style={{
                width: widthPixel(21),
                height: heightPixel(24),
                resizeMode: 'contain',
              }}
            />
            <Text size={16} variant="medium" color={color.primary}>
              PRIVACY FIRST
            </Text>
          </View>
          <Spacer height={15} />
          <Text
            size={18}
            variant="semibold"
            color={color.tabicon}
            style={{
              textAlign: 'center',
            }}>
            No Bank Linking Required
          </Text>
          <Spacer height={10} />
          <Text
            size={12}
            color={color.tabicon}
            style={{
              textAlign: 'center',
              marginHorizontal: widthPixel(35),
            }}>
            Build it yourself, stay private, and take charge – your money, your
            rules.
          </Text>
          <Spacer height={25} />
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
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            rightIcon={ShowPassword ? appImages.EyeOn : appImages.EyePass}
            rightIconPress={() => setShowPassword(!ShowPassword)}
            error={errors.password}
            touched={touched.password}
          />
          <Spacer height={8} />
          <TextInput
            title="Retype Password"
            placeholder="Enter your password"
            secureTextEntry={!ShowRetypePassword}
            value={values.retypePassword}
            onChangeText={handleChange('retypePassword')}
            onBlur={handleBlur('retypePassword')}
            rightIcon={ShowRetypePassword ? appImages.EyeOn : appImages.EyePass}
            rightIconPress={() => setShowRetypePassword(!ShowRetypePassword)}
            error={errors.retypePassword}
            touched={touched.retypePassword}
          />
          <Spacer height={15} />
          <TouchableOpacity
            onPress={() => router.navigate('/auth/SignIn')}
            activeOpacity={0.7}
            style={{
              alignSelf: 'flex-end',
            }}>
            <Text
              size={11}
              variant="medium"
              color={color.primary}
              style={{textDecorationLine: 'underline'}}>
              Already have an account
            </Text>
          </TouchableOpacity>
          <Spacer height={20} />
          <Button title="Sign up & Verify Email" onPress={handleSubmit} isLoading={loading} />
          <Spacer height={30} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Image
              source={appImages.HorizontalLine}
              style={{
                width: widthPixel(180),
                height: heightPixel(2),
                resizeMode: 'contain',
                tintColor: isDarkMode ? '#7A7F8C' : undefined,
              }}
            />
            <Text>or</Text>
            <Image
              source={appImages.HorizontalLine}
              style={{
                width: widthPixel(180),
                height: heightPixel(2),
                resizeMode: 'contain',
                tintColor: isDarkMode ? '#7A7F8C' : undefined,
              }}
            />
          </View>
          <Spacer height={24} />
          <Text
            color={color.black}
            style={{
              textAlign: 'center',
            }}>
            Continue with
          </Text>
          <Spacer height={20} />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 30,
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <TouchableOpacity
              style={{
                borderColor: color.border,
                borderWidth: 1,
                borderRadius: 50,
                padding: 10,
              }}
              disabled={Boolean(loadingProvider)}
              onPress={signInWithGoogle}>
              <Image
                source={appImages.Googleimg}
                style={{
                  width: widthPixel(35),
                  height: heightPixel(35),
                  resizeMode: 'contain',
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                borderColor: color.border,
                borderWidth: 1,
                borderRadius: 50,
                padding: 10,
              }}
              disabled={Boolean(loadingProvider)}
              onPress={signInWithApple}>
              <Image
                source={
                  color.bg === '#121212'
                    ? appImages.Applelogodarkmode
                    : appImages.Applelogolightmode
                }
                style={{
                  width: widthPixel(35),
                  height: heightPixel(35),
                  resizeMode: 'contain',
                }}
              />
            </TouchableOpacity>
          </View>
        </Wrapper>
      )}
    </Formik>
  );
};

export default Signup;
