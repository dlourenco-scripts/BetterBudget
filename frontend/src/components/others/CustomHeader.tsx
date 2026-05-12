import React, {useEffect, useState} from 'react';
import {Alert, Image, StyleSheet, Switch, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {appImages} from '@/constants/assets';
import {useWalkthrough} from '@/context/WalkthroughProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';
import {BottomSheet} from '../common/BottomSheet';
import Button from '../common/Button';
import InfoTooltip from '../common/InfoTooltip';
import Spacer from '../common/Spacer';
import Text from '../common/Text';
import TextInput from '../common/TextInput';
import WalkthroughTooltip from './WalkthroughTooltip';

export interface Budget {
  id: string;
  name: string;
}

interface CustomHeaderProps {
  onDeletePress?: () => void;
  onAddBudgetPress?: () => void;
  budgets?: Budget[];
  primaryBudgetId?: string;
  selectedBudgetId?: string;
  onPrimaryBudgetChange?: (budgetId: string) => void;
  onBudgetSelect?: (budgetId: string) => void;
  currentSavings?: number;
  savingsGoal?: number;
  currentIncome?: number;
  activeCycleId?: string;
  autoFillEnabled?: boolean;
  onAutoFillChange?: (enabled: boolean) => void;
  onSavingsUpdate?: (values: {currentSavings?: number; savingsGoal?: number}) => void;
  onIncomeUpdate?: (amount: number, applyToAll: boolean) => void;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  onDeletePress,
  onAddBudgetPress,
  budgets = [],
  primaryBudgetId,
  selectedBudgetId,
  onPrimaryBudgetChange,
  onBudgetSelect,
  currentSavings = 0,
  savingsGoal = 0,
  currentIncome = 0,
  activeCycleId,
  autoFillEnabled = false,
  onAutoFillChange,
  onSavingsUpdate,
  onIncomeUpdate,
}) => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currentStep} = useWalkthrough();
  const profileImage = useAuthStore(state => state.userData?.profileImage);
  const [selectedBudget, setSelectedBudget] = useState('Home Budget');

  // Custom colors for specific bottom sheets in dark mode
  const customSheetBg = isDarkMode ? '#171A21' : undefined;
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const [ShowBudgetSection, setShowBudgetSection] = useState(false);
  const [showBudgetList, setShowBudgetList] = useState(false);
  const [showIncomeInfo, setShowIncomeInfo] = useState(false);
  const [isEnabled, setIsEnabled] = useState(autoFillEnabled);
  const toggleSwitch = () => {
    const nextValue = !isEnabled;
    setIsEnabled(nextValue);
    onAutoFillChange?.(nextValue);
  };
  const [showEditSavingsSheet, setShowEditSavingsSheet] = useState(false);
  const [currentSavingsAmount, setCurrentSavingsAmount] = useState('');
  const [sheetMode, setSheetMode] = useState<'edit' | 'goal'>('edit');
  const [showEditIncomeSheet, setShowEditIncomeSheet] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [showApplyToAllInfo, setShowApplyToAllInfo] = useState(false);
  const [applyToAllIncome, setApplyToAllIncome] = useState(false);

  useEffect(() => {
    const activeBudget =
      budgets.find(budget => budget.id === selectedBudgetId) || budgets[0];
    if (activeBudget) {
      setSelectedBudget(activeBudget.name);
    }
  }, [budgets, selectedBudgetId]);

  useEffect(() => {
    setIsEnabled(autoFillEnabled);
  }, [autoFillEnabled]);

  useEffect(() => {
    setCurrentSavingsAmount(
      String(sheetMode === 'goal' ? savingsGoal || '' : currentSavings || ''),
    );
  }, [currentSavings, savingsGoal, sheetMode, showEditSavingsSheet]);

  useEffect(() => {
    if (showEditIncomeSheet) {
      setIncomeAmount(String(currentIncome || ''));
      setApplyToAllIncome(false);
    }
  }, [currentIncome, showEditIncomeSheet]);

  // Determine if the current selected budget is the primary budget
  const currentBudget = budgets.find(b => b.name === selectedBudget);
  const isPrimaryBudget = currentBudget && currentBudget.id === primaryBudgetId;

  // Open BudgetList sheet when walkthrough reaches step 6
  useEffect(() => {
    if (currentStep === 6) {
      setShowBudgetList(true);
    }
    if (currentStep === 7) {
      setTimeout(() => {
        router.navigate('/(tabs)/InsightScreen');
        setShowBudgetList(false); // Close the sheet if open
      }, 500);
    }
  }, [currentStep]);

  const budgetData = [
    {
      id: 1,
      title: 'Share Budget',
      onPress: () => {
        router.navigate('/mainScreens/SharingBudget');
      },
    },
    {
      id: 2,
      title: 'Edit Budget Income',
      onPress: () => setShowEditIncomeSheet(true),
    },
    {
      id: 3,
      title: 'Edit Current Savings',
      onPress: () => {
        setSheetMode('edit');
        setShowEditSavingsSheet(true);
      },
    },
    {
      id: 4,
      title: 'Update Savings Goal',
      onPress: () => {
        setSheetMode('goal');
        setShowEditSavingsSheet(true);
      },
    },
  ];

  return (
    <>
      <View style={[styles.container, {backgroundColor: color.bg}]}>
        <TouchableOpacity
          onPress={() => router.navigate('/mainScreens/Settings')}>
          {profileImage ? (
            <Image source={{uri: profileImage}} style={styles.profileImage} />
          ) : (
            <View
              style={[
                styles.profileImage,
                styles.avatarFallback,
                {backgroundColor: color.tabBackground},
              ]}>
              <Ionicons name="person-outline" size={22} color={color.tabicon} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <TouchableOpacity
            onPress={() => {
              if (currentBudget && currentBudget.id !== primaryBudgetId) {
                onPrimaryBudgetChange?.(currentBudget.id);
              }
            }}
            activeOpacity={0.6}
            disabled={!currentBudget || currentBudget.id === primaryBudgetId}>
            {isPrimaryBudget ? (
              <AntDesign
                name="star"
                size={20}
                color={color.primary}
                style={{marginRight: 5}}
              />
            ) : (
              <Ionicons
                name="star-outline"
                size={20}
                color={color.tabicon}
                style={{marginRight: 5}}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowBudgetSection(true)}
            style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text size={20} variant="semibold" color={color.primary}>
              {selectedBudget}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={color.primary}
              style={{
                marginLeft: 5,
              }}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              borderRadius: 50,
              backgroundColor: color.tabBackground,
              padding: 4,
            }}
            onPress={() => setShowBudgetList(true)}>
            <Feather name="more-horizontal" size={22} color={color.tabicon} />
          </TouchableOpacity>
        </View>
      </View>
      <Spacer height={20} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowIncomeInfo(true)}>
          <Image
            source={appImages.Aboutimg}
            style={{
              height: heightPixel(18),
              width: widthPixel(18),
              resizeMode: 'contain',
            }}
          />
        </TouchableOpacity>
        <Text size={14} color={color.black}>
          Auto Fill
        </Text>
        <Switch
          trackColor={{false: '#DADADA', true: color.primary}}
          thumbColor="#fff"
          ios_backgroundColor="#DADADA"
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={{
            transform: [{scaleX: 0.7}, {scaleY: 0.7}],
          }}
        />
      </View>

      <BottomSheet
        visible={ShowBudgetSection}
        onClose={() => setShowBudgetSection(false)}
        title="Budgets"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <View style={{gap: widthPixel(20)}}>
          {budgets.map(budget => {
            const isBudgetPrimary = budget.id === primaryBudgetId;
            return (
              <TouchableOpacity
                key={budget.id}
                style={{
                  backgroundColor: isDarkMode ? '#0F1115' : color.tabBackground,
                  borderRadius: heightPixel(12),
                  paddingHorizontal: widthPixel(15),
                  paddingVertical: heightPixel(20),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  setShowBudgetSection(false);
                  setSelectedBudget(budget.name);
                  onBudgetSelect?.(budget.id);
                }}>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={(event: any) => {
                      event.stopPropagation?.();
                      if (budget.id !== primaryBudgetId) {
                        onPrimaryBudgetChange?.(budget.id);
                      }
                    }}
                    disabled={budget.id === primaryBudgetId}>
                    {isBudgetPrimary ? (
                      <AntDesign name="star" size={20} color={color.primary} />
                    ) : (
                      <Ionicons
                        name="star-outline"
                        size={20}
                        color={color.tabicon}
                      />
                    )}
                  </TouchableOpacity>
                  <Text variant="medium" size={17} color={color.black}>
                    {budget.name}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    onDeletePress?.();
                    setShowBudgetSection(false);
                  }}
                  style={{
                    backgroundColor: isDarkMode ? '#0F1115' : color.bg,
                    padding: widthPixel(5),
                    borderRadius: heightPixel(50),
                  }}>
                  <Image
                    source={appImages.Deleteimg}
                    style={{
                      width: widthPixel(25),
                      height: heightPixel(25),
                      resizeMode: 'contain',
                      tintColor: color.black,
                    }}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
        <Spacer height={heightPixel(30)} />
        <Button
          title="Add New Budget"
          variant="outline"
          style={{
            borderWidth: 1,
            borderColor: isDarkMode ? color.primary : color.tabicon,
          }}
          titleStyle={{
            color: isDarkMode ? color.primary : color.tabicon,
          }}
          onPress={() => {
            setShowBudgetSection(false);
            onAddBudgetPress?.();
          }}
        />
        <Spacer height={heightPixel(40)} />
      </BottomSheet>
      <BottomSheet
        visible={showBudgetList}
        onClose={() => setShowBudgetList(false)}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(40)} />
        <View style={{gap: widthPixel(20), marginBottom: heightPixel(40)}}>
          {budgetData.map((item, index) =>
            index === 0 ? (
              <WalkthroughTooltip
                key={item.id}
                stepNumber={6}
                title="Share Budget"
                content="See how changes affect your budget before making them. Adjust your income or expenses (like adding a new bill or changing your mortgage payment) and instantly see how it affects your monthly budget."
                placement="top"
                displayDelay={500}>
                <TouchableOpacity
                  style={{
                    width: '80%',
                    backgroundColor: color.bg,
                    borderRadius: heightPixel(12),
                    paddingHorizontal: widthPixel(13),
                    paddingVertical: heightPixel(12),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: color.primary,
                    marginHorizontal: widthPixel(35),
                  }}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowBudgetList(false);
                    item.onPress();
                  }}>
                  <Text variant="regular" size={16} color={color.black}>
                    {item.title}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={22}
                    color={color.walletbg}
                  />
                </TouchableOpacity>
              </WalkthroughTooltip>
            ) : (
              <TouchableOpacity
                key={item.id}
                style={{
                  backgroundColor: color.bg,
                  borderRadius: heightPixel(12),
                  paddingHorizontal: widthPixel(13),
                  paddingVertical: heightPixel(12),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: color.primary,
                  marginHorizontal: widthPixel(35),
                }}
                activeOpacity={0.8}
                onPress={() => {
                  setShowBudgetList(false);
                  item.onPress();
                }}>
                <Text variant="regular" size={16} color={color.black}>
                  {item.title}
                </Text>
                <Feather
                  name="chevron-right"
                  size={22}
                  color={color.walletbg}
                />
              </TouchableOpacity>
            ),
          )}
        </View>
      </BottomSheet>
      <InfoTooltip
        visible={showIncomeInfo}
        title="Auto fill feature:"
        content="Set a minimum balance to always keep in your account. After expenses, any extra money above this balance will automatically be added to savings or used for debt payments"
        onClose={() => setShowIncomeInfo(false)}
        position="top"
      />
      <BottomSheet
        visible={showEditSavingsSheet}
        onClose={() => setShowEditSavingsSheet(false)}
        title={
          sheetMode === 'edit' ? 'Edit Current Savings' : 'Update Savings Goal'
        }
        maxHeight={500}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={currentSavingsAmount}
          onChangeText={setCurrentSavingsAmount}
          keyboardType="numeric"
          useCurrencyIcon={true}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
        />
        <Spacer height={heightPixel(20)} />
        <Button
          title="Update"
          onPress={() => {
            const amount = Number(currentSavingsAmount || 0);
            onSavingsUpdate?.(
              sheetMode === 'goal'
                ? {savingsGoal: amount}
                : {currentSavings: amount},
            );
            setShowEditSavingsSheet(false);
          }}
        />
        <Spacer height={heightPixel(40)} />
      </BottomSheet>
      <BottomSheet
        visible={showEditIncomeSheet}
        onClose={() => setShowEditIncomeSheet(false)}
        title="Edit Income"
        maxHeight={450}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(10)} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: widthPixel(10),
          }}>
          <Text>Apply To All Budget Cycles</Text>
          <Switch
            trackColor={{false: '#DADADA', true: color.primary}}
            thumbColor="#fff"
            ios_backgroundColor="#DADADA"
            onValueChange={setApplyToAllIncome}
            value={applyToAllIncome}
            style={{
              transform: [{scaleX: 0.7}, {scaleY: 0.7}],
            }}
          />
          <TouchableOpacity onPress={() => setShowApplyToAllInfo(true)}>
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
        <Spacer height={heightPixel(20)} />
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={incomeAmount}
          onChangeText={setIncomeAmount}
          keyboardType="numeric"
          useCurrencyIcon={true}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
        />
        <Spacer height={heightPixel(20)} />
        <Button
          title="Update"
          onPress={() => {
            const amount = Number(incomeAmount || 0);
            if (!activeCycleId || !amount || amount <= 0) {
              Alert.alert('Invalid income', 'Enter a valid income amount.');
              return;
            }

            onIncomeUpdate?.(amount, applyToAllIncome);
            setShowEditIncomeSheet(false);
          }}
        />
        <Spacer height={heightPixel(20)} />
        <InfoTooltip
          visible={showApplyToAllInfo}
          title="Apply To All Budget Cycles"
          content="When on, changes affect every budget cycle. Turn off to edit this cycle only."
          onClose={() => setShowApplyToAllInfo(false)}
          position="bottom-middle"
        />
      </BottomSheet>
    </>
  );
};

export default CustomHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileImage: {
    height: heightPixel(40),
    width: widthPixel(40),
    borderRadius: 40,
    resizeMode: 'contain',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(17),
    marginLeft: 'auto',
  },
});
