import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import {AntDesign, Entypo, Feather} from '@expo/vector-icons';
import {Swipeable} from 'react-native-gesture-handler';
import {Calendar} from 'react-native-calendars';
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
import {expenseCategoryGroups} from '@/constants/expenseCategories';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
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

const HomeScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currencySymbol} = useCurrency();
  const debtSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debtSavedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const token = useAuthStore(state => state.token);
  const userData = useAuthStore(state => state.userData);
  const userEmail = userData?.email;
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userEmail || 'default'}`;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetDetails, setBudgetDetails] = useState<any[]>([]);
  const [primaryBudgetId, setPrimaryBudgetId] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [debtPaymentInputs, setDebtPaymentInputs] = useState<Record<string, string>>({});
  const [savedDebtIds, setSavedDebtIds] = useState<Set<string>>(new Set());
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
  const debtPaymentTotal = debts.reduce(
    (sum: number, debt: any) =>
      sum + Number(debtPaymentInputs[debt.id] ?? debt.minimumPayment ?? 0),
    0,
  );
  const toSaveAmount = Math.max(0, goalAllocation - debtPaymentTotal);
  const carryOverIn = Number(activeCycle?.carryOverIn || 0);
  const carryOverOut = Number(activeCycle?.carryOverOut || 0);
  const remaining = Number(
    activeCycle?.remainingAmount ??
      totalIncome - totalExpenses - goalAllocation - carryOverOut,
  );
  const totalSavings =
    Number(activeBudget?.currentSavings || 0) + toSaveAmount;
  const savingsGoal = Number(activeBudget?.savingsGoal || userData?.savingsGoal || 0);
  const isSavingsGoal = String(activeBudget?.goalType || '').toLowerCase().includes('sav');
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
        .toFixed(2),
      paymentSource,
      items: sourceExpenses.map((expense: any) => ({
        id: expense.id,
        date: formatOrdinalDay(expense.dueDate),
        label: expense.name,
        tag: expense.type,
        tagBg: colors.light.white,
        tagColor: colors.light.tabicon,
        raw: expense,
        amount: Number(expense.amount || 0).toFixed(2),
      })),
    }),
  );
  const paymentSourceOptions = Array.from(
    new Set(
      [
        ...(activeBudget?.expenses || []).map((expense: any) => expense.notes?.trim()),
        ...Object.keys(expensesByPaymentSource),
      ].filter((source): source is string => !!source && source !== 'Unassigned'),
    ),
  );

  const handleBudgetSelect = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    const nextBudget = budgetDetails.find(budget => budget.id === budgetId);
    const nextCycle = nextBudget?.currentCycle || nextBudget?.cycles?.[0];
    if (nextCycle) {
      setSelectedCycleId(nextCycle.id);
      setDate(dayjs(nextCycle.cycleStart));
    }
  };

  const handlePrimaryBudgetChange = async (budgetId: string) => {
    setPrimaryBudgetId(budgetId);
    await AsyncStorage.setItem(primaryBudgetStorageKey, budgetId);
  };

  const handleAutoFillChange = async (enabled: boolean) => {
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
    if (!activeBudgetId || !activeCycle?.id) {
      return;
    }

    try {
      const response = applyToAll
        ? await budgetApi.update(activeBudgetId, {netPay: amount})
        : await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
            baseIncome: amount,
          });

      if (!response.success) {
        Alert.alert('Unable to update income', response.message || 'Please try again.');
        return;
      }

      await loadBudgets();
    } catch (error: any) {
      Alert.alert('Unable to update income', error?.message || 'Please try again.');
    }
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
        const debtResponse = await budgetApi.updateDebt(activeBudgetId, debt.id, {
          minimumPayment: Number(sanitized || 0),
        });

        if (!debtResponse.success) {
          Alert.alert('Unable to save debt amount', debtResponse.message || 'Please try again.');
          return;
        }

        const cycleResponse = await budgetApi.updateCycle(activeBudgetId, activeCycle.id, {
          goalAllocation: nextGoalAllocation,
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

      const storedPrimaryBudgetId = await AsyncStorage.getItem(primaryBudgetStorageKey);
      const selectedId =
        selectedBudgetId && budgetList.some((budget: any) => budget.id === selectedBudgetId)
          ? selectedBudgetId
          : storedPrimaryBudgetId &&
              budgetList.some((budget: any) => budget.id === storedPrimaryBudgetId)
            ? storedPrimaryBudgetId
            : budgetList[0]?.id || '';
      const nextPrimaryId =
        storedPrimaryBudgetId &&
        budgetList.some((budget: any) => budget.id === storedPrimaryBudgetId)
          ? storedPrimaryBudgetId
          : selectedId;
      setSelectedBudgetId(selectedId);
      setPrimaryBudgetId(nextPrimaryId);

      const selectedBudget = details.find((budget: any) => budget.id === selectedId) || details[0];
      setDebtPaymentInputs(
        (selectedBudget?.debts || []).reduce((next: Record<string, string>, debt: any) => {
          next[debt.id] = String(Number(debt.minimumPayment || 0));
          return next;
        }, {}),
      );
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
  }, [primaryBudgetStorageKey, selectedBudgetId, selectedCycleId, token]);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets]),
  );

  useEffect(
    () => () => {
      Object.values(debtSaveTimers.current).forEach(clearTimeout);
      Object.values(debtSavedTimers.current).forEach(clearTimeout);
    },
    [],
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
  const [showOneTimePaySourceSheet, setShowOneTimePaySourceSheet] = useState(false);
  const [showToSaveSheet, setShowToSaveSheet] = useState(false);
  const [oneTimeExpenseName, setOneTimeExpenseName] = useState('');
  const [oneTimeExpenseAmount, setOneTimeExpenseAmount] = useState('');
  const [oneTimeExpensePaySource, setOneTimeExpensePaySource] = useState('');
  const [carryOverAmount, setCarryOverAmount] = useState('');
  const [toSaveInputAmount, setToSaveInputAmount] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [isEditingExpenseDetails, setIsEditingExpenseDetails] = useState(false);
  const [isAmountOnlyExpenseEdit, setIsAmountOnlyExpenseEdit] = useState(false);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDueDate, setEditExpenseDueDate] = useState('');
  const [editExpenseCategory, setEditExpenseCategory] = useState('');
  const [editExpenseType, setEditExpenseType] = useState('Fixed');
  const [showExpenseDateSheet, setShowExpenseDateSheet] = useState(false);
  const [showExpenseCategorySheet, setShowExpenseCategorySheet] = useState(false);

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
    setToSaveInputAmount(String(Number(toSaveAmount || 0)));
    setShowToSaveSheet(true);
  };

  const handleUpdateToSave = async () => {
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
    setSelectedExpense(expense);
    setEditExpenseName(expense.name || '');
    setEditExpenseAmount(String(Number(expense.amount || 0)));
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
    if (!selectedExpense) return;

    setEditExpenseName(selectedExpense.name || '');
    setEditExpenseAmount(String(Number(selectedExpense.amount || 0)));
    setEditExpenseDueDate(selectedExpense.dueDate || '');
    setEditExpenseCategory(selectedExpense.category || 'General');
    setEditExpenseType(
      String(selectedExpense.type || '').toLowerCase().includes('variable')
        ? 'Variable'
        : 'Fixed',
    );
    setIsAmountOnlyExpenseEdit(false);
    setIsEditingExpenseDetails(true);
  };

  const handleSaveExpenseDetails = async () => {
    if (!activeBudgetId || !selectedExpense) return;

    const amount = Number(editExpenseAmount || 0);
    if (amount <= 0) {
      Alert.alert('Missing expense details', 'Enter an amount.');
      return;
    }

    if (!isAmountOnlyExpenseEdit && (!editExpenseName.trim() || !editExpenseDueDate.trim())) {
      Alert.alert('Missing expense details', 'Enter a name, amount, and due date.');
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
            selectedBudgetId={activeBudgetId}
            onPrimaryBudgetChange={handlePrimaryBudgetChange}
            onBudgetSelect={handleBudgetSelect}
            currentSavings={Number(activeBudget?.currentSavings || 0)}
            savingsGoal={Number(
              activeBudget?.savingsGoal ||
                userData?.savingsGoal ||
                0,
            )}
            currentIncome={Number(
              activeCycle?.baseIncome || activeBudget?.netPay || incomeFromItems || 0,
            )}
            activeCycleId={activeCycle?.id}
            autoFillEnabled={Boolean(activeBudget?.autoFillEnabled)}
            onAutoFillChange={handleAutoFillChange}
            onSavingsUpdate={handleSavingsUpdate}
            onIncomeUpdate={handleIncomeUpdate}
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
                  <TouchableOpacity onPress={openToSaveSheet} hitSlop={10}>
                    <Feather name="edit-2" size={14} color={color.tabicon} />
                  </TouchableOpacity>
                </View>
                <Spacer height={10} />
                <Text size={18} variant="medium" color={color.primary}>
                  {currencySymbol}{toSaveAmount.toFixed(2)}
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
            {isSavingsGoal && <ProgressBar progressPercent={savingsProgressPercent} />}
          </View>
        </WalkthroughTooltip>

        <Spacer height={20} />
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
          <Text style={styles.dateText}>{date.format('MMMM, DD, YYYY')}</Text>
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
            <GradientExpandableCard title="Income" value={totalIncome.toFixed(2)} />
          </View>
        </WalkthroughTooltip>
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
                    <View
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
                        style={{width: widthPixel(36), textAlign: 'right'}}>
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
                      {(isVariable || isOneTime) && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => openExpenseEditor(row.raw)}
                          hitSlop={10}
                          style={styles.expenseActionButton}>
                          <Feather name="edit-2" size={16} color={colors.light.tabicon} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );

                  return isOneTime ? (
                    <Swipeable
                      key={row.id || index}
                      renderRightActions={() => (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => confirmDeleteOneTimeExpense(row.raw)}
                          style={styles.swipeDeleteAction}>
                          <Text size={12} variant="semibold" color="#FFF">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      )}>
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
            {debts.map((debt: any) => (
              <View
                key={debt.id}
                style={[styles.debtTile, {backgroundColor: color.inputField}]}>
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
                  {currencySymbol}
                  {Number(debt.balance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View style={[styles.debtInputWrap, {backgroundColor: color.bg}]}>
                  <Text size={13} variant="medium" color={color.tabicon}>
                    {currencySymbol}
                  </Text>
                  <NativeTextInput
                    value={debtPaymentInputs[debt.id] ?? '0'}
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
              </View>
            ))}
          </>
        )}
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
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Pay Source"
          placeholder="Select or enter Pay Source"
          placeholderTextColor={color.tabicon}
          value={oneTimeExpensePaySource}
          onPress={() => setShowOneTimePaySourceSheet(true)}
          onChangeText={setOneTimeExpensePaySource}
          rightIcon={appImages.ArrowDown}
          rightIconPress={() => setShowOneTimePaySourceSheet(true)}
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
      </BottomSheet>
      <BottomSheet
        visible={showOneTimePaySourceSheet}
        onClose={() => setShowOneTimePaySourceSheet(false)}
        title="Select Pay Source"
        backgroundColor={color.inputField}
        maxHeight={420}>
        <View style={{gap: heightPixel(10), marginBottom: heightPixel(30)}}>
          {paymentSourceOptions.length > 0 ? (
            paymentSourceOptions.map(source => (
              <TouchableOpacity
                key={source}
                activeOpacity={0.8}
                onPress={() => {
                  setOneTimeExpensePaySource(source);
                  setShowOneTimePaySourceSheet(false);
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
            ))
          ) : (
            <Text size={14} color={color.tabicon} style={{textAlign: 'center'}}>
              Add a recurring expense with a pay source first.
            </Text>
          )}
        </View>
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
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        {selectedExpense && !isEditingExpenseDetails && (
          <View style={{gap: heightPixel(12), marginBottom: heightPixel(35)}}>
            {[
              ['Name', selectedExpense.name],
              ['Amount', `${currencySymbol}${Number(selectedExpense.amount || 0).toFixed(2)}`],
              ['Due Date', selectedExpense.dueDate || 'Not set'],
              ['Category', selectedExpense.category || 'General'],
              ['Fixed / Variable', selectedExpense.type || 'Fixed'],
            ].map(([label, value]) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: widthPixel(12),
                }}>
                <Text size={13} color={color.tabicon}>
                  {label}
                </Text>
                <Text
                  size={14}
                  color={color.black}
                  variant="medium"
                  style={{flex: 1, textAlign: 'right'}}>
                  {value}
                </Text>
              </View>
            ))}
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
          </View>
        )}

        {selectedExpense && isEditingExpenseDetails && (
          <View style={{gap: heightPixel(14), marginBottom: heightPixel(35)}}>
            {!isAmountOnlyExpenseEdit && (
              <TextInput
                title="Name"
                placeholder="Expense Name"
                value={editExpenseName}
                onChangeText={setEditExpenseName}
              />
            )}
            <TextInput
              title="Amount"
              placeholder="0"
              keyboardType="numeric"
              useCurrencyIcon={true}
              value={editExpenseAmount}
              onChangeText={setEditExpenseAmount}
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
            <Button
              title="Save Changes"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
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
        )}
      </BottomSheet>
      <BottomSheet
        visible={showExpenseDateSheet}
        onClose={() => setShowExpenseDateSheet(false)}
        title="Select Due Date"
        backgroundColor={color.inputField}
        maxHeight={520}>
        <Calendar
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
                      <Image source={item.icon} style={styles.categoryIcon} />
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
  disabledArrowBtn: {
    opacity: 0.45,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  debtTile: {
    minHeight: heightPixel(58),
    borderRadius: 8,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
    marginBottom: heightPixel(10),
  },
  debtName: {
    flex: 1,
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
  expenseActionButton: {
    width: widthPixel(30),
    height: heightPixel(30),
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteAction: {
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
    width: widthPixel(78),
    marginVertical: heightPixel(1),
    borderRadius: 8,
  },
  modalActionButton: {
    width: '100%',
    height: heightPixel(44),
    marginBottom: heightPixel(10),
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
