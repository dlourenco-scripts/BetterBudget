import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import {AntDesign, Entypo, Feather} from '@expo/vector-icons';
import {
  BottomSheet,
  Button,
  CustomModal,
  InfoTooltip,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import CustomHeader, {Budget} from '@/components/others/CustomHeader';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import ProgressBar from '@/components/others/ProgressBar';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {heightPixel, widthPixel, wp} from '@/services/responsive';
import {useAuthStore} from '@/store';

const HomeScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currencySymbol} = useCurrency();
  const token = useAuthStore(state => state.token);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetDetails, setBudgetDetails] = useState<any[]>([]);
  const [primaryBudgetId, setPrimaryBudgetId] = useState<string>('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const activeBudget =
    budgetDetails.find(budget => budget.id === primaryBudgetId) ||
    budgetDetails[0];
  const activeCycles = activeBudget?.cycles || [];
  const activeCycle =
    activeCycles.find((cycle: any) => cycle.id === selectedCycleId) ||
    activeBudget?.currentCycle ||
    activeCycles[0];
  const incomes = activeCycle?.incomes || [];
  const expenses = activeCycle?.expenses || [];
  const debts = activeBudget?.debts || [];
  const incomeFromItems = incomes.reduce(
    (sum: number, item: any) => sum + Number(item.amount || 0),
    0,
  );
  const expensesFromItems = expenses.reduce(
    (sum: number, item: any) => sum + Number(item.amount || 0),
    0,
  );
  const totalIncome = Number(activeCycle?.totalIncome ?? incomeFromItems);
  const totalExpenses = Number(activeCycle?.totalExpenses ?? expensesFromItems);
  const totalDebt = debts.reduce(
    (sum: number, item: any) => sum + Number(item.balance || 0),
    0,
  );
  const goalAllocation = Number(activeCycle?.goalAllocation || 0);
  const carryOverIn = Number(activeCycle?.carryOverIn || 0);
  const carryOverOut = Number(activeCycle?.carryOverOut || 0);
  const remaining = Number(
    activeCycle?.remainingAmount ??
      totalIncome + carryOverIn - totalExpenses - goalAllocation - carryOverOut,
  );
  const totalSavings =
    Number(activeBudget?.currentSavings || 0) +
    activeCycles
      .filter((cycle: any) => cycle.cycleIndex <= (activeCycle?.cycleIndex ?? 0))
      .reduce((sum: number, cycle: any) => sum + Number(cycle.goalAllocation || 0), 0);

  const handlePrimaryBudgetChange = (budgetId: string) => {
    setPrimaryBudgetId(budgetId);
    const nextBudget = budgetDetails.find(budget => budget.id === budgetId);
    const nextCycle = nextBudget?.currentCycle || nextBudget?.cycles?.[0];
    if (nextCycle) {
      setSelectedCycleId(nextCycle.id);
      setDate(dayjs(nextCycle.cycleStart));
    }
  };

  const handleAutoFillChange = async (enabled: boolean) => {
    if (!primaryBudgetId) {
      return;
    }

    try {
      await budgetApi.update(primaryBudgetId, {autoFillEnabled: enabled});
      await loadBudgets();
    } catch (error) {
      console.error('Unable to update auto fill:', error);
    }
  };

  const handleSavingsUpdate = async (values: {currentSavings?: number; savingsGoal?: number}) => {
    if (!primaryBudgetId) {
      return;
    }

    try {
      await budgetApi.update(primaryBudgetId, values);
      await loadBudgets();
    } catch (error) {
      console.error('Unable to update savings:', error);
    }
  };

  const loadBudgets = useCallback(async () => {
    try {
      setBudgets([]);
      setBudgetDetails([]);
      const response = await budgetApi.list();
      const budgetList = response.data || [];
      setBudgets(budgetList.map((budget: any) => ({id: budget.id, name: budget.name})));

      const details = (
        await Promise.all(
        budgetList.map(async (budget: any) => {
          const detailResponse = await budgetApi.get(budget.id);
          return detailResponse.data || budget;
        }),
        )
      ).sort((a: any, b: any) => dayjs(a.cycleStart).valueOf() - dayjs(b.cycleStart).valueOf());

      setBudgetDetails(details);

      const selectedId =
        primaryBudgetId && budgetList.some((budget: any) => budget.id === primaryBudgetId)
          ? primaryBudgetId
          : budgetList[0]?.id || '';
      setPrimaryBudgetId(selectedId);

      const selectedBudget = details.find((budget: any) => budget.id === selectedId) || details[0];
      const nextCycle =
        selectedBudget?.cycles?.find((cycle: any) => cycle.id === selectedCycleId) ||
        selectedBudget?.currentCycle ||
        selectedBudget?.cycles?.[0];
      if (nextCycle) {
        setSelectedCycleId(nextCycle.id);
        setDate(dayjs(nextCycle.cycleStart));
      }
    } catch (error) {
      console.error('Unable to load budgets:', error);
    }
  }, [primaryBudgetId, selectedCycleId, token]);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets]),
  );

  // Custom colors for specific bottom sheets in dark mode
  const customSheetBg = isDarkMode ? '#171A21' : undefined;
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const [date, setDate] = useState(dayjs('2024-12-15'));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddbudgetList, setShowAddbudgetList] = useState(false);
  const [showExpenseInfo, setShowExpenseInfo] = useState(false);
  const [showCarryOverSheet, setShowCarryOverSheet] = useState(false);
  const [showtoltip, setShowtoltip] = useState(false);
  const [showOnetimeExpensesSheet, setShowOnetimeExpensesSheet] =
    useState(false);
  const [oneTimeExpenseName, setOneTimeExpenseName] = useState('');
  const [oneTimeExpenseAmount, setOneTimeExpenseAmount] = useState('');
  const [carryOverAmount, setCarryOverAmount] = useState('');

  const NewBudgetData = [
    {
      id: 1,
      title: 'Income',
      onPress: () => {
        router.push({
          pathname: '/auth/AddIncome',
          params: {fromHome: 'true', budgetId: primaryBudgetId},
        });
      },
    },
    {
      id: 2,
      title: 'One-Time Expense',
      onPress: () => {
        setShowOnetimeExpensesSheet(true);
      },
    },
    {
      id: 3,
      title: 'Recurring Expense',
      onPress: () => {
        router.push({
          pathname: '/auth/RecurringExpenses',
          params: {fromHome: 'true', budgetId: primaryBudgetId},
        });
      },
    },
    {
      id: 4,
      title: 'Debt',
      onPress: () => {
        router.push({
          pathname: '/auth/Debt',
          params: {fromHome: 'true', budgetId: primaryBudgetId},
        });
      },
    },
  ];

  const goPrev = () => {
    if (activeCycles.length === 0) {
      setDate(prev => prev.subtract(1, 'month'));
      return;
    }

    const currentIndex = activeCycles.findIndex((cycle: any) => cycle.id === activeCycle?.id);
    const prevCycle = activeCycles[Math.max(0, currentIndex - 1)];
    if (prevCycle) {
      setSelectedCycleId(prevCycle.id);
      setDate(dayjs(prevCycle.cycleStart));
    }
  };

  const goNext = () => {
    if (activeCycles.length === 0) {
      setDate(prev => prev.add(1, 'month'));
      return;
    }

    const currentIndex = activeCycles.findIndex((cycle: any) => cycle.id === activeCycle?.id);
    const nextCycle = activeCycles[Math.min(activeCycles.length - 1, currentIndex + 1)];
    if (nextCycle) {
      setSelectedCycleId(nextCycle.id);
      setDate(dayjs(nextCycle.cycleStart));
    }
  };

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleAddBudgetPress = () => {
    setShowAddBudgetModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!primaryBudgetId) {
      setShowDeleteModal(false);
      return;
    }

    try {
      await budgetApi.delete(primaryBudgetId);
      setShowDeleteModal(false);
      setPrimaryBudgetId('');
      setSelectedCycleId('');
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to delete budget', error?.message || 'Please try again.');
    }
  };

  const handleAddOneTimeExpense = async () => {
    if (!primaryBudgetId) {
      Alert.alert('No budget selected', 'Create or select a budget before adding an expense.');
      return;
    }

    if (!oneTimeExpenseName.trim() || !Number(oneTimeExpenseAmount)) {
      Alert.alert('Missing expense details', 'Enter an expense name and amount.');
      return;
    }

    try {
      const response = await budgetApi.createExpense(primaryBudgetId, {
        name: oneTimeExpenseName.trim(),
        amount: Number(oneTimeExpenseAmount),
        type: 'One Time',
        frequency: 'One Time',
        dueDate: activeCycle?.cycleStart || date.format('YYYY-MM-DD'),
        category: 'One-Time Expense',
        priority: 1,
        notes: '',
      });

      if (!response.success) {
        Alert.alert('Unable to save expense', response.message || 'Please try again.');
        return;
      }

      setOneTimeExpenseName('');
      setOneTimeExpenseAmount('');
      setShowOnetimeExpensesSheet(false);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to save expense', error?.message || 'Please try again.');
    }
  };

  const handleUpdateCarryOver = async () => {
    if (!primaryBudgetId || !activeCycle?.id) {
      Alert.alert('No budget selected', 'Create or select a budget before carrying money over.');
      return;
    }

    const amount = Number(carryOverAmount || 0);
    if (amount < 0 || amount > remaining + carryOverOut) {
      Alert.alert('Invalid carry over', 'Carry over cannot exceed the current remaining amount.');
      return;
    }

    try {
      const response = await budgetApi.updateCycle(primaryBudgetId, activeCycle.id, {
        carryOverOut: amount,
      });

      if (!response.success) {
        Alert.alert('Unable to update carry over', response.message || 'Please try again.');
        return;
      }

      setShowCarryOverSheet(false);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to update carry over', error?.message || 'Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleCopyExpenses = () => {
    console.log('Copy expenses');
    setShowAddBudgetModal(false);
    router.push({
      pathname: '/auth/CreateBudget',
      params: {
        fromHome: 'true',
        fromBudgetCreation: 'true',
        fromCopyExpenses: 'true',
      },
    });
  };

  const handleCreateNew = () => {
    console.log('Create new budget');
    setShowAddBudgetModal(false);
    router.push({
      pathname: '/auth/CreateBudget',
      params: {fromHome: 'true', fromBudgetCreation: 'true'},
    });
  };

  return (
    <>
      <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
        <View style={{width: '100%', backgroundColor: color.bg}}>
          <Spacer
            height={20}
            style={{backgroundColor: color.bg}}
            width={wp(100)}
          />
          <CustomHeader
            onDeletePress={handleDeletePress}
            onAddBudgetPress={handleAddBudgetPress}
            budgets={budgets}
            primaryBudgetId={primaryBudgetId}
            onPrimaryBudgetChange={handlePrimaryBudgetChange}
            currentSavings={Number(activeBudget?.currentSavings || 0)}
            savingsGoal={Number(activeBudget?.savingsGoal || 0)}
            autoFillEnabled={Boolean(activeBudget?.autoFillEnabled)}
            onAutoFillChange={handleAutoFillChange}
            onSavingsUpdate={handleSavingsUpdate}
          />
          <Spacer
            height={20}
            style={{backgroundColor: color.bg}}
            width={wp(100)}
          />
        </View>
        <WalkthroughTooltip
          stepNumber={1}
          title="To Save"
          content="The amount you've chosen to set aside for savings this cycle. It adds to your total savings and is deducted from your remaining balance."
          placement="bottom">
          <View
            style={{
              backgroundColor: color.secondaryheader,
              borderWidth: 1,
              borderColor: color.primary,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 15,
              width: '100%',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                  <Image
                    source={appImages.Arrowimg}
                    style={{
                      height: heightPixel(15),
                      width: widthPixel(15),
                      resizeMode: 'contain',
                      tintColor: color.tabicon,
                    }}
                  />
                  <Text size={14} color={color.black} variant="semibold">
                    To Save
                  </Text>
                </View>
                <Spacer height={10} />
                <Text size={18} variant="medium" color={color.primary}>
                  {currencySymbol}{goalAllocation.toFixed(2)}
                </Text>
              </View>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                  <Image
                    source={appImages.ArrowDownimg}
                    style={{
                      height: heightPixel(15),
                      width: widthPixel(15),
                      resizeMode: 'contain',
                      tintColor: color.tabicon,
                    }}
                  />
                  <Text size={14} color={color.black} variant="medium">
                    Total Savings
                  </Text>
                </View>
                <Spacer height={10} />
                <Text
                  size={18}
                  variant="medium"
                  color={color.black}
                  style={{textAlign: 'right'}}>
                  {currencySymbol}{totalSavings.toFixed(2)}
                </Text>
              </View>
            </View>
            <Spacer height={20} />
            <ProgressBar />
          </View>
        </WalkthroughTooltip>

        <Spacer height={20} />
        <View style={styles.row}>
          <Text size={16} color={color.black} variant="semibold">
            Pay Date
          </Text>
          <TouchableOpacity onPress={goPrev} style={styles.arrowBtn}>
            <AntDesign name="left" size={14} color={color.dateText} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{date.format('MMMM, DD, YYYY')}</Text>
          <TouchableOpacity onPress={goNext} style={styles.arrowBtn}>
            <AntDesign name="right" size={14} color={color.dateText} />
          </TouchableOpacity>
        </View>
        <Spacer height={20} />
        <WalkthroughTooltip
          stepNumber={2}
          title="Total Payments"
          content="Your total expenses for this cycle."
          placement="top">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: color.walletbg,
              padding: 15,
              borderRadius: 10,
              width: '100%',
            }}>
            <View
              style={{
                alignItems: 'center',
                gap: 5,
              }}>
              <Image
                source={appImages.Paymentimg}
                style={{
                  height: heightPixel(33),
                  width: widthPixel(36),
                  resizeMode: 'contain',
                  tintColor: color.white,
                }}
              />
              <Text size={18} variant="semibold" color={color.white}>
                {currencySymbol}{totalExpenses.toFixed(2)}
              </Text>
              <Text size={11} color={color.white}>
                Total Payments
              </Text>
            </View>

            <View
              style={{
                width: 1,
                height: 80,
                backgroundColor: color.white,
                opacity: 0.3,
              }}
            />

            <WalkthroughTooltip
              stepNumber={3}
              title="Carry Over"
              content="Carry Over lets you roll unused money from this budget into the next, so you can cover future expenses or keep a cushion."
              placement="top">
              <View
                style={{
                  alignItems: 'center',
                  gap: 5,
                }}>
                <Image
                  source={appImages.CarryOverimg}
                  style={{
                    height: heightPixel(33),
                    width: widthPixel(36),
                    resizeMode: 'contain',
                    tintColor: color.white,
                  }}
                />
                <Text size={18} variant="semibold" color={color.white}>
                  {currencySymbol}{carryOverOut.toFixed(2)}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{
                    borderRadius: 20,
                    backgroundColor: color.white,
                    alignSelf: 'flex-start',
                    padding: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setCarryOverAmount(String(carryOverOut || ''));
                    setShowCarryOverSheet(true);
                  }}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text size={10} variant="medium" color={color.primary}>
                      Carry Over
                    </Text>
                    <Entypo
                      name="chevron-right"
                      size={13}
                      color={color.primary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </WalkthroughTooltip>

            <View
              style={{
                width: 1,
                height: 80,
                backgroundColor: color.white,
                opacity: 0.3,
              }}
            />

            <WalkthroughTooltip
              stepNumber={4}
              title="Remaining"
              content="What's left after subtracting your expenses from your income. This is the amount you still have available."
              placement="top">
              <View
                style={{
                  alignItems: 'center',
                  gap: 5,
                }}>
                <Image
                  source={appImages.Walletimg}
                  style={{
                    height: heightPixel(33),
                    width: widthPixel(36),
                    resizeMode: 'contain',
                    tintColor: color.white,
                  }}
                />
                <Text size={18} variant="semibold" color={color.white}>
                  {currencySymbol}{Number(remaining).toFixed(2)}
                </Text>
                <Text size={11} color={color.white}>
                  Total Remaining
                </Text>
              </View>
            </WalkthroughTooltip>
          </View>
        </WalkthroughTooltip>
        <Spacer height={20} />
        <WalkthroughTooltip
          stepNumber={5}
          title="Income"
          content="Your total income for this cycle."
          placement="top">
          <View
            style={{
              width: '100%',
            }}>
            <GradientExpandableCard title="Income" value={totalIncome.toFixed(2)} />
          </View>
        </WalkthroughTooltip>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
          <Text size={15} variant="medium" color={color.black}>
            Expenses
          </Text>
          <TouchableOpacity onPress={() => setShowExpenseInfo(true)}>
            <Image
              source={appImages.Aboutimg}
              style={{
                height: heightPixel(18),
                width: widthPixel(18),
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          scrollEnabled={false}
          data={
            expenses.length > 0
              ? [
                  {
                    id: 'expenses',
                    title: 'Expenses',
                    value: totalExpenses.toFixed(2),
                    items: expenses.map((expense: any) => ({
                      date: dayjs(expense.dueDate).format('MMM-DD'),
                      label: expense.name,
                      tag: expense.type,
                      tagBg: colors.light.white,
                      tagColor: colors.light.tabicon,
                      amount: Number(expense.amount || 0).toFixed(2),
                    })),
                  },
                ]
              : []
          }
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{paddingBottom: 30}}
          renderItem={({item}) => (
            <GradientExpandableCard
              title={item.title}
              value={item.value}
              expandedGradientColors={{default: ['#FFD479', '#FFAD3D']}}>
              <View style={{gap: 10}}>
                {item.items.map((row: any, index: number) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                    <Text size={11} color="#000">
                      {row.date}
                    </Text>
                    <Text size={12} color="#000" variant="medium">
                      {row.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: row.tagBg,
                        borderRadius: 20,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        alignSelf: 'flex-start',
                      }}>
                      <Text size={8} variant="medium" color={row.tagColor}>
                        {row.tag}
                      </Text>
                    </View>
                    <View style={{flex: 1}} />
                    <Text size={12} color="#000" variant="medium">
                      {currencySymbol}
                      {row.amount}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={{
                  marginTop: 15,
                  padding: 3,
                  backgroundColor: '#FFF3DE',
                  borderRadius: 5,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => router.navigate('/mainScreens/DebitCard')}
                activeOpacity={0.8}>
                <Text variant="medium" size={14} color={colors.light.tabicon}>
                  View All
                </Text>
              </TouchableOpacity>
            </GradientExpandableCard>
          )}
          ListEmptyComponent={
            <Text size={14} color={color.tabicon} style={{marginTop: 10}}>
              No expenses in this pay cycle yet.
            </Text>
          }
        />
        <Spacer height={10} />
        <Text size={15} variant="medium" color={color.black}>
          Debt
        </Text>
        <GradientExpandableCard
          title={debts[0]?.name || 'Debt'}
          value={totalDebt.toFixed(2)}
          subText={activeCycle?.cycleStart || 'No budget'}
        />
      </Wrapper>

      {/* Add Budget Modal */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 100,
          backgroundColor: color.primary,
          alignSelf: 'flex-end',
          padding: 15,
          position: 'absolute',
          bottom: 20,
          right: 20,
          borderWidth: 1,
          borderColor: isDarkMode ? '#000' : color.white,
        }}
        onPress={() => setShowAddbudgetList(true)}>
        <Image
          source={appImages.Plusimg}
          tintColor={isDarkMode ? '#000' : color.white}
          style={{
            height: heightPixel(20),
            width: widthPixel(20),
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>

      {/* Delete Budget Modal */}
      <CustomModal
        visible={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Budget"
        message="Are you sure you want to delete the budget. You will not be able to restore the deleted budget again"
        primaryButtonText="Cancel"
        secondaryButtonText="Delete"
        onPrimaryPress={handleDeleteCancel}
        onSecondaryPress={handleDeleteConfirm}
      />

      {/* Add New Budget / Copy Expenses Modal */}
      <CustomModal
        visible={showAddBudgetModal}
        onClose={() => setShowAddBudgetModal(false)}
        title="Do you want to copy current Expenses?"
        message="This will bring all recurring expenses and any debt from your current budget into the new one. You can edit, add, or remove anything after"
        primaryButtonText="Copy Expenses"
        secondaryButtonText="Create New"
        onPrimaryPress={handleCopyExpenses}
        onSecondaryPress={handleCreateNew}
      />
      <BottomSheet
        visible={showAddbudgetList}
        onClose={() => setShowAddbudgetList(false)}
        title="What do you want to add?"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View style={{gap: widthPixel(15), marginBottom: heightPixel(30)}}>
          {NewBudgetData.map(item => (
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
                setShowAddbudgetList(false);
                item.onPress();
              }}>
              <Text variant="regular" size={16} color={color.black}>
                {item.title}
              </Text>
              <Feather name="chevron-right" size={22} color={color.walletbg} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showOnetimeExpensesSheet}
        onClose={() => setShowOnetimeExpensesSheet(false)}
        title={'One-Time Expense'}
        maxHeight={550}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Expense Name"
          placeholder="Expense Name"
          placeholderTextColor={color.tabicon}
          value={oneTimeExpenseName}
          onChangeText={setOneTimeExpenseName}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          // onChangeText={setCurrentSavingsAmount}
        />
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={oneTimeExpenseAmount}
          onChangeText={setOneTimeExpenseAmount}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          // onChangeText={setCurrentSavingsAmount}
          keyboardType="numeric"
          useCurrencyIcon={true}
        />
        <Spacer height={heightPixel(40)} />
        <Button
          title="Add"
          onPress={handleAddOneTimeExpense}
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
      <BottomSheet
        visible={showCarryOverSheet}
        onClose={() => setShowCarryOverSheet(false)}
        title=""
        maxHeight={450}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: widthPixel(10),
          }}>
          <Text size={22} variant="medium">
            Carry Over
          </Text>
          <TouchableOpacity onPress={() => setShowtoltip(true)}>
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
          keyboardType="numeric"
          useCurrencyIcon={true}
          value={carryOverAmount}
          onChangeText={setCarryOverAmount}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
        />
        <Spacer height={heightPixel(20)} />
        <Button
          title="Update"
          onPress={handleUpdateCarryOver}
        />
        <Spacer height={heightPixel(40)} />
        <InfoTooltip
          visible={showtoltip}
          title="Carry Over :"
          content="Money held back from this budget cycle to cover next cycle’s expenses. The amount is deducted from your current available balance and transferred to the next cycle."
          onClose={() => setShowtoltip(false)}
          position="bottom-middle"
        />
      </BottomSheet>
      <InfoTooltip
        visible={showExpenseInfo}
        title="Expenses:"
        content="Grouped by payment method, shows all expenses paid from each source."
        onClose={() => setShowExpenseInfo(false)}
        position="bottom"
      />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
  },
  arrowBtn: {
    padding: 5,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: '600',
    marginHorizontal: 12,
  },
});

export default HomeScreen;
