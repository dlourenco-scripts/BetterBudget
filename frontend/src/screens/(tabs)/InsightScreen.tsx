import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import {
  Header,
  Spacer,
  Text,
  Wrapper,
} from '@/components';
import {CircularProgress} from '@/components/others/CircularProgress';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

const InsightScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const {currencySymbol} = useCurrency();
  const userData = useAuthStore(state => state.userData);
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userData?.email || 'default'}`;
  const isDark = colorScheme === 'dark';
  const overviewLabelColor = isDark ? '#FFFFFF' : '#333333';
  const overviewIconColor = isDark ? '#FFFFFF' : '#2E2A26';
  const [budget, setBudget] = useState<any>(null);
  const [selectedForecastPoint, setSelectedForecastPoint] = useState<any>(null);

  const currentCycle = budget?.currentCycle;
  const expenses = budget?.expenses || [];
  const cycleExpenses = currentCycle?.expenses || [];
  const currentMonthKey = dayjs().format('YYYY-MM');
  const totalIncome = Number(currentCycle?.totalIncome || 0);
  const totalExpenses = Number(currentCycle?.totalExpenses || 0);
  const cycleRemaining = totalIncome - totalExpenses;
  const cycleUsagePercent = totalIncome > 0 ? Math.min(100, (totalExpenses / totalIncome) * 100) : 0;
  const allCycles = useMemo(
    () =>
      [...(budget?.cycles || []), ...(currentCycle ? [currentCycle] : [])].filter(
        (cycle, index, cycles) => {
          const id =
            cycle?.id ||
            `${cycle?.cycleStart || cycle?.cycle_start}-${cycle?.cycleEnd || cycle?.cycle_end}`;
          return (
            cycles.findIndex(item => {
              const itemId =
                item?.id ||
                `${item?.cycleStart || item?.cycle_start}-${item?.cycleEnd || item?.cycle_end}`;
              return itemId === id;
            }) === index
          );
        },
      ),
    [budget?.cycles, currentCycle],
  );
  const currentMonthStart = dayjs(`${currentMonthKey}-01`);
  const currentMonthEnd = currentMonthStart.endOf('month');
  const currentMonthCycles = useMemo(
    () =>
      allCycles.filter((cycle: any) => {
        const start = dayjs(cycle.cycleStart || cycle.cycle_start);
        const end = dayjs(cycle.cycleEnd || cycle.cycle_end);
        return (
          start.isValid() &&
          end.isValid() &&
          start.isBefore(currentMonthEnd.add(1, 'day')) &&
          end.isAfter(currentMonthStart.subtract(1, 'day'))
        );
      }),
    [allCycles, currentMonthEnd, currentMonthStart],
  );
  const remainingMonthCycles = useMemo(
    () =>
      currentMonthCycles.filter((cycle: any) => {
        const end = dayjs(cycle.cycleEnd || cycle.cycle_end);
        return end.isValid() && end.isAfter(dayjs().subtract(1, 'day'));
      }),
    [currentMonthCycles],
  );
  const projectedRemainingMonthCycleCount = useMemo(() => {
    if (!currentCycle) {
      return Math.max(1, remainingMonthCycles.length);
    }

    const cycleStart = dayjs(currentCycle.cycleStart || currentCycle.cycle_start);
    const cycleEnd = dayjs(currentCycle.cycleEnd || currentCycle.cycle_end);
    const cycleDays = Math.max(1, cycleEnd.diff(cycleStart, 'day') + 1 || 14);
    let cursor = cycleStart.isValid() ? cycleStart : dayjs();

    let count = 0;
    while (cursor.isBefore(currentMonthEnd.add(1, 'day'))) {
      const end = cursor.add(cycleDays - 1, 'day');
      if (
        cursor.isBefore(currentMonthEnd.add(1, 'day')) &&
        end.isAfter(currentMonthStart.subtract(1, 'day'))
      ) {
        count += 1;
      }
      cursor = cursor.add(cycleDays, 'day');
    }

    return Math.max(count, remainingMonthCycles.length, 1);
  }, [currentCycle, currentMonthEnd, currentMonthStart, remainingMonthCycles.length]);
  const totalDebt = (budget?.debts || []).reduce(
    (sum: number, debt: any) => sum + Number(debt.balance || 0),
    0,
  );
  const goalAllocation = Number(currentCycle?.goalAllocation || 0);
  const isDebtGoal = String(budget?.goalType || userData?.goalType || '').toLowerCase().includes('debt');
  const activeDebts = [...(budget?.debts || [])]
    .filter((debt: any) => {
      const status = String(debt.status || 'active').toLowerCase();
      return !['archived', 'paid_off'].includes(status) && Number(debt.balance || 0) > 0;
    })
    .sort(
      (first: any, second: any) =>
        Number(first.priority || 0) - Number(second.priority || 0),
    );
  const primaryDebt = activeDebts[0];
  const totalSavings =
    Number(budget?.currentSavings || 0) +
    (budget?.cycles || []).reduce(
      (sum: number, cycle: any) => sum + Number(cycle.goalAllocation || 0),
      0,
    );
  const savingsGoal = Number(budget?.savingsGoal || userData?.savingsGoal || 0);
  const monthlySummary = useMemo(
    () => [
      {
        key: currentMonthKey,
        label: currentMonthStart.format('MMM'),
        income: totalIncome * projectedRemainingMonthCycleCount,
        expenses: totalExpenses * projectedRemainingMonthCycleCount,
      },
    ],
    [
      currentMonthKey,
      currentMonthStart,
      projectedRemainingMonthCycleCount,
      totalExpenses,
      totalIncome,
    ],
  );
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
  const monthlyUsagePercent =
    monthlyIncome > 0 ? Math.min(100, (monthlyExpenses / monthlyIncome) * 100) : 0;
  const monthRangeLabel = `${dayjs(`${currentMonthKey}-01`).format('MMM D')} - ${dayjs(`${currentMonthKey}-01`).endOf('month').format('MMM D')}`;
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
  const weeklyExpenseRows = useMemo(() => {
    const today = dayjs();
    const ranges = [
      {start: currentMonthStart, end: currentMonthStart.date(7)},
      {start: currentMonthStart.date(8), end: currentMonthStart.date(14)},
      {start: currentMonthStart.date(15), end: currentMonthStart.date(21)},
      {start: currentMonthStart.date(22), end: currentMonthEnd},
    ];
    const rows = ranges.map(range => {
      const isCurrent = today.isAfter(range.start.subtract(1, 'day')) && today.isBefore(range.end.add(1, 'day'));
      const hasCycleData = currentMonthCycles.some(cycle => {
        const start = dayjs(cycle.cycleStart || cycle.cycle_start);
        const end = dayjs(cycle.cycleEnd || cycle.cycle_end);
        return (
          start.isValid() &&
          end.isValid() &&
          start.isBefore(today.add(1, 'day')) &&
          start.isBefore(range.end.add(1, 'day')) &&
          end.isAfter(range.start.subtract(1, 'day'))
        );
      });

      return {
        label: `${range.start.format('MMM D')} - ${range.end.format('D')}`,
        planned: 0,
        actual: 0,
        start: range.start,
        end: range.end,
        isCurrent,
        hasCycleData,
      };
    });

    currentMonthCycles.forEach(cycle => {
      const start = dayjs(cycle.cycleStart || cycle.cycle_start);
      const end = dayjs(cycle.cycleEnd || cycle.cycle_end);
      if (!start.isValid() || !end.isValid() || start.isAfter(today, 'day')) {
        return;
      }

      const isCurrentCycle = cycle.id === currentCycle?.id;
      let rowIndex = -1;
      if (isCurrentCycle) {
        rowIndex = rows.findIndex(
          row =>
            row.isCurrent &&
            start.isBefore(row.end.add(1, 'day')) &&
            end.isAfter(row.start.subtract(1, 'day')),
        );
      }
      if (rowIndex < 0) {
        rowIndex = rows.findIndex(
          row =>
            start.isAfter(row.start.subtract(1, 'day')) &&
            start.isBefore(row.end.add(1, 'day')),
        );
      }
      if (rowIndex < 0) {
        rowIndex = rows.findIndex(
          row =>
            start.isBefore(row.end.add(1, 'day')) &&
            end.isAfter(row.start.subtract(1, 'day')),
        );
      }
      if (rowIndex < 0) {
        return;
      }

      const cycleExpenseRows = (cycle.expenses || []).length
        ? cycle.expenses
        : cycle.id === currentCycle?.id
          ? cycleExpenses
          : [];
      const actualAmount =
        Number(cycle.totalExpenses || cycle.total_expenses || 0) ||
        cycleExpenseRows.reduce(
          (sum: number, expense: any) => sum + Number(expense.amount || 0),
          0,
        );
      const plannedAmount =
        cycleExpenseRows.length > 0
          ? cycleExpenseRows.reduce(
              (sum: number, expense: any) => sum + Number(expense.amount || 0),
              0,
            )
          : (expenses as any[]).reduce((sum, expense) => {
              const dueDate = dayjs(expense.dueDate || expense.due_date);
              if (
                dueDate.isValid() &&
                dueDate.isAfter(start.subtract(1, 'day')) &&
                dueDate.isBefore(end.add(1, 'day'))
              ) {
                return sum + Number(expense.amount || 0);
              }
              return sum;
            }, 0);

      rows[rowIndex].planned += plannedAmount;
      rows[rowIndex].actual += actualAmount;
    });

    const currentRow = rows.find(row => row.isCurrent);
    if (currentRow && currentRow.actual <= 0 && totalExpenses > 0) {
      currentRow.actual = totalExpenses;
      currentRow.planned = totalBudgetExpenses || totalExpenses;
    }

    return rows;
  }, [
    currentCycle,
    currentMonthCycles,
    currentMonthEnd,
    currentMonthStart,
    cycleExpenses,
    expenses,
    totalBudgetExpenses,
    totalExpenses,
  ]);
  const weeklyMax = Math.max(
    ...weeklyExpenseRows.flatMap(item => [item.planned, item.actual]),
    1,
  );
  const expenseChartMax = Math.max(1500, Math.ceil(weeklyMax / 500) * 500);
  const expenseChartTicks = [
    expenseChartMax,
    expenseChartMax * 0.67,
    expenseChartMax * 0.33,
    0,
  ];
  const cycleStartDate = dayjs(currentCycle?.cycleStart || currentCycle?.cycle_start || new Date());
  const cycleEndDate = dayjs(currentCycle?.cycleEnd || currentCycle?.cycle_end || new Date());
  const cycleLengthDays = Math.max(1, cycleEndDate.diff(cycleStartDate, 'day') + 1 || 14);
  const daysLeftInCycle = Math.max(0, cycleEndDate.diff(dayjs(), 'day'));
  const forecastTitle = isDebtGoal ? 'Debt Payoff Forecast' : 'Savings Forecast';
  const forecastSubtitle = isDebtGoal
    ? 'See when your priority debt may be paid off'
    : 'See when you’ll reach your goal';
  const forecastTargetAmount = isDebtGoal
    ? Number(primaryDebt?.balance || 0)
    : savingsGoal;
  const forecastAllocationPerCycle = isDebtGoal
    ? Math.max(0, Number(primaryDebt?.minimumPayment || 0) || goalAllocation)
    : Math.max(0, goalAllocation);
  const forecastMonthsInRange = 4;
  const cyclesRemaining = forecastAllocationPerCycle > 0
    ? isDebtGoal
      ? Math.ceil(forecastTargetAmount / forecastAllocationPerCycle)
      : Math.ceil(Math.max(0, savingsGoal - totalSavings) / forecastAllocationPerCycle)
    : 0;
  const estimatedGoalDate =
    cyclesRemaining > 0
      ? cycleEndDate.add(Math.max(cyclesRemaining, 1) * cycleLengthDays, 'day')
      : !isDebtGoal && totalSavings >= savingsGoal && savingsGoal > 0
        ? dayjs()
        : null;
  const forecastMonthNumbers = useMemo(
    () => Array.from({length: forecastMonthsInRange}, (_, index) => index + 1),
    [forecastMonthsInRange],
  );
  const forecastPoints = useMemo(
    () =>
      forecastMonthNumbers.map(monthNumber => {
        const pointDate = cycleEndDate.add(monthNumber, 'month');
        const elapsedDays = Math.max(1, pointDate.diff(cycleEndDate, 'day'));
        const projectedCycleCount = Math.max(
          1,
          Math.round(elapsedDays / Math.max(cycleLengthDays, 1)),
        );
        const rawAmount = isDebtGoal
          ? Math.max(0, forecastTargetAmount - forecastAllocationPerCycle * projectedCycleCount)
          : totalSavings + forecastAllocationPerCycle * projectedCycleCount;
        const amount = isDebtGoal ? rawAmount : rawAmount;
        return {
          cycleNumber: monthNumber,
          label: pointDate.format('MMM'),
          amount,
          date: pointDate,
          rangeLabel: pointDate.format('YYYY'),
          isGoal: isDebtGoal
            ? amount <= 0
            : savingsGoal > 0 && amount >= savingsGoal,
        };
      }),
    [
      cycleEndDate,
      cycleLengthDays,
      forecastAllocationPerCycle,
      forecastMonthNumbers,
      forecastTargetAmount,
      isDebtGoal,
      savingsGoal,
      totalSavings,
    ],
  );
  const projectedRangePoint = forecastPoints[forecastPoints.length - 1];
  const forecastHasProjection =
    forecastAllocationPerCycle > 0 &&
    (isDebtGoal ? Boolean(primaryDebt) : savingsGoal > 0);
  const forecastChart = useMemo(() => {
    const width = 320;
    const height = 252;
    const left = 44;
    const right = 18;
    const top = 74;
    const bottom = 68;
    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;
    const startingAmount = isDebtGoal ? forecastTargetAmount : totalSavings;
    const goalLineAmount = isDebtGoal ? 0 : savingsGoal;
    const maxAmount = Math.max(goalLineAmount, startingAmount, ...forecastPoints.map(point => point.amount), 1);
    const minAmount = Math.min(goalLineAmount, startingAmount, ...forecastPoints.map(point => point.amount), 0);
    const scaleY = (amount: number) =>
      top + graphHeight - ((amount - minAmount) / Math.max(maxAmount - minAmount, 1)) * graphHeight;
    const scaleX = (index: number) =>
      left + (forecastPoints.length <= 1 ? 0 : (index / (forecastPoints.length - 1)) * graphWidth);
    const plottedPoints = forecastPoints.map((point, index) => ({
      ...point,
      x: scaleX(index),
      y: scaleY(point.amount),
    }));
    const linePath =
      plottedPoints.length > 0
        ? plottedPoints
            .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
            .join(' ')
        : '';

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      graphHeight,
      graphWidth,
      goalY: scaleY(goalLineAmount),
      linePath,
      points: plottedPoints,
      yLabels: [maxAmount, maxAmount * 0.66, maxAmount * 0.33, 0].map(amount =>
        Number(amount.toFixed(0)),
      ),
    };
  }, [forecastPoints, forecastTargetAmount, isDebtGoal, savingsGoal, totalSavings]);

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
      />
      <Spacer height={18} />

      <View style={styles.overviewPanel}>
        <View style={styles.overviewRingColumn}>
          <CircularProgress progress={monthlyUsagePercent} size={132} strokeWidth={9}>
            <View style={{alignItems: 'center'}}>
              <Text size={25} variant="semibold" color={overviewLabelColor}>
                {Math.round(monthlyUsagePercent)}%
              </Text>
              <Text size={12} variant="semibold" color={overviewLabelColor}>
                Used
              </Text>
            </View>
          </CircularProgress>
          <View style={styles.cycleCaption}>
            <Text size={14} variant="semibold" color="#F8AD2E">
              This Cycle
            </Text>
            <Text size={12} color="#FFFFFF">
              {monthRangeLabel}
            </Text>
          </View>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewStats}>
          <View style={styles.statRow}>
            <Feather name="layers" size={30} color={overviewIconColor} />
            <View>
              <Text size={14} variant="semibold" color={overviewLabelColor}>
                Income
              </Text>
              <Text size={19} variant="semibold" color="#F4A72D">
                + {currencySymbol}{monthlyIncome.toFixed(2)} ↑
              </Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Feather name="credit-card" size={30} color={overviewIconColor} />
            <View>
              <Text size={14} variant="semibold" color={overviewLabelColor}>
                Expenses
              </Text>
              <Text size={19} variant="semibold" color="#8F1D0C">
                - {currencySymbol}{monthlyExpenses.toFixed(2)} ↓
              </Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Feather name="dollar-sign" size={30} color={overviewIconColor} />
            <View>
              <Text size={14} variant="semibold" color={overviewLabelColor}>
                Remaining
              </Text>
              <Text
                size={19}
                variant="semibold"
                color={monthlyRemaining < 0 ? '#D92D20' : '#F4A72D'}>
                {currencySymbol}{monthlyRemaining.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <WalkthroughTooltip
        stepNumber={9}
        content="Simulated Budget lets you test a possible expense or income change without altering your real budget."
        placement="bottom"
        displayDelay={800}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.navigate('/mainScreens/SimulatedBudget')}
          style={styles.simulationCard}>
          <View style={styles.simulationIconWrap}>
            <Feather name="trending-up" size={28} color="#F8AD2E" />
          </View>
          <View style={styles.simulationCopy}>
            <Text size={16} variant="semibold" color="#FFFFFF">
              Try a simulated budget
            </Text>
            <Text size={11} color="#D7D7D7">
              See how changes to income, expenses, or savings affect your budget.
            </Text>
          </View>
          <View style={styles.simulationCta}>
            <Text size={12} variant="semibold" color="#050609">
              Start Simulation
            </Text>
          </View>
        </TouchableOpacity>
      </WalkthroughTooltip>

      <View style={styles.insightsSection}>
        <View style={styles.expenseChartCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.forecastHeaderCopy}>
              <Text size={18} variant="medium" color="#FFFFFF">
                Expenses This Cycle
              </Text>
              <Text size={12} color="#D7D7D7">
                Planned vs actual by week
              </Text>
            </View>
            <View style={styles.chartRangePill}>
              <Feather name="calendar" size={13} color="#050609" />
              <Text size={11} variant="semibold" color="#050609">
                {daysLeftInCycle} days left
              </Text>
            </View>
          </View>
          <Spacer height={12} />
          <View style={styles.expenseMetricStrip}>
            <View style={styles.expenseMetricCell}>
              <Text size={10} color="#D7D7D7" numberOfLines={1}>
                Planned
              </Text>
              <Text size={15} variant="semibold" color="#F8AD2E" numberOfLines={1}>
                {currencySymbol}{totalBudgetExpenses.toFixed(0)}
              </Text>
            </View>
            <View style={styles.expenseMetricDivider} />
            <View style={styles.expenseMetricCell}>
              <Text size={10} color="#D7D7D7" numberOfLines={1}>
                Spent
              </Text>
              <Text size={15} variant="semibold" color="#FFFFFF" numberOfLines={1}>
                {currencySymbol}{totalExpenses.toFixed(0)}
              </Text>
            </View>
            <View style={styles.expenseMetricDivider} />
            <View style={styles.expenseMetricCell}>
              <Text size={10} color="#D7D7D7" numberOfLines={1}>
                Difference
              </Text>
              <Text
                size={15}
                variant="semibold"
                color={totalBudgetExpenses - totalExpenses < 0 ? '#D92D20' : '#F8AD2E'}
                numberOfLines={1}>
                {currencySymbol}{(totalBudgetExpenses - totalExpenses).toFixed(0)}
              </Text>
            </View>
          </View>
          <Spacer height={22} />
          <View style={styles.expenseGraph}>
            <View style={styles.expenseGridLayer}>
              {expenseChartTicks.map((tick, index) => {
                const label =
                  tick >= 1000
                    ? `${currencySymbol}${(tick / 1000).toFixed(tick >= 10000 ? 0 : 1)}k`
                    : `${currencySymbol}${Math.round(tick)}`;
                return (
                  <View key={`${tick}-${index}`} style={styles.expenseGridRow}>
                    <Text size={11} color="#FFFFFF" style={styles.gridLabel}>
                      {label}
                    </Text>
                    <View style={styles.gridRule} />
                  </View>
                );
              })}
            </View>
            <View style={styles.weekBarsRow}>
              {weeklyExpenseRows.map(item => (
                <View key={item.label} style={styles.weekColumn}>
                  <View style={styles.barsWrap}>
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        {
                          height:
                            item.planned > 0
                              ? Math.max(8, (item.planned / expenseChartMax) * heightPixel(120))
                              : 0,
                        },
                      ]}
                    >
                      {item.planned > 0 && (
                        <Text
                          size={10}
                          variant="semibold"
                          color="#FFFFFF"
                          numberOfLines={1}
                          style={styles.barValueLabel}>
                          {currencySymbol}{item.planned.toFixed(0)}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        {
                          height:
                            item.actual > 0
                              ? Math.max(8, (item.actual / expenseChartMax) * heightPixel(120))
                              : 0,
                        },
                      ]}
                    >
                      {item.actual > 0 && (
                        <Text
                          size={10}
                          variant="semibold"
                          color="#FFFFFF"
                          numberOfLines={1}
                          style={styles.barValueLabel}>
                          {currencySymbol}{item.actual.toFixed(0)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.weekLabelBox}>
                    <Text size={11} color="#FFFFFF" style={{textAlign: 'center'}}>
                      {item.label}
                    </Text>
                    <Text
                      size={10}
                      variant="medium"
                      color={item.isCurrent ? '#F7931A' : 'transparent'}>
                      (Current)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#F8AD2E'}]} />
              <Text size={12} color="#FFFFFF">Planned</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#4A2D17'}]} />
              <Text size={12} color="#FFFFFF">Actual</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.navigate('/mainScreens/Insights')}
          style={styles.detailLink}>
          <View style={styles.detailIconCircle}>
            <Feather name="list" size={21} color="#F8AD2E" />
          </View>
          <View style={{flex: 1}}>
            <Text size={17} variant="semibold" color="#FFFFFF">
              View Detailed Expenses
            </Text>
            <Text size={12} color="#D7D7D7">
              See where your money is going
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.forecastCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.forecastHeaderCopy}>
              <Text size={18} variant="medium" color="#FFFFFF">
                {forecastTitle}
              </Text>
              <Text size={12} color="#D7D7D7">
                {forecastSubtitle}
              </Text>
            </View>
            <View style={styles.forecastRangePill}>
              <Text size={11} variant="semibold" color="#050609">
                4 Months
              </Text>
            </View>
          </View>
          <Spacer height={14} />
          <View style={styles.forecastSummary}>
            <View style={styles.forecastSummaryCell}>
              <Text size={9} color="#D7D7D7" numberOfLines={1}>
                {isDebtGoal ? 'Current Balance' : 'Current Savings'}
              </Text>
              <Text size={14} variant="semibold" color="#FFFFFF" numberOfLines={1}>
                {currencySymbol}
                {(isDebtGoal ? forecastTargetAmount : totalSavings).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </Text>
            </View>
            <View style={styles.forecastSummaryDivider} />
            <View style={styles.forecastSummaryCell}>
              <Text size={9} color="#D7D7D7" numberOfLines={1}>
                {isDebtGoal ? 'Per Cycle Payment' : 'Savings Goal'}
              </Text>
              <Text size={14} variant="semibold" color="#FFFFFF" numberOfLines={1}>
                {currencySymbol}
                {(isDebtGoal ? forecastAllocationPerCycle : savingsGoal).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </Text>
            </View>
            <View style={styles.forecastSummaryDivider} />
            <View style={styles.forecastSummaryCell}>
              <Text size={9} color="#D7D7D7" numberOfLines={1}>
                {isDebtGoal ? 'Estimated Payoff Date' : 'Estimated Goal Date'}
              </Text>
              <Text size={12} variant="semibold" color="#F8AD2E" numberOfLines={1}>
                {estimatedGoalDate ? estimatedGoalDate.format('MMM DD, YYYY') : '--'}
              </Text>
              <Text size={9} color="#D7D7D7" numberOfLines={1}>
                {cyclesRemaining > 0 ? `In ${cyclesRemaining} cycles` : 'No projection'}
              </Text>
            </View>
          </View>

          {!forecastHasProjection ? (
            <View style={styles.notEnoughBox}>
              <Text size={17} variant="semibold" color="#FFFFFF">
                {isDebtGoal ? 'No debt payment allocation yet' : 'No savings allocation yet'}
              </Text>
              <Text size={13} color="#D7D7D7" style={{textAlign: 'center'}}>
                {isDebtGoal
                  ? 'Add a payment amount to your priority debt to project the payoff date.'
                  : 'Add money to To Save this cycle to project when you’ll reach your savings goal.'}
              </Text>
            </View>
          ) : (
            <>
              <Text
                size={14}
                variant="semibold"
                color="#F8AD2E"
                style={styles.forecastProjectionText}>
                {isDebtGoal
                  ? `${primaryDebt?.name || 'Priority debt'} projected balance: ${currencySymbol}${Number(projectedRangePoint?.amount || 0).toLocaleString(undefined, {maximumFractionDigits: 0})} by ${projectedRangePoint?.date.format('MMM DD, YYYY')}.`
                  : `Projected savings: ${currencySymbol}${Number(projectedRangePoint?.amount || 0).toLocaleString(undefined, {maximumFractionDigits: 0})} by ${projectedRangePoint?.date.format('MMM DD, YYYY')}.`}
              </Text>
              <View style={styles.forecastChart}>
                <Svg width="100%" height={forecastChart.height} viewBox={`0 0 ${forecastChart.width} ${forecastChart.height}`}>
                  <Defs>
                    <SvgLinearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#F4A72D" stopOpacity="0.28" />
                      <Stop offset="1" stopColor="#F4A72D" stopOpacity="0.02" />
                    </SvgLinearGradient>
                  </Defs>
                  {forecastChart.yLabels.map((_, index) => {
                    const y = forecastChart.top + (index / 3) * forecastChart.graphHeight;
                    const labelAmount = forecastChart.yLabels[index];
                    const label =
                      labelAmount >= 1000
                        ? `${currencySymbol}${(labelAmount / 1000).toFixed(labelAmount >= 10000 ? 0 : 1)}k`
                        : `${currencySymbol}${labelAmount}`;
                    return (
                      <React.Fragment key={index}>
                        <SvgText
                          x={forecastChart.left - 8}
                          y={y + 4}
                          fill="#FFFFFF"
                          opacity={0.9}
                          fontSize="9"
                          textAnchor="end">
                          {label}
                        </SvgText>
                        <Line x1={forecastChart.left} x2={forecastChart.width - forecastChart.right} y1={y} y2={y} stroke="#FFFFFF" strokeOpacity={0.18} strokeDasharray="5 6" strokeWidth={1} />
                      </React.Fragment>
                    );
                  })}
                  <Line x1={forecastChart.left} x2={forecastChart.width - forecastChart.right} y1={forecastChart.goalY} y2={forecastChart.goalY} stroke="#FFFFFF" strokeOpacity={0.65} strokeDasharray="6 7" strokeWidth={1.5} />
                  <Path
                    d={`${forecastChart.linePath} L ${forecastChart.points[forecastChart.points.length - 1]?.x || forecastChart.left} ${forecastChart.height - forecastChart.bottom} L ${forecastChart.left} ${forecastChart.height - forecastChart.bottom} Z`}
                    fill="url(#forecastFill)"
                  />
                  <Path d={forecastChart.linePath} stroke="#F7931A" strokeWidth={3} strokeLinecap="round" fill="none" />
                  {forecastChart.points.map(point => (
                    <React.Fragment key={point.cycleNumber}>
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={point.isGoal ? 8 : 6}
                        fill="#F7931A"
                        stroke="#FFFFFF"
                        strokeWidth={3}
                        onPress={() => setSelectedForecastPoint(point)}
                      />
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={16}
                        fill="transparent"
                        onPress={() => setSelectedForecastPoint(point)}
                      />
                      <SvgText
                        x={point.x}
                        y={forecastChart.height - forecastChart.bottom + 20}
                        fill="#FFFFFF"
                        fontSize="8"
                        textAnchor="middle">
                        <TSpan x={point.x} dy="0">
                          {point.label}
                        </TSpan>
                        <TSpan x={point.x} dy="10" fill="#F6C979">
                          {point.rangeLabel}
                        </TSpan>
                      </SvgText>
                    </React.Fragment>
                  ))}
                  {selectedForecastPoint &&
                    (() => {
                      const bubbleWidth = 116;
                      const bubbleHeight = 50;
                      const pointRadius = selectedForecastPoint.isGoal ? 8 : 6;
                      const pointerHeight = 8;
                      const pointerGap = 3;
                      const pointerTipY = selectedForecastPoint.y - pointRadius - pointerGap;
                      const pointerBaseY = pointerTipY - pointerHeight;
                      const bubbleX = Math.min(
                        Math.max(selectedForecastPoint.x - bubbleWidth / 2, 2),
                        forecastChart.width - bubbleWidth - 2,
                      );
                      const bubbleY = Math.max(2, pointerBaseY - bubbleHeight);
                      const pointerX = selectedForecastPoint.x;
                      const calloutAmount = `${currencySymbol}${Number(selectedForecastPoint.amount).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
                      const calloutDate = selectedForecastPoint.date.format('MMM DD, YYYY');
                      return (
                        <React.Fragment key="forecast-callout">
                          <Rect
                            x={bubbleX}
                            y={bubbleY}
                            width={bubbleWidth}
                            height={bubbleHeight}
                            rx={9}
                            fill="#1F2329"
                          />
                          <Polygon
                            points={`${pointerX - 7},${pointerBaseY} ${pointerX + 7},${pointerBaseY} ${pointerX},${pointerTipY}`}
                            fill="#1F2329"
                          />
                          <SvgText
                            x={bubbleX + bubbleWidth / 2}
                            y={bubbleY + 22}
                            fill="#F8AD2E"
                            fontSize="13"
                            fontWeight="700"
                            textAnchor="middle">
                            {calloutAmount}
                          </SvgText>
                          <SvgText
                            x={bubbleX + bubbleWidth / 2}
                            y={bubbleY + 40}
                            fill="#FFFFFF"
                            fontSize="11"
                            textAnchor="middle">
                            {calloutDate}
                          </SvgText>
                        </React.Fragment>
                      );
                    })()}
                </Svg>
              </View>
              <View style={styles.forecastTip}>
                <Feather name="mouse-pointer" size={18} color="#F7931A" />
                <Text size={12} color="#FFFFFF" style={{flex: 1}}>
                  Tap any point on the chart to see projected amount and date.
                </Text>
              </View>
            </>
          )}
        </View>

      </View>
      <Spacer height={20} />
    </Wrapper>
  );
};

