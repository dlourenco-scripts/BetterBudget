import React, {useState} from 'react';
import {Alert, Image, TouchableOpacity, View} from 'react-native';
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

const CreateBudget = () => {
  const [showexpenseInfo, setShowexpenseInfo] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [reserveAmount, setReserveAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const {fromHome, fromBudgetCreation, fromCopyExpenses, sourceBudgetId} =
    useLocalSearchParams<{
      fromHome?: string;
      fromBudgetCreation?: string;
      fromCopyExpenses?: string;
      sourceBudgetId?: string;
    }>();
  const showBackArrow = fromHome === 'true';
  const isBudgetCreation = fromBudgetCreation !== 'false';

  const color = useThemeColor();
  return (
    <Wrapper>
      <Header
        title="Create Budget"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={showBackArrow}
      />
      <TextInput
        title="Budget Name"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        placeholder="Budget Name"
        value={budgetName}
        onChangeText={setBudgetName}
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
        placeholder="0"
        value={reserveAmount}
        onChangeText={setReserveAmount}
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
        placeholder="0"
        value={currentSavings}
        onChangeText={setCurrentSavings}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
      />
      <Spacer height={heightPixel(30)} />
      <FullFlex />
      <Button
        title="Next"
        onPress={() => {
          if (!budgetName.trim()) {
            Alert.alert('Budget name required', 'Please enter a budget name.');
            return;
          }
          router.push({
            pathname: '/auth/AddIncome',
            params: {
              fromBudgetCreation: isBudgetCreation ? 'true' : 'false',
              fromCopyExpenses: fromCopyExpenses,
              sourceBudgetId: sourceBudgetId,
              budgetName: budgetName.trim(),
              reserveAmount: reserveAmount || '0',
              currentSavings: currentSavings || '0',
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
export default CreateBudget;
