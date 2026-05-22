import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {AntDesign, Feather} from '@expo/vector-icons';
import {Swipeable} from 'react-native-gesture-handler';
import {Calendar} from 'react-native-calendars';
import {
  BottomSheet,
  Button,
  CustomModal,
  InfoTooltip,
  RadioList,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import CustomHeader, {Budget} from '@/components/others/CustomHeader';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {expenseCategoryGroups} from '@/constants/expenseCategories';
import {useCurrency} from '@/context/CurrencyProvider';
import {useNotifications} from '@/context/NotificationProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {
  cancelPaydayLocalNotification,
  schedulePaydayLocalNotification,
} from '@/services/localNotifications';
import {fontPixel, heightPixel, widthPixel, wp} from '@/services/responsive';
import {useAuthStore} from '@/store';

const formatOrdinalDay = (dateValue?: string) => {
  const date = dayjs(dateValue);
  if (!date.isValid()) {
    return '';
  }

  const day = date.date();
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

const formatDisplayDate = (dateValue?: string | Date | null) => {
  if (!dateValue) {
    return 'Not set';
  }

  const rawValue = dateValue instanceof Date ? dateValue.toISOString() : String(dateValue).trim();
  const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return localDate.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const date = dayjs(rawValue);
  return date.isValid() ? date.format('MMMM D, YYYY') : rawValue || 'Not set';
};

const getAdditionalIncomePayDate = (income: any, referenceDateValue?: string | dayjs.Dayjs) => {
  const anchorDate = dayjs(income?.receivedDate || income?.received_date).startOf('day');
  const referenceDate = dayjs(referenceDateValue || new Date()).startOf('day');

  if (!anchorDate.isValid() || !referenceDate.isValid()) {
    return null;
  }

  const frequency = String(income?.frequency || '').toLowerCase();
  if (frequency.includes('one')) {
    return anchorDate;
  }

  if (frequency.includes('monthly')) {
    let nextDate = anchorDate;
    while (nextDate.isBefore(referenceDate, 'day')) {
      nextDate = nextDate.add(1, 'month');
    }
    return nextDate;
  }

  const dayStep =
    frequency.includes('weekly') && !frequency.includes('bi')
      ? 7
      : frequency.includes('bi')
        ? 14
        : frequency.includes('semi')
          ? 15
          : 0;

  if (!dayStep) {
    return anchorDate;
  }

  const daysSinceAnchor = referenceDate.diff(anchorDate, 'day');
  const stepCount = Math.max(0, Math.ceil(daysSinceAnchor / dayStep));
  return anchorDate.add(stepCount * dayStep, 'day');
};

const getNextAdditionalIncomePayDate = (income: any, activeCycleId?: string) => {
  const todayPayDate = getAdditionalIncomePayDate(income, dayjs());
  const wasHandledToday =
    todayPayDate?.isSame(dayjs(), 'day') &&
    activeCycleId &&
    (hasIncomeFlag(income, `auto_added:${activeCycleId}`) ||
      hasManualPrompted(income, activeCycleId) ||
      getManualAppliedAmount(income, activeCycleId) > 0);

  return getAdditionalIncomePayDate(income, wasHandledToday ? dayjs().add(1, 'day') : dayjs());
};

const getAdditionalIncomeCyclePayDate = (income: any, cycle?: any) => {
  const payDate = getAdditionalIncomePayDate(income, cycle?.cycleStart);
  const cycleStart = dayjs(cycle?.cycleStart).startOf('day');
  const cycleEnd = dayjs(cycle?.cycleEnd).startOf('day');

  if (
    !payDate ||
    !cycleStart.isValid() ||
    !cycleEnd.isValid() ||
    payDate.isBefore(cycleStart, 'day') ||
    payDate.isAfter(cycleEnd, 'day')
  ) {
    return null;
  }

  return payDate;
};

const getAdditionalIncomeDuePayDate = (income: any, cycle?: any) => {
  const payDate = getAdditionalIncomePayDate(income, dayjs());

  if (
    !payDate ||
    !cycle?.id ||
    payDate.isAfter(dayjs(), 'day')
  ) {
    return null;
  }

  return payDate;
};

const getNextAdditionalIncomeOccurrenceAfter = (income: any, payDateValue?: string) => {
  const payDate = dayjs(payDateValue).startOf('day');
  if (!payDate.isValid()) {
    return null;
  }
  return getAdditionalIncomePayDate(income, payDate.add(1, 'day'));
};

const hasIncomeFlag = (income: any, flag: string) =>
  String(income?.notes || '').includes(flag);

const isManualAdditionalIncome = (income: any) =>
  String(income?.notes || '').includes('manual_additional_income_pending');

const isAutoAdditionalIncome = (income: any) =>
  String(income?.notes || '').includes('auto_add_enabled');

const getAdditionalIncomeMode = (income: any) =>
  isAutoAdditionalIncome(income) ? 'auto' : 'manual';

const withAdditionalIncomeMode = (notes: string | undefined, mode: 'auto' | 'manual') => {
  const cleanedNotes = String(notes || '')
    .split('|')
    .filter(
      token =>
        token &&
        token !== 'auto_add_enabled' &&
        token !== 'manual_additional_income_pending',
    );
  cleanedNotes.unshift(mode === 'auto' ? 'auto_add_enabled' : 'manual_additional_income_pending');
  return cleanedNotes.join('|');
};

const manualNotificationId = (incomeId?: string, cycleId?: string) =>
  `additional-income-manual-${incomeId || 'unknown'}-${cycleId || 'unknown'}`;

const manualPromptKey = (incomeId?: string, cycleId?: string) =>
  `${cycleId || 'unknown'}:${incomeId || 'unknown'}`;

const formatNotificationAmount = (currencySymbol: string, amount: number | string | undefined | null) =>
  `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;

const reviewedCycleStorageKey = (email: string | undefined, budgetId: string) =>
  `betterbudget.reviewedCycle.${email || 'default'}.${budgetId}`;

const getCycleIndexValue = (cycle: any) =>
  Number(cycle?.cycleIndex ?? cycle?.cycle_index ?? 0);

const getManualAppliedAmount = (income: any, cycleId?: string) => {
  if (!cycleId) {
    return 0;
  }
  const match = String(income?.notes || '').match(
    new RegExp(`manual_applied:${cycleId}:([0-9.]+)`),
  );
  return Math.max(0, Number(match?.[1] || 0));
};

const getManualRemainingAmount = (income: any, cycleId?: string) =>
  Math.max(0, Number(income?.amount || 0) - getManualAppliedAmount(income, cycleId));

const hasManualPrompted = (income: any, cycleId?: string) =>
  Boolean(cycleId && String(income?.notes || '').includes(`manual_prompted:${cycleId}`));

const isAdditionalIncomeDueToday = (payDate: dayjs.Dayjs | null) =>
  Boolean(payDate && !payDate.isAfter(dayjs(), 'day'));

const withManualAppliedAmount = (
  notes: string | undefined,
  cycleId: string,
  appliedAmount: number,
) => {
  const currentNotes = String(notes || '').trim();
  const nextToken = `manual_applied:${cycleId}:${Number(appliedAmount.toFixed(2))}`;
  const existingPattern = new RegExp(`manual_applied:${cycleId}:[0-9.]+`);

  if (existingPattern.test(currentNotes)) {
    return currentNotes.replace(existingPattern, nextToken);
  }

  return [currentNotes, nextToken].filter(Boolean).join('|');
};

const withManualPrompted = (notes: string | undefined, cycleId: string) =>
  withIncomeFlag(notes, `manual_prompted:${cycleId}`);

const withIncomeFlag = (notes: string | undefined, flag: string) => {
  const currentNotes = String(notes || '').trim();
  if (currentNotes.includes(flag)) {
    return currentNotes;
  }
  return [currentNotes, flag].filter(Boolean).join('|');
};

const distributeDebtAllocation = (debts: any[], amount: number) => {
  let remainingAllocation = Math.max(0, amount);
  return debts.reduce((next: Record<string, string>, debt: any) => {
    const debtBalance = Number(debt.balance || 0);
    const allocation = Math.min(remainingAllocation, debtBalance);
    next[debt.id] = String(Number(allocation.toFixed(2)));
    remainingAllocation -= allocation;
    return next;
  }, {});
};

const HomeScreen = () => {
  const color = useThemeColor();
  const {
    selectedBudgetId: routeSelectedBudgetId,
    openAdditionalIncomeCycleId: routeAdditionalIncomeCycleId,
  } = useLocalSearchParams<{
    selectedBudgetId?: string;
    openAdditionalIncomeId?: string;
    openAdditionalIncomeCycleId?: string;
  }>();
  const {openAdditionalIncomeId, openAdditionalIncomeCycleId} = useLocalSearchParams<{
    openAdditionalIncomeId?: string;
    openAdditionalIncomeCycleId?: string;
    openAdditionalIncomeRequestId?: string;
  }>();
  const {openAdditionalIncomeRequestId} = useLocalSearchParams<{
    openAdditionalIncomeRequestId?: string;
  }>();
  const routeOpenAdditionalIncomeId = Array.isArray(openAdditionalIncomeId)
    ? openAdditionalIncomeId[0]
    : openAdditionalIncomeId;
  const routeOpenAdditionalIncomeCycleId = Array.isArray(openAdditionalIncomeCycleId)
    ? openAdditionalIncomeCycleId[0]
    : openAdditionalIncomeCycleId;
  const routeOpenAdditionalIncomeRequestId = Array.isArray(openAdditionalIncomeRequestId)
    ? openAdditionalIncomeRequestId[0]
    : openAdditionalIncomeRequestId;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currencySymbol} = useCurrency();
  const formatWholeAmount = (amount: number | string | undefined | null) =>
    Math.round(Number(amount || 0)).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  const formatWholeCurrency = (amount: number | string | undefined | null) =>
    `${currencySymbol}${formatWholeAmount(amount)}`;
  const {addNotification, deleteNotifications, notifications} = useNotifications();
  const debtSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debtSavedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const hasSelectedInitialBudgetRef = useRef(false);
  const autoAdditionalIncomeProcessingRef = useRef<Set<string>>(new Set());
  const additionalIncomeInputRef = useRef<NativeTextInput>(null);
  const openedAdditionalIncomeNotificationRef = useRef<Set<string>>(new Set());
  const suppressedAdditionalIncomePromptRef = useRef<Set<string>>(new Set());
  const additionalIncomeSwipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const oneTimeExpenseSwipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeableRef = useRef<Swipeable | null>(null);

  const closeOpenSwipeable = useCallback(() => {
    openSwipeableRef.current?.close();
    openSwipeableRef.current = null;
  }, []);

  const suppressAdditionalIncomePrompt = useCallback((incomeId?: string, cycleId?: string) => {
    suppressedAdditionalIncomePromptRef.current.add(manualPromptKey(incomeId, cycleId));
  }, []);

  const consumeSuppressedAdditionalIncomePrompt = useCallback(
    (incomeId?: string, cycleId?: string) => {
      const key = manualPromptKey(incomeId, cycleId);
      if (!suppressedAdditionalIncomePromptRef.current.has(key)) {
        return false;
      }
      return true;
    },
    [],
  );
  const token = useAuthStore(state => state.token);
  const userData = useAuthStore(state => state.userData);
  const userEmail = userData?.email;
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userEmail || 'default'}`;
  const activeBudgetStorageKey = `betterbudget.activeBudgetId.${userEmail || 'default'}`;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [hasLoadedBudgetList, setHasLoadedBudgetList] = useState(false);
  const [budgetDetails, setBudgetDetails] = useState<any[]>([]);
  const [primaryBudgetId, setPrimaryBudgetId] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [pendingSelectedBudgetId, setPendingSelectedBudgetId] = useState<string>('');
  const [oneTimeCustomPaySources, setOneTimeCustomPaySources] = useState<string[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [debtPaymentInputs, setDebtPaymentInputs] = useState<Record<string, string>>({});
  const [savedDebtIds, setSavedDebtIds] = useState<Set<string>>(new Set());
  const [reorderingDebtId, setReorderingDebtId] = useState<string | null>(null);
  const [debtOrderIds, setDebtOrderIds] = useState<string[]>([]);
  const [paidOffDebt, setPaidOffDebt] = useState<any>(null);
  const [showAdjustDebtBalance, setShowAdjustDebtBalance] = useState(false);
  const [adjustDebtBalanceValue, setAdjustDebtBalanceValue] = useState('0');
  const [additionalIncomeAmount, setAdditionalIncomeAmount] = useState('');
  const [showAdditionalIncomeSheet, setShowAdditionalIncomeSheet] = useState(false);
  const [dismissedAdditionalIncomeIds, setDismissedAdditionalIncomeIds] = useState<string[]>([]);
  const [additionalIncomeExpandedByView, setAdditionalIncomeExpandedByView] =
    useState<Record<string, boolean>>({});
  const [missedCyclePrompt, setMissedCyclePrompt] = useState<{
    budgetId: string;
    cycleId: string;
    cycleIndex: number;
  } | null>(null);
  const activeBudget =
    budgetDetails.find(budget => budget.id === selectedBudgetId) ||
    budgetDetails[0];
  const activeBudgetId = activeBudget?.id || selectedBudgetId;
  const activeCycles = activeBudget?.cycles || [];
  const activeCycle =
    activeCycles.find((cycle: any) => cycle.id === selectedCycleId) ||
    activeBudget?.currentCycle ||
    activeCycles[0];
  const incomes = activeCycle?.incomes || [];
  const expenses = activeCycle?.expenses || [];
  const additionalIncomes = (activeBudget?.incomes || []).filter(
    (income: any) => !income.isPrimary,
  );
  const hasAdditionalIncome = additionalIncomes.length > 0;
  const additionalIncomeExpansionKey = `${activeBudgetId || 'budget'}:${
    activeCycle?.id || 'cycle'
  }`;
  const isIncomeExpanded = Boolean(
    additionalIncomeExpandedByView[additionalIncomeExpansionKey],
  );
  const currentActiveCycleId = activeBudget?.currentCycle?.id || activeCycles[0]?.id;
  const isCurrentActiveCycle = activeCycle?.id === currentActiveCycleId;
  const isPastCycle = Boolean(
    activeCycle?.cycleEnd && dayjs(activeCycle.cycleEnd).isBefore(dayjs(), 'day'),
  );
  const readOnlyPastCycleMessage = 'Past budget cycles are read-only.';
  const debts = [...(activeBudget?.debts || [])]
    .filter((debt: any) => {
      const status = String(debt.status || 'active').toLowerCase();
      return !['archived', 'paid_off'].includes(status) || isCurrentActiveCycle;
    })
    .sort(
    (first: any, second: any) =>
      Number(first.priority || 0) - Number(second.priority || 0),
    );
  const debtOrderSignature = debts.map((debt: any) => debt.id).join('|');
  const displayDebts =
    debtOrderIds.length === debts.length
      ? debtOrderIds
          .map(id => debts.find((debt: any) => debt.id === id))
          .filter(Boolean)
      : debts;

  useEffect(() => {
    if (paidOffDebt || showAdjustDebtBalance) {
      return;
    }
    const pendingPaidOffDebt = debts.find((debt: any) => {
      const status = String(debt.status || '').toLowerCase();
      return status === 'paid_off_pending' && Number(debt.balance || 0) <= 0;
    });
    if (pendingPaidOffDebt) {
      setPaidOffDebt(pendingPaidOffDebt);
    }
  }, [debts, paidOffDebt, showAdjustDebtBalance]);
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
  const isDebtGoal = String(activeBudget?.goalType || '').toLowerCase().includes('debt');
  const isSavingsGoal = String(activeBudget?.goalType || '').toLowerCase().includes('sav');
  const debtPaymentTotal = debts.reduce(
    (sum: number, debt: any) =>
      sum + Number(debtPaymentInputs[debt.id] ?? debt.minimumPayment ?? 0),
    0,
  );
  const toSaveAmount =
    isDebtGoal && debts.length > 0
      ? 0
      : Math.max(0, goalAllocation - debtPaymentTotal);
  const carryOverIn = Number(activeCycle?.carryOverIn || 0);
  const carryOverOut = Number(activeCycle?.carryOverOut || 0);
  const remaining = Number(
    activeCycle?.remainingAmount ??
      totalIncome - totalExpenses - goalAllocation - carryOverOut,
  );
  const totalSavings =
    Number(activeBudget?.currentSavings || 0) + toSaveAmount;
  const savingsGoal = Number(activeBudget?.savingsGoal || userData?.savingsGoal || 0);
  const savingsProgressPercent =
    savingsGoal > 0 ? Math.min(100, (totalSavings / savingsGoal) * 100) : 0;
  const expensesByPaymentSource = (expenses as any[]).reduce(
    (groups: Record<string, any[]>, expense: any) => {
      const paymentSource = expense.notes?.trim() || 'Unassigned';
      groups[paymentSource] = [...(groups[paymentSource] || []), expense];
      return groups;
    },
    {} as Record<string, any[]>,
  );
  const expenseSections = Object.entries(expensesByPaymentSource).map(
    ([paymentSource, sourceExpenses]) => ({
      id: paymentSource,
      title: paymentSource,
      value: sourceExpenses
        .reduce((sum, expense: any) => sum + Number(expense.amount || 0), 0)
        .toLocaleString(undefined, {maximumFractionDigits: 0}),
      paymentSource,
      items: sourceExpenses.map((expense: any) => ({
        id: expense.id,
        date: `Due: ${formatOrdinalDay(expense.dueDate)}`,
        label: expense.name,
        tag: expense.type,
        tagBg: colors.light.white,
        tagColor: colors.light.tabicon,
        raw: expense,
        amount: formatWholeAmount(expense.amount),
      })),
    }),
  );
  const paymentSourceOptions = Array.from(
    new Set(
      [
        ...oneTimeCustomPaySources,
        ...(activeBudget?.expenses || []).map((expense: any) => expense.notes?.trim()),
        ...Object.keys(expensesByPaymentSource),
      ].filter((source): source is string => !!source && source !== 'Unassigned'),
    ),
  );
  const manualAdditionalIncome = (activeBudget?.incomes || []).find((income: any) => {
    const payDate = getAdditionalIncomeDuePayDate(income, activeCycle);
    return (
      !income.isPrimary &&
      isManualAdditionalIncome(income) &&
      payDate !== null &&
      isCurrentActiveCycle &&
      isAdditionalIncomeDueToday(payDate) &&
      !hasManualPrompted(income, activeCycle?.id) &&
      getManualRemainingAmount(income, activeCycle?.id) > 0
    );
  });
  const notificationManualAdditionalIncome =
    routeOpenAdditionalIncomeId && activeCycle?.id
      ? additionalIncomes.find((income: any) => {
          return (
            income.id === routeOpenAdditionalIncomeId &&
            isManualAdditionalIncome(income) &&
            !isPastCycle &&
            (!routeOpenAdditionalIncomeCycleId ||
              routeOpenAdditionalIncomeCycleId === activeCycle.id) &&
            getManualRemainingAmount(income, activeCycle.id) > 0
          );
        })
      : null;
  const selectedManualAdditionalIncome =
    notificationManualAdditionalIncome || manualAdditionalIncome;
  const manualAdditionalIncomePromptKey = manualPromptKey(
    selectedManualAdditionalIncome?.id,
    activeCycle?.id,
  );
  const manualAdditionalIncomeRemaining = getManualRemainingAmount(
    selectedManualAdditionalIncome,
    activeCycle?.id,
  );
  const isManualAdditionalIncomeDismissed = dismissedAdditionalIncomeIds.includes(
    manualAdditionalIncomePromptKey,
  );
  const dueAutoAdditionalIncomes = additionalIncomes.filter((income: any) => {
    const payDate = getAdditionalIncomeDuePayDate(income, activeCycle);
    const cycleFlag = `auto_added:${activeCycle?.id}`;
    return (
      isAutoAdditionalIncome(income) &&
      !hasIncomeFlag(income, cycleFlag) &&
      payDate !== null &&
      isCurrentActiveCycle &&
      isAdditionalIncomeDueToday(payDate)
    );
  });

  useEffect(() => {
    if (
      !selectedManualAdditionalIncome?.id ||
      !activeCycle?.id ||
      isPastCycle ||
      !isManualAdditionalIncomeDismissed
    ) {
      return;
    }

    const existingNotification = notifications.find(
      notification =>
        notification.id === manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
    );
    const computedRemainingAmount = getManualRemainingAmount(
      selectedManualAdditionalIncome,
      activeCycle.id,
    );
    const notificationRemainingAmount = existingNotification?.payload?.amount
      ? Math.min(Number(existingNotification.payload.amount || 0), computedRemainingAmount)
      : computedRemainingAmount;

    addNotification({
      id: manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
      type: 'additional_income',
      action: 'open_additional_income',
      dedupeKey: manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
      title: 'Additional income available',
      message: `${formatNotificationAmount(currencySymbol, notificationRemainingAmount)} from ${selectedManualAdditionalIncome.name || 'Additional income'} is ready to be added to your budget.`,
      payload: {
        budgetId: activeBudgetId,
        cycleId: activeCycle?.id,
        incomeId: selectedManualAdditionalIncome.id,
        amount: notificationRemainingAmount,
        payDate: getAdditionalIncomeDuePayDate(selectedManualAdditionalIncome, activeCycle)?.format('YYYY-MM-DD'),
      },
    });
  }, [
    activeBudgetId,
    activeCycle?.id,
    addNotification,
    isManualAdditionalIncomeDismissed,
    isPastCycle,
    selectedManualAdditionalIncome?.amount,
    selectedManualAdditionalIncome?.id,
    selectedManualAdditionalIncome?.name,
    currencySymbol,
  ]);

  useEffect(() => {
    if (
      !manualAdditionalIncome?.id ||
      isPastCycle ||
      isManualAdditionalIncomeDismissed ||
      showAdditionalIncomeSheet
    ) {
      return;
    }

    if (consumeSuppressedAdditionalIncomePrompt(manualAdditionalIncome.id, activeCycle?.id)) {
      return;
    }

    setAdditionalIncomeAmount('');
    setShowAdditionalIncomeSheet(true);
  }, [
    activeCycle?.id,
    consumeSuppressedAdditionalIncomePrompt,
    isManualAdditionalIncomeDismissed,
    isPastCycle,
    manualAdditionalIncome?.id,
    showAdditionalIncomeSheet,
  ]);

  useEffect(() => {
    if (!showAdditionalIncomeSheet || !selectedManualAdditionalIncome?.id) {
      return;
    }

    const focusTimer = setTimeout(() => {
      additionalIncomeInputRef.current?.focus();
    }, 250);

    return () => clearTimeout(focusTimer);
  }, [selectedManualAdditionalIncome?.id, showAdditionalIncomeSheet]);

  useEffect(() => {
    if (
      isPastCycle ||
      !activeBudgetId ||
      !activeCycle?.id ||
      dueAutoAdditionalIncomes.length === 0
    ) {
      return;
    }

    const processingKey = `${activeCycle.id}:${dueAutoAdditionalIncomes
      .map((income: any) => income.id)
      .join('|')}`;
    if (autoAdditionalIncomeProcessingRef.current.has(processingKey)) {
      return;
    }
    autoAdditionalIncomeProcessingRef.current.add(processingKey);

    const applyAutoAdditionalIncome = async () => {
      const autoIncomeTotal = dueAutoAdditionalIncomes.reduce(
        (sum: number, income: any) => sum + Number(income.amount || 0),
        0,
      );

      try {
        const nextManualAdditionalIncome =
          Number(activeCycle.manualAdditionalIncome || 0) + autoIncomeTotal;
        const cycleResponse = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
          manualAdditionalIncome: nextManualAdditionalIncome,
        });

        if (!cycleResponse.success) {
          autoAdditionalIncomeProcessingRef.current.delete(processingKey);
          return;
        }

        await Promise.all(
          dueAutoAdditionalIncomes.map((income: any) =>
            budgetApi.updateIncome(activeBudgetId, income.id, {
              notes: withIncomeFlag(income.notes, `auto_added:${activeCycle.id}`),
            }),
          ),
        );

        await Promise.all(
          dueAutoAdditionalIncomes.map((income: any) =>
            addNotification({
              type: 'additional_income',
              action: 'view',
              dedupeKey: `additional-income-auto-${income.id}-${activeCycle.id}`,
              title: 'Additional income received',
              message: `${formatNotificationAmount(currencySymbol, income.amount)} from ${income.name || 'Additional income'} was automatically added to your budget.`,
              payload: {
                budgetId: activeBudgetId,
                cycleId: activeCycle.id,
                incomeId: income.id,
                amount: Number(income.amount || 0),
              },
            }),
          ),
        );

        await loadBudgets();
      } catch (error) {
        autoAdditionalIncomeProcessingRef.current.delete(processingKey);
        console.error('Unable to auto-add additional income:', error);
      }
    };

    applyAutoAdditionalIncome();
  }, [
    activeBudgetId,
    activeCycle?.id,
    activeCycle?.manualAdditionalIncome,
    addNotification,
    dueAutoAdditionalIncomes,
    isPastCycle,
    currencySymbol,
  ]);

  useEffect(() => {
    if (
      !notificationManualAdditionalIncome?.id ||
      !routeOpenAdditionalIncomeId ||
      routeOpenAdditionalIncomeId !== notificationManualAdditionalIncome.id ||
      isPastCycle
    ) {
      return;
    }

    if (
      consumeSuppressedAdditionalIncomePrompt(
        notificationManualAdditionalIncome.id,
        activeCycle?.id,
      )
    ) {
      return;
    }

    const openKey = `${activeCycle?.id || 'unknown'}:${notificationManualAdditionalIncome.id}`;
    openedAdditionalIncomeNotificationRef.current.add(openKey);
    setAdditionalIncomeAmount('');
    setShowAdditionalIncomeSheet(true);
  }, [
    activeCycle?.id,
    consumeSuppressedAdditionalIncomePrompt,
    isPastCycle,
    notificationManualAdditionalIncome?.id,
    routeOpenAdditionalIncomeId,
    routeOpenAdditionalIncomeRequestId,
  ]);

  useEffect(() => {
    if (
      !activeCycle?.cycleStart ||
      isPastCycle
    ) {
      return;
    }

    const reminderTime = String(userData.paydayReminderTime || '09:00');
    const [hours = '9', minutes = '0'] = reminderTime.split(':');
    const reminderDate = dayjs(activeCycle.cycleStart)
      .hour(Number(hours))
      .minute(Number(minutes))
      .second(0)
      .millisecond(0);
    const reminderId = `${activeBudgetId}-${activeCycle.id}`;

    if (!userData?.paydayReminderEnabled) {
      cancelPaydayLocalNotification(reminderId).catch(error => {
        console.error('Unable to cancel payday reminder:', error);
      });
      return;
    }

    schedulePaydayLocalNotification(
      reminderId,
      reminderDate.toDate(),
    ).catch(error => {
      console.error('Unable to schedule payday reminder:', error);
    });

    if (!dayjs().isSame(reminderDate, 'day') || dayjs().isBefore(reminderDate)) {
      return;
    }

    addNotification({
      type: 'payday_reminder',
      dedupeKey: `payday-reminder-${reminderId}`,
      title: 'Payday reminder',
      message: 'It’s payday! Time to check your budget and plan ahead.',
      payload: {
        budgetId: activeBudgetId,
        cycleId: activeCycle.id,
      },
    });
  }, [
    activeBudgetId,
    activeCycle?.cycleStart,
    activeCycle?.id,
    addNotification,
    isPastCycle,
    userData?.paydayReminderEnabled,
    userData?.paydayReminderTime,
  ]);

  const handleBudgetSelect = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    const nextBudget = budgetDetails.find(budget => budget.id === budgetId);
    const nextCycle = nextBudget?.currentCycle || nextBudget?.cycles?.[0];
    if (nextCycle) {
      setSelectedCycleId(nextCycle.id);
      setDate(dayjs(nextCycle.cycleStart));
    }
  };

  useEffect(() => {
    if (!activeBudgetId) {
      return;
    }
    AsyncStorage.setItem(activeBudgetStorageKey, activeBudgetId).catch(error => {
      console.error('Unable to store active budget id:', error);
    });
  }, [activeBudgetId, activeBudgetStorageKey]);

  const handlePrimaryBudgetChange = async (budgetId: string) => {
    setPrimaryBudgetId(budgetId);
    await AsyncStorage.setItem(primaryBudgetStorageKey, budgetId);
  };

  const handleBudgetRename = async (budgetId: string, name: string) => {
    try {
      const response = await budgetApi.update(budgetId, {name});
      if (!response.success) {
        Alert.alert('Unable to rename budget', response.message || 'Please try again.');
        return false;
      }

      await loadBudgets();
      return true;
    } catch (error: any) {
      Alert.alert('Unable to rename budget', error?.message || 'Please try again.');
      return false;
    }
  };

  const handleAutoFillChange = async (enabled: boolean) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId) {
      return;
    }

    try {
      await budgetApi.update(activeBudgetId, {autoFillEnabled: enabled});
      if (!enabled && activeCycle?.id) {
        await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
          goalAllocation: debtPaymentTotal,
        });
      }
      await loadBudgets();
    } catch (error) {
      console.error('Unable to update auto fill:', error);
    }
  };

  const handleSavingsUpdate = async (values: {currentSavings?: number; savingsGoal?: number}) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId) {
      return;
    }

    try {
      await budgetApi.update(activeBudgetId, values);
      await loadBudgets();
    } catch (error) {
      console.error('Unable to update savings:', error);
    }
  };

  const handleIncomeUpdate = async (amount: number, applyToAll: boolean) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return false;
    }
    if (!activeBudgetId || !activeCycle?.id) {
      return false;
    }

    try {
      if (!Number.isFinite(amount)) {
        Alert.alert('Invalid income', 'Income must be a valid number.');
        return false;
      }
      if (amount < 0) {
        Alert.alert('Invalid income', 'Income cannot be negative.');
        return false;
      }
      if (amount === 0) {
        Alert.alert('Invalid income', 'Please enter an income amount greater than 0.');
        return false;
      }

      const carryOverOut = Number(activeCycle.carryOverOut || 0);
      if (amount < carryOverOut) {
        Alert.alert('Invalid income', 'Income cannot be less than the Carry Over amount.');
        return false;
      }

      const nextRemaining =
        amount +
        Number(activeCycle.extraIncome || 0) +
        Number(activeCycle.manualAdditionalIncome || 0) +
        Number(activeCycle.carryOverIn || 0) -
        totalExpenses -
        Number(activeCycle.goalAllocation || 0) -
        carryOverOut;
      const shouldWarnCarryOverNegative = carryOverOut > 0 && nextRemaining < 0;

      console.log('[EditIncome] submitting income update', {
        activeBudgetId,
        activeCycleId: activeCycle.id,
        amount,
        payload: applyToAll ? {netPay: amount} : {baseIncome: amount},
        activeCycleCarryOverOut: activeCycle.carryOverOut,
        activeCycleBaseIncome: activeCycle.baseIncome,
      });

      const response = applyToAll
        ? await budgetApi.update(activeBudgetId, {netPay: amount})
        : await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {baseIncome: amount});

      if (!response.success) {
        Alert.alert(
          'Unable to update income',
          response.message || 'Please try again.',
        );
        return false;
      }

      const updatedCycle = !applyToAll ? response.data : null;
      const patchCycleIncome = (cycle: any) => ({
        ...cycle,
        ...(updatedCycle && cycle.id === activeCycle.id ? updatedCycle : {}),
        baseIncome: amount,
        totalIncome:
          updatedCycle?.id === cycle.id
            ? updatedCycle.totalIncome
            : amount +
              Number(cycle.extraIncome || 0) +
              Number(cycle.manualAdditionalIncome || 0) +
              Number(cycle.carryOverIn || 0),
      });
      setBudgetDetails(previous =>
        previous.map(budget =>
          budget.id === activeBudgetId
            ? {
                ...budget,
                netPay: applyToAll ? amount : budget.netPay,
                currentCycle:
                  budget.currentCycle?.id === activeCycle.id
                    ? patchCycleIncome(budget.currentCycle)
                    : budget.currentCycle,
                cycles: (budget.cycles || []).map((cycle: any) => {
                  if (applyToAll) {
                    if (dayjs(cycle.cycleEnd).isBefore(dayjs(), 'day')) {
                      return cycle;
                    }
                    return {
                      ...cycle,
                      baseIncome: amount,
                      totalIncome:
                        amount +
                        Number(cycle.extraIncome || 0) +
                        Number(cycle.manualAdditionalIncome || 0) +
                        Number(cycle.carryOverIn || 0),
                    };
                  }

                  if (cycle.id !== activeCycle.id) {
                    return cycle;
                  }

                  return patchCycleIncome(cycle);
                }),
                incomes: (budget.incomes || []).map((income: any) =>
                  applyToAll && income.isPrimary ? {...income, amount} : income,
                ),
              }
            : budget,
        ),
      );
      await loadBudgets();
      if (shouldWarnCarryOverNegative) {
        Alert.alert(
          'Carry over warning',
          'Carry over causes this budget to go negative. Adjust carry over if needed.',
        );
      }
      return true;
    } catch (error: any) {
      Alert.alert('Unable to update income', error?.message || 'Please try again.');
      return false;
    }
  };

  const handleAddFromSavings = async (amount: number) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !activeCycle?.id) {
      return;
    }

    const currentSavingsAmount = Number(activeBudget?.currentSavings || 0);
    if (amount > currentSavingsAmount) {
      Alert.alert('Not enough savings', 'Amount cannot exceed your current savings.');
      return;
    }

    try {
      const nextBaseIncome = Number(activeCycle?.baseIncome || totalIncome || 0) + amount;
      const [savingsResponse, incomeResponse] = await Promise.all([
        budgetApi.update(activeBudgetId, {
          currentSavings: Math.max(0, currentSavingsAmount - amount),
        }),
        budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
          baseIncome: nextBaseIncome,
        }),
      ]);

      if (!savingsResponse.success || !incomeResponse.success) {
        Alert.alert('Unable to add from savings', 'Please try again.');
        return;
      }

      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to add from savings', error?.message || 'Please try again.');
    }
  };

  const openEditAdditionalIncome = (income: any) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    setEditingAdditionalIncome(income);
    setEditAdditionalIncomeName(income.name || '');
    setEditAdditionalIncomeAmount(
      Number(income.amount || 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
    );
    setEditAdditionalIncomeFrequency(income.frequency || 'Weekly');
    setEditAdditionalIncomeMode(getAdditionalIncomeMode(income));
    setEditAdditionalIncomePayDate(
      dayjs(income.receivedDate || income.received_date).isValid()
        ? dayjs(income.receivedDate || income.received_date).format('YYYY-MM-DD')
        : '',
    );
  };

  const handleSaveAdditionalIncome = async () => {
    if (!activeBudgetId || !editingAdditionalIncome?.id) {
      Alert.alert('Unable to update income', 'No budget or income was selected.');
      return;
    }

    const amount = Number(String(editAdditionalIncomeAmount || '').replace(/,/g, ''));
    if (
      !editAdditionalIncomeName.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !editAdditionalIncomePayDate
    ) {
      Alert.alert('Missing details', 'Enter an income name, amount, frequency, and next pay date.');
      return;
    }

    const editedIncomeId = editingAdditionalIncome.id;
    const editedCycleId = activeCycle?.id;
    const suppressedPromptKey = manualPromptKey(editedIncomeId, editedCycleId);
    suppressAdditionalIncomePrompt(editedIncomeId, editedCycleId);

    try {
      const nextNotes = withAdditionalIncomeMode(
        editingAdditionalIncome.notes,
        editAdditionalIncomeMode,
      );
      const response = await budgetApi.updateIncome(
        activeBudgetId,
        editedIncomeId,
        {
          name: editAdditionalIncomeName.trim(),
          amount,
          frequency: editAdditionalIncomeFrequency,
          receivedDate: editAdditionalIncomePayDate,
          notes: nextNotes,
        },
      );

      if (!response.success) {
        Alert.alert('Unable to update income', response.message || 'Please try again.');
        return;
      }

      const savedIncome = response.data
        ? {...response.data, notes: response.data.notes || nextNotes}
        : {
            ...editingAdditionalIncome,
            name: editAdditionalIncomeName.trim(),
            amount,
            frequency: editAdditionalIncomeFrequency,
            receivedDate: editAdditionalIncomePayDate,
            notes: nextNotes,
          };
      setBudgetDetails(previous =>
        previous.map(budget =>
          budget.id === activeBudgetId
            ? {
                ...budget,
                incomes: (budget.incomes || []).map((income: any) =>
                  income.id === editedIncomeId ? savedIncome : income,
                ),
                currentCycle: budget.currentCycle
                  ? {
                      ...budget.currentCycle,
                      incomes: (budget.currentCycle.incomes || []).map((income: any) =>
                        income.id === editedIncomeId ? savedIncome : income,
                      ),
                    }
                  : budget.currentCycle,
                cycles: (budget.cycles || []).map((cycle: any) => ({
                  ...cycle,
                  incomes: (cycle.incomes || []).map((income: any) =>
                    income.id === editedIncomeId ? savedIncome : income,
                  ),
                })),
              }
            : budget,
        ),
      );
      setEditingAdditionalIncome(null);
      setEditAdditionalIncomeName('');
      setEditAdditionalIncomeAmount('');
      setEditAdditionalIncomeFrequency('Weekly');
      setEditAdditionalIncomeMode('manual');
      setEditAdditionalIncomePayDate('');
      await loadBudgets();
      setTimeout(() => {
        suppressedAdditionalIncomePromptRef.current.delete(suppressedPromptKey);
      }, 1000);
    } catch (error: any) {
      suppressedAdditionalIncomePromptRef.current.delete(suppressedPromptKey);
      Alert.alert('Unable to update income', error?.message || 'Please try again.');
    }
  };

  const handleAdditionalIncomeModeToggle = async (enabled: boolean) => {
    if (!activeBudgetId || !editingAdditionalIncome?.id) {
      setEditAdditionalIncomeMode(enabled ? 'auto' : 'manual');
      return;
    }

    const nextMode = enabled ? 'auto' : 'manual';
    const previousMode = editAdditionalIncomeMode;
    const previousNotes = editingAdditionalIncome.notes;
    const nextNotes = withAdditionalIncomeMode(previousNotes, nextMode);

    setEditAdditionalIncomeMode(nextMode);
    setEditingAdditionalIncome((previous: any) =>
      previous ? {...previous, notes: nextNotes} : previous,
    );
    setBudgetDetails(previous =>
      previous.map(budget => ({
        ...budget,
        incomes: (budget.incomes || []).map((income: any) =>
          income.id === editingAdditionalIncome.id ? {...income, notes: nextNotes} : income,
        ),
      })),
    );

    try {
      const response = await budgetApi.updateIncome(activeBudgetId, editingAdditionalIncome.id, {
        notes: nextNotes,
      });

      if (!response.success) {
        throw new Error(response.message || 'Please try again.');
      }

      const savedIncome = response.data
        ? {...response.data, notes: response.data.notes || nextNotes}
        : {...editingAdditionalIncome, notes: nextNotes};
      setEditingAdditionalIncome(savedIncome);
      setEditAdditionalIncomeMode(getAdditionalIncomeMode(savedIncome));

      if (activeCycle?.id && nextMode === 'auto') {
        await deleteNotifications([manualNotificationId(editingAdditionalIncome.id, activeCycle.id)]);
      }
      await loadBudgets();
    } catch (error: any) {
      setEditAdditionalIncomeMode(previousMode);
      setEditingAdditionalIncome((previous: any) =>
        previous ? {...previous, notes: previousNotes} : previous,
      );
      setBudgetDetails(previous =>
        previous.map(budget => ({
          ...budget,
          incomes: (budget.incomes || []).map((income: any) =>
            income.id === editingAdditionalIncome.id
              ? {...income, notes: previousNotes}
              : income,
          ),
        })),
      );
      Alert.alert('Unable to update add method', error?.message || 'Please try again.');
    }
  };

  const handleDeleteAdditionalIncome = (income: any) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (income.isPrimary) {
      Alert.alert('Primary income locked', 'Primary income cannot be deleted.');
      return;
    }
    if (!activeBudgetId || !income?.id) {
      return;
    }

    Alert.alert(
      'Delete additional income?',
      `This will remove ${income.name || 'this income'} from this budget.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await budgetApi.deleteIncome(activeBudgetId, income.id);
              if (!response.success && response.status !== 204) {
                Alert.alert('Unable to delete income', response.message || 'Please try again.');
                return;
              }
              await loadBudgets();
            } catch (error: any) {
              Alert.alert('Unable to delete income', error?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleApplyAdditionalIncome = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return false;
    }
    if (!activeBudgetId || !activeCycle?.id || !selectedManualAdditionalIncome?.id) {
      return false;
    }

    const amount = Number(additionalIncomeAmount || 0);
    const availableAmount = manualAdditionalIncomeRemaining;
    if (amount <= 0 || amount > availableAmount) {
      Alert.alert('Invalid amount', `Enter an amount between ${currencySymbol}0 and ${currencySymbol}${availableAmount.toFixed(2)}.`);
      return false;
    }

    try {
      const nextManualAdditionalIncome =
        Number(activeCycle.manualAdditionalIncome || 0) + amount;
      const cycleResponse = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
        manualAdditionalIncome: nextManualAdditionalIncome,
      });
      if (!cycleResponse.success) {
        Alert.alert('Unable to add income', cycleResponse.message || 'Please try again.');
        return false;
      }

      const nextAppliedAmount =
        getManualAppliedAmount(selectedManualAdditionalIncome, activeCycle.id) + amount;
      const nextRemainingAmount = Math.max(
        0,
        Number(selectedManualAdditionalIncome.amount || 0) - nextAppliedAmount,
      );
      await budgetApi.updateIncome(activeBudgetId, selectedManualAdditionalIncome.id, {
        notes: withManualPrompted(
          withManualAppliedAmount(
            selectedManualAdditionalIncome.notes,
            activeCycle.id,
            nextAppliedAmount,
          ),
          activeCycle.id,
        ),
      });
      if (nextRemainingAmount <= 0) {
        await deleteNotifications([
          manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
        ]);
      } else {
        await addNotification({
          id: manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
          type: 'additional_income',
          action: 'open_additional_income',
          dedupeKey: manualNotificationId(selectedManualAdditionalIncome.id, activeCycle.id),
          title: 'Additional income available',
          message: `${formatNotificationAmount(currencySymbol, nextRemainingAmount)} from ${selectedManualAdditionalIncome.name || 'Additional income'} is still available to add.`,
          payload: {
            budgetId: activeBudgetId,
            cycleId: activeCycle.id,
            incomeId: selectedManualAdditionalIncome.id,
            amount: nextRemainingAmount,
            payDate: getAdditionalIncomeDuePayDate(selectedManualAdditionalIncome, activeCycle)?.format('YYYY-MM-DD'),
          },
        });
      }
      await addNotification({
        type: 'additional_income',
        action: 'view',
        dedupeKey: `additional-income-manual-added-${selectedManualAdditionalIncome.id}-${activeCycle.id}-${Date.now()}`,
        title: 'Additional income added',
        message: `${formatNotificationAmount(currencySymbol, amount)} from ${selectedManualAdditionalIncome.name || 'Additional income'} was added to your budget.`,
        payload: {
          budgetId: activeBudgetId,
          cycleId: activeCycle.id,
          incomeId: selectedManualAdditionalIncome.id,
          amount,
        },
      });
      setAdditionalIncomeAmount('');
      setDismissedAdditionalIncomeIds(previous => [
        ...new Set([
          ...previous.filter(id => id !== manualAdditionalIncomePromptKey),
          manualAdditionalIncomePromptKey,
        ]),
      ]);
      await loadBudgets();
      return true;
    } catch (error: any) {
      Alert.alert('Unable to add income', error?.message || 'Please try again.');
      return false;
    }
  };

  const dismissAdditionalIncomePrompt = () => {
    if (!selectedManualAdditionalIncome?.id) {
      return;
    }
    setDismissedAdditionalIncomeIds(previous => [
      ...new Set([...previous, manualAdditionalIncomePromptKey]),
    ]);
    if (activeCycle?.id) {
      const notificationId = manualNotificationId(
        selectedManualAdditionalIncome.id,
        activeCycle.id,
      );
      const existingNotification = notifications.find(
        notification => notification.id === notificationId,
      );
      budgetApi.updateIncome(activeBudgetId, selectedManualAdditionalIncome.id, {
        notes: withManualPrompted(selectedManualAdditionalIncome.notes, activeCycle.id),
      }).catch(error => {
        console.error('Unable to mark additional income prompt dismissed:', error);
      });
      addNotification({
        id: notificationId,
        type: 'additional_income',
        action: 'open_additional_income',
        dedupeKey: notificationId,
        title: 'Additional income available',
        message: `${formatNotificationAmount(currencySymbol, manualAdditionalIncomeRemaining)} from ${selectedManualAdditionalIncome.name || 'Additional income'} is ready to be added to your budget.`,
        isRead: existingNotification?.isRead ?? Boolean(notificationManualAdditionalIncome),
        payload: {
          budgetId: activeBudgetId,
          cycleId: activeCycle.id,
          incomeId: selectedManualAdditionalIncome.id,
          amount: manualAdditionalIncomeRemaining,
          payDate: getAdditionalIncomeDuePayDate(selectedManualAdditionalIncome, activeCycle)?.format('YYYY-MM-DD'),
        },
      });
    }
  };

  const closeAdditionalIncomePrompt = () => {
    dismissAdditionalIncomePrompt();
    setShowAdditionalIncomeSheet(false);
  };

  const handleDebtPaymentChange = (debt: any, nextValue: string) => {
    const sanitized = nextValue
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setDebtPaymentInputs(prev => ({
      ...prev,
      [debt.id]: sanitized,
    }));
  };

  const saveDebtPayment = async (debt: any, valueOverride?: string) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !activeCycle?.id) {
      return;
    }

    const sanitized = (valueOverride ?? debtPaymentInputs[debt.id] ?? '0')
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    const nextInputs: Record<string, string> = {
      ...debtPaymentInputs,
      [debt.id]: sanitized,
    };
    const nextGoalAllocation = debts.reduce(
      (sum: number, item: any) => sum + Number(nextInputs[item.id] || 0),
      0,
    ) + toSaveAmount;

    setDebtPaymentInputs(nextInputs);
    if (debtSaveTimers.current[debt.id]) {
      clearTimeout(debtSaveTimers.current[debt.id]);
    }

    debtSaveTimers.current[debt.id] = setTimeout(async () => {
      try {
        const cycleResponse = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
          goalAllocation: nextGoalAllocation,
          debtPayments: Object.fromEntries(
            Object.entries(nextInputs).map(([debtId, value]) => [debtId, Number(value || 0)]),
          ),
        });

        if (!cycleResponse.success) {
          Alert.alert('Unable to update budget total', cycleResponse.message || 'Please try again.');
          return;
        }

        await loadBudgets();
        setSavedDebtIds(prev => new Set(prev).add(debt.id));
        if (debtSavedTimers.current[debt.id]) {
          clearTimeout(debtSavedTimers.current[debt.id]);
        }
        debtSavedTimers.current[debt.id] = setTimeout(() => {
          setSavedDebtIds(prev => {
            const next = new Set(prev);
            next.delete(debt.id);
            return next;
          });
        }, 1000);
      } catch (error: any) {
        Alert.alert('Unable to save debt amount', error?.message || 'Please try again.');
      }
    }, 0);
  };

  const markDebtAsPaidOff = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !paidOffDebt?.id) {
      return;
    }

    try {
      const response = await budgetApi.updateDebt(activeBudgetId, paidOffDebt.id, {
        balance: 0,
        minimumPayment: 0,
        status: 'paid_off',
      });
      if (!response.success) {
        Alert.alert('Unable to mark paid off', response.message || 'Please try again.');
        return;
      }
      setPaidOffDebt(null);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to mark paid off', error?.message || 'Please try again.');
    }
  };

  const deletePaidOffDebt = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !paidOffDebt?.id) {
      return;
    }

    try {
      const response = await budgetApi.deleteDebt(activeBudgetId, paidOffDebt.id);
      if (!response.success) {
        Alert.alert('Unable to delete debt', response.message || 'Please try again.');
        return;
      }
      setPaidOffDebt(null);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to delete debt', error?.message || 'Please try again.');
    }
  };

  const openAdjustDebtBalance = () => {
    setAdjustDebtBalanceValue(String(Number(paidOffDebt?.balance || 0)));
    setShowAdjustDebtBalance(true);
  };

  const saveAdjustedDebtBalance = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !paidOffDebt?.id) {
      return;
    }

    const nextBalance = Number(adjustDebtBalanceValue || 0);
    if (Number.isNaN(nextBalance) || nextBalance < 0) {
      Alert.alert('Invalid balance', 'Enter a balance of 0 or more.');
      return;
    }

    try {
      const response = await budgetApi.updateDebt(activeBudgetId, paidOffDebt.id, {
        balance: nextBalance,
        status: nextBalance <= 0 ? 'paid_off_pending' : 'active',
      });
      if (!response.success) {
        Alert.alert('Unable to adjust balance', response.message || 'Please try again.');
        return;
      }
      setShowAdjustDebtBalance(false);
      setPaidOffDebt(nextBalance <= 0 ? {...paidOffDebt, balance: 0} : null);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to adjust balance', error?.message || 'Please try again.');
    }
  };

  const saveDebtPriorityOrder = async (orderedDebts: any[]) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || orderedDebts.length < 2) {
      return;
    }

    setDebtOrderIds(orderedDebts.map(debt => debt.id));
    setReorderingDebtId(orderedDebts[0]?.id || null);

    try {
      await Promise.all(
        orderedDebts.map((debt: any, index: number) =>
          budgetApi.updateDebt(activeBudgetId, debt.id, {priority: index + 1}),
        ),
      );
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to reorder debt', error?.message || 'Please try again.');
      setDebtOrderIds(debts.map((debt: any) => debt.id));
    } finally {
      setReorderingDebtId(null);
    }
  };

  const moveDebtOneRow = (fromIndex: number, direction: -1 | 1) => {
    const targetIndex = fromIndex + direction;
    if (targetIndex < 0 || targetIndex >= displayDebts.length) {
      return;
    }

    const nextOrder = [...displayDebts];
    const [movedDebt] = nextOrder.splice(fromIndex, 1);
    if (!movedDebt) {
      return;
    }
    nextOrder.splice(targetIndex, 0, movedDebt);
    saveDebtPriorityOrder(nextOrder);
  };

  const loadBudgets = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await budgetApi.list();
      if (response.success === false || !Array.isArray(response.data)) {
        console.warn('Unable to load budget list:', response.message || 'Invalid budget response.');
        return;
      }
      const budgetList = response.data || [];
      setHasLoadedBudgetList(true);
      const budgetSummaries = budgetList.map((budget: any) => ({
        id: budget.id,
        name: budget.name,
      }));
      setBudgets(budgetSummaries);

      if (budgetList.length === 0) {
        setBudgetDetails([]);
        setSelectedBudgetId('');
        setSelectedCycleId('');
        setPrimaryBudgetId('');
        setHasLoadedBudgetList(true);
        return;
      }

      const storedPrimaryBudgetId = await AsyncStorage.getItem(primaryBudgetStorageKey);
      const shouldPreferStoredPrimaryOnLoad =
        !hasSelectedInitialBudgetRef.current && !pendingSelectedBudgetId;
      const selectedId =
        pendingSelectedBudgetId &&
        budgetList.some((budget: any) => budget.id === pendingSelectedBudgetId)
          ? pendingSelectedBudgetId
          : shouldPreferStoredPrimaryOnLoad &&
              storedPrimaryBudgetId &&
              budgetList.some((budget: any) => budget.id === storedPrimaryBudgetId)
            ? storedPrimaryBudgetId
          : selectedBudgetId && budgetList.some((budget: any) => budget.id === selectedBudgetId)
          ? selectedBudgetId
          : storedPrimaryBudgetId &&
              budgetList.some((budget: any) => budget.id === storedPrimaryBudgetId)
            ? storedPrimaryBudgetId
            : budgetList[0]?.id || '';
      const nextPrimaryId =
        storedPrimaryBudgetId &&
        budgetList.some((budget: any) => budget.id === storedPrimaryBudgetId)
          ? storedPrimaryBudgetId
          : budgetList[0]?.id || '';

      setSelectedBudgetId(selectedId);
      if (pendingSelectedBudgetId && selectedId === pendingSelectedBudgetId) {
        setPendingSelectedBudgetId('');
      }
      setPrimaryBudgetId(nextPrimaryId);
      hasSelectedInitialBudgetRef.current = true;

      const details = (
        await Promise.all(
        budgetList.map(async (budget: any) => {
          const detailResponse = await budgetApi.get(budget.id);
          return detailResponse.success && detailResponse.data ? detailResponse.data : null;
        }),
        )
      )
        .filter(Boolean)
        .sort((a: any, b: any) => dayjs(a.cycleStart).valueOf() - dayjs(b.cycleStart).valueOf());

      if (details.length === 0) {
        console.error('Unable to load budget details.');
        return;
      }

      setBudgetDetails(details);

      const selectedBudget = details.find((budget: any) => budget.id === selectedId) || details[0];
      const selectedDebts = selectedBudget?.debts || [];
      const routeCycleId = Array.isArray(routeAdditionalIncomeCycleId)
        ? routeAdditionalIncomeCycleId[0]
        : routeAdditionalIncomeCycleId;
      const selectedCycle =
        selectedBudget?.cycles?.find((cycle: any) => cycle.id === routeCycleId) ||
        selectedBudget?.cycles?.find((cycle: any) => cycle.id === selectedCycleId) ||
        selectedBudget?.currentCycle ||
        selectedBudget?.cycles?.[0];
      const selectedIsDebtGoal = String(selectedBudget?.goalType || '')
        .toLowerCase()
        .includes('debt');
      const selectedGoalAllocation = Number(selectedCycle?.goalAllocation || 0);
      const selectedDebtPayments = selectedCycle?.debtPayments || {};
      const orderedSelectedDebts = [...selectedDebts].sort(
        (first: any, second: any) =>
          Number(first.priority || 0) - Number(second.priority || 0),
      );
      setDebtPaymentInputs(
        selectedIsDebtGoal && selectedBudget?.autoFillEnabled && orderedSelectedDebts.length > 0
          ? distributeDebtAllocation(orderedSelectedDebts, selectedGoalAllocation)
          : orderedSelectedDebts.reduce((next: Record<string, string>, debt: any) => {
              next[debt.id] = String(Number(selectedDebtPayments[debt.id] || 0));
              return next;
            }, {}),
      );
      const nextCycle =
        selectedCycle;
      if (nextCycle) {
        setSelectedCycleId(nextCycle.id);
        setDate(dayjs(nextCycle.cycleStart));
      }
    } catch (error) {
      console.warn('Unable to load budgets:', error);
    }
  }, [
    pendingSelectedBudgetId,
    primaryBudgetStorageKey,
    routeAdditionalIncomeCycleId,
    selectedBudgetId,
    selectedCycleId,
    token,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
      return () => {
        closeOpenSwipeable();
      };
    }, [closeOpenSwipeable, loadBudgets]),
  );

  useEffect(
    () => () => {
      Object.values(debtSaveTimers.current).forEach(clearTimeout);
      Object.values(debtSavedTimers.current).forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (budgetDetails.length === 0 || notifications.length === 0) {
      return;
    }

    const budgetsById = budgetDetails.reduce((next: Record<string, any>, budget: any) => {
      if (budget?.id) {
        next[budget.id] = budget;
      }
      return next;
    }, {});
    const cyclesById = budgetDetails.reduce((next: Record<string, any>, budget: any) => {
      (budget.cycles || []).forEach((cycle: any) => {
        if (cycle?.id) {
          next[cycle.id] = cycle;
        }
      });
      return next;
    }, {});
    const today = dayjs().startOf('day');
    const expiredNotificationIds = notifications
      .filter(notification => {
        const budgetId = String(notification.payload?.budgetId || '');
        const cycleId = String(notification.payload?.cycleId || '');
        const incomeId = String(notification.payload?.incomeId || '');
        const payDate = String(notification.payload?.payDate || '');
        const budget = budgetId ? budgetsById[budgetId] : null;
        const cycle = cyclesById[cycleId];
        const income = incomeId
          ? (budget?.incomes || []).find((item: any) => item.id === incomeId)
          : null;
        const missingBudget = Boolean(budgetId && !budget);
        const missingCycle = Boolean(cycleId && !cycle);
        const missingIncome = Boolean(incomeId && budget && !income);
        const expiredCycle = Boolean(
          cycleId &&
            cycle?.cycleEnd &&
            dayjs(cycle.cycleEnd).startOf('day').isBefore(today, 'day'),
        );
        const nextIncomeOccurrence = getNextAdditionalIncomeOccurrenceAfter(income, payDate);
        const expiredIncomeOccurrence = Boolean(
          notification.action === 'open_additional_income' &&
            payDate &&
            nextIncomeOccurrence &&
            !nextIncomeOccurrence.isAfter(today, 'day'),
        );
        const completedPendingAdditionalIncome = Boolean(
          notification.action === 'open_additional_income' &&
            income &&
            cycleId &&
            getManualRemainingAmount(income, cycleId) <= 0,
        );
        return (
          (budgetId || cycleId || incomeId) &&
          (missingBudget ||
            missingCycle ||
            missingIncome ||
            expiredCycle ||
            expiredIncomeOccurrence ||
            completedPendingAdditionalIncome)
        );
      })
      .map(notification => notification.id);

    if (expiredNotificationIds.length > 0) {
      deleteNotifications(expiredNotificationIds);
    }
  }, [budgetDetails, deleteNotifications, notifications]);

  useEffect(() => {
    if (!activeBudgetId || !activeCycle?.id) {
      return;
    }

    let cancelled = false;
    const syncReviewedCycle = async () => {
      const activeIndex = getCycleIndexValue(activeCycle);
      const storageKey = reviewedCycleStorageKey(userEmail, activeBudgetId);
      const storedValue = await AsyncStorage.getItem(storageKey);
      const stored = storedValue ? JSON.parse(storedValue) : null;
      const storedIndex = Number(stored?.cycleIndex);

      if (cancelled) {
        return;
      }

      if (!Number.isFinite(storedIndex)) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            cycleId: activeCycle.id,
            cycleIndex: activeIndex,
            reviewedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      const cycleAdvanceCount = activeIndex - storedIndex;
      if (cycleAdvanceCount <= 0) {
        return;
      }

      if (cycleAdvanceCount <= 1) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            cycleId: activeCycle.id,
            cycleIndex: activeIndex,
            reviewedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      if (
        missedCyclePrompt?.budgetId === activeBudgetId &&
        missedCyclePrompt?.cycleId === activeCycle.id
      ) {
        return;
      }

      setMissedCyclePrompt({
        budgetId: activeBudgetId,
        cycleId: activeCycle.id,
        cycleIndex: activeIndex,
      });
    };

    syncReviewedCycle().catch(error => {
      console.error('Unable to check reviewed budget cycle:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeBudgetId,
    activeCycle?.id,
    activeCycle?.cycleIndex,
    missedCyclePrompt?.budgetId,
    missedCyclePrompt?.cycleId,
    userEmail,
  ]);

  useEffect(() => {
    setDebtOrderIds(debts.map((debt: any) => debt.id));
  }, [debtOrderSignature]);

  useEffect(() => {
    const nextBudgetId = Array.isArray(routeSelectedBudgetId)
      ? routeSelectedBudgetId[0]
      : routeSelectedBudgetId;
    if (nextBudgetId) {
      setPendingSelectedBudgetId(nextBudgetId);
    }
    const nextCycleId = Array.isArray(routeAdditionalIncomeCycleId)
      ? routeAdditionalIncomeCycleId[0]
      : routeAdditionalIncomeCycleId;
    if (nextCycleId) {
      setSelectedCycleId(nextCycleId);
    }
  }, [routeAdditionalIncomeCycleId, routeSelectedBudgetId]);

  // Custom colors for specific bottom sheets in dark mode
  const customSheetBg = isDarkMode ? '#171A21' : undefined;
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const [date, setDate] = useState(dayjs());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddbudgetList, setShowAddbudgetList] = useState(false);
  const [showExpenseInfo, setShowExpenseInfo] = useState(false);
  const [showCarryOverSheet, setShowCarryOverSheet] = useState(false);
  const [showtoltip, setShowtoltip] = useState(false);
  const [showOnetimeExpensesSheet, setShowOnetimeExpensesSheet] =
    useState(false);
  const [oneTimeExpensePanel, setOneTimeExpensePanel] = useState<
    'form' | 'paySource' | 'newPaySource'
  >('form');
  const [showToSaveSheet, setShowToSaveSheet] = useState(false);
  const [oneTimeExpenseName, setOneTimeExpenseName] = useState('');
  const [oneTimeExpenseAmount, setOneTimeExpenseAmount] = useState('');
  const [oneTimeExpensePaySource, setOneTimeExpensePaySource] = useState('');
  const [oneTimeNewPaySource, setOneTimeNewPaySource] = useState('');
  const [carryOverAmount, setCarryOverAmount] = useState('');
  const [toSaveInputAmount, setToSaveInputAmount] = useState('');
  const [currentSavingsEditOpenKey, setCurrentSavingsEditOpenKey] = useState(0);
  const [savingsGoalEditOpenKey, setSavingsGoalEditOpenKey] = useState(0);
  const [incomeEditOpenKey, setIncomeEditOpenKey] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [isEditingExpenseDetails, setIsEditingExpenseDetails] = useState(false);
  const [isAmountOnlyExpenseEdit, setIsAmountOnlyExpenseEdit] = useState(false);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDueDate, setEditExpenseDueDate] = useState('');
  const [editExpenseCategory, setEditExpenseCategory] = useState('');
  const [editExpensePaySource, setEditExpensePaySource] = useState('');
  const [editExpenseNewPaySource, setEditExpenseNewPaySource] = useState('');
  const [editExpenseType, setEditExpenseType] = useState('Fixed');
  const [showExpenseDateSheet, setShowExpenseDateSheet] = useState(false);
  const [showExpenseCategorySheet, setShowExpenseCategorySheet] = useState(false);
  const [showExpensePaySourceSheet, setShowExpensePaySourceSheet] = useState(false);
  const [showNewExpensePaySourceSheet, setShowNewExpensePaySourceSheet] = useState(false);
  const [editingAdditionalIncome, setEditingAdditionalIncome] = useState<any | null>(null);
  const [editAdditionalIncomeName, setEditAdditionalIncomeName] = useState('');
  const [editAdditionalIncomeAmount, setEditAdditionalIncomeAmount] = useState('');
  const [editAdditionalIncomeFrequency, setEditAdditionalIncomeFrequency] = useState('Weekly');
  const [editAdditionalIncomeMode, setEditAdditionalIncomeMode] = useState<'auto' | 'manual'>('manual');
  const [editAdditionalIncomePayDate, setEditAdditionalIncomePayDate] = useState('');
  const [showAdditionalIncomeFrequencySheet, setShowAdditionalIncomeFrequencySheet] =
    useState(false);
  const [showAdditionalIncomePayDateSheet, setShowAdditionalIncomePayDateSheet] =
    useState(false);
  const additionalIncomeFrequencyOptions = [
    {label: 'Weekly', value: 'Weekly'},
    {label: 'Bi-Weekly', value: 'Bi-Weekly'},
    {label: 'Semi-Monthly', value: 'Semi-Monthly'},
    {label: 'Monthly', value: 'Monthly'},
  ];

  const NewBudgetData = [
    {
      id: 1,
      title: 'Income',
      onPress: () => {
        router.push({
          pathname: '/auth/AddIncome',
          params: {fromHome: 'true', budgetId: activeBudgetId},
        });
      },
    },
    {
      id: 2,
      title: 'One-Time Expense',
      onPress: () => {
        if (isPastCycle) {
          Alert.alert('Read only', readOnlyPastCycleMessage);
          return;
        }
        setShowOnetimeExpensesSheet(true);
      },
    },
    {
      id: 3,
      title: 'Recurring Expense',
      onPress: () => {
        router.push({
          pathname: '/auth/RecurringExpenses',
          params: {fromHome: 'true', budgetId: activeBudgetId},
        });
      },
    },
    {
      id: 4,
      title: 'Debt',
      onPress: () => {
        router.push({
          pathname: '/auth/Debt',
          params: {fromHome: 'true', budgetId: activeBudgetId},
        });
      },
    },
  ];

  const currentCycleIndex = activeCycles.findIndex(
    (cycle: any) => cycle.id === activeCycle?.id,
  );
  const isFirstCycle = activeCycles.length > 0 && currentCycleIndex <= 0;
  const isLastCycle =
    activeCycles.length > 0 && currentCycleIndex >= activeCycles.length - 1;

  const goPrev = () => {
    if (activeCycles.length === 0) {
      setDate(prev => prev.subtract(1, 'month'));
      return;
    }
    if (isFirstCycle) {
      return;
    }

    const prevCycle = activeCycles[Math.max(0, currentCycleIndex - 1)];
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
    if (isLastCycle) {
      return;
    }

    const nextCycle = activeCycles[Math.min(activeCycles.length - 1, currentCycleIndex + 1)];
    if (nextCycle) {
      setSelectedCycleId(nextCycle.id);
      setDate(dayjs(nextCycle.cycleStart));
    }
  };

  const markActiveCycleReviewed = async () => {
    if (!activeBudgetId || !activeCycle?.id) {
      return;
    }
    await AsyncStorage.setItem(
      reviewedCycleStorageKey(userEmail, activeBudgetId),
      JSON.stringify({
        cycleId: activeCycle.id,
        cycleIndex: getCycleIndexValue(activeCycle),
        reviewedAt: new Date().toISOString(),
      }),
    );
  };

  const handleContinueMissedCycles = async () => {
    await markActiveCycleReviewed();
    setMissedCyclePrompt(null);
  };

  const handleStartFreshFromMissedCycles = async () => {
    const staleAdditionalIncomeNotificationIds = notifications
      .filter(notification => {
        const budgetId = String(notification.payload?.budgetId || '');
        const cycleId = String(notification.payload?.cycleId || '');
        return (
          notification.type === 'additional_income' &&
          budgetId === activeBudgetId &&
          cycleId &&
          cycleId !== activeCycle?.id
        );
      })
      .map(notification => notification.id);

    if (staleAdditionalIncomeNotificationIds.length > 0) {
      await deleteNotifications(staleAdditionalIncomeNotificationIds);
    }

    if (activeCycle?.id) {
      setSelectedCycleId(activeCycle.id);
      setDate(dayjs(activeCycle.cycleStart));
    }
    setDismissedAdditionalIncomeIds([]);
    await markActiveCycleReviewed();
    setMissedCyclePrompt(null);
  };

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const hasCopyableBudgetItems = Boolean(
    activeBudget &&
      ((activeBudget.expenses?.length || 0) > 0 ||
        (activeBudget.debts?.length || 0) > 0),
  );

  const handleAddBudgetPress = () => {
    if (!hasCopyableBudgetItems) {
      setShowAddBudgetModal(false);
      router.push({
        pathname: '/auth/CreateBudget',
        params: {
          fromHome: 'true',
          fromBudgetCreation: 'true',
          fromCopyExpenses: 'false',
        },
      });
      return;
    }

    setShowAddBudgetModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeBudgetId) {
      setShowDeleteModal(false);
      return;
    }

    try {
      await budgetApi.delete(activeBudgetId);
      setShowDeleteModal(false);
      setPrimaryBudgetId('');
      setSelectedBudgetId('');
      setSelectedCycleId('');
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to delete budget', error?.message || 'Please try again.');
    }
  };

  const handleAddOneTimeExpense = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId) {
      Alert.alert('No budget selected', 'Create or select a budget before adding an expense.');
      return;
    }

    if (!oneTimeExpenseName.trim() || !Number(oneTimeExpenseAmount) || !oneTimeExpensePaySource.trim()) {
      Alert.alert('Missing expense details', 'Enter an expense name, amount, and pay source.');
      return;
    }

    try {
      const response = await budgetApi.createExpense(activeBudgetId, {
        name: oneTimeExpenseName.trim(),
        amount: Number(oneTimeExpenseAmount),
        type: 'One Time',
        frequency: 'One Time',
        dueDate: activeCycle?.cycleStart || date.format('YYYY-MM-DD'),
        category: 'One-Time Expense',
        priority: 1,
        notes: oneTimeExpensePaySource.trim(),
      });

      if (!response.success) {
        Alert.alert('Unable to save expense', response.message || 'Please try again.');
        return;
      }

      setOneTimeExpenseName('');
      setOneTimeExpenseAmount('');
      setOneTimeExpensePaySource('');
      setShowOnetimeExpensesSheet(false);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to save expense', error?.message || 'Please try again.');
    }
  };

  const handleUpdateCarryOver = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !activeCycle?.id) {
      Alert.alert('No budget selected', 'Create or select a budget before carrying money over.');
      return;
    }

    const amount = Number(carryOverAmount || 0);
    if (amount < 0 || amount > remaining + goalAllocation + carryOverOut) {
      Alert.alert('Invalid carry over', 'Carry over cannot exceed remaining plus the amount set to save.');
      return;
    }

    try {
      const response = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
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

  const openToSaveSheet = () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    setToSaveInputAmount(String(Number(toSaveAmount || 0)));
    setShowToSaveSheet(true);
  };

  const handleUpdateToSave = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !activeCycle?.id) {
      Alert.alert('No budget selected', 'Create or select a budget before updating savings.');
      return;
    }

    const amount = Number(toSaveInputAmount || 0);
    const availableForSavings = remaining + toSaveAmount;
    if (amount < 0 || amount > availableForSavings) {
      Alert.alert('Invalid amount', 'To Save cannot exceed your available remaining amount.');
      return;
    }

    try {
      const response = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
        goalAllocation: debtPaymentTotal + amount,
      });

      if (!response.success) {
        Alert.alert('Unable to update savings', response.message || 'Please try again.');
        return;
      }

      setShowToSaveSheet(false);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to update savings', error?.message || 'Please try again.');
    }
  };

  const openExpenseDetails = (expense: any) => {
    setSelectedExpense(expense);
    setIsAmountOnlyExpenseEdit(false);
    setIsEditingExpenseDetails(false);
    setShowExpenseDetails(true);
  };

  const openExpenseEditor = (expense: any) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    setSelectedExpense(expense);
    setEditExpenseName(expense.name || '');
    setEditExpenseAmount(String(Math.round(Number(expense.amount || 0))));
    setEditExpenseDueDate(expense.dueDate || '');
    setEditExpenseCategory(expense.category || 'General');
    setEditExpenseType(
      String(expense.type || '').toLowerCase().includes('variable')
        ? 'Variable'
        : 'Fixed',
    );
    setIsAmountOnlyExpenseEdit(true);
    setIsEditingExpenseDetails(true);
    setShowExpenseDetails(true);
  };

  const startEditingExpense = () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!selectedExpense) return;

    setEditExpenseName(selectedExpense.name || '');
    setEditExpenseAmount(String(Math.round(Number(selectedExpense.amount || 0))));
    setEditExpenseDueDate(selectedExpense.dueDate || '');
    setEditExpenseCategory(selectedExpense.category || 'General');
    setEditExpensePaySource(selectedExpense.notes?.trim() || '');
    setEditExpenseType(
      String(selectedExpense.type || '').toLowerCase().includes('variable')
        ? 'Variable'
        : 'Fixed',
    );
    setIsAmountOnlyExpenseEdit(false);
    setIsEditingExpenseDetails(true);
  };

  const handleSaveExpenseDetails = async () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !selectedExpense) return;

    const amount = Number(editExpenseAmount || 0);
    if (amount <= 0) {
      Alert.alert('Missing expense details', 'Enter an amount.');
      return;
    }

    if (
      !isAmountOnlyExpenseEdit &&
      (!editExpenseName.trim() || !editExpenseDueDate.trim() || !editExpensePaySource.trim())
    ) {
      Alert.alert('Missing expense details', 'Enter a name, amount, due date, and pay source.');
      return;
    }

    try {
      const response = await budgetApi.updateExpense(
        activeBudgetId,
        selectedExpense.id,
        isAmountOnlyExpenseEdit
          ? {amount}
          : {
              name: editExpenseName.trim(),
              amount,
              dueDate: editExpenseDueDate.trim(),
              category: editExpenseCategory.trim() || 'General',
              notes: editExpensePaySource.trim(),
              frequency: selectedExpense.frequency || 'Every Pay Cycle',
              type: editExpenseType,
            },
      );

      if (!response.success) {
        Alert.alert('Unable to update expense', response.message || 'Please try again.');
        return;
      }

      setShowExpenseDetails(false);
      setIsEditingExpenseDetails(false);
      setIsAmountOnlyExpenseEdit(false);
      setSelectedExpense(null);
      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to update expense', error?.message || 'Please try again.');
    }
  };

  const confirmDeleteExpense = () => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !selectedExpense) return;

    Alert.alert('Delete expense?', 'This will delete this expense from all budget cycles.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await budgetApi.deleteExpense(activeBudgetId, selectedExpense.id);
            if (!response.success) {
              Alert.alert('Unable to delete', response.message || 'Please try again.');
              return;
            }
            setShowExpenseDetails(false);
            setSelectedExpense(null);
            await loadBudgets();
          } catch (error: any) {
            Alert.alert('Unable to delete', error?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const confirmDeleteOneTimeExpense = (expense: any) => {
    if (isPastCycle) {
      Alert.alert('Read only', readOnlyPastCycleMessage);
      return;
    }
    if (!activeBudgetId || !expense) return;

    Alert.alert('Delete one-time expense?', 'This will remove this one-time expense from this budget.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await budgetApi.deleteExpense(activeBudgetId, expense.id);
            if (!response.success) {
              Alert.alert('Unable to delete', response.message || 'Please try again.');
              return;
            }
            await loadBudgets();
          } catch (error: any) {
            Alert.alert('Unable to delete', error?.message || 'Please try again.');
          }
        },
      },
    ]);
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
        sourceBudgetId: activeBudgetId,
      },
    });
  };

  const handleCreateNew = () => {
    console.log('Create new budget');
    setShowAddBudgetModal(false);
    router.push({
      pathname: '/auth/CreateBudget',
      params: {
        fromHome: 'true',
        fromBudgetCreation: 'true',
        fromCopyExpenses: 'false',
      },
    });
  };

  const getAdditionalIncomeIcon = (income: any) => {
    const value = `${income?.category || ''} ${income?.name || ''}`.toLowerCase();
    if (value.includes('photo') || value.includes('camera')) return 'camera';
    if (value.includes('dash') || value.includes('delivery') || value.includes('car')) return 'truck';
    if (value.includes('gift') || value.includes('bonus')) return 'gift';
    return 'dollar-sign';
  };

  const renderAdditionalIncomeActions = (income: any) => (
    <View style={styles.incomeSwipeActionGroup} onTouchStart={event => event.stopPropagation()}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          additionalIncomeSwipeableRefs.current[income.id]?.close();
          openEditAdditionalIncome(income);
        }}
        style={[styles.incomeSwipeAction, styles.incomeSwipeEdit]}>
        <Feather name="edit-2" size={21} color="#FFFFFF" />
        <Text size={12} variant="semibold" color="#FFFFFF">
          Edit
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          additionalIncomeSwipeableRefs.current[income.id]?.close();
          handleDeleteAdditionalIncome(income);
        }}
        style={[styles.incomeSwipeAction, styles.incomeSwipeDelete]}>
        <Feather name="trash-2" size={22} color="#FFFFFF" />
        <Text size={12} variant="semibold" color="#FFFFFF">
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAdditionalIncomeRow = (income: any, index: number) => {
    const nextPayDate = getNextAdditionalIncomePayDate(income, activeCycle?.id);
    const modeLabel = isAutoAdditionalIncome(income) ? 'Auto Add' : 'Manual Add';
    const remainingManualAmount = getManualRemainingAmount(income, activeCycle?.id);
    const metaLabel =
      isManualAdditionalIncome(income) && remainingManualAmount > 0
        ? `${modeLabel} • ${formatWholeCurrency(remainingManualAmount)} available`
        : modeLabel;
    const row = (
      <TouchableOpacity
        activeOpacity={1}
        onPress={closeOpenSwipeable}
        style={[
          styles.additionalIncomeListRow,
          {backgroundColor: color.inputField, borderColor: color.border},
        ]}>
        <View
          style={[
            styles.additionalIncomeIcon,
            {backgroundColor: index % 2 === 0 ? '#27AE60' : '#5B5CE2'},
          ]}>
          {getAdditionalIncomeIcon(income) === 'dollar-sign' ? (
            <View style={styles.additionalIncomeDollarCircle}>
              <Feather name="dollar-sign" size={16} color="#FFFFFF" />
            </View>
          ) : (
            <Feather name={getAdditionalIncomeIcon(income) as any} size={17} color="#FFFFFF" />
          )}
        </View>
        <View style={styles.additionalIncomeTextGroup}>
          <Text
            size={15}
            variant="medium"
            color={color.black}
            numberOfLines={1}>
            {income.name || 'Additional Income'}
          </Text>
          <Text size={12} color={color.tabicon} numberOfLines={1}>
            Next Pay:{' '}
            {nextPayDate ? nextPayDate.format('MMMM D, YYYY') : 'Not scheduled'}
          </Text>
          <Text size={12} color={color.primary} numberOfLines={1}>
            {metaLabel}
          </Text>
        </View>
        <Text size={15} variant="medium" color={color.black}>
          {formatWholeCurrency(income.amount)}
        </Text>
      </TouchableOpacity>
    );

    return isPastCycle ? (
      <View key={income.id}>{row}</View>
    ) : (
      <Swipeable
        key={income.id}
        ref={ref => {
          additionalIncomeSwipeableRefs.current[income.id] = ref;
        }}
        overshootRight={false}
        containerStyle={styles.additionalIncomeSwipeContainer}
        childrenContainerStyle={{backgroundColor: color.secondaryheader}}
        renderRightActions={() => renderAdditionalIncomeActions(income)}
        onSwipeableWillOpen={() => {
          const currentSwipeable = additionalIncomeSwipeableRefs.current[income.id];
          if (openSwipeableRef.current && openSwipeableRef.current !== currentSwipeable) {
            openSwipeableRef.current.close();
          }
          openSwipeableRef.current = currentSwipeable;
        }}
        onSwipeableClose={() => {
          const currentSwipeable = additionalIncomeSwipeableRefs.current[income.id];
          if (openSwipeableRef.current === currentSwipeable) {
            openSwipeableRef.current = null;
          }
        }}>
        {row}
      </Swipeable>
    );
  };

  return (
    <>
      <Wrapper
        keyboardProps={{
          stickyHeaderIndices: [0],
          bounces: false,
          onTouchEnd: closeOpenSwipeable,
          onScrollBeginDrag: closeOpenSwipeable,
        }}>
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
            selectedBudgetId={activeBudgetId}
            isBudgetLoading={!hasLoadedBudgetList}
            onPrimaryBudgetChange={handlePrimaryBudgetChange}
            onBudgetSelect={handleBudgetSelect}
            onBudgetRename={handleBudgetRename}
            currentSavings={Number(activeBudget?.currentSavings || 0)}
            savingsGoal={Number(
              activeBudget?.savingsGoal ||
                userData?.savingsGoal ||
                0,
            )}
            currentIncome={Number(activeCycle?.baseIncome ?? activeBudget?.netPay ?? 0)}
            activeCycleId={activeCycle?.id}
            autoFillEnabled={Boolean(activeBudget?.autoFillEnabled)}
            onAutoFillChange={handleAutoFillChange}
            onSavingsUpdate={handleSavingsUpdate}
            onIncomeUpdate={handleIncomeUpdate}
            onAddFromSavings={handleAddFromSavings}
            currentSavingsEditOpenKey={currentSavingsEditOpenKey}
            savingsGoalEditOpenKey={savingsGoalEditOpenKey}
            incomeEditOpenKey={incomeEditOpenKey}
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
            style={[
              styles.savingsOverviewCard,
              {
                backgroundColor: color.secondaryheader,
                borderColor: color.primary,
              },
            ]}>
            <View style={styles.savingsOverviewTopRow}>
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isPastCycle}
                onPress={() => setCurrentSavingsEditOpenKey(previous => previous + 1)}
                style={[
                  styles.savingsOverviewMetric,
                  styles.currentSavingsMetricTouchable,
                  isPastCycle && styles.disabledSummaryMetric,
                ]}>
                <Text size={11} color={color.tabicon} numberOfLines={1}>
                  Current Savings
                </Text>
                <View style={styles.currentSavingsValueRow}>
                  <Text
                    size={20}
                    variant="semibold"
                    color={color.black}
                    numberOfLines={1}
                    style={styles.currentSavingsAmountText}>
                    {formatWholeCurrency(totalSavings)}
                  </Text>
                  {!isPastCycle && (
                    <Feather
                      name="chevron-right"
                      size={17}
                      color={color.tabicon}
                      style={styles.currentSavingsChevron}
                    />
                  )}
                </View>
              </TouchableOpacity>
              <View style={[styles.savingsOverviewDivider, {backgroundColor: color.primary}]} />
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isPastCycle}
                onPress={() => setSavingsGoalEditOpenKey(previous => previous + 1)}
                style={[
                  styles.savingsOverviewMetric,
                  styles.currentSavingsMetricTouchable,
                  isPastCycle && styles.disabledSummaryMetric,
                ]}>
                <Text size={11} color={color.tabicon} numberOfLines={1}>
                  Savings Goal
                </Text>
                <View style={styles.currentSavingsValueRow}>
                  <Text
                    size={20}
                    variant="semibold"
                    color={color.black}
                    numberOfLines={1}
                    style={styles.currentSavingsAmountText}>
                    {formatWholeCurrency(savingsGoal)}
                  </Text>
                  {!isPastCycle && (
                    <Feather
                      name="chevron-right"
                      size={17}
                      color={color.tabicon}
                      style={styles.currentSavingsChevron}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <Spacer height={heightPixel(10)} />
            <View style={styles.savingsProgressLabelRow}>
              <Feather name="target" size={13} color={color.primary} />
              <Text size={11} variant="semibold" color={color.primary}>
                {Math.round(savingsProgressPercent)}% toward your goal
              </Text>
            </View>
            <Spacer height={heightPixel(5)} />
            <View style={[styles.savingsProgressTrack, {backgroundColor: color.progressbarbg, borderColor: color.progressbarborder}]}>
              <View
                style={[
                  styles.savingsProgressFill,
                  {
                    width: `${Math.max(8, savingsProgressPercent)}%`,
                    backgroundColor: color.primary,
                  },
                ]}>
                <Text size={12} variant="semibold" color={color.white}>
                  {Math.round(savingsProgressPercent)}%
                </Text>
              </View>
            </View>

            <View style={[styles.savingsOverviewRule, {backgroundColor: color.border}]} />

            <TouchableOpacity
              activeOpacity={0.82}
              disabled={isPastCycle}
              onPress={openToSaveSheet}
              style={[styles.toSaveOverviewRow, isPastCycle && styles.disabledSummaryMetric]}>
              <View style={[styles.toSaveIconCircle, {backgroundColor: color.iconCardBg}]}>
                <View style={[styles.toSaveDollarInnerCircle, {borderColor: color.primary}]}>
                  <Feather name="dollar-sign" size={18} color={color.primary} />
                </View>
                <Feather name="arrow-up-right" size={17} color={color.primary} style={styles.toSaveTrendIcon} />
              </View>
              <View style={styles.toSaveOverviewCopy}>
                <View style={styles.toSaveTitleRow}>
                  <Text size={11} color={color.tabicon} numberOfLines={1}>
                    To Save
                  </Text>
                  {!isPastCycle && <Feather name="edit-2" size={13} color={color.tabicon} />}
                </View>
                <Text size={16} variant="semibold" color={color.primary} numberOfLines={1}>
                  {formatWholeCurrency(toSaveAmount)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </WalkthroughTooltip>

        <Spacer height={20} />
        {isPastCycle && (
          <>
            <Text size={13} color={color.tabicon} style={{textAlign: 'center'}}>
              Past budget cycle. Read only.
            </Text>
            <Spacer height={10} />
          </>
        )}
        <View style={styles.row}>
          <Text size={16} color={color.black} variant="semibold">
            Pay Date
          </Text>
          <TouchableOpacity
            onPress={goPrev}
            disabled={isFirstCycle}
            style={[styles.arrowBtn, isFirstCycle && styles.disabledArrowBtn]}>
            <AntDesign
              name="left"
              size={14}
              color={isFirstCycle ? color.disabled : color.dateText}
            />
          </TouchableOpacity>
          <Text style={[styles.dateText, {color: color.primary}]}>
            {date.format('MMMM D, YYYY')}
          </Text>
          <TouchableOpacity
            onPress={goNext}
            disabled={isLastCycle}
            style={[styles.arrowBtn, isLastCycle && styles.disabledArrowBtn]}>
            <AntDesign
              name="right"
              size={14}
              color={isLastCycle ? color.disabled : color.dateText}
            />
          </TouchableOpacity>
        </View>
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
            <View
              style={[
                styles.incomePanel,
                {
                  backgroundColor: color.secondaryheader,
                  borderColor: color.primary,
                },
              ]}>
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isPastCycle}
                onPress={() => setIncomeEditOpenKey(previous => previous + 1)}
                style={styles.incomePanelHeader}>
                <Text size={20} color={color.black} variant="semibold">
                  Income
                </Text>
                <View style={styles.incomeHeaderValue}>
                  <Text size={18} color={color.black} variant="medium">
                    {formatWholeCurrency(totalIncome)}
                  </Text>
                  {!isPastCycle && (
                    <Feather name="chevron-right" size={18} color={color.tabicon} />
                  )}
                </View>
              </TouchableOpacity>
              {hasAdditionalIncome && isIncomeExpanded && (
                <>
                  <View style={[styles.incomePanelDivider, {backgroundColor: color.border}]} />
                  <Text size={13} color={color.tabicon}>
                    Additional Income
                  </Text>
                  <Spacer height={heightPixel(8)} />
                  {additionalIncomes.map(renderAdditionalIncomeRow)}
                </>
              )}
            </View>
          </View>
        </WalkthroughTooltip>
        <Spacer height={20} />
        <WalkthroughTooltip
          stepNumber={2}
          title="Total Payments"
          content="Your total expenses for this cycle."
          placement="top">
          <View
            style={[styles.summaryBanner, {backgroundColor: color.walletbg}]}>
            <View style={styles.summarySlot}>
              <View style={styles.summaryMetric}>
                <Image
                  source={appImages.Paymentimg}
                  style={[styles.summaryIcon, {tintColor: color.white}]}
                />
                <Text size={14} variant="semibold" color={color.white} numberOfLines={1}>
                  {formatWholeCurrency(totalExpenses)}
                </Text>
                <Text size={9} color={color.white} numberOfLines={1}>
                  Total Payments
                </Text>
              </View>
            </View>

            <View
              style={[styles.summaryDivider, {backgroundColor: color.white}]}
            />

            <View style={[styles.summarySlot, styles.carryOverSlot]}>
              <WalkthroughTooltip
                stepNumber={3}
                title="Carry Over"
                content="Carry Over lets you roll unused money from this budget into the next, so you can cover future expenses or keep a cushion."
                placement="top">
                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={isPastCycle}
                  onPress={() => {
                    setCarryOverAmount(String(carryOverOut || ''));
                    setShowCarryOverSheet(true);
                  }}
                  style={[
                    styles.summaryMetric,
                    styles.carryOverSummaryMetric,
                    {
                      backgroundColor: 'rgba(255,255,255,0.11)',
                      shadowColor: color.black,
                    },
                    isPastCycle && styles.disabledSummaryMetric,
                  ]}>
                  <Image
                    source={appImages.CarryOverimg}
                    style={[styles.summaryIcon, {tintColor: color.white}]}
                  />
                  <Text size={9} color={color.white} numberOfLines={1}>
                    Carry Over
                  </Text>
                  <View style={styles.carryOverValueRow}>
                    <Text size={14} variant="semibold" color={color.white} numberOfLines={1}>
                      {formatWholeCurrency(carryOverOut)}
                    </Text>
                    {!isPastCycle && <Feather name="edit-2" size={11} color={color.white} />}
                  </View>
                </TouchableOpacity>
              </WalkthroughTooltip>
            </View>

            <View
              style={[styles.summaryDivider, {backgroundColor: color.white}]}
            />

            <View style={styles.summarySlot}>
              <WalkthroughTooltip
                stepNumber={4}
                title="Remaining"
                content="What's left after subtracting your expenses from your income. This is the amount you still have available."
                placement="top">
                <View style={styles.summaryMetric}>
                  <Image
                    source={appImages.Walletimg}
                    style={[styles.summaryIcon, {tintColor: color.white}]}
                  />
                  <Text size={14} variant="semibold" color={color.white} numberOfLines={1}>
                    {formatWholeCurrency(remaining)}
                  </Text>
                  <Text size={9} color={color.white} numberOfLines={1}>
                    Total Remaining
                  </Text>
                </View>
              </WalkthroughTooltip>
            </View>
          </View>
        </WalkthroughTooltip>
        <Spacer height={20} />
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
        <View style={{paddingBottom: 30}}>
          {expenseSections.length > 0 ? (
            expenseSections.map(item => (
            <GradientExpandableCard
              key={item.id}
              title={item.title}
              value={item.value}
              expandedGradientColors={{default: ['#FFD479', '#FFAD3D']}}>
              <View style={{gap: 10}}>
                {item.items.map((row: any, index: number) => {
                  const isVariable = String(row.raw?.type || '')
                    .toLowerCase()
                    .includes('variable');
                  const isOneTime = String(row.raw?.frequency || '')
                    .toLowerCase()
                    .includes('one');
                  const rowContent = (
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={closeOpenSwipeable}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                        paddingVertical: 2,
                        backgroundColor: 'transparent',
                      }}>
                      <Text
                        size={11}
                        color="#000"
                        style={{width: widthPixel(54), textAlign: 'right'}}>
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
                      {(isVariable || isOneTime) && !isPastCycle && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => openExpenseEditor(row.raw)}
                          hitSlop={10}
                          style={styles.expenseActionButton}>
                          <Feather name="edit-2" size={16} color={colors.light.tabicon} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );

                  return isOneTime && !isPastCycle ? (
                    <Swipeable
                      key={row.id || index}
                      ref={ref => {
                        oneTimeExpenseSwipeableRefs.current[row.id || String(index)] = ref;
                      }}
                      renderRightActions={() => (
                        <View
                          style={styles.swipeActionGroup}
                          onTouchStart={event => event.stopPropagation()}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                              oneTimeExpenseSwipeableRefs.current[row.id || String(index)]?.close();
                              openExpenseEditor(row.raw);
                            }}
                            style={[styles.swipeEditAction, {backgroundColor: color.primary}]}>
                            <Text size={12} variant="semibold" color={color.primaryButtonText}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                              oneTimeExpenseSwipeableRefs.current[row.id || String(index)]?.close();
                              confirmDeleteOneTimeExpense(row.raw);
                            }}
                            style={styles.swipeDeleteAction}>
                            <Text size={12} variant="semibold" color="#FFF">
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      onSwipeableWillOpen={() => {
                        const rowKey = row.id || String(index);
                        const currentSwipeable = oneTimeExpenseSwipeableRefs.current[rowKey];
                        if (openSwipeableRef.current && openSwipeableRef.current !== currentSwipeable) {
                          openSwipeableRef.current.close();
                        }
                        openSwipeableRef.current = currentSwipeable;
                      }}
                      onSwipeableClose={() => {
                        const currentSwipeable =
                          oneTimeExpenseSwipeableRefs.current[row.id || String(index)];
                        if (openSwipeableRef.current === currentSwipeable) {
                          openSwipeableRef.current = null;
                        }
                      }}>
                      {rowContent}
                    </Swipeable>
                  ) : (
                    <View key={row.id || index}>{rowContent}</View>
                  );
                })}
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
                onPress={() =>
                  router.navigate({
                    pathname: '/mainScreens/DebitCard',
                    params: {
                      budgetId: activeBudgetId,
                      cycleId: activeCycle?.id || '',
                      paymentSource: item.paymentSource,
                    },
                  })
                }
                activeOpacity={0.8}>
                <Text variant="medium" size={14} color={colors.light.tabicon}>
                  View All
                </Text>
              </TouchableOpacity>
            </GradientExpandableCard>
            ))
          ) : (
            <Text size={14} color={color.tabicon} style={{marginTop: 10}}>
              No expenses in this pay cycle yet.
            </Text>
          )}
        </View>
        {debts.length > 0 && (
          <>
            <Spacer height={10} />
            <Text size={15} variant="medium" color={color.black}>
              Debt
            </Text>
            <Spacer height={10} />
            {displayDebts.map((debt: any, index: number) => {
                const canReorderDebt = debts.length > 1;
                const canMoveUp = canReorderDebt && index > 0;
                const canMoveDown = canReorderDebt && index < displayDebts.length - 1;
                const isPaidOffDebt =
                  Number(debt.balance || 0) <= 0 ||
                  String(debt.status || '').toLowerCase().includes('paid_off');

                return (
                  <View
                    key={debt.id}
                    style={[
                      styles.debtTile,
                      {
                        backgroundColor: color.inputField,
                        borderColor: isPaidOffDebt ? color.disabled : color.primary,
                        shadowColor: isPaidOffDebt ? color.disabled : color.primary,
                        opacity: isPaidOffDebt ? 0.62 : reorderingDebtId === debt.id ? 0.65 : 1,
                      },
                    ]}>
                    <View style={styles.debtDragZone}>
                      {canReorderDebt && (
                        <View style={styles.debtDragHandle}>
                          <Feather name="menu" size={16} color={color.tabicon} />
                        </View>
                      )}
                      <Text
                        size={15}
                        variant="medium"
                        color={color.black}
                        style={styles.debtName}
                        numberOfLines={1}>
                        {debt.name}
                      </Text>
                      <Text
                        size={15}
                        variant="medium"
                        color={color.black}
                        style={styles.debtBalance}>
                        {formatWholeCurrency(debt.balance)}
                      </Text>
                      {isPaidOffDebt && (
                        <Text size={12} variant="semibold" color="#32A852">
                          ✓ Paid Off
                        </Text>
                      )}
                    </View>
                    {!isPaidOffDebt && !isPastCycle && (
                      <View style={[styles.debtInputWrap, {backgroundColor: color.bg}]}>
                        <Text size={13} variant="medium" color={color.tabicon}>
                          {currencySymbol}
                        </Text>
                        <NativeTextInput
                          value={debtPaymentInputs[debt.id] ?? '0'}
                          selectTextOnFocus
                          onChangeText={value => handleDebtPaymentChange(debt, value)}
                          onFocus={() => {
                            if (/^0+(\.0+)?$/.test(String(debtPaymentInputs[debt.id] ?? '0'))) {
                              handleDebtPaymentChange(debt, '');
                            }
                          }}
                          onEndEditing={event => saveDebtPayment(debt, event.nativeEvent.text)}
                          onSubmitEditing={event => saveDebtPayment(debt, event.nativeEvent.text)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={color.tabicon}
                          style={[styles.debtInput, {color: color.black}]}
                        />
                        {savedDebtIds.has(debt.id) && (
                          <AntDesign name="check" size={15} color="#32A852" />
                        )}
                      </View>
                    )}
                    {canReorderDebt && !isPaidOffDebt && !isPastCycle && (
                      <View style={styles.debtPriorityControls}>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          disabled={!canMoveUp}
                          onPress={() => moveDebtOneRow(index, -1)}
                          style={styles.debtPriorityButton}>
                          <Feather
                            name="chevron-up"
                            size={15}
                            color={canMoveUp ? color.black : color.disabled}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          disabled={!canMoveDown}
                          onPress={() => moveDebtOneRow(index, 1)}
                          style={styles.debtPriorityButton}>
                          <Feather
                            name="chevron-down"
                            size={15}
                            color={canMoveDown ? color.black : color.disabled}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
            })}
          </>
        )}
      </Wrapper>

      {/* Add Budget Modal */}
      <WalkthroughTooltip
        stepNumber={8}
        content="Use the add button when money or plans change. You can add income, one-time expenses, recurring expenses, or debt from here."
        placement="top">
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
      </WalkthroughTooltip>

      <BottomSheet
        visible={showAdditionalIncomeSheet && !!selectedManualAdditionalIncome}
        onClose={closeAdditionalIncomePrompt}
        title="Apply additional income"
        hideTitleLine={false}
        backgroundColor={color.inputField}
        dismissible={false}>
        <Spacer height={heightPixel(12)} />
        <View style={{gap: heightPixel(14), marginBottom: heightPixel(24)}}>
          <Text size={16} variant="semibold" color={color.black} style={{textAlign: 'center'}}>
            {selectedManualAdditionalIncome?.name}: {formatWholeCurrency(manualAdditionalIncomeRemaining)} available
          </Text>
          <View style={styles.additionalIncomeInputRow}>
            <Text size={15} variant="medium" color={color.black}>
              Add to current budget:
            </Text>
            <View style={[styles.additionalIncomeInputWrap, {backgroundColor: color.bg}]}>
              <Text size={13} color={color.tabicon}>
                {currencySymbol}
              </Text>
              <NativeTextInput
                ref={additionalIncomeInputRef}
                value={additionalIncomeAmount}
                selectTextOnFocus
                onChangeText={value =>
                  setAdditionalIncomeAmount(
                    value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                  )
                }
                placeholder="0"
                placeholderTextColor={color.tabicon}
                keyboardType="decimal-pad"
                style={[styles.additionalIncomeInput, {color: color.black}]}
              />
            </View>
          </View>
          <View style={styles.manualIncomeModalActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                const didApply = await handleApplyAdditionalIncome();
                if (didApply) {
                  setShowAdditionalIncomeSheet(false);
                }
              }}
              style={[styles.manualIncomeModalButton, {backgroundColor: color.primary}]}>
              <Text size={12} variant="semibold" color={color.primaryButtonText}>
                Apply Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={closeAdditionalIncomePrompt}
              style={[
                styles.manualIncomeModalButton,
                styles.manualIncomeDismissButton,
                {backgroundColor: color.bg, borderColor: color.primary},
              ]}>
              <Text size={12} variant="semibold" color={color.primary}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showAdditionalIncomeFrequencySheet}
        onClose={() => setShowAdditionalIncomeFrequencySheet(false)}
        title="Select Frequency"
        backgroundColor={color.inputField}>
        <RadioList
          options={additionalIncomeFrequencyOptions}
          selectedValue={editAdditionalIncomeFrequency}
          onSelect={setEditAdditionalIncomeFrequency}
          onClose={() => setShowAdditionalIncomeFrequencySheet(false)}
        />
      </BottomSheet>

      <BottomSheet
        visible={showAdditionalIncomePayDateSheet}
        onClose={() => setShowAdditionalIncomePayDateSheet(false)}
        title="Next Pay Date"
        backgroundColor={color.inputField}
        maxHeight={520}>
        <Calendar
          minDate={dayjs().format('YYYY-MM-DD')}
          onDayPress={day => {
            setEditAdditionalIncomePayDate(day.dateString);
            setShowAdditionalIncomePayDateSheet(false);
          }}
          markedDates={
            editAdditionalIncomePayDate
              ? {
                  [editAdditionalIncomePayDate]: {
                    selected: true,
                    selectedColor: color.primary,
                  },
                }
              : undefined
          }
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>

      <BottomSheet
        visible={
          !!editingAdditionalIncome &&
          !showAdditionalIncomeFrequencySheet &&
          !showAdditionalIncomePayDateSheet
        }
        onClose={() => setEditingAdditionalIncome(null)}
        title="Edit Additional Income"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(12)} />
        <View style={{gap: heightPixel(14), marginBottom: heightPixel(28)}}>
          <TextInput
            title="Income Name"
            placeholder="Income Name"
            value={editAdditionalIncomeName}
            onChangeText={setEditAdditionalIncomeName}
          />
          <TextInput
            title="Amount"
            placeholder="0"
            value={editAdditionalIncomeAmount}
            keyboardType="decimal-pad"
            useCurrencyIcon
            replaceOnFirstType
            onChangeText={amount =>
              setEditAdditionalIncomeAmount(
                amount.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
              )
            }
          />
          <TextInput
            title="Frequency"
            placeholder="Frequency"
            value={editAdditionalIncomeFrequency}
            editable={false}
            onPress={() => setShowAdditionalIncomeFrequencySheet(true)}
            rightIcon={appImages.ArrowDown}
            rightIconStyle={{tintColor: color.black}}
          />
          <View>
            <View
              style={[
                styles.additionalIncomeToggleRow,
                {backgroundColor: color.bg, borderColor: color.border},
              ]}>
              <View style={styles.additionalIncomeToggleText}>
                <Text size={14} color={color.black} variant="medium">
                  Auto Add
                </Text>
                <Text size={12} color={color.tabicon}>
                  {editAdditionalIncomeMode === 'auto'
                    ? 'Automatically add this income on payday.'
                    : 'Prompt me to add this income manually.'}
                </Text>
              </View>
              <Switch
                value={editAdditionalIncomeMode === 'auto'}
                onValueChange={handleAdditionalIncomeModeToggle}
                trackColor={{false: '#D1D1D6', true: color.primary}}
                thumbColor={color.white}
                ios_backgroundColor="#D1D1D6"
              />
            </View>
          </View>
          <TextInput
            title="Next Pay Date"
            placeholder="Select Date"
            value={editAdditionalIncomePayDate}
            editable={false}
            onPress={() => setShowAdditionalIncomePayDateSheet(true)}
            rightIcon={appImages.Calenderimg}
            rightIconPress={() => setShowAdditionalIncomePayDateSheet(true)}
            rightIconStyle={{
              height: heightPixel(24),
              width: widthPixel(24),
              resizeMode: 'contain',
              tintColor: color.black,
            }}
          />
          <Button title="Save Changes" onPress={handleSaveAdditionalIncome} />
          <Button
            title="Cancel"
            onPress={() => setEditingAdditionalIncome(null)}
            style={{backgroundColor: color.bg, borderWidth: 1, borderColor: color.primary}}
            titleStyle={{color: color.primary}}
          />
        </View>
      </BottomSheet>

      <CustomModal
        visible={!!missedCyclePrompt}
        onClose={handleContinueMissedCycles}
        title="Budget cycle check-in"
        message="It looks like at least one full budget cycle passed since you last reviewed this budget. Start fresh from the current cycle, or continue where you left off without changing past budgets."
        primaryButtonText="Start Fresh"
        secondaryButtonText="Continue Where I Left Off"
        onPrimaryPress={handleStartFreshFromMissedCycles}
        onSecondaryPress={handleContinueMissedCycles}
      />

      {/* Delete Budget Modal */}
      <CustomModal
        visible={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Budget"
        message="This budget and its data cannot be restored."
        primaryButtonText="Cancel"
        secondaryButtonText="Delete"
        onPrimaryPress={handleDeleteCancel}
        onSecondaryPress={handleDeleteConfirm}
        secondaryButtonVariant="destructive"
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
        visible={!!paidOffDebt && !showAdjustDebtBalance}
        onClose={() => setPaidOffDebt(null)}
        title="Debt Paid Off"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(10)} />
        <View style={{gap: heightPixel(12), marginBottom: heightPixel(24)}}>
          <Text size={18} variant="semibold" color={color.black} style={{textAlign: 'center'}}>
            Congratulations! You’ve paid off “{paidOffDebt?.name}”
          </Text>
          <Text size={15} color={color.black} style={{textAlign: 'center'}}>
            Remaining balance: {formatWholeCurrency(0)}
          </Text>
          <Text size={12} color={color.tabicon} style={{textAlign: 'center'}}>
            (based on your entries)
          </Text>
          <Button
            title="Edit Balance"
            onPress={openAdjustDebtBalance}
            style={{backgroundColor: color.bg, borderWidth: 1, borderColor: color.primary}}
            titleStyle={{color: color.primary}}
          />
          <Button title="Delete Debt" onPress={deletePaidOffDebt} />
          <Button
            title="Keep as Paid Off"
            onPress={markDebtAsPaidOff}
            style={{backgroundColor: color.bg, borderWidth: 1, borderColor: color.primary}}
            titleStyle={{color: color.primary}}
          />
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showAdjustDebtBalance}
        onClose={() => setShowAdjustDebtBalance(false)}
        title="Adjust Balance"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(10)} />
        <View style={{gap: heightPixel(15), marginBottom: heightPixel(30)}}>
          <TextInput
            title="Remaining Balance"
            placeholder="0"
            value={adjustDebtBalanceValue}
            onChangeText={value =>
              setAdjustDebtBalanceValue(
                value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
              )
            }
            keyboardType="decimal-pad"
            useCurrencyIcon
            replaceOnFirstType
            inputContainerStyle={{
              backgroundColor: isDarkMode ? '#0F1115' : color.bg,
            }}
          />
          <Button title="Save" onPress={saveAdjustedDebtBalance} />
          <Button
            title="Cancel"
            onPress={() => setShowAdjustDebtBalance(false)}
            style={{backgroundColor: color.bg, borderWidth: 1, borderColor: color.primary}}
            titleStyle={{color: color.primary}}
          />
        </View>
      </BottomSheet>
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
        onClose={() => {
          setShowOnetimeExpensesSheet(false);
          setOneTimeExpensePanel('form');
        }}
        title={'One-Time Expense'}
        maxHeight={550}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        {oneTimeExpensePanel === 'form' && (
          <>
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
              keyboardType="numeric"
              useCurrencyIcon={true}
              replaceOnFirstType
            />
            <Spacer height={heightPixel(12)} />
            <TextInput
              title="Pay Source"
              placeholder="Select or enter Pay Source"
              placeholderTextColor={color.tabicon}
              value={oneTimeExpensePaySource}
              onPress={() => setOneTimeExpensePanel('paySource')}
              onChangeText={setOneTimeExpensePaySource}
              rightIcon={appImages.ArrowDown}
              rightIconPress={() => setOneTimeExpensePanel('paySource')}
              inputContainerStyle={
                customInputBg ? {backgroundColor: customInputBg} : undefined
              }
            />
            <Spacer height={heightPixel(40)} />
            <Button
              title="Add"
              onPress={handleAddOneTimeExpense}
            />
            <Spacer height={heightPixel(30)} />
          </>
        )}

        {oneTimeExpensePanel === 'paySource' && (
          <View style={{gap: heightPixel(10), marginBottom: heightPixel(30)}}>
            <Text size={18} variant="medium" color={color.black} style={{textAlign: 'center'}}>
              Select Pay Source
            </Text>
            <Spacer height={heightPixel(4)} />
            {paymentSourceOptions.map(source => (
              <TouchableOpacity
                key={source}
                activeOpacity={0.8}
                onPress={() => {
                  setOneTimeExpensePaySource(source);
                  setOneTimeExpensePanel('form');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: color.primary,
                  borderRadius: 10,
                  paddingHorizontal: widthPixel(14),
                  paddingVertical: heightPixel(12),
                }}>
                <Text size={15} color={color.black} variant="medium">
                  {source}
                </Text>
              </TouchableOpacity>
            ))}
            {paymentSourceOptions.length === 0 && (
              <Text size={14} color={color.tabicon} style={{textAlign: 'center'}}>
                No payment sources yet.
              </Text>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setOneTimeExpensePanel('newPaySource')}
              style={{
                borderWidth: 1,
                borderColor: color.primary,
                borderRadius: heightPixel(50),
                paddingVertical: heightPixel(14),
                marginTop: heightPixel(8),
              }}>
              <Text size={15} variant="medium" color={color.primary} style={{textAlign: 'center'}}>
                Add New Payment Source
              </Text>
            </TouchableOpacity>
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={() => setOneTimeExpensePanel('form')}
            />
          </View>
        )}

        {oneTimeExpensePanel === 'newPaySource' && (
          <View style={{marginBottom: heightPixel(30)}}>
            <TextInput
              title="Payment Source"
              placeholder="Enter Name"
              placeholderTextColor={color.tabicon}
              value={oneTimeNewPaySource}
              onChangeText={setOneTimeNewPaySource}
              inputContainerStyle={
                customInputBg ? {backgroundColor: customInputBg} : undefined
              }
            />
            <Spacer height={heightPixel(20)} />
            <Button
              title="Add Payment Source"
              onPress={() => {
                const trimmedSource = oneTimeNewPaySource.trim();
                if (trimmedSource) {
                  setOneTimeCustomPaySources(previous =>
                    previous.includes(trimmedSource) ? previous : [...previous, trimmedSource],
                  );
                  setOneTimeExpensePaySource(trimmedSource);
                  setOneTimeNewPaySource('');
                  setOneTimeExpensePanel('form');
                }
              }}
            />
            <Spacer height={heightPixel(10)} />
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={() => setOneTimeExpensePanel('paySource')}
            />
          </View>
        )}
      </BottomSheet>
      <BottomSheet
        visible={showToSaveSheet}
        onClose={() => setShowToSaveSheet(false)}
        title=""
        maxHeight={360}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <Text size={22} variant="medium" style={{textAlign: 'center'}}>
          To Save
        </Text>
        <Spacer height={heightPixel(20)} />
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          keyboardType="numeric"
          useCurrencyIcon={true}
          value={toSaveInputAmount}
          replaceOnFirstType
          onChangeText={setToSaveInputAmount}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
        />
        <Spacer height={heightPixel(20)} />
        <Button title="Update" onPress={handleUpdateToSave} />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
      <BottomSheet
        visible={showExpenseDetails}
        onClose={() => {
          setShowExpenseDetails(false);
          setIsEditingExpenseDetails(false);
          setIsAmountOnlyExpenseEdit(false);
          setSelectedExpense(null);
        }}
        title="Expense Details"
        hideTitleLine={true}
        titleSize={20}
        headerPaddingVertical={14}
        backgroundColor={color.inputField}
        footer={
          selectedExpense && isEditingExpenseDetails ? (
            <View style={{gap: heightPixel(10)}}>
              <Button
                title="Save"
                style={styles.modalActionButton}
                onPress={handleSaveExpenseDetails}
              />
              <Button
                title="Cancel"
                variant="outline"
                style={styles.modalActionButton}
                titleStyle={{color: color.primary}}
                onPress={() => setIsEditingExpenseDetails(false)}
              />
            </View>
          ) : null
        }>
        <Spacer height={selectedExpense && !isEditingExpenseDetails ? heightPixel(8) : heightPixel(20)} />
        {selectedExpense && !isEditingExpenseDetails && (
          <View style={styles.detailContent}>
            {[
              ['Name', selectedExpense.name],
              ['Amount', formatWholeCurrency(selectedExpense.amount)],
              ['Due Date', formatDisplayDate(selectedExpense.dueDate || selectedExpense.due_date)],
              ['Category', selectedExpense.category || 'General'],
              ['Pay Source', selectedExpense.notes?.trim() || 'Unassigned'],
              ['Type', selectedExpense.type || 'Fixed'],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text size={13} color={color.tabicon} style={styles.detailLabel}>
                  {label}
                </Text>
                <Text
                  size={14}
                  color={color.black}
                  variant="medium"
                  style={styles.detailValue}>
                  {value}
                </Text>
              </View>
            ))}
            {!isPastCycle && (
              <>
                <Spacer height={heightPixel(8)} />
                <Button
                  title="Edit Expense"
                  variant="outline"
                  style={styles.modalActionButton}
                  titleStyle={{color: color.primary}}
                  onPress={startEditingExpense}
                />
                <Button
                  title="Delete Expense"
                  variant="outline"
                  style={{...styles.modalActionButton, borderColor: '#D92D20'}}
                  titleStyle={{color: '#D92D20'}}
                  onPress={confirmDeleteExpense}
                />
              </>
            )}
          </View>
        )}

        {selectedExpense && isEditingExpenseDetails && (
          <View style={{gap: heightPixel(14), marginBottom: heightPixel(35)}}>
            {!isAmountOnlyExpenseEdit && (
              <>
                <TextInput
                  title="Name"
                  placeholder="Expense Name"
                  value={editExpenseName}
                  onChangeText={setEditExpenseName}
                />
                <View style={{flexDirection: 'row', gap: widthPixel(10)}}>
                  {['Fixed', 'Variable'].map(option => (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      onPress={() => setEditExpenseType(option)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        paddingVertical: heightPixel(11),
                        alignItems: 'center',
                        backgroundColor: editExpenseType === option ? color.primary : color.bg,
                        borderWidth: 1,
                        borderColor: color.primary,
                      }}>
                      <Text size={14} variant="medium" color={color.black}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <TextInput
              title="Amount"
              placeholder="0"
              keyboardType="numeric"
              useCurrencyIcon={true}
              value={editExpenseAmount}
              replaceOnFirstType
              onChangeText={value =>
                setEditExpenseAmount(
                  value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                )
              }
            />
            {!isAmountOnlyExpenseEdit && (
              <>
                <TextInput
                  title="Due Date"
                  placeholder="YYYY-MM-DD"
                  value={editExpenseDueDate}
                  onPress={() => setShowExpenseDateSheet(true)}
                  onFocus={() => setShowExpenseDateSheet(true)}
                  rightIcon={appImages.Calenderimg}
                  rightIconPress={() => setShowExpenseDateSheet(true)}
                />
                <TextInput
                  title="Category"
                  placeholder="Category"
                  value={editExpenseCategory}
                  onPress={() => setShowExpenseCategorySheet(true)}
                  rightIcon={appImages.ArrowDown}
                  rightIconPress={() => setShowExpenseCategorySheet(true)}
                />
                <TextInput
                  title="Pay Source"
                  placeholder="Select Pay Source"
                  value={editExpensePaySource}
                  onPress={() => setShowExpensePaySourceSheet(true)}
                  onFocus={() => setShowExpensePaySourceSheet(true)}
                  rightIcon={appImages.ArrowDown}
                  rightIconPress={() => setShowExpensePaySourceSheet(true)}
                />
              </>
            )}
          </View>
        )}
      </BottomSheet>
      <BottomSheet
        visible={showExpenseDateSheet}
        onClose={() => setShowExpenseDateSheet(false)}
        title="Select Due Date"
        backgroundColor={color.inputField}
        maxHeight={520}>
        <Calendar
          minDate={new Date().toISOString().slice(0, 10)}
          onDayPress={day => {
            setEditExpenseDueDate(day.dateString);
            setShowExpenseDateSheet(false);
          }}
          markedDates={
            editExpenseDueDate
              ? {[editExpenseDueDate]: {selected: true, selectedColor: color.primary}}
              : undefined
          }
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
      <BottomSheet
        visible={showExpenseCategorySheet}
        onClose={() => setShowExpenseCategorySheet(false)}
        title="Select Category"
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowExpenseCategorySheet(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: widthPixel(4),
            }}>
            <Feather name="chevron-left" size={22} color={color.black} />
            <Text size={14} variant="medium" color={color.black}>
              Back
            </Text>
          </TouchableOpacity>
        }
        backgroundColor={color.inputField}
        maxHeight={760}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {expenseCategoryGroups.map(group => (
            <View key={group.title}>
              <Text
                variant="semibold"
                size={fontPixel(18)}
                color={color.black}
                style={{textAlign: 'center', marginBottom: heightPixel(14)}}>
                {group.title}
              </Text>
              <View style={styles.categoryGrid}>
                {group.items.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.8}
                    onPress={() => {
                      setEditExpenseCategory(item.label);
                      setShowExpenseCategorySheet(false);
                    }}
                    style={styles.categoryItem}>
                    <View style={[styles.categoryIconWrap, {backgroundColor: color.primary}]}>
                      {item.vectorIcon ? (
                        <Feather name={item.vectorIcon as any} size={20} color={color.black} />
                      ) : (
                        <Image source={item.icon} style={styles.categoryIcon} />
                      )}
                    </View>
                    <Text
                      size={11}
                      color={color.black}
                      variant="medium"
                      style={{textAlign: 'center'}}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Spacer height={heightPixel(20)} />
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        visible={showExpensePaySourceSheet}
        onClose={() => setShowExpensePaySourceSheet(false)}
        title="Select Pay Source"
        backgroundColor={color.inputField}
        maxHeight={560}>
        <View style={{gap: heightPixel(10), marginBottom: heightPixel(30)}}>
          {paymentSourceOptions.map(source => (
            <TouchableOpacity
              key={source}
              activeOpacity={0.8}
              onPress={() => {
                setEditExpensePaySource(source);
                setShowExpensePaySourceSheet(false);
              }}
              style={{
                borderWidth: 1,
                borderColor: color.primary,
                borderRadius: 10,
                paddingHorizontal: widthPixel(14),
                paddingVertical: heightPixel(12),
              }}>
              <Text size={15} color={color.black} variant="medium">
                {source}
              </Text>
            </TouchableOpacity>
          ))}
          {paymentSourceOptions.length === 0 && (
            <Text size={14} color={color.tabicon} style={{textAlign: 'center'}}>
              No payment sources yet.
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setShowExpensePaySourceSheet(false);
              setShowNewExpensePaySourceSheet(true);
            }}
            style={{
              borderWidth: 1,
              borderColor: color.primary,
              borderRadius: heightPixel(50),
              paddingVertical: heightPixel(14),
              marginTop: heightPixel(8),
            }}>
            <Text size={15} variant="medium" color={color.primary} style={{textAlign: 'center'}}>
              Add New Payment Source
            </Text>
          </TouchableOpacity>
          <Button
            title="Cancel"
            variant="outline"
            style={{borderColor: color.primary}}
            titleStyle={{color: color.primary}}
            onPress={() => setShowExpensePaySourceSheet(false)}
          />
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showNewExpensePaySourceSheet}
        onClose={() => {
          setShowNewExpensePaySourceSheet(false);
          setEditExpenseNewPaySource('');
        }}
        title="Add Pay Source"
        backgroundColor={color.inputField}
        maxHeight={360}>
        <View style={{marginBottom: heightPixel(30)}}>
          <TextInput
            title="Payment Source"
            placeholder="Enter Name"
            placeholderTextColor={color.tabicon}
            value={editExpenseNewPaySource}
            onChangeText={setEditExpenseNewPaySource}
            inputContainerStyle={customInputBg ? {backgroundColor: customInputBg} : undefined}
          />
          <Spacer height={heightPixel(20)} />
          <Button
            title="Add Payment Source"
            onPress={() => {
              const trimmedSource = editExpenseNewPaySource.trim();
              if (trimmedSource) {
                setOneTimeCustomPaySources(previous =>
                  previous.includes(trimmedSource) ? previous : [...previous, trimmedSource],
                );
                setEditExpensePaySource(trimmedSource);
                setEditExpenseNewPaySource('');
                setShowNewExpensePaySourceSheet(false);
              }
            }}
          />
          <Spacer height={heightPixel(10)} />
          <Button
            title="Cancel"
            variant="outline"
            style={{borderColor: color.primary}}
            titleStyle={{color: color.primary}}
            onPress={() => {
              setShowNewExpensePaySourceSheet(false);
              setEditExpenseNewPaySource('');
              setShowExpensePaySourceSheet(true);
            }}
          />
        </View>
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
          replaceOnFirstType
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
  disabledArrowBtn: {
    opacity: 0.45,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  savingsOverviewCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: widthPixel(16),
    paddingVertical: heightPixel(12),
  },
  savingsOverviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsOverviewMetric: {
    flex: 1,
    minWidth: 0,
    gap: heightPixel(4),
  },
  currentSavingsMetricTouchable: {
    borderRadius: 8,
    paddingVertical: heightPixel(4),
    paddingHorizontal: widthPixel(4),
    marginVertical: -heightPixel(4),
    marginHorizontal: -widthPixel(4),
  },
  currentSavingsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(8),
  },
  currentSavingsAmountText: {
    flex: 1,
    minWidth: 0,
  },
  currentSavingsChevron: {
    opacity: 0.65,
  },
  savingsOverviewDivider: {
    width: 1.5,
    height: heightPixel(44),
    opacity: 0.85,
    marginHorizontal: widthPixel(16),
  },
  savingsProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(5),
  },
  savingsProgressTrack: {
    height: heightPixel(28),
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  savingsProgressFill: {
    minWidth: widthPixel(52),
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsOverviewRule: {
    height: 1,
    opacity: 0.45,
    marginTop: heightPixel(8),
    marginBottom: heightPixel(4),
  },
  toSaveOverviewRow: {
    alignSelf: 'flex-start',
    width: '48%',
    minHeight: heightPixel(46),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: widthPixel(10),
  },
  toSaveIconCircle: {
    width: widthPixel(36),
    height: heightPixel(36),
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: heightPixel(5),
  },
  toSaveDollarInnerCircle: {
    width: widthPixel(24),
    height: heightPixel(24),
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toSaveTrendIcon: {
    position: 'absolute',
    right: widthPixel(-2),
    top: heightPixel(-2),
  },
  toSaveOverviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: heightPixel(2),
  },
  toSaveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(5),
  },
  summaryBanner: {
    width: '100%',
    borderRadius: 10,
    minHeight: heightPixel(76),
    paddingHorizontal: widthPixel(8),
    paddingVertical: heightPixel(7),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  carryOverSlot: {
    flex: 0.78,
  },
  summaryMetric: {
    width: '100%',
    minWidth: 0,
    minHeight: heightPixel(58),
    alignItems: 'center',
    justifyContent: 'center',
    gap: heightPixel(3),
  },
  summaryIcon: {
    height: heightPixel(20),
    width: widthPixel(22),
    resizeMode: 'contain',
  },
  summaryDivider: {
    width: 1,
    height: heightPixel(48),
    opacity: 0.22,
    marginHorizontal: widthPixel(5),
  },
  carryOverSummaryMetric: {
    borderRadius: 8,
    paddingHorizontal: widthPixel(4),
    paddingVertical: heightPixel(3),
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  carryOverValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(5),
  },
  disabledSummaryMetric: {
    opacity: 0.85,
  },
  manualIncomeModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: widthPixel(8),
    marginTop: heightPixel(2),
  },
  manualIncomeModalButton: {
    minWidth: widthPixel(92),
    minHeight: heightPixel(32),
    borderRadius: 8,
    paddingHorizontal: widthPixel(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualIncomeDismissButton: {
    borderWidth: 1,
  },
  additionalIncomeBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(12),
  },
  additionalIncomeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
    flexWrap: 'wrap',
  },
  additionalIncomeInputWrap: {
    minWidth: widthPixel(96),
    minHeight: heightPixel(34),
    borderRadius: 8,
    paddingHorizontal: widthPixel(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(4),
  },
  additionalIncomeInput: {
    flex: 1,
    minWidth: widthPixel(52),
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: 'regular',
  },
  additionalIncomeActions: {
    gap: heightPixel(8),
  },
  additionalIncomeButton: {
    minWidth: widthPixel(78),
    borderRadius: 8,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(8),
    alignItems: 'center',
  },
  additionalIncomeDismiss: {
    borderWidth: 1,
    borderColor: '#A0A4AD',
    backgroundColor: 'transparent',
  },
  incomePanel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(14),
  },
  incomePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(12),
  },
  incomeHeaderValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
  },
  incomePanelDivider: {
    height: 1,
    opacity: 0.5,
    marginVertical: heightPixel(14),
  },
  additionalIncomeListRow: {
    minHeight: heightPixel(58),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: widthPixel(10),
    paddingVertical: heightPixel(8),
    marginBottom: heightPixel(8),
  },
  additionalIncomeSwipeContainer: {
    overflow: 'hidden',
    borderRadius: 8,
    marginBottom: heightPixel(8),
  },
  additionalIncomeIcon: {
    width: widthPixel(34),
    height: heightPixel(34),
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalIncomeDollarCircle: {
    width: widthPixel(23),
    height: heightPixel(23),
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalIncomeTextGroup: {
    flex: 1,
    gap: heightPixel(3),
  },
  additionalIncomeToggleRow: {
    minHeight: heightPixel(58),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(12),
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(9),
  },
  additionalIncomeToggleText: {
    flex: 1,
    gap: heightPixel(3),
  },
  incomeSwipeActionGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: heightPixel(56),
  },
  incomeSwipeAction: {
    width: widthPixel(74),
    alignItems: 'center',
    justifyContent: 'center',
    gap: heightPixel(4),
  },
  incomeSwipeEdit: {
    backgroundColor: '#55575D',
  },
  incomeSwipeDelete: {
    backgroundColor: '#EF3434',
  },
  debtTile: {
    minHeight: heightPixel(58),
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
    marginBottom: heightPixel(10),
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  debtDragZone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
    minHeight: heightPixel(38),
  },
  debtName: {
    flex: 1,
  },
  debtDragHandle: {
    width: widthPixel(24),
    minHeight: heightPixel(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtBalance: {
    flex: 0.85,
    textAlign: 'left',
  },
  debtInputWrap: {
    width: widthPixel(96),
    minHeight: heightPixel(36),
    borderRadius: 8,
    paddingHorizontal: widthPixel(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(4),
  },
  debtInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: 'regular',
  },
  debtPriorityControls: {
    width: widthPixel(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: heightPixel(2),
  },
  debtPriorityButton: {
    width: widthPixel(24),
    height: heightPixel(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseActionButton: {
    width: widthPixel(30),
    height: heightPixel(30),
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: heightPixel(1),
  },
  swipeEditAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: widthPixel(70),
    borderRadius: 8,
  },
  swipeDeleteAction: {
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
    width: widthPixel(78),
    borderRadius: 8,
  },
  modalActionButton: {
    width: '100%',
    height: heightPixel(44),
    marginBottom: heightPixel(10),
  },
  detailContent: {
    gap: heightPixel(10),
    marginBottom: heightPixel(30),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: widthPixel(14),
  },
  detailLabel: {
    width: widthPixel(92),
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: heightPixel(18),
    paddingHorizontal: widthPixel(4),
  },
  categoryIconWrap: {
    borderRadius: heightPixel(50),
    width: widthPixel(55),
    height: widthPixel(55),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: heightPixel(8),
  },
  categoryIcon: {
    width: widthPixel(28),
    height: heightPixel(28),
    resizeMode: 'contain',
  },
});

export default HomeScreen;
