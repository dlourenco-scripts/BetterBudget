import React from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Formik} from 'formik';
import {Button, Header, Spacer, Text, TextInput, Wrapper} from '@/components';
import {useThemeColor} from '@/hooks/useThemeColor';
import {forgotPasswordValidationSchema} from '@/services/validators';

const ForgetPassword = () => {
  const color = useThemeColor();

  const handleSendEmail = (values: {email: string}) => {
    router.navigate({
      pathname: '/auth/OtpVerification',
      params: {from: 'ForgetPassword'},
    });
  };

  return (
    <Wrapper>
      <Header title="Forgot Password" />
      <Spacer height={40} />
      <View
        style={{
          marginHorizontal: 10,
        }}>
        <Text variant="semibold" size={20} color={color.tabicon}>
          Reset Password?
        </Text>
        <Spacer height={12} />
        <Text color={color.tabicon}>
          Enter your email address and we will send you instructions to reset
          your password
        </Text>
        <Spacer height={70} />
        <Formik
          initialValues={{email: ''}}
          validationSchema={forgotPasswordValidationSchema}
          onSubmit={handleSendEmail}>
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
                placeholder="example@example.com"
                placeholderTextColor={color.inputLabel}
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={errors.email}
                touched={touched.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Spacer height={40} />
              <Button title="Send Email" onPress={handleSubmit} />
            </>
          )}
        </Formik>
      </View>
    </Wrapper>
  );
};

export default ForgetPassword;
