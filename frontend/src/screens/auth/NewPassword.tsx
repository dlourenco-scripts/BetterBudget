import React, {useState} from 'react';
import {Alert} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {Formik} from 'formik';
import {Button, Header, Spacer, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {authApi} from '@/network/api';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel} from '@/services/responsive';
import {newPasswordValidationSchema} from '@/services/validators';

const NewPassword = () => {
  const color = useThemeColor();
  const {email, code} = useLocalSearchParams();
  const [ShowPassword, setShowPassword] = useState(false);
  const [ShowRetypePassword, setShowRetypePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getApiMessage = (error: any, fallback: string) =>
    typeof error === 'string' ? error : error?.message || fallback;

  const handleChangePassword = async (values: {
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    if (!email || !code) {
      Alert.alert('Missing data', 'Unable to reset password because email or code is missing.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: String(email),
        code: String(code),
        password: values.newPassword,
      });
      if (response.success) {
        router.navigate('/auth/SuccessScreen');
        return;
      }
      Alert.alert('Reset failed', response.message || 'Unable to reset password.');
    } catch (error: any) {
      Alert.alert('Reset failed', getApiMessage(error, 'Unable to reset password.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Wrapper>
      <Header title="New Password" canGoBack={false} />
      <Spacer height={80} />
      <Formik
        initialValues={{newPassword: '', confirmNewPassword: ''}}
        validationSchema={newPasswordValidationSchema}
        onSubmit={handleChangePassword}>
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
              title="New Password"
              placeholder="********"
              secureTextEntry={!ShowPassword}
              rightIcon={ShowPassword ? appImages.EyeOn : appImages.EyePass}
              rightIconPress={() => setShowPassword(!ShowPassword)}
              value={values.newPassword}
              onChangeText={handleChange('newPassword')}
              onBlur={handleBlur('newPassword')}
              error={errors.newPassword}
              touched={touched.newPassword}
            />
            <Spacer height={10} />
            <TextInput
              title="Confirm New Password"
              placeholder="********"
              secureTextEntry={!ShowRetypePassword}
              rightIcon={
                ShowRetypePassword ? appImages.EyeOn : appImages.EyePass
              }
              rightIconPress={() => setShowRetypePassword(!ShowRetypePassword)}
              value={values.confirmNewPassword}
              onChangeText={handleChange('confirmNewPassword')}
              onBlur={handleBlur('confirmNewPassword')}
              error={errors.confirmNewPassword}
              touched={touched.confirmNewPassword}
            />
            <Spacer height={70} />
            <Button title="Change Password" onPress={handleSubmit} isLoading={loading} />
          </>
        )}
      </Formik>
    </Wrapper>
  );
};

export default NewPassword;
