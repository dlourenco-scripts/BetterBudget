import React, {useCallback, useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {
  BottomSheet,
  Header,
  Spacer,
  Text,
  TextInput,
  ToggleButton,
  Wrapper,
} from '@/components';
import IconToggleButton from '@/components/IconToggleButton';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {useCurrency} from '@/context/CurrencyProvider';
import {useWalkthrough} from '@/context/WalkthroughProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

const InsightScreen = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const {currentStep} = useWalkthrough();
  const userData = useAuthStore(state => state.userData);
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userData?.email || 'default'}`;
  const isDark = color.bg === '#171A21';
  const customInputBg = isDark ? '#0F1115' : undefined;
  const [showInsightSheet, setShowInsightSheet] = useState(false);
  const [showFinancialSheet, setShowFinancialSheet] = useState(false);
  const [insightViewIndex, setInsightViewIndex] = useState(0);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [budget, setBudget] = useState<any>(null);

  const currentCycle = budget?.currentCycle;
  const expenses = budget?.expenses || [];
  const cycleExpenses = currentCycle?.expenses || [];
  const currentMonthKey = dayjs(
    currentCycle?.cycleStart || currentCycle?.cycle_start || new Date(),
  ).format('YYYY-MM');
  const totalIncome = Number(currentCycle?.totalIncome || 0);
  const totalExpenses = Number(currentCycle?.totalExpenses || 0);
  const totalDebt = (budget?.debts || []).reduce(
    (sum: number, debt: any) => sum + Number(debt.balance || 0),
    0,
  );
  const goalAllocation = Number(currentCycle?.goalAllocation || 0);
  const monthlySummary = useMemo(() => {
    const groups = (budget?.cycles || []).reduce((items: Record<string, any>, cycle: any) => {
      const key = dayjs(cycle.cycleStart || cycle.cycle_start).format('YYYY-MM');
      if (!items[key]) {
        items[key] = {
          key,
          label: dayjs(cycle.cycleStart || cycle.cycle_start).format('MMM'),
          income: 0,
          expenses: 0,
        };
      }

      items[key].income += Number(cycle.totalIncome || 0);
      items[key].expenses += Number(cycle.totalExpenses || 0);
      return items;
    }, {});

    const rows = Object.values(groups)
      .sort((a: any, b: any) => a.key.localeCompare(b.key))
      .slice(-6);

    if (rows.length > 0) {
      return rows as {key: string; label: string; income: number; expenses: number}[];
    }

    return [
      {
        key: dayjs().format('YYYY-MM'),
        label: dayjs().format('MMM'),
        income: totalIncome,
        expenses: totalExpenses,
      },
    ];
  }, [budget?.cycles, totalExpenses, totalIncome]);
  const monthlyMax = Math.max(
    ...monthlySummary.flatMap(item => [item.income, item.expenses]),
    1,
  );
  const currentMonthSummary =
    monthlySummary.find(item => item.key === currentMonthKey) ||
    monthlySummary[monthlySummary.length - 1] || {
      income: totalIncome,
      expenses: totalExpenses,
    };
  const monthlyIncome = Number(currentMonthSummary.income || 0);
  const monthlyExpenses = Number(currentMonthSummary.expenses || 0);
  const monthlyRemaining = monthlyIncome - monthlyExpenses;
  const comparisonRows = [
    {label: 'Income', amount: monthlyIncome, tint: color.primary},
    {label: 'Expenses', amount: monthlyExpenses, tint: '#7C1500'},
    {label: 'Allocated', amount: goalAllocation, tint: '#3D7B8F'},
    {
      label: 'Remaining',
      amount: monthlyRemaining,
      tint: monthlyRemaining < 0 ? '#D92D20' : color.tabicon,
    },
  ];
  const maxIncomeExpense = Math.max(
    ...comparisonRows.map(item => Math.abs(item.amount)),
    1,
  );

  const expenseCategories = useMemo<Record<string, number>>(() => {
    return (expenses as any[]).reduce((groups: Record<string, number>, expense: any) => {
      const category = expense.category || 'Uncategorized';
      groups[category] = (groups[category] || 0) + Number(expense.amount || 0);
      return groups;
    }, {});
  }, [expenses]);

  const cyclePaymentSources = useMemo<Record<string, number>>(() => {
    return (cycleExpenses as any[]).reduce((groups: Record<string, number>, expense: any) => {
      const source = expense.notes?.trim() || 'Unassigned';
      groups[source] = (groups[source] || 0) + Number(expense.amount || 0);
      return groups;
    }, {});
  }, [cycleExpenses]);
  const maxCategoryAmount = Math.max(
    ...Object.values(expenseCategories).map(amount => Number(amount)),
    1,
  );
  const totalBudgetExpenses = Object.values(expenseCategories).reduce(
    (sum, amount) => sum + Number(amount || 0),
    0,
  );
  const sortedCategoryEntries = Object.entries(expenseCategories).sort(
    ([, firstAmount], [, secondAmount]) => Number(secondAmount) - Number(firstAmount),
  );

  const loadInsights = useCallback(async () => {
    try {
      const budgetsResponse = await budgetApi.list();
      const budgetList = budgetsResponse.data || [];
      const storedPrimaryBudgetId = await AsyncStorage.getItem(primaryBudgetStorageKey);
      const targetBudget =
        budgetList.find((item: any) => item.id === storedPrimaryBudgetId) ||
        budgetList[0];
      if (!targetBudget?.id) {
        setBudget(null);
        return;
      }

      const detailResponse = await budgetApi.get(targetBudget.id);
      setBudget(detailResponse.data || null);
    } catch (error) {
      console.error('Unable to load insights:', error);
      setBudget(null);
    }
  }, [primaryBudgetStorageKey]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [loadInsights]),
  );

  React.useEffect(() => {
    if (currentStep === 7) {
      setTimeout(() => {
        setShowInsightSheet(true);
      }, 500);
    }
  }, [currentStep]);

  return (
    <Wrapper
      keyboardProps={{stickyHeaderIndices: [0], bounces: false}}
      bottomSpace={false}>
      <Header
        canGoBack={false}
        title="Insights"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        leftComponent={
          <TouchableOpacity
            activeOpacity={0.6}
            style={{
              borderRadius: 50,
              backgroundColor: color.tabBackground,
              padding: 5,
            }}
            onPress={() => setShowInsightSheet(true)}>
            <Feather name="more-horizontal" size={22} color={color.tabicon} />
          </TouchableOpacity>
        }
      />
      <Spacer height={20} />

      <IconToggleButton
        options={[
          {label: 'Comparison', icon: 'bar-chart'},
          {label: 'Breakdown', icon: 'pie-chart'},
        ]}
        selectedIndex={insightViewIndex}
        onToggle={setInsightViewIndex}
      />
      <Spacer height={16} />

      <View
        style={{
          backgroundColor: color.inputField,
          borderRadius: 14,
          padding: 16,
        }}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 12}}>
          <View>
            <Text size={12} color={color.tabicon}>
              Income vs Expenses
            </Text>
            <Text size={22} variant="semibold" color={color.black}>
              {currencySymbol}
              {totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text size={12} color={color.tabicon}>
              Expenses
            </Text>
            <Text size={22} variant="semibold" color="#7C1500">
              {currencySymbol}
              {totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>
        <Spacer height={16} />
        <View style={{gap: 12}}>
          {monthlySummary.map(item => (
            <View key={item.key}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text size={12} variant="medium" color={color.black}>
                  {item.label}
                </Text>
                <Text size={12} color={color.tabicon}>
                  {currencySymbol}
                  {item.income.toFixed(0)} / {currencySymbol}
                  {item.expenses.toFixed(0)}
                </Text>
              </View>
              <Spacer height={6} />
              <View style={{gap: 4}}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 20,
                    backgroundColor: color.bg,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      width: `${Math.min(100, (item.income / monthlyMax) * 100)}%`,
                      height: '100%',
                      backgroundColor: color.primary,
                    }}
                  />
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 20,
                    backgroundColor: color.bg,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      width: `${Math.min(100, (item.expenses / monthlyMax) * 100)}%`,
                      height: '100%',
                      backgroundColor: '#7C1500',
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
        <Spacer height={12} />
        <View style={{flexDirection: 'row', gap: widthPixel(14)}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary}} />
            <Text size={11} color={color.tabicon}>
              Income
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C1500'}} />
            <Text size={11} color={color.tabicon}>
              Expenses
            </Text>
          </View>
        </View>
      </View>
      <Spacer height={10} />

      {insightViewIndex === 0 ? (
        <>
          <GradientExpandableCard title="Monthly Income" value={monthlyIncome.toFixed(2)} />
          <Spacer height={10} />
          <GradientExpandableCard title="Monthly Expenses" value={monthlyExpenses.toFixed(2)} />
          <Spacer height={10} />
          <GradientExpandableCard title="Debt Balance" value={totalDebt.toFixed(2)} />
          <Spacer height={10} />
          <GradientExpandableCard
            title="Monthly Remaining"
            value={monthlyRemaining.toFixed(2)}
            valueStyle={monthlyRemaining < 0 ? {color: '#D92D20'} : undefined}
          />
          <Spacer height={14} />
          <View
            style={{
              backgroundColor: color.inputField,
              borderRadius: 14,
              padding: 14,
              gap: 12,
            }}>
            {comparisonRows.map(item => (
              <View key={item.label}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text size={13} color={color.black} variant="medium">
                    {item.label}
                  </Text>
                  <Text
                    size={13}
                    color={item.amount < 0 ? '#D92D20' : color.black}>
                    {currencySymbol}
                    {item.amount.toFixed(2)}
                  </Text>
                </View>
                <Spacer height={6} />
                <View
                  style={{
                    height: 8,
                    borderRadius: 20,
                    backgroundColor: color.bg,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(0, (Math.abs(item.amount) / maxIncomeExpense) * 100))}%`,
                      height: '100%',
                      borderRadius: 20,
                      backgroundColor: item.tint,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <GradientExpandableCard
            title="By Pay Source"
            value={totalExpenses.toFixed(2)}
            expandedGradientColors={{default: ['#FFD479', '#FFAD3D']}}>
            <View style={{gap: 10}}>
              {Object.entries(cyclePaymentSources).length > 0 ? (
                Object.entries(cyclePaymentSources).map(([source, amount]) => (
                  <View
                    key={source}
                    style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text size={12} color="#000">
                      {source}
                    </Text>
                    <Text size={12} color="#000" variant="medium">
                      {currencySymbol}
                      {amount.toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text size={12} color="#000">
                  No expenses in this pay cycle yet.
                </Text>
              )}
            </View>
          </GradientExpandableCard>
          <Spacer height={14} />
          <Text size={16} variant="medium" color={color.black}>
            Expense Categories
          </Text>
          <Text size={12} color={color.tabicon}>
            Total budgeted expenses: {currencySymbol}
            {totalBudgetExpenses.toFixed(2)}
          </Text>
          <Spacer height={10} />
          {sortedCategoryEntries.length > 0 ? (
            sortedCategoryEntries.map(([category, amount]) => {
              const percent = totalBudgetExpenses
                ? Math.round((Number(amount) / totalBudgetExpenses) * 100)
                : 0;

              return (
          <View
            key={category}
            style={{
              backgroundColor: color.inputField,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
            }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text size={14} color={color.black}>
                {category}
              </Text>
              <Text size={14} variant="medium" color={color.black}>
                {currencySymbol}
                {Number(amount).toFixed(2)} ({percent}%)
              </Text>
            </View>
            <Spacer height={8} />
            <View
              style={{
                height: 7,
                borderRadius: 20,
                backgroundColor: color.bg,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  width: `${Math.min(100, (Number(amount) / maxCategoryAmount) * 100)}%`,
                  height: '100%',
                  backgroundColor: color.primary,
                }}
              />
            </View>
          </View>
              );
            })
          ) : (
            <Text size={14} color={color.tabicon}>
              No expenses added yet.
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.navigate('/mainScreens/Insights')}
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: color.primary,
              paddingVertical: heightPixel(12),
              alignItems: 'center',
              marginTop: heightPixel(6),
            }}>
            <Text size={14} variant="medium" color={color.primary}>
              View Detailed Breakdown
            </Text>
          </TouchableOpacity>
        </>
      )}
      <Spacer height={20} />

      <BottomSheet
        visible={showInsightSheet}
        onClose={() => setShowInsightSheet(false)}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(40)} />
        <View style={{gap: widthPixel(20), marginBottom: heightPixel(40)}}>
          <WalkthroughTooltip
            stepNumber={7}
            content="Click here for simulated budget"
            placement="top"
            displayDelay={1000}>
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
                setShowInsightSheet(false);
                router.navigate('/mainScreens/SimulatedBudget');
              }}>
              <Text variant="medium" size={16} color={color.black}>
                Simulated Budget
              </Text>
              <Feather name="chevron-right" size={22} color={color.walletbg} />
            </TouchableOpacity>
          </WalkthroughTooltip>
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
              setShowInsightSheet(false);
              setSelectedTabIndex(0);
              setShowFinancialSheet(true);
            }}>
            <Text variant="medium" size={16} color={color.black}>
              Financial Forecast
            </Text>
            <Feather name="chevron-right" size={22} color={color.walletbg} />
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showFinancialSheet}
        onClose={() => setShowFinancialSheet(false)}
        title="Projected Savings"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={10} />
        <View style={{gap: widthPixel(20)}}>
          <ToggleButton
            options={['By Amount', 'By Date']}
            selectedIndex={selectedTabIndex}
            onToggle={setSelectedTabIndex}
          />
          <TextInput
            title={selectedTabIndex === 0 ? 'Amount' : 'Target Date'}
            placeholder={selectedTabIndex === 0 ? '0' : 'YYYY-MM-DD'}
            placeholderTextColor={color.tabicon}
            keyboardType={selectedTabIndex === 0 ? 'numeric' : 'default'}
            useCurrencyIcon={selectedTabIndex === 0}
            inputContainerStyle={
              customInputBg ? {backgroundColor: customInputBg} : undefined
            }
          />
          <Text size={14} color={color.tabicon}>
            Forecasting will use real budget history once enough pay cycles have
            been completed.
          </Text>
        </View>
        <Spacer height={40} />
      </BottomSheet>
    </Wrapper>
  );
};

export default InsightScreen;
