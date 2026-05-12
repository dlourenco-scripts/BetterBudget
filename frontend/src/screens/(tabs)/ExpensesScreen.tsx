import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {Calendar} from 'react-native-calendars';
import {BottomSheet, Button, Header, Spacer, Text, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {expenseCategoryGroups} from '@/constants/expenseCategories';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

interface ExpenseItem {
  id: string;
  title: string;
  value: string;
  subText: string;
  kind: 'expense' | 'debt';
  type?: string;
  dueDate?: string;
  category?: string;
  frequency?: string;
}

type ExpenseEditPanel = 'form' | 'date' | 'category';

const ExpensesScreen = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const isDark = color.bg === '#171A21';
  const [showAddExpenseSheet, setShowAddExpenseSheet] = useState(false);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [budgetId, setBudgetId] = useState('');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [debts, setDebts] = useState<ExpenseItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpenseType, setEditExpenseType] = useState('Fixed');
  const [expenseEditPanel, setExpenseEditPanel] = useState<ExpenseEditPanel>('form');
  const userEmail = useAuthStore(state => state.userData?.email);
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userEmail || 'default'}`;

  const loadExpenses = useCallback(async () => {
    try {
      const budgetsResponse = await budgetApi.list();
      const budgetList = budgetsResponse.data || [];
      const storedPrimaryBudgetId = await AsyncStorage.getItem(primaryBudgetStorageKey);
      const targetBudget =
        budgetList.find((budget: any) => budget.id === storedPrimaryBudgetId) ||
        budgetList[0];
      if (!targetBudget?.id) {
        setBudgetId('');
        setExpenses([]);
        setDebts([]);
        return;
      }

      setBudgetId(targetBudget.id);
      const detailResponse = await budgetApi.get(targetBudget.id);
      const budget = detailResponse.data;

      setExpenses(
        (budget?.expenses || [])
          .filter(
            (expense: any) =>
              !String(expense.frequency || '').toLowerCase().includes('one'),
          )
          .map((expense: any) => ({
            id: expense.id,
            title: expense.name,
            value: Number(expense.amount || 0).toFixed(2),
            subText: expense.dueDate ? dayjs(expense.dueDate).format('MMM-DD') : '',
            kind: 'expense',
            type: expense.type,
            dueDate: expense.dueDate,
            category: expense.category,
            frequency: expense.frequency,
          })),
      );
      const debtItems: ExpenseItem[] = (budget?.debts || []).map((debt: any) => ({
          id: debt.id,
          title: debt.name,
          value: Number(debt.balance || 0).toFixed(2),
          subText: '',
          kind: 'debt',
        }));
      setDebts(debtItems);
    } catch (error) {
      console.error('Unable to load expenses:', error);
    }
  }, [primaryBudgetStorageKey]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const allItems = [...expenses, ...debts];

  const handleLongPress = (item: ExpenseItem) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([item.id]));
  };

  const handleCardPress = (item: ExpenseItem) => {
    if (isSelectionMode) {
      toggleSelection(item.id);
      return;
    }

    setSelectedItem(item);
    setIsEditingDetails(false);
    setShowExpenseDetails(true);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map(e => e.id)));
    }
  };

  const deleteSelectedItems = async () => {
    if (!budgetId) return;

    try {
      await Promise.all(
        allItems
          .filter(item => selectedIds.has(item.id))
          .map(item =>
            item.kind === 'debt'
              ? budgetApi.deleteDebt(budgetId, item.id)
              : budgetApi.deleteExpense(budgetId, item.id),
          ),
      );
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      await loadExpenses();
    } catch (error: any) {
      Alert.alert('Unable to delete', error?.message || 'Please try again.');
    }
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) {
      return;
    }

    Alert.alert(
      'Delete selected items?',
      `This will permanently delete ${selectedIds.size} selected item${selectedIds.size === 1 ? '' : 's'}.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: deleteSelectedItems},
      ],
    );
  };

  const handleDeleteItem = async (item = selectedItem) => {
    if (!budgetId) return;
    if (!item) return;

    const deleteItem = async () => {
      try {
        const response =
          item.kind === 'debt'
            ? await budgetApi.deleteDebt(budgetId, item.id)
            : await budgetApi.deleteExpense(budgetId, item.id);

        if (!response.success) {
          Alert.alert('Unable to delete', response.message || 'Please try again.');
          return;
        }

        await loadExpenses();
        setShowExpenseDetails(false);
        setSelectedItem(null);
      } catch (error: any) {
        Alert.alert('Unable to delete', error?.message || 'Please try again.');
      }
    };

    const itemLabel = item.kind === 'debt' ? 'debt' : 'expense';
    Alert.alert(`Delete ${itemLabel}?`, `This will delete this ${itemLabel} from this budget.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: deleteItem},
    ]);
  };

  const startEditingDetails = (item = selectedItem) => {
    if (!item) {
      return;
    }

    setEditName(item.title);
    setEditAmount(String(Number(item.value || 0)));
    setEditDueDate(item.dueDate || '');
    setEditCategory(item.category || '');
    setEditExpenseType(
      String(item.type || '').toLowerCase().includes('variable')
        ? 'Variable'
        : 'Fixed',
    );
    setExpenseEditPanel('form');
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    if (!budgetId || !selectedItem) {
      return;
    }

    const amount = Number(editAmount || 0);
    if (!editName.trim() || !amount || amount <= 0) {
      Alert.alert('Missing details', 'Enter a name and amount.');
      return;
    }

    if (selectedItem.kind === 'expense' && !editDueDate.trim()) {
      Alert.alert('Missing expense details', 'Enter a name, amount, and due date.');
      return;
    }

    try {
      const response =
        selectedItem.kind === 'debt'
          ? await budgetApi.updateDebt(budgetId, selectedItem.id, {
              name: editName.trim(),
              balance: amount,
            })
          : await budgetApi.updateExpense(budgetId, selectedItem.id, {
              name: editName.trim(),
              amount,
              dueDate: editDueDate.trim(),
              category: editCategory.trim() || 'General',
              frequency: selectedItem.frequency || 'Every Pay Cycle',
              type: editExpenseType,
            });

      if (!response.success) {
        Alert.alert('Unable to update', response.message || 'Please try again.');
        return;
      }

      await loadExpenses();
      setShowExpenseDetails(false);
      setIsEditingDetails(false);
      setExpenseEditPanel('form');
      setSelectedItem(null);
    } catch (error: any) {
      Alert.alert('Unable to update', error?.message || 'Please try again.');
    }
  };

  const renderSelectionCheckbox = (item: ExpenseItem) =>
    isSelectionMode ? (
      <TouchableOpacity
        onPress={() => toggleSelection(item.id)}
        style={{
          borderRadius: 50,
          backgroundColor: color.inputField,
          padding: 10,
        }}>
        <Image
          source={selectedIds.has(item.id) ? appImages.SelectBox : appImages.UnSelectBox}
          tintColor={color.primary}
          style={{
            width: widthPixel(18),
            height: heightPixel(18),
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>
    ) : null;

  const renderItem = (item: ExpenseItem) => {
    return (
      <View key={item.id} style={styles.itemRow}>
        {renderSelectionCheckbox(item)}
        <Pressable
          style={[
            styles.expenseTile,
            {
              backgroundColor: color.inputField,
              borderColor: color.primary,
            },
          ]}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          hitSlop={4}>
          <View style={styles.expenseTitleWrap}>
            {!!item.subText && (
              <Text size={14} color={color.black}>
                {item.subText}
              </Text>
            )}
            <Text
              size={15}
              variant="medium"
              color={color.black}
              style={styles.expenseName}
              numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <Text size={15} variant="medium" color={color.black}>
            {currencySymbol}
            {Number(item.value || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          {!isSelectionMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCardPress(item)}
              hitSlop={10}
              style={styles.expenseActionButton}>
              <Feather name="more-horizontal" size={20} color={color.tabicon} />
            </TouchableOpacity>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
      <Header
        title="Expenses"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={isSelectionMode}
        onBackPress={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
        leftComponent={undefined}
        rightComponent={
          !isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                backgroundColor: color.iconCardBg,
                borderRadius: 50,
                padding: 8,
              }}
              onPress={() => setShowAddExpenseSheet(true)}>
              <Image
                source={appImages.AddImg}
                style={{
                  height: heightPixel(20),
                  width: widthPixel(20),
                  resizeMode: 'contain',
                  tintColor: color.tabicon,
                }}
              />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isSelectionMode && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            marginBottom: 10,
          }}>
          <TouchableOpacity
            onPress={handleSelectAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
            <View
              style={{
                backgroundColor: isDark ? color.black : color.inputField,
                padding: 10,
                borderRadius: 50,
              }}>
              <Image
                source={
                  selectedIds.size === allItems.length && allItems.length > 0
                    ? appImages.SelectBox
                    : appImages.UnSelectBox
                }
                tintColor={color.primary}
                style={{
                  width: widthPixel(18),
                  height: heightPixel(18),
                  resizeMode: 'contain',
                }}
              />
            </View>
            <Text
              size={14}
              variant="medium"
              color={color.tabicon}
              style={{textDecorationLine: 'underline'}}>
              Select All
            </Text>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', gap: 15}}>
            <TouchableOpacity
              disabled={selectedIds.size === 0}
              onPress={confirmDeleteSelected}
              style={{
                backgroundColor: selectedIds.size === 0 ? color.disabled : '#D92D20',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}>
              <Text size={14} variant="medium" color="#FFF">
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {expenses.length === 0 && debts.length === 0 ? (
          <Text size={14} color={color.tabicon}>
            No expenses or debt added
          </Text>
        ) : (
          <>
            {expenses.length > 0 && (
              <>
                <Text size={15} variant="medium" color={color.black}>
                  Expenses
                </Text>
                <Spacer height={10} />
                {expenses.map(renderItem)}
              </>
            )}

            {debts.length > 0 && (
              <>
                <Spacer height={expenses.length > 0 ? 20 : 0} />
                <Text size={15} variant="medium" color={color.black}>
                  Debt
                </Text>
                <Spacer height={10} />
                {debts.map(renderItem)}
              </>
            )}
          </>
        )}
        <Spacer height={50} />
      </ScrollView>

      <BottomSheet
        visible={showAddExpenseSheet}
        onClose={() => setShowAddExpenseSheet(false)}
        title="What do you want to add?"
        backgroundColor={color.inputField}>
        <Spacer height={20} />
        <View
          style={{
            marginBottom: heightPixel(60),
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: color.primary,
              padding: 8,
              borderRadius: 6,
              paddingHorizontal: widthPixel(15),
            }}
            activeOpacity={0.8}
            onPress={() => {
              setShowAddExpenseSheet(false);
              router.navigate({
                pathname: '/auth/RecurringExpenses',
                params: {fromExpenses: 'true', budgetId},
              });
            }}>
            <Text size={16} variant="regular" color={color.black}>
              Recurring Expense
            </Text>
          </TouchableOpacity>
          <Spacer height={10} />
          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              padding: 8,
              borderRadius: 6,
              paddingHorizontal: widthPixel(15),
            }}
            activeOpacity={0.8}
            onPress={() => {
              setShowAddExpenseSheet(false);
              router.navigate({
                pathname: '/auth/Debt',
                params: {fromHome: 'true', budgetId},
              });
            }}>
            <Text size={16} variant="regular" color={color.black}>
              Debt
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showExpenseDetails}
        onClose={() => {
          setShowExpenseDetails(false);
          setIsEditingDetails(false);
          setExpenseEditPanel('form');
          setSelectedItem(null);
        }}
        title={selectedItem?.kind === 'debt' ? 'Debt Details' : 'Expense Details'}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        {selectedItem && !isEditingDetails && (
          <View style={{gap: heightPixel(12), marginBottom: heightPixel(35)}}>
            {[
              ['Name', selectedItem.title],
              [selectedItem.kind === 'debt' ? 'Total' : 'Amount', `$${selectedItem.value}`],
              ...(selectedItem.kind === 'expense'
                ? [
                    ['Due Date', selectedItem.dueDate || selectedItem.subText || 'Not set'],
                    ['Category', selectedItem.category || 'General'],
                    ['Fixed / Variable', selectedItem.type || 'Fixed'],
                  ]
                : []),
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
              title={selectedItem.kind === 'debt' ? 'Edit Debt' : 'Edit Expense'}
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={() => startEditingDetails()}
            />
            <Button
              title={selectedItem.kind === 'debt' ? 'Delete Debt' : 'Delete Expense'}
              variant="outline"
              style={{...styles.modalActionButton, borderColor: '#D92D20'}}
              titleStyle={{color: '#D92D20'}}
              onPress={() => handleDeleteItem()}
            />
          </View>
        )}

        {selectedItem && isEditingDetails && expenseEditPanel === 'date' && (
          <View style={{gap: heightPixel(14), marginBottom: heightPixel(35)}}>
            <Calendar
              onDayPress={day => {
                setEditDueDate(day.dateString);
                setExpenseEditPanel('form');
              }}
              markedDates={
                editDueDate
                  ? {[editDueDate]: {selected: true, selectedColor: color.primary}}
                  : undefined
              }
            />
            <Button
              title="Cancel"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={() => setExpenseEditPanel('form')}
            />
          </View>
        )}

        {selectedItem && isEditingDetails && expenseEditPanel === 'category' && (
          <View style={{marginBottom: heightPixel(35)}}>
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
                          setEditCategory(item.label);
                          setExpenseEditPanel('form');
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
            <Button
              title="Cancel"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={() => setExpenseEditPanel('form')}
            />
          </View>
        )}

        {selectedItem && isEditingDetails && expenseEditPanel === 'form' && (
          <View style={{gap: heightPixel(14), marginBottom: heightPixel(35)}}>
            <TextInput
              title="Name"
              placeholder="Expense Name"
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              title="Amount"
              placeholder="0"
              keyboardType="numeric"
              useCurrencyIcon={true}
              value={editAmount}
              onChangeText={setEditAmount}
            />
            {selectedItem.kind === 'expense' && (
              <>
                <TextInput
                  title="Due Date"
                  placeholder="YYYY-MM-DD"
                  value={editDueDate}
                  onPress={() => setExpenseEditPanel('date')}
                  onFocus={() => setExpenseEditPanel('date')}
                  rightIcon={appImages.Calenderimg}
                  rightIconPress={() => setExpenseEditPanel('date')}
                />
                <TextInput
                  title="Category"
                  placeholder="Category"
                  value={editCategory}
                  onPress={() => setExpenseEditPanel('category')}
                  rightIcon={appImages.ArrowDown}
                  rightIconPress={() => setExpenseEditPanel('category')}
                />
                <View style={{flexDirection: 'row', gap: widthPixel(10)}}>
                  {[
                    {label: 'Fixed', value: 'Fixed'},
                    {label: 'Variable', value: 'Variable'},
                  ].map(option => (
                    <TouchableOpacity
                      key={option.label}
                      activeOpacity={0.8}
                      onPress={() => setEditExpenseType(option.value)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        paddingVertical: heightPixel(11),
                        alignItems: 'center',
                        backgroundColor:
                          editExpenseType === option.value ? color.primary : color.bg,
                        borderWidth: 1,
                        borderColor: color.primary,
                      }}>
                      <Text size={14} variant="medium" color={color.black}>
                        {option.label}
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
              onPress={handleSaveDetails}
            />
            <Button
              title="Cancel"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={() => {
                setExpenseEditPanel('form');
                setIsEditingDetails(false);
              }}
            />
          </View>
        )}
      </BottomSheet>
    </Wrapper>
  );
};

export default ExpensesScreen;

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 5,
  },
  expenseTile: {
    flex: 1,
    minHeight: heightPixel(56),
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: widthPixel(10),
    paddingVertical: heightPixel(14),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: widthPixel(10),
  },
  expenseTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(6),
  },
  expenseName: {
    flex: 1,
  },
  expenseActionButton: {
    width: widthPixel(32),
    height: heightPixel(32),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
