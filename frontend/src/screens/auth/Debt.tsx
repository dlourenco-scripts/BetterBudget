import React, {useState} from 'react';
import {Alert, Image, Platform, TouchableOpacity, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {Formik} from 'formik';
import {Feather} from '@expo/vector-icons';
import {
  BottomSheet,
  Button,
  FullFlex,
  Header,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {debtValidationSchema} from '@/services/validators';
import {budgetApi} from '@/network/api';

const Debt = () => {
  const {fromHome, budgetId} = useLocalSearchParams<{
    fromHome?: string;
    budgetId?: string;
  }>();
  const [ShowIncomeSheet, setShowIncomeSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconButtonBg = isDark ? '#7A7F8C' : '#FFFFFF';

  // Function to clear all form data
  const clearForm = (resetForm?: () => void) => {
    setDebtName('');
    setDebtAmount('');
    if (resetForm) {
      resetForm();
    }
  };

  const handleFormSubmit = async (values: {debtName: string; debtAmount: string}) => {
    if (!budgetId) {
      Alert.alert('No budget selected', 'Create or select a budget before adding debt.');
      return;
    }

    setSaving(true);
    try {
      const response = await budgetApi.createDebt(budgetId, {
        name: values.debtName,
        balance: Number(values.debtAmount),
        minimumPayment: 0,
        interestRate: 0,
        priority: 1,
        status: 'active',
      });

      if (!response.success) {
        Alert.alert('Unable to save debt', response.message || 'Please try again.');
        return;
      }

      if (fromHome === 'true') {
        router.back();
      } else if (isEditMode) {
        setIsEditMode(false);
      } else {
        setShowIncomeSheet(true);
      }
    } catch (error: any) {
      Alert.alert('Unable to save debt', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Wrapper>
      <Header
        title={isEditMode ? 'Update Debt' : 'Debt'}
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={20} />
      {(!ShowIncomeSheet || isEditMode) && (
        <View
          style={{
            backgroundColor: color.newbg,
            padding: widthPixel(20),
            borderRadius: heightPixel(12),
            gap: heightPixel(10),
          }}>
          <Text variant="medium" size={14} color={color.black}>
            Only add debts here if you are actively paying them off. Monthly or
            recurring debt payments belong in Recurring Expenses.
          </Text>
        </View>
      )}
      <Spacer height={20} />
      <Formik
        initialValues={{
          debtName: debtName,
          debtAmount: debtAmount,
        }}
        validationSchema={debtValidationSchema}
        onSubmit={handleFormSubmit}
        enableReinitialize>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
          resetForm,
        }) => (
          <>
            <TextInput
              title="Debt Name"
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="Enter Name"
              value={values.debtName}
              onChangeText={text => {
                setDebtName(text);
                setFieldValue('debtName', text);
              }}
              onBlur={handleBlur('debtName')}
              error={errors.debtName}
              touched={touched.debtName}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <Spacer height={20} />
            <TextInput
              title="Amount"
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="0"
              value={values.debtAmount}
              onChangeText={text => {
                setDebtAmount(text);
                setFieldValue('debtAmount', text);
              }}
              onBlur={handleBlur('debtAmount')}
              error={errors.debtAmount}
              touched={touched.debtAmount}
              keyboardType="numeric"
              useCurrencyIcon={true}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <FullFlex />
            <Button
              title={isEditMode ? 'Update' : 'Add'}
              onPress={handleSubmit}
              isLoading={saving}
              containerStyle={{
                backgroundColor: color.primary,
              }}
            />
          </>
        )}
      </Formik>

      <BottomSheet
        visible={ShowIncomeSheet}
        onClose={() => setShowIncomeSheet(false)}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={40} />
        <View style={{gap: widthPixel(20)}}>
          <Text
            variant="medium"
            size={17}
            color={color.black}
            style={{textAlign: 'center'}}>
            Debt saved.
          </Text>
        </View>
        <Spacer height={20} />
        <Button
          style={{
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: color.primary,
          }}
          title="Add New Debt"
          titleStyle={{
            color: color.primary,
          }}
          onPress={() => {
            setShowIncomeSheet(false);
            clearForm();
            router.navigate('/auth/Debt');
            // Navigate to add income screen or open add form
          }}
        />
        <Spacer height={Platform.OS === 'ios' ? 20 : 0} />
        <Button
          title="Complete"
          onPress={() => {
            setShowIncomeSheet(false);
            router.replace('/(tabs)/HomeScreen');
          }}
        />
        <Spacer height={40} />
      </BottomSheet>
    </Wrapper>
  );
};

export default Debt;
