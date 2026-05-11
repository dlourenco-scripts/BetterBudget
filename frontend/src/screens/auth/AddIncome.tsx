import React, {useState} from 'react';
import {
  Alert,
  Image,
  Platform,
  TextInput as RNTextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {Formik} from 'formik';
import {Calendar} from 'react-native-calendars';
import {Feather} from '@expo/vector-icons';
import {
  BottomSheet,
  Button,
  FullFlex,
  Header,
  InfoTooltip,
  RadioList,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages, AppSvgs} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {addIncomeValidationSchema} from '@/services/validators';
import {budgetApi} from '@/network/api';

const getCycleEnd = (startDate: string, frequency: string) => {
  const date = new Date(`${startDate}T00:00:00`);
  const normalizedFrequency = frequency.toLowerCase();

  if (normalizedFrequency.includes('weekly') && !normalizedFrequency.includes('bi')) {
    date.setDate(date.getDate() + 6);
  } else if (normalizedFrequency.includes('bi')) {
    date.setDate(date.getDate() + 13);
  } else if (normalizedFrequency.includes('semi')) {
    date.setDate(date.getDate() + 14);
  } else {
    date.setMonth(date.getMonth() + 1);
    date.setDate(date.getDate() - 1);
  }

  return date.toISOString().slice(0, 10);
};

const AddIncome = () => {
  const {fromHome, fromBudgetCreation, fromCopyExpenses, budgetId, budgetName, reserveAmount, currentSavings} =
    useLocalSearchParams<{
      fromHome?: string;
      fromBudgetCreation?: string;
      fromCopyExpenses?: string;
      budgetId?: string;
      budgetName?: string;
      reserveAmount?: string;
      currentSavings?: string;
    }>();
  const [selectedIncomeType, setSelectedIncomeType] =
    useState<string>('Fixed Income');
  const [selectedFrequency, setSelectedFrequency] = useState('Monthly');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [showFrequencySheet, setShowFrequencySheet] = useState(false);
  const [incomeSourceText, setIncomeSourceText] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [ShowIncomeSheet, setShowIncomeSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showIncomeSourceInfo, setShowIncomeSourceInfo] = useState(false);
  const [showIncomeTypeInfo, setShowIncomeTypeInfo] = useState(false);
  const [showTakeHomeInfo, setShowTakeHomeInfo] = useState(false);
  const [showFrequencyInfo, setShowFrequencyInfo] = useState(false);
  const [showNextPayDateInfo, setShowNextPayDateInfo] = useState(false);
  const [showAutoAddInfo, setShowAutoAddInfo] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconButtonBg = isDark ? '#7A7F8C' : '#FFFFFF';

  // Function to clear all form data
  const clearForm = (resetForm?: () => void) => {
    setIncomeSourceText('');
    setIncomeAmount('');
    setSelectedIncomeType('Fixed Income');
    setSelectedFrequency('Monthly');
    setSelectedDate('');
    setIsEnabled(true);
    if (resetForm) {
      resetForm();
    }
  };

  const handleFormSubmit = async (values: {
    incomeSourceText: string;
    incomeAmount: string;
    selectedDate: string;
  }) => {
    setSaving(true);
    try {
      let targetBudgetId = budgetId;

      if (fromBudgetCreation === 'true') {
        const response = await budgetApi.create({
          name: budgetName || 'Home Budget',
          netPay: Number(values.incomeAmount),
          cycleType: selectedFrequency,
          cycleStart: values.selectedDate,
          cycleEnd: getCycleEnd(values.selectedDate, selectedFrequency),
          reserveAmount: Number(reserveAmount || 0),
          currentSavings: Number(currentSavings || 0),
          goalType: 'save',
          autoFillEnabled: isEnabled,
        });

        if (!response.success || !response.data?.id) {
          Alert.alert('Unable to save budget', response.message || 'Please try again.');
          return;
        }

        targetBudgetId = response.data.id;
      }

      if (!targetBudgetId) {
        Alert.alert('No budget selected', 'Create or select a budget before adding income.');
        return;
      }

      const incomeResponse = await budgetApi.createIncome(targetBudgetId, {
        name: values.incomeSourceText,
        amount: Number(values.incomeAmount),
        type: selectedIncomeType,
        frequency: selectedFrequency,
        receivedDate: values.selectedDate,
        category: values.incomeSourceText,
        notes: '',
        isPrimary: fromBudgetCreation === 'true',
      });

      if (!incomeResponse.success) {
        Alert.alert('Unable to save income', incomeResponse.message || 'Please try again.');
        return;
      }

      if (fromHome === 'true') {
        router.back();
      } else {
        router.push({
          pathname: '/auth/RecurringExpenses',
          params: {
            fromBudgetCreation: fromBudgetCreation || '',
            fromCopyExpenses: fromCopyExpenses || '',
            budgetId: targetBudgetId,
          },
        });
      }
    } catch (error: any) {
      Alert.alert('Unable to save income', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const frequencyOptions = [
    {label: 'Weekly', value: 'Weekly'},
    {label: 'Bi-Weekly', value: 'Bi-Weekly'},
    {label: 'Semi-Monthly', value: 'Semi-Monthly'},
    {label: 'Monthly', value: 'Monthly'},
  ];

  return (
    <Wrapper>
      <Header
        title={
          isEditMode
            ? 'Update Income'
            : fromHome
              ? 'Add Additional Income'
              : 'Add Income'
        }
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={20} />
      {fromHome === 'true' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: widthPixel(10),
          }}>
          <Text variant="medium" size={16}>
            Auto-Add On Pay Date
          </Text>
          <Switch
            trackColor={{false: '#DADADA', true: color.primary}}
            thumbColor="#fff"
            ios_backgroundColor="#DADADA"
            onValueChange={toggleSwitch}
            value={isEnabled}
            style={{
              transform: [{scaleX: 0.6}, {scaleY: 0.6}],
            }}
          />
          <TouchableOpacity onPress={() => setShowAutoAddInfo(true)}>
            <Image
              source={appImages.Aboutimg}
              style={{
                width: widthPixel(20),
                height: heightPixel(20),
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        </View>
      ) : null}
      <Formik
        initialValues={{
          incomeSourceText: incomeSourceText,
          incomeAmount: incomeAmount,
          selectedDate: selectedDate,
        }}
        validationSchema={addIncomeValidationSchema}
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
              title="Income Source"
              infoIconPosition="beside"
              infoicon={appImages.Aboutimg}
              onInfoIconPress={() =>
                setShowIncomeSourceInfo(!showIncomeSourceInfo)
              }
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="Income Source"
              value={values.incomeSourceText}
              onChangeText={text => {
                setIncomeSourceText(text);
                setFieldValue('incomeSourceText', text);
              }}
              onBlur={handleBlur('incomeSourceText')}
              error={errors.incomeSourceText}
              touched={touched.incomeSourceText}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <Spacer height={30} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: widthPixel(10),
              }}>
              <Text
                variant="medium"
                color={color.tabicon}
                size={15}
                style={{
                  marginLeft: widthPixel(12),
                  fontFamily: 'regular',
                }}>
                Income Type
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowIncomeTypeInfo(!showIncomeTypeInfo)}>
                <Image
                  source={appImages.Aboutimg}
                  style={{
                    width: widthPixel(20),
                    height: heightPixel(20),
                    resizeMode: 'contain',
                  }}
                />
              </TouchableOpacity>
            </View>
            <Spacer height={30} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: widthPixel(10),
              }}>
              <TouchableOpacity
                style={{
                  borderRadius: 50,
                  backgroundColor:
                    selectedIncomeType === 'Fixed Income'
                      ? color.primary
                      : color.tabBackground,
                  borderColor: color.border,
                  paddingVertical: 12,
                  alignItems: 'center',
                  maxWidth: '40%',
                  flex: 1,
                }}
                activeOpacity={0.7}
                onPress={() => setSelectedIncomeType('Fixed Income')}>
                <Text
                  color={
                    selectedIncomeType === 'Fixed Income'
                      ? '#1E1E1E'
                      : color.black
                  }>
                  Fixed Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  borderRadius: 50,
                  backgroundColor:
                    selectedIncomeType === 'Variable Income'
                      ? color.primary
                      : color.tabBackground,
                  borderColor: color.border,
                  paddingVertical: 12,
                  alignItems: 'center',
                  maxWidth: '40%',
                  flex: 1,
                }}
                activeOpacity={0.7}
                onPress={() => setSelectedIncomeType('Variable Income')}>
                <Text
                  color={
                    selectedIncomeType === 'Variable Income'
                      ? '#1E1E1E'
                      : color.black
                  }>
                  Variable Income
                </Text>
              </TouchableOpacity>
            </View>
            <Spacer height={30} />
            <TextInput
              title={
                selectedIncomeType === 'Fixed Income'
                  ? 'Enter Your Take-Home Income (After tax)'
                  : 'Estimated Income Amount'
              }
              {...(selectedIncomeType === 'Fixed Income' && {
                infoIconPosition: 'beside',
                infoicon: appImages.Aboutimg,
                onInfoIconPress: () => setShowTakeHomeInfo(!showTakeHomeInfo),
              })}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="0"
              value={values.incomeAmount}
              onChangeText={text => {
                setIncomeAmount(text);
                setFieldValue('incomeAmount', text);
              }}
              onBlur={handleBlur('incomeAmount')}
              error={errors.incomeAmount}
              touched={touched.incomeAmount}
              keyboardType="numeric"
              useCurrencyIcon={true}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <Spacer height={30} />
            <TextInput
              title="Frequency"
              rightIcon={appImages.ArrowDown}
              onPress={() => setShowFrequencySheet(true)}
              infoIconPosition="beside"
              infoicon={appImages.Aboutimg}
              onInfoIconPress={() => setShowFrequencyInfo(!showFrequencyInfo)}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder={selectedFrequency}
              value={selectedFrequency}
              editable={false}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
              rightIconStyle={{
                tintColor: color.black,
              }}
            />

            <Spacer height={30} />
            <TextInput
              title="Next Pay Date"
              rightIcon={appImages.Calenderimg}
              rightIconPress={() => setShowCalendarSheet(true)}
              onPress={() => setShowCalendarSheet(true)}
              infoIconPosition="beside"
              infoicon={appImages.Aboutimg}
              onInfoIconPress={() =>
                setShowNextPayDateInfo(!showNextPayDateInfo)
              }
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="Select Date"
              value={values.selectedDate}
              onChangeText={text => {
                setSelectedDate(text);
                setFieldValue('selectedDate', text);
              }}
              error={errors.selectedDate}
              touched={touched.selectedDate}
              editable={false}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
              rightIconStyle={{
                height: heightPixel(28),
                width: widthPixel(28),
                resizeMode: 'contain',
                tintColor: color.black,
              }}
            />
            <FullFlex />
            <Spacer height={20} />
            <Button
              title={isEditMode ? 'Update' : fromHome ? 'Update' : 'Add'}
              onPress={handleSubmit}
              isLoading={saving}
            />
          </>
        )}
      </Formik>
      <BottomSheet
        visible={showFrequencySheet}
        onClose={() => setShowFrequencySheet(false)}
        title="Select Frequency"
        backgroundColor={color.inputField}>
        <RadioList
          options={frequencyOptions}
          selectedValue={selectedFrequency}
          onSelect={setSelectedFrequency}
          onClose={() => setShowFrequencySheet(false)}
        />
      </BottomSheet>
      <BottomSheet
        visible={showCalendarSheet}
        onClose={() => setShowCalendarSheet(false)}
        title="Next Pay Date"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Calendar
          onDayPress={day => {
            setSelectedDate(day.dateString);
            setShowCalendarSheet(false);
          }}
          markedDates={{
            ...Object.fromEntries(
              // Mark today and next 7 days with orange text
              Array.from({length: 8}, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                return [
                  dateString,
                  {
                    marked: true,
                    dotColor: 'transparent',
                    textColor: color.primary,
                  },
                ];
              }),
            ),
            // selectedDate MUST come after the spread to override any conflicting styles
            ...(selectedDate
              ? {
                  [selectedDate]: {
                    selected: true,
                    selectedColor: color.primary,
                    selectedTextColor: color.black,
                  },
                }
              : {}),
          }}
          theme={
            {
              backgroundColor: color.inputField,
              calendarBackground: color.inputField,
              textSectionTitleColor: color.black,
              selectedDayBackgroundColor: color.primary,
              selectedDayTextColor: color.black,
              todayTextColor: color.primary,
              dayTextColor: color.black,
              textDisabledColor: color.disabled,
              monthTextColor: color.black,
              textMonthFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              arrowColor: color.black,
              todayBackgroundColor: 'transparent',
              'stylesheet.calendar.header': {
                header: {
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  alignSelf: 'center',
                  marginTop: 16,
                  marginBottom: 20,
                  backgroundColor: color.primary,
                  borderRadius: 50,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  width: '80%',
                },
                monthText: {
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#1E1E1E',
                  marginHorizontal: 30,
                },
                arrow: {
                  padding: 5,
                },
                arrowImage: {
                  tintColor: '#1E1E1E',
                },
                week: {
                  marginTop: 10,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: color.border,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              'stylesheet.day.basic': {
                base: {
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                text: {
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: '400',
                  color: color.black,
                },
                today: {
                  backgroundColor: 'transparent',
                },
                todayText: {
                  color: color.primary,
                  fontWeight: '600',
                },
              },
            } as any
          }
          style={{
            borderRadius: 10,
          }}
        />
        <Spacer height={30} />
      </BottomSheet>
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
            Income saved.
          </Text>
        </View>
        <Spacer height={40} />
        <Button
          style={{
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: color.primary,
          }}
          title="Add New Income"
          titleStyle={{color: color.primary}}
          onPress={() => {
            setShowIncomeSheet(false);
            clearForm();
          }}
        />
        <Spacer height={Platform.OS === 'ios' ? 20 : 0} />
        <Button
          title={
            fromBudgetCreation === 'true' || fromCopyExpenses === 'true'
              ? 'Save'
              : 'Next'
          }
          onPress={() => {
            setShowIncomeSheet(false);
            if (fromCopyExpenses === 'true' || fromBudgetCreation === 'true') {
              router.navigate('/(tabs)/HomeScreen');
            } else {
              router.push({
                pathname: '/auth/RecurringExpenses',
                params: {
                  ...(fromBudgetCreation === 'true' && {
                    fromBudgetCreation: 'true',
                  }),
                },
              });
            }
          }}
        />
        <Spacer height={40} />
      </BottomSheet>

      {/* Info Tooltips as Modals */}
      <InfoTooltip
        visible={showIncomeSourceInfo}
        title="Income Source:"
        content="Label this income source (e.g., Job, Freelance, Business). Helps you track and organize income streams."
        onClose={() => setShowIncomeSourceInfo(false)}
        position="top"
      />
      <InfoTooltip
        visible={showIncomeTypeInfo}
        title="Expense Type:"
        content="Fixed income stays the same each pay period (like a salary). Variable income changes (like freelance or sales-based pay)"
        onClose={() => setShowIncomeTypeInfo(false)}
        position="top-middle"
      />
      <InfoTooltip
        visible={showTakeHomeInfo}
        title="Enter Your Take-Home Income (After Tax):"
        content="Enter the amount you receive after taxes and deductions. This is your actual usable income."
        onClose={() => setShowTakeHomeInfo(false)}
        position="middle"
      />
      <InfoTooltip
        visible={showFrequencyInfo}
        title="Frequency:"
        content="How often you receive this income. Used to align paychecks with upcoming expenses."
        onClose={() => setShowFrequencyInfo(false)}
        position="middle"
      />
      <InfoTooltip
        visible={showNextPayDateInfo}
        title="Next Pay Date:"
        content="Select the next expected pay date to forecast your upcoming budgets.  This will set the starting point for your budgeting schedule."
        onClose={() => setShowNextPayDateInfo(false)}
        position="bottom"
      />
      <InfoTooltip
        visible={showAutoAddInfo}
        title="Auto-add on pay date:"
        content="When enabled, this income will be added to your budget automatically on its pay date."
        onClose={() => setShowAutoAddInfo(false)}
        position="top"
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});
export default AddIncome;
