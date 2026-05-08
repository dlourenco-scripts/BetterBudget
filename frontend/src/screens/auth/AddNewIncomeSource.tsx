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
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
      />
      <Spacer height={heightPixel(30)} />
      <FullFlex />
      <Button
        title="Next"
        onPress={() =>
          router.push({
            pathname: '/auth/AddIncome',
            params: {
              fromBudgetCreation: fromBudgetCreation,
              fromCopyExpenses: fromCopyExpenses,
            },
          })
        }
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
