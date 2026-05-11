import React, {useEffect, useState} from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {router} from 'expo-router';
import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {appImages} from '@/constants/assets';
import {fonts} from '@/constants/fonts';
import {useWalkthrough} from '@/context/WalkthroughProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
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
  onPrimaryBudgetChange?: (budgetId: string) => void;
  currentSavings?: number;
  savingsGoal?: number;
  autoFillEnabled?: boolean;
  onAutoFillChange?: (enabled: boolean) => void;
  onSavingsUpdate?: (values: {currentSavings?: number; savingsGoal?: number}) => void;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  onDeletePress,
  onAddBudgetPress,
  budgets = [],
  primaryBudgetId,
  onPrimaryBudgetChange,
  currentSavings = 0,
  savingsGoal = 0,
  autoFillEnabled = false,
  onAutoFillChange,
  onSavingsUpdate,
}) => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currentStep, isStepVisible} = useWalkthrough();
  const [selectedBudget, setSelectedBudget] = useState('Home Budget');

  // Custom colors for specific bottom sheets in dark mode
  const customSheetBg = isDarkMode ? '#171A21' : undefined;
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const [expandFlame, setExpandFlame] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
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
      budgets.find(budget => budget.id === primaryBudgetId) || budgets[0];
    if (activeBudget) {
      setSelectedBudget(activeBudget.name);
    }
  }, [budgets, primaryBudgetId]);

  useEffect(() => {
    setIsEnabled(autoFillEnabled);
  }, [autoFillEnabled]);

  useEffect(() => {
    setCurrentSavingsAmount(
      String(sheetMode === 'goal' ? savingsGoal || '' : currentSavings || ''),
    );
  }, [currentSavings, savingsGoal, sheetMode, showEditSavingsSheet]);

  // Determine if the current selected budget is the primary budget
  const currentBudget = budgets.find(b => b.name === selectedBudget);
  const isPrimaryBudget =
    budgets.length === 1 ||
    (currentBudget && currentBudget.id === primaryBudgetId);
  const canSelectPrimary = budgets.length > 1;

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

  const toggleFlame = () => {
    const newValue = !expandFlame;
    setExpandFlame(newValue);

    Animated.timing(slideAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <>
      <View style={[styles.container, {backgroundColor: color.bg}]}>
        <TouchableOpacity
          onPress={() => router.navigate('/mainScreens/Settings')}>
          <Image source={appImages.UserDemoimg} style={styles.profileImage} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <TouchableOpacity
            onPress={() => {
              if (canSelectPrimary && currentBudget) {
                onPrimaryBudgetChange?.(currentBudget.id);
              }
            }}
            activeOpacity={0.6}
            disabled={!canSelectPrimary}>
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
          <TouchableOpacity style={styles.badgeContainer} onPress={toggleFlame}>
            <View
              style={[
                styles.flameWrapper,
                {backgroundColor: color.headerIconBg},
              ]}>
              <Image source={appImages.Flame} style={{height: 20, width: 20}} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>15</Text>
              </View>
            </View>
          </TouchableOpacity>
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

      {expandFlame && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            onPress={toggleFlame}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <Animated.View
            style={[
              styles.expandedSection,
              {
                opacity: slideAnim,
                transform: [{translateY}],
              },
            ]}>
            {/* Triangular Pointer */}
            <View style={styles.trianglePointer} />
            <LinearGradient
              colors={['#FF6E00', '#D6CB64', '#FF6E00']}
              style={styles.gradientContainer}
              start={{x: 1.2, y: 0.2}}
              end={{x: 0.2, y: 1.2}}>
              <View style={styles.headerRow}>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Image
                    source={appImages.Flame}
                    style={{height: 24, width: 24}}
                  />
                  <Text
                    size={20}
                    variant="semibold"
                    color="#FFF"
                    style={{fontFamily: fonts.PoltawskiNowy}}>
                    Streaks (Per Cycle)
                  </Text>
                </View>
              </View>

              <View style={styles.streakRow}>
                <Text size={13} variant="regular" color="#FFF">
                  App Open Streak
                </Text>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                  <Text size={16} variant="regular" color="#FFF">
                    5
                  </Text>
                  <Image
                    source={appImages.Flame}
                    style={{height: 14, width: 14}}
                  />
                </View>
              </View>

              <View style={styles.streakRow}>
                <Text size={13} variant="regular" color="#FFF">
                  Savings Streak
                </Text>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                  <Text size={16} variant="regular" color="#FFF">
                    5
                  </Text>
                  <Image
                    source={appImages.Flame}
                    style={{height: 14, width: 14}}
                  />
                </View>
              </View>

              <View style={[styles.streakRow, {borderBottomWidth: 0}]}>
                <Text size={13} variant="regular" color="#FFF">
                  Debt Paydown Streak
                </Text>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                  <Text size={16} variant="regular" color="#FFF">
                    5
                  </Text>
                  <Image
                    source={appImages.Flame}
                    style={{height: 14, width: 14}}
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </>
      )}
      <BottomSheet
        visible={ShowBudgetSection}
        onClose={() => setShowBudgetSection(false)}
        title="Budgets"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <View style={{gap: widthPixel(20)}}>
          {budgets.map(budget => {
            const isBudgetPrimary =
              budgets.length === 1 || budget.id === primaryBudgetId;
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
                  onPrimaryBudgetChange?.(budget.id);
                }}>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (budgets.length > 1) {
                        onPrimaryBudgetChange?.(budget.id);
                      }
                    }}
                    disabled={budgets.length <= 1}>
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
            // Handle update logic
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
  flameWrapper: {
    position: 'relative',
    borderRadius: 50,
    padding: 6,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#F48024',
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  expandedSection: {
    position: 'absolute',
    top: heightPixel(85),
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  trianglePointer: {
    position: 'absolute',
    top: -15,
    right: widthPixel(68),
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF8C42',
    zIndex: 1001,
  },
  gradientContainer: {
    borderRadius: 16,
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
});
