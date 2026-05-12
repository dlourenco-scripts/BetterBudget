import React, {useCallback, useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import dayjs from 'dayjs';
import {useFocusEffect, useLocalSearchParams} from 'expo-router';
import {Calendar} from 'react-native-calendars';
import {BottomSheet, Button, Header, Spacer, Text, TextInput, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {expenseCategoryGroups} from '@/constants/expenseCategories';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel} from '@/services/responsive';

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

type CycleExpense = {
  id: string;
  name: string;
  amount: number;
  type?: string;
  frequency?: string;
  dueDate?: string;
  notes?: string;
};

const DebitCard = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const params = useLocalSearchParams<{
    budgetId?: string;
    cycleId?: string;
    paymentSource?: string;
  }>();
  const budgetId = Array.isArray(params.budgetId)
    ? params.budgetId[0]
    : params.budgetId;
  const cycleId = Array.isArray(params.cycleId)
    ? params.cycleId[0]
    : params.cycleId;
  const selectedPaymentSource = Array.isArray(params.paymentSource)
    ? params.paymentSource[0]
    : params.paymentSource;
  const [currentBudgetId, setCurrentBudgetId] = useState('');
  const [expenses, setExpenses] = useState<CycleExpense[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<CycleExpense | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpenseType, setEditExpenseType] = useState('Fixed');
  const [showEditDateSheet, setShowEditDateSheet] = useState(false);
  const [showEditCategorySheet, setShowEditCategorySheet] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      const targetBudgetId = budgetId || (await budgetApi.list()).data?.[0]?.id;
      if (!targetBudgetId) {
        setCurrentBudgetId('');
        setExpenses([]);
        setSourceTotal(0);
        return;
      }

      setCurrentBudgetId(targetBudgetId);
      const detailResponse = await budgetApi.get(targetBudgetId);
      const budget = detailResponse.data;
      const activeCycle =
        budget?.cycles?.find((cycle: any) => cycle.id === cycleId) ||
        budget?.currentCycle ||
        budget?.cycles?.[0];

      const cycleExpenses = activeCycle?.expenses || [];
      const filteredExpenses = selectedPaymentSource
        ? cycleExpenses.filter(
            (expense: CycleExpense) =>
              (expense.notes?.trim() || 'Unassigned') === selectedPaymentSource,
          )
        : cycleExpenses;

      setExpenses(filteredExpenses);
      setSourceTotal(
        filteredExpenses.reduce(
          (sum: number, expense: CycleExpense) =>
            sum + Number(expense.amount || 0),
          0,
        ),
      );
    } catch (error) {
      console.error('Unable to load pay source expenses:', error);
      setExpenses([]);
      setSourceTotal(0);
    }
  }, [budgetId, cycleId, selectedPaymentSource]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const openExpenseDetails = (expense: CycleExpense) => {
    setSelectedExpense(expense);
    setIsEditingDetails(false);
    setShowExpenseDetails(true);
  };

  const startEditingExpense = () => {
    if (!selectedExpense) return;

    setEditName(selectedExpense.name);
    setEditAmount(String(Number(selectedExpense.amount || 0)));
    setEditDueDate(selectedExpense.dueDate || '');
    setEditCategory((selectedExpense as any).category || 'General');
    setEditExpenseType(
      String(selectedExpense.type || '').toLowerCase().includes('variable')
        ? 'Variable'
        : 'Fixed',
    );
    setIsEditingDetails(true);
  };

  const handleSaveExpense = async () => {
    if (!currentBudgetId || !selectedExpense) return;

    const amount = Number(editAmount || 0);
    if (!editName.trim() || amount <= 0 || !editDueDate.trim()) {
      Alert.alert('Missing expense details', 'Enter a name, amount, and due date.');
      return;
    }

    try {
      const response = await budgetApi.updateExpense(currentBudgetId, selectedExpense.id, {
        name: editName.trim(),
        amount,
        dueDate: editDueDate.trim(),
        category: editCategory.trim() || 'General',
        frequency: selectedExpense.frequency || 'Every Pay Cycle',
        type: editExpenseType,
      });

      if (!response.success) {
        Alert.alert('Unable to update expense', response.message || 'Please try again.');
        return;
      }

      setShowExpenseDetails(false);
      setIsEditingDetails(false);
      await loadExpenses();
    } catch (error: any) {
      Alert.alert('Unable to update expense', error?.message || 'Please try again.');
    }
  };

  return (
    <Wrapper>
      <Header
        title={selectedPaymentSource || 'Payment Sources'}
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />

      <Spacer height={heightPixel(25)} />
      <Text size={12} variant="regular" color={color.black}>
        This Cycle's Spending
      </Text>
      <Spacer height={heightPixel(6)} />
      <Text size={24} variant="medium" color={color.black}>
        {currencySymbol}
        {sourceTotal.toFixed(2)}
      </Text>
      <Spacer height={heightPixel(20)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {expenses.length > 0 ? (
          <View style={{gap: 10}}>
            {expenses.map(expense => (
              <Pressable
                key={expense.id}
                onPress={() => openExpenseDetails(expense)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border,
                  paddingVertical: heightPixel(12),
                }}>
                <Text
                  size={11}
                  color={color.tabicon}
                  style={{width: 36, textAlign: 'right'}}>
                  {formatOrdinalDay(expense.dueDate)}
                </Text>
                <Text
                  size={14}
                  color={color.black}
                  variant="medium"
                  style={{flex: 1}}>
                  {expense.name}
                </Text>
                <Text size={14} color={color.black} variant="medium">
                  {currencySymbol}
                  {Number(expense.amount || 0).toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text size={14} color={color.tabicon}>
            No expenses in this pay cycle yet.
          </Text>
        )}
        <Spacer height={heightPixel(30)} />
      </ScrollView>
      <BottomSheet
        visible={showExpenseDetails}
        onClose={() => {
          setShowExpenseDetails(false);
          setIsEditingDetails(false);
          setSelectedExpense(null);
        }}
        title="Expense Details"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        {selectedExpense && !isEditingDetails && (
          <View style={{gap: heightPixel(12), marginBottom: heightPixel(35)}}>
            {[
              ['Name', selectedExpense.name],
              ['Amount', `${currencySymbol}${Number(selectedExpense.amount || 0).toFixed(2)}`],
              ['Due Date', selectedExpense.dueDate || 'Not set'],
              ['Category', (selectedExpense as any).category || 'General'],
              ['Fixed / Variable', selectedExpense.type || 'Fixed'],
            ].map(([label, value]) => (
              <View
                key={label}
                style={{flexDirection: 'row', justifyContent: 'space-between', gap: 12}}>
                <Text size={13} color={color.tabicon}>
                  {label}
                </Text>
                <Text size={14} color={color.black} variant="medium" style={{flex: 1, textAlign: 'right'}}>
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
          </View>
        )}

        {selectedExpense && isEditingDetails && (
          <View style={{gap: heightPixel(14), marginBottom: heightPixel(35)}}>
            <TextInput title="Name" placeholder="Expense Name" value={editName} onChangeText={setEditName} />
            <TextInput title="Amount" placeholder="0" keyboardType="numeric" useCurrencyIcon={true} value={editAmount} onChangeText={setEditAmount} />
            <TextInput
              title="Due Date"
              placeholder="YYYY-MM-DD"
              value={editDueDate}
              onPress={() => setShowEditDateSheet(true)}
              onFocus={() => setShowEditDateSheet(true)}
              rightIcon={appImages.Calenderimg}
              rightIconPress={() => setShowEditDateSheet(true)}
            />
            <TextInput
              title="Category"
              placeholder="Category"
              value={editCategory}
              onPress={() => setShowEditCategorySheet(true)}
              rightIcon={appImages.ArrowDown}
              rightIconPress={() => setShowEditCategorySheet(true)}
            />
            <View style={{flexDirection: 'row', gap: 10}}>
              {['Fixed', 'Variable'].map(option => (
                <Pressable
                  key={option}
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
                </Pressable>
              ))}
            </View>
            <Button
              title="Save Changes"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={handleSaveExpense}
            />
            <Button
              title="Cancel"
              variant="outline"
              style={styles.modalActionButton}
              titleStyle={{color: color.primary}}
              onPress={() => setIsEditingDetails(false)}
            />
          </View>
        )}
      </BottomSheet>
      <BottomSheet
        visible={showEditDateSheet}
        onClose={() => setShowEditDateSheet(false)}
        title="Select Due Date"
        backgroundColor={color.inputField}
        maxHeight={520}>
        <Calendar
          onDayPress={day => {
            setEditDueDate(day.dateString);
            setShowEditDateSheet(false);
          }}
          markedDates={
            editDueDate
              ? {[editDueDate]: {selected: true, selectedColor: color.primary}}
              : undefined
          }
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
      <BottomSheet
        visible={showEditCategorySheet}
        onClose={() => setShowEditCategorySheet(false)}
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
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      setEditCategory(item.label);
                      setShowEditCategorySheet(false);
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
                  </Pressable>
                ))}
              </View>
              <Spacer height={heightPixel(20)} />
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </Wrapper>
  );
};

export default DebitCard;

const styles = StyleSheet.create({
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
  },
  categoryIconWrap: {
    borderRadius: heightPixel(50),
    width: heightPixel(55),
    height: heightPixel(55),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: heightPixel(8),
  },
  categoryIcon: {
    width: heightPixel(28),
    height: heightPixel(28),
    resizeMode: 'contain',
  },
});