export default InsightScreen;

const styles = StyleSheet.create({
  overviewPanel: {
    marginHorizontal: widthPixel(16),
    marginBottom: heightPixel(22),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(12),
  },
  overviewRingColumn: {
    width: widthPixel(150),
    alignItems: 'center',
    flexShrink: 0,
  },
  cycleCaption: {
    marginTop: heightPixel(10),
    alignItems: 'center',
  },
  overviewDivider: {
    width: 2,
    height: heightPixel(172),
    borderRadius: 2,
    backgroundColor: '#F4A72D',
  },
  overviewStats: {
    flex: 1,
    minWidth: 0,
    gap: heightPixel(14),
  },
  simulationCard: {
    marginHorizontal: widthPixel(0),
    marginBottom: heightPixel(6),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 173, 46, 0.32)',
    backgroundColor: '#050609',
    paddingHorizontal: widthPixel(16),
    paddingVertical: heightPixel(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(12),
  },
  simulationIconWrap: {
    width: widthPixel(52),
    height: heightPixel(52),
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F8AD2E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 173, 46, 0.08)',
  },
  simulationCopy: {
    flex: 1,
    gap: heightPixel(4),
  },
  simulationCta: {
    borderRadius: 10,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(9),
    backgroundColor: '#F8AD2E',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
  },
  statDivider: {
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F4A72D',
  },
  insightsSection: {
    marginTop: heightPixel(8),
    marginHorizontal: widthPixel(0),
    paddingTop: heightPixel(6),
    paddingBottom: heightPixel(32),
    backgroundColor: 'transparent',
  },
  expenseChartCard: {
    borderRadius: 14,
    paddingHorizontal: widthPixel(22),
    paddingVertical: heightPixel(22),
    borderWidth: 1,
    borderColor: '#272A31',
    backgroundColor: '#050609',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(12),
  },
  expenseMetricStrip: {
    minHeight: heightPixel(54),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3038',
    backgroundColor: '#0D0F14',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: widthPixel(10),
  },
  expenseMetricCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: heightPixel(2),
  },
  expenseMetricDivider: {
    width: 1,
    height: heightPixel(30),
    backgroundColor: '#3A3D45',
  },
  daysLeftPill: {
    borderRadius: 12,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(8),
    backgroundColor: '#FFE5C0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(10),
  },
  forecastHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  calendarButton: {
    width: widthPixel(42),
    height: heightPixel(42),
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8AD2E',
  },
  chartRangePill: {
    flexShrink: 0,
    borderRadius: 10,
    paddingHorizontal: widthPixel(10),
    paddingVertical: heightPixel(6),
    backgroundColor: '#F8AD2E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(5),
  },
  forecastRangePill: {
    flexShrink: 0,
    marginRight: widthPixel(4),
    borderRadius: 10,
    paddingHorizontal: widthPixel(10),
    paddingVertical: heightPixel(6),
    backgroundColor: '#F8AD2E',
  },
  expenseGraph: {
    height: heightPixel(202),
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: heightPixel(42),
  },
  expenseGridLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingBottom: heightPixel(42),
    justifyContent: 'space-between',
  },
  expenseGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    width: widthPixel(36),
    textAlign: 'right',
    marginRight: widthPixel(8),
  },
  gridRule: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  weekBarsRow: {
    height: heightPixel(160),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: widthPixel(44),
    marginRight: widthPixel(2),
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  weekColumn: {
    flex: 1,
    maxWidth: widthPixel(88),
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barsWrap: {
    height: heightPixel(120),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: widthPixel(22),
  },
  bar: {
    width: widthPixel(18),
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
  },
  barValueLabel: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: heightPixel(6),
    width: widthPixel(58),
    left: widthPixel(-20),
    textAlign: 'center',
  },
  weekLabelBox: {
    height: heightPixel(34),
    marginTop: heightPixel(7),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  incomeBar: {
    backgroundColor: '#F8AD2E',
  },
  expenseBar: {
    backgroundColor: '#6B340B',
  },
  chartLegend: {
    marginTop: heightPixel(10),
    flexDirection: 'row',
    justifyContent: 'center',
    gap: widthPixel(24),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(7),
  },
  legendDot: {
    width: widthPixel(12),
    height: heightPixel(12),
    borderRadius: 6,
  },
  detailLink: {
    marginTop: heightPixel(12),
    marginBottom: heightPixel(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(12),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272A31',
    paddingHorizontal: widthPixel(18),
    paddingVertical: heightPixel(14),
    backgroundColor: '#050609',
  },
  detailIconCircle: {
    width: widthPixel(44),
    height: heightPixel(44),
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A21',
  },
  forecastCard: {
    borderRadius: 14,
    paddingHorizontal: widthPixel(22),
    paddingTop: heightPixel(18),
    paddingBottom: heightPixel(22),
    borderWidth: 1,
    borderColor: '#272A31',
    backgroundColor: '#050609',
  },
  forecastSummary: {
    borderWidth: 1,
    borderColor: '#2D3038',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#0D0F14',
    overflow: 'hidden',
  },
  forecastSummaryCell: {
    flex: 1,
    minHeight: heightPixel(54),
    justifyContent: 'center',
    paddingHorizontal: widthPixel(7),
    paddingVertical: heightPixel(6),
    gap: heightPixel(2),
  },
  forecastSummaryDivider: {
    width: 1,
    marginVertical: heightPixel(9),
    backgroundColor: '#3A3D45',
  },
  forecastProjectionText: {
    marginTop: heightPixel(16),
    marginBottom: heightPixel(2),
    lineHeight: heightPixel(20),
  },
  forecastLegend: {
    marginTop: heightPixel(18),
    marginBottom: heightPixel(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(18),
  },
  legendLine: {
    width: widthPixel(26),
    height: heightPixel(2),
    borderRadius: 2,
  },
  legendLineDashed: {
    width: widthPixel(26),
    height: heightPixel(2),
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFFFFF',
    opacity: 0.65,
  },
  forecastChart: {
    marginTop: heightPixel(8),
    minHeight: heightPixel(238),
    position: 'relative',
  },
  forecastCallout: {
    position: 'absolute',
    zIndex: 2,
    top: heightPixel(16),
    alignSelf: 'center',
    borderRadius: 10,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(9),
    backgroundColor: '#1F2329',
    alignItems: 'center',
  },
  forecastTip: {
    marginTop: heightPixel(10),
    borderWidth: 1,
    borderColor: '#2D3038',
    borderRadius: 12,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
    backgroundColor: '#0D0F14',
  },
  notEnoughBox: {
    marginTop: heightPixel(18),
    minHeight: heightPixel(150),
    borderWidth: 1,
    borderColor: '#2D3038',
    borderRadius: 16,
    paddingHorizontal: widthPixel(22),
    alignItems: 'center',
    justifyContent: 'center',
    gap: heightPixel(10),
    backgroundColor: '#0D0F14',
  },
  categoryPreview: {
    marginTop: heightPixel(18),
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 249, 239, 0.78)',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: heightPixel(5),
  },
});
