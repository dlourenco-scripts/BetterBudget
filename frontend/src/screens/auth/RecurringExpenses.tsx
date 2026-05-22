import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {Formik} from 'formik';
import {Calendar} from 'react-native-calendars';
import {Entypo, Feather} from '@expo/vector-icons';
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
import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {recurringExpensesValidationSchema} from '@/services/validators';
import {budgetApi} from '@/network/api';
import SNACKBARS from '@/services/snackbar';

const essentialCategories = [
  {icon: appImages.Housing, label: 'Housing'},
  {icon: appImages.Dropletbolt, label: 'Utilities'},
  {icon: appImages.Phone, label: 'Phone'},
  {icon: appImages.TvSet, label: 'TV/Internet'},
  {icon: appImages.Grocery, label: 'Groceries'},
  {icon: appImages.Transportation, label: 'Transportation'},
  {icon: appImages.Fuel, label: 'Fuel'},
  {icon: appImages.Maintainence, label: 'Auto Maintenance'},
  {icon: appImages.Medical, label: 'Medical & Health Care'},
  {icon: appImages.Subscription, label: 'Subscriptions'},
  {icon: appImages.Insurance, label: 'Insurance'},
  {vectorIcon: 'more-horizontal', label: 'Miscellaneous'},
];

const financialObligationCategories = [
  {icon: appImages.Loan, label: 'Loan Payment'},
  {icon: appImages.Tax, label: 'Taxes'},
  {icon: appImages.childExpense, label: 'Child Expense'},
  {icon: appImages.Education, label: 'Education'},
];

const lifeStyle = [
  {icon: appImages.Personal, label: 'Personal Use'},
  {icon: appImages.Clothing, label: 'Clothing'},
  {icon: appImages.Entertainment, label: 'Entertainment'},
  {icon: appImages.Dining, label: 'Dining Out'},
  {icon: appImages.Healthfitness, label: 'Health & Fitness'},
  {icon: appImages.Travel, label: 'Travel'},
  {icon: appImages.Vacations, label: 'Vacations'},
];

const expenseCategories = [
  ...essentialCategories,
  ...financialObligationCategories,
  ...lifeStyle,
];

