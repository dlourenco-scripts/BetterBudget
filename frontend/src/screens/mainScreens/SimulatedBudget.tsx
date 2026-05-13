import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {router, useFocusEffect} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {Swipeable} from 'react-native-gesture-handler';
import {Calendar} from 'react-native-calendars';
import {
  BottomSheet,
  Button,
  Header,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {expenseCategoryGroups} from '@/constants/expenseCategories';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

type SimExpense = {
  id: string;
  name: string;
  amount: number;
  monthlyAmount?: number;
  dueDate?: string;
  category?: string;
  frequency?: string;
};

type ExpenseSheetPanel = 'form' | 'date' | 'category' | 'frequency';

const emptyExpenseDraft = {
  id: '',
  name: '',
  amount: '',
  dueDate: '',
  category: '',
  frequency: 'Monthly',
};

const frequencyOptions = [
  'Every Pay Cycle',
  'Monthly',
  'Quaterly',
  'Bianually',
  'Annually',
];

const getCycleMonthlyMultiplier = (frequency?: string) => {
  const value = String(frequency || '').toLowerCase();
  if (value.includes('weekly') && !value.includes('bi')) return 52 / 12;
  if (value.includes('bi')) return 26 / 12;
  if (value.includes('semi')) return 2;
  return 1;
};

const getExpenseMonthlyMultiplier = (frequency?: string, cycleMultiplier = 1) => {
  const value = String(frequency || '').toLowerCase();
  if (value.includes('every pay')) return cycleMultiplier;
  if (value.includes('quarter') || value.includes('quater')) return 1 / 3;
  if (value.includes('bian') || value.includes('semi annual')) return 1 / 6;
  if (value.includes('annual')) return 1 / 12;
  if (value.includes('weekly') && !value.includes('bi')) return 52 / 12;
  if (value.includes('bi')) return 26 / 12;
  return 1;
};

const getMonthlyEquivalent = (amount: number, frequency?: string, cycleMultiplier = 1) =>
  Number(amount || 0) * getExpenseMonthlyMultiplier(frequency, cycleMultiplier);

const getCategoryIcon = (category?: string) => {
  const value = String(category || '').toLowerCase();
  if (value.includes('rent') || value.includes('housing')) return 'home';
  if (value.includes('car') || value.includes('auto') || value.includes('transport')) return 'truck';
  if (value.includes('grocery') || value.includes('food')) return 'shopping-cart';
  if (value.includes('util')) return 'zap';
  if (value.includes('health') || value.includes('medical')) return 'heart';
  if (value.includes('internet') || value.includes('phone')) return 'wifi';
  if (value.includes('insurance')) return 'shield';
  return 'credit-card';
};

const SimulatedBudget = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const userEmail = useAuthStore(state => state.userData?.email);
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userEmail || 'default'}`;
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState<SimExpense[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState(emptyExpenseDraft);
  const [expensePanel, setExpensePanel] = useState<ExpenseSheetPanel>('form');
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState('');
  const [simulationCycleMultiplier, setSimulationCycleMultiplier] = useState(1);

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.monthlyAmount ??
              getMonthlyEquivalent(expense.amount, expense.frequency, simulationCycleMultiplier),
          ),
        0,
      ),
    [expenses, simulationCycleMultiplier],
  );
  const remaining = income - totalExpenses;
  const remainingPercent = income > 0 ? Math.max(0, Math.min(100, (remaining / income) * 100)) : 0;
  const isEditing = Boolean(expenseDraft.id);

  const loadSimulation = useCallback(async () => {
    try {
      const budgetsResponse = await budgetApi.list();
      const budgetList = budgetsResponse.data || [];
      const storedPrimaryBudgetId = await AsyncStorage.getItem(primaryBudgetStorageKey);
      const targetBudget =
        budgetList.find((budget: any) => budget.id === storedPrimaryBudgetId) ||
        budgetList[0];

      if (!targetBudget?.id) {
        setIncome(0);
        setExpenses([]);
        return;
      }

      const detailResponse = await budgetApi.get(targetBudget.id);
      const budget = detailResponse.data;
      const activeCycle = budget?.currentCycle || budget?.cycles?.[0];
      const cycleExpenses = activeCycle?.expenses || [];
      const budgetExpenses = budget?.expenses || [];
      const cycleMultiplier = getCycleMonthlyMultiplier(budget?.cycleType || budget?.cycle_type);
      setSimulationCycleMultiplier(cycleMultiplier);
      const mergedExpenses = [...budgetExpenses, ...cycleExpenses].filter(
        (expense, index, list) =>
          list.findIndex(item => String(item.id) === String(expense.id)) === index,
      );

      setIncome(Number(activeCycle?.totalIncome || budget?.netPay || 0) * cycleMultiplier);
      setExpenses(
        mergedExpenses.map((expense: any) => {
          const frequency = expense.frequency || 'Every Pay Cycle';
          return {
            id: String(expense.id || `sim-${Date.now()}-${Math.random()}`),
            name: expense.name || 'Expense',
            amount: Number(expense.amount || 0),
            monthlyAmount: getMonthlyEquivalent(
              Number(expense.amount || 0),
              frequency,
              cycleMultiplier,
            ),
            dueDate: expense.dueDate || expense.due_date || '',
            category: expense.category || 'General',
            frequency,
          };
        }),
      );
    } catch (error) {
      console.error('Unable to load simulated budget:', error);
      setIncome(0);
      setExpenses([]);
    }
  }, [primaryBudgetStorageKey]);

  useFocusEffect(
    useCallback(() => {
      loadSimulation();
    }, [loadSimulation]),
  );

  const openAddExpense = () => {
    setExpenseDraft(emptyExpenseDraft);
    setExpensePanel('form');
    setShowExpenseSheet(true);
  };

  const openEditExpense = (expense: SimExpense) => {
    setExpenseDraft({
      id: expense.id,
      name: expense.name,
      amount: String(Number(expense.amount || 0)),
      dueDate: expense.dueDate || '',
      category: expense.category || '',
      frequency: expense.frequency || 'Monthly',
    });
    setExpensePanel('form');
    setShowExpenseSheet(true);
  };

  const closeExpenseSheet = () => {
    setShowExpenseSheet(false);
    setExpensePanel('form');
  };

  const openIncomeEdit = () => {
    setIncomeDraft(Number(income || 0).toFixed(2));
    setShowIncomeSheet(true);
  };

  const saveIncomeEdit = () => {
    const amount = Number(incomeDraft || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert('Invalid amount', 'Enter a valid monthly income amount.');
      return;
    }
    setIncome(amount);
    setShowIncomeSheet(false);
  };

  const saveSimExpense = () => {
    const amount = Number(expenseDraft.amount || 0);
    if (!expenseDraft.name.trim() || amount <= 0) {
      Alert.alert('Missing details', 'Enter an expense name and amount.');
      return;
    }

    const nextExpense: SimExpense = {
      id: expenseDraft.id || `sim-${Date.now()}`,
      name: expenseDraft.name.trim(),
      amount,
      monthlyAmount: getMonthlyEquivalent(
        amount,
        expenseDraft.frequency.trim() || 'Monthly',
        simulationCycleMultiplier,
      ),
      dueDate: expenseDraft.dueDate.trim(),
      category: expenseDraft.category.trim() || 'General',
      frequency: expenseDraft.frequency.trim() || 'Monthly',
    };

    setExpenses(previous =>
      expenseDraft.id
        ? previous.map(expense => (expense.id === expenseDraft.id ? nextExpense : expense))
        : [...previous, nextExpense],
    );
    setShowExpenseSheet(false);
    setExpenseDraft(emptyExpenseDraft);
    setExpensePanel('form');
  };

  const confirmDeleteExpense = (expense: SimExpense) => {
    Alert.alert('Delete simulated expense?', 'This only removes the expense from this simulation.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setExpenses(previous => previous.filter(item => item.id !== expense.id)),
      },
    ]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmMassDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('Delete selected expenses?', 'This only changes this simulation.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setExpenses(previous => previous.filter(expense => !selectedIds.has(expense.id)));
          setSelectedIds(new Set());
          setIsSelectionMode(false);
        },
      },
    ]);
  };

  const renderRightActions = (expense: SimExpense) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEditExpense(expense)}
        style={[styles.swipeAction, {backgroundColor: color.primary}]}>
        <Text size={12} variant="semibold" color={color.primaryButtonText}>
          Edit
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => confirmDeleteExpense(expense)}
        style={[styles.swipeAction, {backgroundColor: '#D94343'}]}>
        <Text size={12} variant="semibold" color="#FFFFFF">
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderExpenseRow = (expense: SimExpense) => {
    const isSelected = selectedIds.has(expense.id);
    const monthlyAmount = Number(
      expense.monthlyAmount ??
        getMonthlyEquivalent(expense.amount, expense.frequency, simulationCycleMultiplier),
    );
    const showMonthlyHelper = Math.abs(monthlyAmount - Number(expense.amount || 0)) > 0.005;
    const row = (
      <TouchableOpacity
        activeOpacity={0.82}
        onLongPress={() => {
          setIsSelectionMode(true);
          setSelectedIds(new Set([expense.id]));
        }}
        onPress={() => {
          if (isSelectionMode) toggleSelection(expense.id);
        }}
        style={styles.expenseRow}>
        {isSelectionMode && (
          <Image
            source={isSelected ? appImages.SelectBox : appImages.UnSelectBox}
            tintColor={color.primary}
            style={styles.checkboxIcon}
          />
        )}
        <View style={styles.expenseIcon}>
          <Feather name={getCategoryIcon(expense.category) as any} size={21} color="#F8AD2E" />
        </View>
        <View style={{flex: 1}}>
          <Text size={15} variant="semibold" color="#FFFFFF" numberOfLines={1}>
            {expense.name}
          </Text>
          <Text size={12} color="#B8BDC5" numberOfLines={1}>
            {[
              expense.dueDate ? `Due ${expense.dueDate}` : null,
              expense.frequency || 'Monthly',
              showMonthlyHelper ? `≈ ${currencySymbol}${monthlyAmount.toFixed(2)}/mo` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>
        <Text size={16} variant="medium" color="#FFFFFF">
          {currencySymbol}{Number(expense.amount || 0).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );

    return isSelectionMode ? (
      <View key={expense.id}>{row}</View>
    ) : (
      <Swipeable key={expense.id} overshootRight={false} renderRightActions={() => renderRightActions(expense)}>
        {row}
      </Swipeable>
    );
  };

  return (
    <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}} bottomSpace={false}>
      <Header
        canGoBack={isSelectionMode}
        onBackPress={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
        title="Simulated Budget"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        leftComponent={
          !isSelectionMode ? (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
              <Feather name="arrow-left" size={25} color={color.tabicon} />
            </TouchableOpacity>
          ) : undefined
        }
        rightComponent={
          !isSelectionMode ? (
            <Feather name="info" size={23} color="#F8AD2E" />
          ) : undefined
        }
      />

      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            onPress={() =>
              setSelectedIds(
                selectedIds.size === expenses.length
                  ? new Set()
                  : new Set(expenses.map(expense => expense.id)),
              )
            }
            style={styles.selectionAction}>
            <Image
              source={
                selectedIds.size === expenses.length && expenses.length > 0
                  ? appImages.SelectBox
                  : appImages.UnSelectBox
              }
              tintColor={color.primary}
              style={styles.checkboxIcon}
            />
            <Text size={14} variant="medium" color={color.tabicon}>
              Select All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmMassDelete}
            disabled={selectedIds.size === 0}
            style={[styles.massDeleteButton, {opacity: selectedIds.size === 0 ? 0.5 : 1}]}>
            <Text size={13} variant="semibold" color="#FFFFFF">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Spacer height={heightPixel(18)} />
      <View style={styles.modePill}>
        <Feather name="shuffle" size={12} color="#F8AD2E" />
        <Text size={12} variant="semibold" color="#F8AD2E">
          Simulation Mode
        </Text>
      </View>
      <Spacer height={heightPixel(10)} />
      <Text size={13} color="#D7D7D7" style={{textAlign: 'center', paddingHorizontal: widthPixel(35)}}>
        Changes won’t affect your current budget unless you apply them.
      </Text>

      <Spacer height={heightPixel(24)} />
      <View style={styles.summaryCard}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <Text size={12} color="#D7D7D7">Monthly Income</Text>
            <Text size={18} variant="semibold" color="#F8AD2E">
              {currencySymbol}{income.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text size={12} color="#D7D7D7">Total Expenses</Text>
            <Text size={18} variant="semibold" color="#FF4545">
              {currencySymbol}{totalExpenses.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text size={12} color="#D7D7D7">Remaining</Text>
            <Text size={18} variant="semibold" color={remaining < 0 ? '#FF4545' : '#F8AD2E'}>
              {currencySymbol}{remaining.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${remainingPercent}%`}]} />
        </View>
        <Text size={12} color="#D7D7D7" style={{textAlign: 'center'}}>
          {Math.round(remainingPercent)}% of income remaining
        </Text>
      </View>

      <Spacer height={heightPixel(26)} />
      <View style={styles.sectionHeader}>
        <Text size={17} variant="semibold" color="#FFFFFF">
          Income <Text size={15} color="#B8BDC5">(Monthly)</Text>
        </Text>
        <TouchableOpacity activeOpacity={0.8} onPress={openIncomeEdit}>
          <Text size={14} variant="semibold" color="#F8AD2E">Edit</Text>
        </TouchableOpacity>
      </View>
      <Spacer height={heightPixel(10)} />
      <View style={styles.incomeCard}>
        <View style={styles.incomeIcon}>
          <Feather name="dollar-sign" size={24} color="#F8AD2E" />
        </View>
        <View style={{flex: 1}}>
          <Text size={15} variant="semibold" color="#FFFFFF">
            Total Monthly Income
          </Text>
          <Text size={12} color="#B8BDC5">
            Converted from your pay schedule
          </Text>
        </View>
        <Text size={16} variant="semibold" color="#F8AD2E">
          {currencySymbol}{income.toFixed(2)}
        </Text>
      </View>

      <Spacer height={heightPixel(26)} />
      <View style={styles.sectionHeader}>
        <Text size={17} variant="semibold" color="#FFFFFF">
          Expenses <Text size={15} color="#B8BDC5">(Monthly)</Text>
        </Text>
        {!isSelectionMode && (
          <TouchableOpacity activeOpacity={0.8} onPress={openAddExpense}>
            <Text size={14} variant="semibold" color="#F8AD2E">
              + Add Expense
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Spacer height={heightPixel(10)} />
      <View style={styles.expenseList}>
        {expenses.map(renderExpenseRow)}
        <View style={styles.totalExpenseRow}>
          <Text size={15} variant="semibold" color="#FFFFFF">Total Expenses</Text>
          <Text size={16} variant="semibold" color="#FF4545">
            {currencySymbol}{totalExpenses.toFixed(2)}
          </Text>
        </View>
      </View>

      <Spacer height={heightPixel(18)} />
      <View style={styles.helpRow}>
        <View style={styles.helpIcon}>
          <Feather name="mouse-pointer" size={18} color="#F8AD2E" />
        </View>
        <Text size={12} color="#D7D7D7" style={{flex: 1}}>
          Swipe left on any expense to edit or delete. Long press to select multiple expenses to delete.
        </Text>
      </View>

      <Spacer height={heightPixel(24)} />
      <View style={styles.footerActions}>
        <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.exitButton}>
          <Text size={16} variant="semibold" color="#FFFFFF">
            Exit Simulation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} style={styles.applyButton}>
          <Text size={16} variant="semibold" color="#050609">
            Apply to Budget
          </Text>
        </TouchableOpacity>
      </View>

      <BottomSheet
        visible={showExpenseSheet}
        onClose={closeExpenseSheet}
        title={
          expensePanel === 'date'
            ? 'Select Due Date'
            : expensePanel === 'category'
              ? 'Select Category'
              : expensePanel === 'frequency'
                ? 'Select Frequency'
                : isEditing
                  ? 'Edit Simulated Expense'
                  : 'Add Simulated Expense'
        }
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(10)} />
        {expensePanel === 'form' && (
          <View style={{gap: heightPixel(12), marginBottom: heightPixel(28)}}>
            <TextInput
              title="Expense Name"
              placeholder="Expense Name"
              value={expenseDraft.name}
              onChangeText={name => setExpenseDraft(previous => ({...previous, name}))}
            />
            <TextInput
              title="Amount"
              placeholder="0"
              value={expenseDraft.amount}
              keyboardType="decimal-pad"
              useCurrencyIcon
              onChangeText={amount =>
                setExpenseDraft(previous => ({
                  ...previous,
                  amount: amount.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                }))
              }
            />
            <TextInput
              title="Due Date"
              placeholder="Select Due Date"
              value={expenseDraft.dueDate}
              editable={false}
              onPressIn={() => setExpensePanel('date')}
              rightIcon={appImages.Calenderimg}
              rightIconPress={() => setExpensePanel('date')}
            />
            <TextInput
              title="Category"
              placeholder="Select Category"
              value={expenseDraft.category}
              editable={false}
              onPressIn={() => setExpensePanel('category')}
            />
            <TextInput
              title="Frequency"
              placeholder="Select Frequency"
              value={expenseDraft.frequency}
              editable={false}
              onPressIn={() => setExpensePanel('frequency')}
            />
            <Button title={isEditing ? 'Save Changes' : 'Add Expense'} onPress={saveSimExpense} />
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={closeExpenseSheet}
            />
          </View>
        )}

        {expensePanel === 'date' && (
          <View style={{marginBottom: heightPixel(28)}}>
            <Calendar
              onDayPress={(day: {dateString: string}) => {
                setExpenseDraft(previous => ({...previous, dueDate: day.dateString}));
                setExpensePanel('form');
              }}
              markedDates={
                expenseDraft.dueDate
                  ? {
                      [expenseDraft.dueDate]: {
                        selected: true,
                        selectedColor: color.primary,
                        selectedTextColor: color.primaryButtonText,
                      },
                    }
                  : {}
              }
              theme={{
                calendarBackground: color.inputField,
                dayTextColor: color.black,
                monthTextColor: color.black,
                textDisabledColor: color.border,
                arrowColor: color.primary,
                todayTextColor: color.primary,
              }}
            />
            <Spacer height={heightPixel(14)} />
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={() => setExpensePanel('form')}
            />
          </View>
        )}

        {expensePanel === 'category' && (
          <View style={{marginBottom: heightPixel(28)}}>
            {expenseCategoryGroups.map(group => (
              <View key={group.title}>
                <Text
                  size={16}
                  variant="semibold"
                  color={color.black}
                  style={styles.sheetGroupTitle}>
                  {group.title}
                </Text>
                <View style={styles.categoryGrid}>
                  {group.items.map(item => {
                    const isSelected = expenseDraft.category === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        activeOpacity={0.82}
                        onPress={() => {
                          setExpenseDraft(previous => ({...previous, category: item.label}));
                          setExpensePanel('form');
                        }}
                        style={[
                          styles.categoryOption,
                          {
                            borderColor: isSelected ? color.primary : color.border,
                            backgroundColor: isSelected ? 'rgba(248, 173, 46, 0.12)' : 'transparent',
                          },
                        ]}>
                        <Image source={item.icon} style={styles.categoryIcon} resizeMode="contain" />
                        <Text size={11} variant="medium" color={color.tabicon} style={{textAlign: 'center'}}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <Spacer height={heightPixel(8)} />
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={() => setExpensePanel('form')}
            />
          </View>
        )}

        {expensePanel === 'frequency' && (
          <View style={{gap: heightPixel(10), marginBottom: heightPixel(28)}}>
            {frequencyOptions.map(option => {
              const isSelected = expenseDraft.frequency === option;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.82}
                  onPress={() => {
                    setExpenseDraft(previous => ({...previous, frequency: option}));
                    setExpensePanel('form');
                  }}
                  style={[
                    styles.sheetOption,
                    {
                      borderColor: isSelected ? color.primary : color.border,
                      backgroundColor: isSelected ? 'rgba(248, 173, 46, 0.12)' : 'transparent',
                    },
                  ]}>
                  <Text size={15} variant="medium" color={color.black}>
                    {option}
                  </Text>
                  {isSelected && <Feather name="check" size={18} color={color.primary} />}
                </TouchableOpacity>
              );
            })}
            <Button
              title="Cancel"
              variant="outline"
              style={{borderColor: color.primary}}
              titleStyle={{color: color.primary}}
              onPress={() => setExpensePanel('form')}
            />
          </View>
        )}
      </BottomSheet>

      <BottomSheet
        visible={showIncomeSheet}
        onClose={() => setShowIncomeSheet(false)}
        title="Edit Monthly Income"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(10)} />
        <View style={{gap: heightPixel(12), marginBottom: heightPixel(28)}}>
          <TextInput
            title="Amount"
            placeholder="0"
            value={incomeDraft}
            keyboardType="decimal-pad"
            useCurrencyIcon
            onChangeText={amount =>
              setIncomeDraft(amount.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))
            }
          />
          <Button title="Save" onPress={saveIncomeEdit} />
          <Button
            title="Cancel"
            variant="outline"
            style={{borderColor: color.primary}}
            titleStyle={{color: color.primary}}
            onPress={() => setShowIncomeSheet(false)}
          />
        </View>
      </BottomSheet>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  modePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(6),
    borderWidth: 1,
    borderColor: '#F8AD2E',
    borderRadius: 50,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(7),
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272A31',
    backgroundColor: '#050609',
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(18),
    gap: heightPixel(14),
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCell: {
    flex: 1,
    gap: heightPixel(8),
  },
  summaryDivider: {
    width: 1,
    height: heightPixel(50),
    backgroundColor: '#2D3038',
    marginHorizontal: widthPixel(8),
  },
  progressTrack: {
    height: heightPixel(12),
    borderRadius: 999,
    backgroundColor: '#25272D',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F8AD2E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incomeCard: {
    minHeight: heightPixel(76),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272A31',
    backgroundColor: '#050609',
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(12),
  },
  incomeIcon: {
    width: widthPixel(46),
    height: heightPixel(46),
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 173, 46, 0.15)',
  },
  expenseList: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272A31',
    backgroundColor: '#050609',
    overflow: 'hidden',
  },
  expenseRow: {
    minHeight: heightPixel(72),
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(10),
    borderBottomWidth: 1,
    borderBottomColor: '#272A31',
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(12),
  },
  expenseIcon: {
    width: widthPixel(42),
    height: heightPixel(42),
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 173, 46, 0.14)',
  },
  checkboxIcon: {
    width: widthPixel(18),
    height: heightPixel(18),
    resizeMode: 'contain',
  },
  totalExpenseRow: {
    minHeight: heightPixel(60),
    paddingHorizontal: widthPixel(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
  },
  helpIcon: {
    width: widthPixel(38),
    height: heightPixel(38),
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 173, 46, 0.12)',
  },
  footerActions: {
    flexDirection: 'row',
    gap: widthPixel(10),
    paddingBottom: heightPixel(18),
  },
  exitButton: {
    flex: 1,
    minHeight: heightPixel(54),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14171D',
  },
  applyButton: {
    flex: 1,
    minHeight: heightPixel(54),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8AD2E',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: heightPixel(10),
  },
  selectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
  },
  massDeleteButton: {
    borderRadius: 8,
    backgroundColor: '#D94343',
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(8),
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeAction: {
    width: widthPixel(72),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetGroupTitle: {
    marginTop: heightPixel(10),
    marginBottom: heightPixel(12),
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: widthPixel(10),
    marginBottom: heightPixel(12),
  },
  categoryOption: {
    width: '22%',
    minHeight: heightPixel(92),
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: widthPixel(4),
    paddingVertical: heightPixel(8),
    gap: heightPixel(6),
  },
  categoryIcon: {
    width: widthPixel(26),
    height: heightPixel(26),
  },
  sheetOption: {
    minHeight: heightPixel(50),
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: widthPixel(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default SimulatedBudget;
