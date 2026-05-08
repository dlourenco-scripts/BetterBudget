import React, {useState} from 'react';
import {Image, Platform, TouchableOpacity, View} from 'react-native';
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

const Debt = () => {
  const {fromHome} = useLocalSearchParams<{fromHome?: string}>();
  const [ShowIncomeSheet, setShowIncomeSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');

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

  const handleFormSubmit = (values: {debtName: string; debtAmount: string}) => {
    if (fromHome === 'true') {
      router.back();
    } else if (isEditMode) {
      setIsEditMode(false);
    } else {
      setShowIncomeSheet(true);
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
          <View
            style={{
              backgroundColor: color.container,
              borderRadius: heightPixel(12),
              paddingHorizontal: widthPixel(20),
              paddingVertical: heightPixel(20),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{flex: 1}}>
              <Text variant="regular" size={14} color={color.tabicon}>
                Salary
              </Text>
            </View>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text variant="medium" size={13} color={color.black}>
                Monthly
              </Text>
            </View>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text variant="medium" size={13} color={color.black}>
                $3000
              </Text>
            </View>
            <View style={{flexDirection: 'row', gap: widthPixel(15)}}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowIncomeSheet(false);
                  setIsEditMode(true);
                }}
                style={{
                  backgroundColor: iconButtonBg,
                  padding: widthPixel(7),
                  borderRadius: heightPixel(50),
                }}>
                <Feather name="edit" size={15} color={color.black} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  backgroundColor: iconButtonBg,
                  padding: widthPixel(5),
                  borderRadius: heightPixel(50),
                }}>
                <Image
                  source={appImages.Deleteimg}
                  style={{
                    width: widthPixel(20),
                    height: heightPixel(20),
                    resizeMode: 'contain',
                    tintColor: color.black,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>
          {/* Additional Income Item */}
          <View
            style={{
              backgroundColor: color.container,
              borderRadius: heightPixel(12),
              paddingHorizontal: widthPixel(20),
              paddingVertical: heightPixel(20),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{flex: 1}}>
              <Text variant="regular" size={14} color={color.tabicon}>
                Additional{'\n'}Income
              </Text>
            </View>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text variant="medium" size={13} color={color.black}>
                Monthly
              </Text>
            </View>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text variant="medium" size={13} color={color.black}>
                $5000
              </Text>
            </View>
            <View style={{flexDirection: 'row', gap: widthPixel(15)}}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowIncomeSheet(false);
                  setIsEditMode(true);
                }}
                style={{
                  backgroundColor: iconButtonBg,
                  padding: widthPixel(7),
                  borderRadius: heightPixel(50),
                }}>
                <Feather name="edit" size={15} color={color.black} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  backgroundColor: iconButtonBg,
                  padding: widthPixel(5),
                  borderRadius: heightPixel(50),
                }}>
                <Image
                  source={appImages.Deleteimg}
                  style={{
                    width: widthPixel(20),
                    height: heightPixel(20),
                    resizeMode: 'contain',
                    tintColor: color.black,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>
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
