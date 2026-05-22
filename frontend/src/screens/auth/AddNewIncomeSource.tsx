import React, {useState} from 'react';
import {Image, TouchableOpacity, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {Entypo} from '@expo/vector-icons';
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
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const AddNewIncomeSource = () => {
  const [showexpenseInfo, setShowexpenseInfo] = useState(false);
  const [incomeSourceName, setIncomeSourceName] = useState('');
  const [reserveAmount, setReserveAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const {fromHome, fromBudgetCreation, fromCopyExpenses} =
    useLocalSearchParams<{
      fromHome?: string;
      fromBudgetCreation?: string;
      fromCopyExpenses?: string;
    }>();
  const showBackArrow = fromHome === 'true';

  const color = useThemeColor();
  return (
    <Wrapper>
      <Header
        title="Add New Income Source"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={showBackArrow}
      />
      <TextInput
        title="Add New Income Source"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        placeholder="Home budget"
        value={incomeSourceName}
        onChangeText={setIncomeSourceName}
        error="Income source is required"
        touched={submitted && !incomeSourceName.trim()}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
      />
      <Spacer height={heightPixel(30)} />
      <TextInput
        infoIconPosition="right"
        infoicon={appImages.Aboutimg}
        onInfoIconPress={() => setShowexpenseInfo(!showexpenseInfo)}
        title="Balance To Keep After Expenses"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        keyboardType="numeric"
        useCurrencyIcon={true}
        replaceOnFirstType
        placeholder="0"
        value={reserveAmount}
        onChangeText={setReserveAmount}
        error="Balance to keep is required"
        touched={submitted && !reserveAmount.trim()}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
      />
      <Spacer height={heightPixel(30)} />
      <TextInput
        title="Total Current Savings"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        keyboardType="numeric"
        useCurrencyIcon={true}
        replaceOnFirstType
        placeholder="0"
        value={currentSavings}
        onChangeText={setCurrentSavings}
        error="Current savings is required"
        touched={submitted && !currentSavings.trim()}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
      />
      <Spacer height={heightPixel(30)} />
      <FullFlex />
      <Button
        title="Next"
        onPress={() => {
          setSubmitted(true);
          if (!incomeSourceName.trim() || !reserveAmount.trim() || !currentSavings.trim()) {
            return;
          }
          router.push({
            pathname: '/auth/AddIncome',
            params: {
              fromBudgetCreation: fromBudgetCreation,
              fromCopyExpenses: fromCopyExpenses,
            },
          });
        }}
      />

      <InfoTooltip
        visible={showexpenseInfo}
        title="Minimum to Reserve in Account:"
        content="Set the minimum amount you want to keep in your account after all expenses. When auto-fill is enabled, the app will only use extra funds above this amount for savings or debt payoff."
        onClose={() => setShowexpenseInfo(false)}
        position="middle"
      />
    </Wrapper>
  );
};
export default AddNewIncomeSource;