const formatOrdinalDay = (dateValue?: string) => {
  if (!dateValue) {
    return '';
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : day % 10 === 1
        ? 'st'
        : day % 10 === 2
          ? 'nd'
          : day % 10 === 3
            ? 'rd'
            : 'th';
  return `${day}${suffix}`;
};

const formatAmount = (amount: number | string | undefined | null) => {
  const numericAmount = Number(amount || 0);
  const isWholeAmount = Math.abs(numericAmount - Math.round(numericAmount)) < 0.005;

  return numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: isWholeAmount ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const formatSuccessAmount = formatAmount;

type SavedExpensePreview = {
  id: string;
  name: string;
  amount: number;
  category?: string;
  dueDate?: string;
};

const RecurringExpenses = () => {
  const {fromHome, fromSimulated, isEdit, fromExpenses, budgetId} = useLocalSearchParams<{
    fromHome?: string;
    fromSimulated?: string;
    isEdit?: string;
    fromExpenses?: string;
    fromBudgetCreation?: string;
    budgetId?: string;
  }>();
  const [selectedDate, setSelectedDate] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('fixed');
  const [showPaymentSourceSheet, setShowPaymentSourceSheet] = useState(false);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState('');
  const [paymentSources, setPaymentSources] = useState<string[]>([]);
  const [newPaymentSource, setNewPaymentSource] = useState('');
  const [showFrequencySheet, setShowFrequencySheet] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  //  const [showAddIncomeSourceSheet, setShowAddIncomeSourceSheet] = useState(false);
  const [ShowIncomeSheet, setShowIncomeSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPaymentMethodInfo, setShowPaymentMethodInfo] = useState(false);
  const [showExpenseTypeInfo, setShowExpenseTypeInfo] = useState(false);
  const [showFrequencyInfo, setShowFrequencyInfo] = useState(false);
  const [showNextBillInfo, setShowNextBillInfo] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [showNextPayDateInfo, setShowNextPayDateInfo] = useState(false);
  const [shownewPaymentSourceSheet, setShownewPaymentSourceSheet] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [savedExpenses, setSavedExpenses] = useState<SavedExpensePreview[]>([]);
  const [showRecurringSuccessSheet, setShowRecurringSuccessSheet] = useState(false);
  const [lastSavedRecurringExpense, setLastSavedRecurringExpense] =
    useState<SavedExpensePreview | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const expenseNameInputRef = useRef<NativeTextInput>(null);
  const expenseAmountInputRef = useRef<NativeTextInput>(null);
  const recurringExpenseResetFormRef = useRef<((nextState?: any) => void) | null>(null);
  const openSavedExpenseSwipeableRef = useRef<Swipeable | null>(null);
  const savedExpenseSwipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const [guidedField, setGuidedField] = useState<'dueDate' | null>(null);

  const closeOpenSavedExpenseSwipeable = useCallback(() => {
    openSavedExpenseSwipeableRef.current?.close();
    openSavedExpenseSwipeableRef.current = null;
  }, []);

  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isDarkMode = colorScheme === 'dark';
  const iconButtonBg = isDark ? '#7A7F8C' : '#FFFFFF';
  const customInputBg = isDarkMode ? '#0F1115' : undefined;

  useFocusEffect(
    useCallback(() => {
      return () => {
        closeOpenSavedExpenseSwipeable();
      };
    }, [closeOpenSavedExpenseSwipeable]),
  );

  useEffect(() => {
    const loadPaymentSources = async () => {
      if (!budgetId) {
        return;
      }

      try {
        const response = await budgetApi.get(String(budgetId));
        if (response.success && response.data?.expenses) {
          const sources = response.data.expenses
            .map((expense: any) => expense.notes?.trim())
            .filter(Boolean);
          setPaymentSources(Array.from(new Set(sources)));
        }
      } catch (error) {
        console.error('Unable to load payment sources:', error);
      }
    };

    loadPaymentSources();
  }, [budgetId]);

  const emptyExpenseForm = {
    expenseName: '',
    selectedExpense: '',
    expenseAmount: '',
    selectedDate: '',
  };

  // Function to clear all form data
  const clearForm = (resetForm?: (nextState?: any) => void) => {
    Keyboard.dismiss();
    setExpenseName('');
    setExpenseAmount('');
    setSelectedExpense('');
    setActiveTab('fixed');
    setSelectedPaymentSource('');
    setSelectedFrequency('');
    setSelectedDate('');
    if (resetForm) {
      resetForm({
        values: emptyExpenseForm,
        errors: {},
        touched: {},
        submitCount: 0,
      });
    }
    setFormResetKey(previous => previous + 1);
  };

  const closeSavedExpensesSheet = () => {
    setShowIncomeSheet(false);
    clearForm(recurringExpenseResetFormRef.current || undefined);
  };

  const formatDueDay = (dateValue?: string) => {
    if (!dateValue) {
      return '';
    }
    const rawDate = String(dateValue);
    const date = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const day = date.getDate();
    const suffix =
      day % 100 >= 11 && day % 100 <= 13
        ? 'th'
        : day % 10 === 1
          ? 'st'
          : day % 10 === 2
            ? 'nd'
            : day % 10 === 3
              ? 'rd'
              : 'th';
    return `${day}${suffix}`;
  };

  const handleFormSubmit = async (
    values: {
      expenseName: string;
      selectedExpense: string;
      expenseAmount: string;
      selectedDate: string;
    },
    resetForm?: (nextState?: any) => void,
  ) => {
    recurringExpenseResetFormRef.current = resetForm || null;
    Keyboard.dismiss();
    if (!budgetId) {
      Alert.alert('No budget selected', 'Create or select a budget before adding expenses.');
      return;
    }
    if (!selectedPaymentSource.trim()) {
      return;
    }
    if (!selectedFrequency.trim()) {
      return;
    }

    setSaving(true);
    try {
      const response = await budgetApi.createExpense(budgetId, {
        name: values.expenseName,
        amount: Number(values.expenseAmount),
        type: activeTab === 'fixed' ? 'Fixed' : 'Variable',
        frequency: selectedFrequency,
        dueDate: values.selectedDate,
        category: values.selectedExpense,
        priority: 1,
        notes: selectedPaymentSource,
      });

      if (!response.success) {
        Alert.alert('Unable to save expense', response.message || 'Please try again.');
        return;
      }

      const savedExpense = {
        id: response.data?.id || `${Date.now()}`,
        name: response.data?.name || values.expenseName,
        amount: Number(response.data?.amount ?? values.expenseAmount),
        category: response.data?.category || values.selectedExpense,
        dueDate: response.data?.dueDate || response.data?.due_date || values.selectedDate,
      };
      setSavedExpenses(previous => [...previous, savedExpense]);
      setLastSavedRecurringExpense(savedExpense);
      SNACKBARS.GreenSnackbar(
        `Recurring expense added: ${savedExpense.name} • $${formatSuccessAmount(savedExpense.amount)} • Due ${formatDueDay(savedExpense.dueDate)}`,
        {title: 'Saved', duration: 2500},
      );

      if (fromHome === 'true') {
        setShowRecurringSuccessSheet(true);
      } else if (fromExpenses === 'true') {
        setShowRecurringSuccessSheet(true);
      } else {
        setShowIncomeSheet(true);
      }
    } catch (error: any) {
      Alert.alert('Unable to save expense', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSavedExpense = async (expenseId: string) => {
    if (!budgetId) {
      return;
    }

    setDeletingExpenseId(expenseId);
    try {
      const response = await budgetApi.deleteExpense(budgetId, expenseId);
      if (!response.success) {
        Alert.alert('Unable to delete expense', response.message || 'Please try again.');
        return;
      }
      setSavedExpenses(previous =>
        previous.filter(expense => expense.id !== expenseId),
      );
    } catch (error: any) {
      Alert.alert('Unable to delete expense', error?.message || 'Please try again.');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const renderSavedExpenseDelete = (expenseId: string) => (
    <View onTouchStart={event => event.stopPropagation()}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={deletingExpenseId === expenseId}
        onPress={() => {
          savedExpenseSwipeableRefs.current[expenseId]?.close();
          handleDeleteSavedExpense(expenseId);
        }}
        style={styles.savedExpenseDeleteAction}>
        <Text variant="semibold" size={13} color="#FFFFFF">
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  const PaymentSourceOptions = paymentSources.map(source => ({
    label: source,
    value: source,
  }));

  const frequencyOptions = [
    {label: 'Every Pay Cycle', value: 'Every Pay Cycle'},
    {label: 'Monthly', value: 'Monthly'},
    {label: 'Quaterly', value: 'Quaterly'},
    {label: 'Bianually', value: 'Bianually'},
    {label: 'Annually', value: 'Annually'},
  ];

  const renderCategoryGrid = (
    categories: Array<{icon?: any; vectorIcon?: string; label: string}>,
  ) => (
    <View style={styles.categoryGrid}>
      {categories.map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.categoryGridItem}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedExpense(item.label);
            setShowExpenseSheet(false);
            setTimeout(() => setShowPaymentSourceSheet(true), 250);
          }}>
          <View
            style={{
              borderRadius: heightPixel(50),
              padding: heightPixel(15),
              backgroundColor: color.primary,
              marginBottom: heightPixel(8),
              width: widthPixel(55),
              height: widthPixel(55),
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {item.vectorIcon ? (
              <Feather name={item.vectorIcon as any} size={24} color={color.black} />
            ) : (
              <Image
                source={item.icon}
                style={{
                  height: heightPixel(35),
                  width: widthPixel(35),
                  resizeMode: 'contain',
                }}
              />
            )}
          </View>
          <Text
            variant="medium"
            size={12}
            color={color.tabicon}
            numberOfLines={2}
            style={{
              textAlign: 'center',
            }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Wrapper
      keyboardProps={{
        stickyHeaderIndices: [0],
        bounces: false,
        onTouchEnd: closeOpenSavedExpenseSwipeable,
        onScrollBeginDrag: closeOpenSavedExpenseSwipeable,
      }}>
      <Header
        title={
          isEditMode
            ? 'Update Expense'
            : isEdit === 'true'
              ? 'Edit Recurring Expense'
              : 'Recurring Expenses'
        }
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />
      <Formik
        key={formResetKey}
        initialValues={{
          expenseName: expenseName,
          selectedExpense: selectedExpense,
          expenseAmount: expenseAmount,
          selectedDate: selectedDate,
        }}
        validationSchema={recurringExpensesValidationSchema}
        onSubmit={(values, helpers) => handleFormSubmit(values, helpers.resetForm)}
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
          submitCount,
        }) => (
          <>
            <TextInput
              ref={expenseNameInputRef}
              title="Expense Name"
              placeholder="Expense Name"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                setShowExpenseSheet(true);
              }}
              value={values.expenseName}
              onChangeText={text => {
                setExpenseName(text);
                setFieldValue('expenseName', text);
              }}
              onBlur={handleBlur('expenseName')}
              error={errors.expenseName}
              touched={submitCount > 0}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <Spacer height={heightPixel(15)} />

            <TextInput
              title="Expense Category"
              onPressIn={() => setShowExpenseSheet(true)}
              leftIconComponent={
                <Image
                  source={
                    selectedExpense
                      ? expenseCategories.find(
                          cat => cat.label === selectedExpense,
                        )?.icon || appImages.Expense
                      : appImages.Expense
                  }
                  style={{
                    height: heightPixel(28),
                    width: widthPixel(28),
                    resizeMode: 'contain',
                    marginRight: widthPixel(8),
                    ...(selectedExpense && {tintColor: color.tabicon}),
                  }}
                />
              }
              rightIcon={appImages.ArrowDown}
              rightIconPress={() => setShowExpenseSheet(true)}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder={selectedExpense || 'Expense Category'}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
              editable={false}
              value={values.selectedExpense}
              error={errors.selectedExpense}
              touched={submitCount > 0}
              rightIconStyle={{
                tintColor: color.black,
              }}
            />
            <Spacer height={heightPixel(15)} />
            <TextInput
              title="Payment Method"
              infoicon={appImages.Aboutimg}
              onInfoIconPress={() =>
                setShowPaymentMethodInfo(!showPaymentMethodInfo)
              }
              placeholder={selectedPaymentSource || 'Select Payment Method'}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              editable={false}
              value={selectedPaymentSource}
              error="Payment method is required"
              touched={submitCount > 0 && !selectedPaymentSource.trim()}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
              onPress={() => setShowPaymentSourceSheet(true)}
              rightIconComponent={
                <Image
                  source={appImages.ArrowDown}
                  style={{
                    height: heightPixel(18),
                    width: widthPixel(18),
                    resizeMode: 'contain',
                    tintColor: color.black,
                  }}
                />
              }
            />
            <Spacer height={heightPixel(20)} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
              }}>
              <Text
                size={fontPixel(15)}
                color={color.tabicon}
                variant="regular">
                Expense Type
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowExpenseTypeInfo(!showExpenseTypeInfo)}>
                <Image
                  source={appImages.Aboutimg}
                  style={{
                    height: heightPixel(20),
                    width: widthPixel(20),
                    resizeMode: 'contain',
                  }}
                />
              </TouchableOpacity>
            </View>
            <Spacer height={heightPixel(20)} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 20}}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  borderRadius: 50,
                  backgroundColor:
                    activeTab === 'fixed' ? color.primary : color.tabBackground,
                  paddingHorizontal: 30,
                  paddingVertical: 10,
                }}
                onPress={() => setActiveTab('fixed')}>
                <Text color={activeTab === 'fixed' ? '#1E1E1E' : color.black}>
                  Fixed Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  borderRadius: 50,
                  backgroundColor:
                    activeTab === 'variable'
                      ? color.primary
                      : color.tabBackground,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
                onPress={() => setActiveTab('variable')}>
                <Text
                  color={activeTab === 'variable' ? '#1E1E1E' : color.black}>
                  Variable Income
                </Text>
              </TouchableOpacity>
            </View>
            <Spacer height={heightPixel(20)} />
            <TextInput
              ref={expenseAmountInputRef}
              title={activeTab === 'fixed' ? 'Fixed Amount' : 'Variable Amount'}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              placeholder="0"
              returnKeyType="next"
              blurOnSubmit={false}
              value={values.expenseAmount}
              onChangeText={text => {
                setExpenseAmount(text);
                setFieldValue('expenseAmount', text);
              }}
              onBlur={handleBlur('expenseAmount')}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                setShowFrequencySheet(true);
              }}
              error={errors.expenseAmount}
              touched={submitCount > 0}
              keyboardType="numeric"
              useCurrencyIcon={true}
              replaceOnFirstType
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
            />
            <Spacer height={heightPixel(20)} />
            <TextInput
              title="Frequency"
              infoicon={appImages.Aboutimg}
              onInfoIconPress={() => setShowFrequencyInfo(!showFrequencyInfo)}
              placeholder={selectedFrequency || 'Select Frequency'}
              titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
              value={selectedFrequency}
              error="Frequency is required"
              touched={submitCount > 0 && !selectedFrequency.trim()}
              inputContainerStyle={{
                backgroundColor: color.inputField,
              }}
              editable={false}
              onPress={() => setShowFrequencySheet(true)}
              rightIcon={appImages.ArrowDown}
              rightIconStyle={{
                height: heightPixel(18),
                width: widthPixel(18),
                resizeMode: 'contain',
                tintColor: color.black,
              }}
            />

            <Spacer height={heightPixel(20)} />
            <TextInput
              title="Next Pay Date"
              rightIcon={appImages.Calenderimg}
              onPress={() => {
                setGuidedField(null);
                setShowCalendarSheet(true);
              }}
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
              touched={submitCount > 0}
              editable={false}
              inputContainerStyle={{
                backgroundColor: color.inputField,
                ...(guidedField === 'dueDate'
                  ? {borderWidth: 1, borderColor: color.primary}
                  : {}),
              }}
              rightIconStyle={{
                height: heightPixel(28),
                width: widthPixel(28),
                resizeMode: 'contain',
                tintColor: color.black,
              }}
            />
            <Spacer height={heightPixel(20)} />
            <FullFlex />
            <Button
              title={
                isEditMode ? 'Update' : isEdit === 'true' ? 'Update' : 'Add'
              }
              onPress={handleSubmit}
              isLoading={saving}
            />
          </>
        )}
      </Formik>
      <BottomSheet
        visible={showPaymentSourceSheet}
        onClose={() => setShowPaymentSourceSheet(false)}
        title="Please Select the Payment Source"
        maxHeight={400}
        backgroundColor={color.inputField}>
        <RadioList
          options={PaymentSourceOptions}
          selectedValue={selectedPaymentSource}
          onSelect={value => {
            setSelectedPaymentSource(value);
            setTimeout(() => expenseAmountInputRef.current?.focus(), 250);
          }}
          onClose={() => setShowPaymentSourceSheet(false)}
        />
        {paymentSources.length === 0 && (
          <>
            <Spacer height={heightPixel(10)} />
            <Text
              size={14}
              color={color.tabicon}
              style={{textAlign: 'center', marginBottom: heightPixel(10)}}>
              No payment methods yet.
            </Text>
          </>
        )}
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: color.black,
            borderRadius: heightPixel(50),
            marginBottom: heightPixel(60),
            paddingVertical: heightPixel(15),
          }}
          activeOpacity={0.7}
          onPress={() => {
            setShowPaymentSourceSheet(false);
            setShownewPaymentSourceSheet(true);
          }}>
          <Text
            variant="semibold"
            size={17}
            color={color.tabicon}
            style={{
              textAlign: 'center',
            }}>
            Add New Payment Source
          </Text>
        </TouchableOpacity>
      </BottomSheet>
      <BottomSheet
        visible={showFrequencySheet}
        onClose={() => setShowFrequencySheet(false)}
        title="Select Frequency"
        maxHeight={400}
        backgroundColor={color.inputField}>
        <RadioList
          options={frequencyOptions}
          selectedValue={selectedFrequency}
          onSelect={value => {
            setSelectedFrequency(value);
            setTimeout(() => {
              setGuidedField('dueDate');
              setShowCalendarSheet(true);
            }, 250);
          }}
          onClose={() => setShowFrequencySheet(false)}
        />
      </BottomSheet>
      <BottomSheet
        visible={showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
        hideTitleLine={true}
        backgroundColor={color.inputField}
        maxHeight={850}
        title="Select Category">
        <Text
          variant="semibold"
          size={fontPixel(20)}
          color={color.black}
          style={{
            textAlign: 'center',
            marginBottom: heightPixel(20),
            marginTop: heightPixel(10),
          }}>
          Essentials
        </Text>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: color.border,
            marginBottom: heightPixel(20),
            marginHorizontal: widthPixel(20),
          }}
        />
        {renderCategoryGrid(essentialCategories)}

        <Text
          variant="semibold"
          size={fontPixel(20)}
          color={color.black}
          style={{
            textAlign: 'center',
            marginBottom: heightPixel(20),
            marginTop: heightPixel(10),
          }}>
          Financial Obligations
        </Text>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: color.border,
            marginBottom: heightPixel(20),
            marginHorizontal: widthPixel(20),
          }}
        />
        {renderCategoryGrid(financialObligationCategories)}
        <Text
          variant="semibold"
          size={fontPixel(20)}
          color={color.black}
          style={{
            textAlign: 'center',
            marginBottom: heightPixel(20),
            marginTop: heightPixel(10),
          }}>
          Lifestyle and Variable
        </Text>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: color.border,
            marginBottom: heightPixel(20),
            marginHorizontal: widthPixel(20),
          }}
        />
        {renderCategoryGrid(lifeStyle)}
      </BottomSheet>
      <BottomSheet
        visible={ShowIncomeSheet}
        onClose={closeSavedExpensesSheet}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(40)} />
        <View style={{gap: widthPixel(20)}}>
          <Text
            variant="medium"
            size={17}
            color={color.black}
            style={{textAlign: 'center'}}>
            Expenses saved.
          </Text>
        </View>
        <Spacer height={heightPixel(15)} />
        {savedExpenses.length > 0 && (
          <>
            <View
              style={[
                styles.savedExpenseList,
                savedExpenses.length > 5 && styles.savedExpenseListScrollable,
              ]}>
              <View style={styles.savedExpenseHint}>
                <Feather name="chevrons-left" size={15} color={color.primary} />
                <Text size={12} color={color.tabicon}>
                  Swipe left on an expense to delete it.
                </Text>
              </View>
              <ScrollView
                nestedScrollEnabled
                onScrollBeginDrag={closeOpenSavedExpenseSwipeable}
                showsVerticalScrollIndicator={savedExpenses.length > 5}>
                {savedExpenses.map(item => (
                  <Swipeable
                    key={item.id}
                    ref={ref => {
                      savedExpenseSwipeableRefs.current[item.id] = ref;
                    }}
                    overshootRight={false}
                    renderRightActions={() => renderSavedExpenseDelete(item.id)}
                    onSwipeableWillOpen={() => {
                      const currentSwipeable = savedExpenseSwipeableRefs.current[item.id];
                      if (
                        openSavedExpenseSwipeableRef.current &&
                        openSavedExpenseSwipeableRef.current !== currentSwipeable
                      ) {
                        openSavedExpenseSwipeableRef.current.close();
                      }
                      openSavedExpenseSwipeableRef.current = currentSwipeable;
                    }}
                    onSwipeableClose={() => {
                      const currentSwipeable = savedExpenseSwipeableRefs.current[item.id];
                      if (openSavedExpenseSwipeableRef.current === currentSwipeable) {
                        openSavedExpenseSwipeableRef.current = null;
                      }
                    }}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={closeOpenSavedExpenseSwipeable}
                      style={[styles.savedExpenseRow, {backgroundColor: color.inputField}]}>
                      <View style={styles.savedExpenseInfo}>
                        <Text
                          variant="semibold"
                          size={15}
                          color={color.black}
                          numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text
                          variant="regular"
                          size={12}
                          color={color.tabicon}
                          numberOfLines={1}>
                          {item.category || 'Expense'}
                          {item.dueDate ? ` - ${formatOrdinalDay(item.dueDate)}` : ''}
                        </Text>
                      </View>
                      <Text variant="semibold" size={15} color={color.black}>
                        ${formatAmount(item.amount)}
                      </Text>
                    </TouchableOpacity>
                  </Swipeable>
                ))}
              </ScrollView>
            </View>
            <Spacer height={heightPixel(15)} />
          </>
        )}
        <Spacer height={heightPixel(8)} />
        <View style={styles.savedExpenseActionStack}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setShowIncomeSheet(false);
              clearForm(recurringExpenseResetFormRef.current || undefined);
            }}
            style={styles.savedExpenseActionTouch}>
            <Text
              variant="regular"
              size={17}
              color={color.primary}
              style={styles.savedExpenseActionText}>
              + Add Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setShowIncomeSheet(false);
              router.navigate({
                pathname: '/auth/Debt',
                params: {budgetId},
              });
            }}
            style={styles.savedExpenseActionTouch}>
            <Text
              variant="regular"
              size={17}
              color={color.primary}
              style={styles.savedExpenseActionText}>
              + Add Debt
            </Text>
          </TouchableOpacity>
        </View>
        <Spacer height={Platform.OS === 'ios' ? 30 : heightPixel(26)} />
        <Button
          title="Complete"
          onPress={() => {
            setShowIncomeSheet(false);
            router.navigate({
              pathname: '/(tabs)/HomeScreen',
              params: {selectedBudgetId: budgetId},
            });
          }}
        />
        <Spacer height={heightPixel(40)} />
      </BottomSheet>

      <BottomSheet
        visible={showCalendarSheet}
        onClose={() => setShowCalendarSheet(false)}
        title="Next Pay Date"
        hideTitleLine={true}
        maxHeight={550}
        backgroundColor={color.inputField}>
        <Calendar
          minDate={new Date().toISOString().slice(0, 10)}
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
        visible={shownewPaymentSourceSheet}
        onClose={() => setShownewPaymentSourceSheet(false)}
        title="Add Payment Source"
        maxHeight={500}
        backgroundColor={color.inputField}>
        <TextInput
          title="Payment Source"
          placeholder="Enter Name"
          placeholderTextColor={color.tabicon}
          value={newPaymentSource}
          onChangeText={setNewPaymentSource}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          style={{
            borderWidth: 1,
            borderColor: color.border,
            borderRadius: heightPixel(50),
            paddingVertical: heightPixel(15),
          }}
        />
        <Spacer height={20} />
        <Button
          title="Add Payment Source"
          onPress={() => {
            const trimmedSource = newPaymentSource.trim();
            if (trimmedSource) {
              setPaymentSources(previous =>
                previous.includes(trimmedSource)
                  ? previous
                  : [...previous, trimmedSource],
              );
              setSelectedPaymentSource(trimmedSource);
              setNewPaymentSource('');
            }
            setShownewPaymentSourceSheet(false);
          }}
          variant="primary"
        />
        <Spacer height={30} />
      </BottomSheet>

      <BottomSheet
        visible={showRecurringSuccessSheet}
        onClose={() => setShowRecurringSuccessSheet(false)}
        title=""
        hideTitleLine
        backgroundColor={color.inputField}
        maxHeight={360}>
        <View style={styles.successSheetContent}>
          <Text size={18} variant="semibold" color={color.black} style={{textAlign: 'center'}}>
            Recurring expense added.
          </Text>
          {lastSavedRecurringExpense && (
            <View style={styles.successSheetDetails}>
              <Text size={17} variant="semibold" color={color.black} style={{textAlign: 'center'}}>
                {lastSavedRecurringExpense.name}
              </Text>
              <Text size={15} variant="medium" color={color.black} style={{textAlign: 'center'}}>
                ${formatSuccessAmount(lastSavedRecurringExpense.amount)} • Due{' '}
                {formatDueDay(lastSavedRecurringExpense.dueDate) || '-'}
              </Text>
            </View>
          )}
          <View style={styles.successSheetActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                clearForm(recurringExpenseResetFormRef.current || undefined);
                setShowRecurringSuccessSheet(false);
              }}
              style={[
                styles.successSheetButton,
                styles.successSheetSecondaryButton,
                {borderColor: color.primary, backgroundColor: color.bg},
              ]}>
              <Text size={13} variant="semibold" color={color.primary}>
                Add Another
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setShowRecurringSuccessSheet(false);
                if (fromExpenses === 'true') {
                  router.navigate('/(tabs)/ExpensesScreen');
                } else {
                  router.back();
                }
              }}
              style={[styles.successSheetButton, {backgroundColor: color.primary}]}>
              <Text size={13} variant="semibold" color={color.primaryButtonText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Spacer height={heightPixel(20)} />
      </BottomSheet>

      {/* Info Tooltips */}
      <InfoTooltip
        visible={showPaymentMethodInfo}
        title="Payment Method :"
        content="Select the account or method used to pay this expense (e.g., checking, savings, credit card). This helps track cash flow from the correct source."
        onClose={() => setShowPaymentMethodInfo(false)}
        position="top-middle"
      />
      <InfoTooltip
        visible={showExpenseTypeInfo}
        title="Expense Type :"
        content="Choose whether this is a fixed or variable recurring expense. Fixed expenses stay the same each cycle (like rent), while variable ones can change (like groceries or utilities)"
        onClose={() => setShowExpenseTypeInfo(false)}
        position="middle"
      />
      <InfoTooltip
        visible={showFrequencyInfo}
        title="Frequency"
        content="How often will you be receiving this income. Used to align paychecks and recurring expenses or savings."
        onClose={() => setShowFrequencyInfo(false)}
        position="bottom-middle"
      />
      <InfoTooltip
        visible={showNextBillInfo}
        title="Next Bill Due"
        content="Select the next due date for this recurring expense. This helps you plan your budget and avoid late payments."
        onClose={() => setShowNextBillInfo(false)}
        position="bottom"
      />
      <InfoTooltip
        visible={showNextPayDateInfo}
        title="Next Pay Date"
        content="Select the next expected pay date to forecast your upcoming budgets.  This will set the starting point for your budgeting schedule."
        onClose={() => setShowNextPayDateInfo(false)}
        position="bottom"
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: heightPixel(20),
  },
  categoryGridItem: {
    alignItems: 'center',
    marginBottom: heightPixel(20),
    marginTop: heightPixel(10),
    width: '25%',
  },
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
  savedExpenseList: {
    maxHeight: heightPixel(290),
    marginHorizontal: widthPixel(8),
  },
  savedExpenseListScrollable: {
    height: heightPixel(290),
  },
  savedExpenseRow: {
    minHeight: heightPixel(58),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
    paddingVertical: heightPixel(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E3E5EA',
  },
  savedExpenseInfo: {
    flex: 1,
  },
  savedExpenseHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(6),
    paddingBottom: heightPixel(8),
  },
  savedExpenseDeleteAction: {
    width: widthPixel(86),
    minHeight: heightPixel(58),
    backgroundColor: '#D94343',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: heightPixel(2),
  },
  savedExpenseActionStack: {
    alignItems: 'center',
    gap: heightPixel(13),
  },
  savedExpenseActionTouch: {
    paddingVertical: heightPixel(9),
    paddingHorizontal: widthPixel(18),
    minWidth: widthPixel(165),
    alignItems: 'flex-start',
  },
  savedExpenseActionText: {
    textAlign: 'left',
  },
  successSheetContent: {
    gap: heightPixel(16),
    paddingHorizontal: widthPixel(12),
    paddingTop: heightPixel(22),
    paddingBottom: heightPixel(24),
  },
  successSheetDetails: {
    gap: heightPixel(6),
    paddingVertical: heightPixel(4),
  },
  successSheetActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: widthPixel(18),
    marginTop: heightPixel(8),
  },
  successSheetButton: {
    width: widthPixel(142),
    minHeight: heightPixel(54),
    borderRadius: heightPixel(28),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: widthPixel(18),
  },
  successSheetSecondaryButton: {
    borderWidth: 1,
  },
});

export default RecurringExpenses;
