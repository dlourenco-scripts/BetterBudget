import React, {useState} from 'react';
import {router} from 'expo-router';
import {Formik} from 'formik';
import {Button, Header, Spacer, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel} from '@/services/responsive';
import {newPasswordValidationSchema} from '@/services/validators';

const NewPassword = () => {
  const color = useThemeColor();
  const [ShowPassword, setShowPassword] = useState(false);
  const [ShowRetypePassword, setShowRetypePassword] = useState(false);
  const handleChangePassword = (values: {
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    console.log('Change Password with:', values);
    // TODO: Implement password change logic
    router.navigate('/auth/SuccessScreen');
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
            <Button title="Change Password" onPress={handleSubmit} />
          </>
        )}
      </Formik>
    </Wrapper>
  );
};

export default NewPassword;
