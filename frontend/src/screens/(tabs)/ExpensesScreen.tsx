import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {router, useFocusEffect} from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Feather} from '@expo/vector-icons';
import {BottomSheet, Header, Spacer, Text, Wrapper} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface ExpenseItem {
  id: string;
  title: string;
  value: string;
  subText: string;
  kind: 'expense' | 'debt';
}

const ExpensesScreen = () => {
  const color = useThemeColor();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const isDark = color.bg === '#171A21';
  const [showAddExpenseSheet, setShowAddExpenseSheet] = useState(false);
  const [budgetId, setBudgetId] = useState('');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [debts, setDebts] = useState<ExpenseItem[]>([]);

  const loadExpenses = useCallback(async () => {
    try {
      const budgetsResponse = await budgetApi.list();
      const firstBudget = budgetsResponse.data?.[0];
      if (!firstBudget?.id) {
        setBudgetId('');
        setExpenses([]);
        setDebts([]);
        return;
      }

      setBudgetId(firstBudget.id);
      const detailResponse = await budgetApi.get(firstBudget.id);
      const budget = detailResponse.data;
      const currentCycle = budget?.currentCycle;

      setExpenses(
        (currentCycle?.expenses || []).map((expense: any) => ({
          id: expense.id,
          title: expense.name,
          value: Number(expense.amount || 0).toFixed(2),
          subText: expense.dueDate ? dayjs(expense.dueDate).format('MMM-DD') : '',
          kind: 'expense',
        })),
      );
      setDebts(
        (budget?.debts || []).map((debt: any) => ({
          id: debt.id,
          title: debt.name,
          value: Number(debt.balance || 0).toFixed(2),
          subText: debt.status || 'active',
          kind: 'debt',
        })),
      );
    } catch (error) {
      console.error('Unable to load expenses:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const allItems = [...expenses, ...debts];

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handleCardPress = (id: string) => {
    if (isSelectionMode) {
      toggleSelection(id);
    }
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

  const handleDeleteAction = async () => {
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

  const renderItem = (item: ExpenseItem) => (
    <View
      key={item.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 5,
      }}>
      {isSelectionMode && (
        <TouchableOpacity
          onPress={() => toggleSelection(item.id)}
          style={{
            borderRadius: 50,
            backgroundColor: color.inputField,
            padding: 10,
          }}>
          <Image
            source={
              selectedIds.has(item.id)
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
        </TouchableOpacity>
      )}
      <View style={{flex: 1}}>
        <GradientExpandableCard
          title={item.title}
          value={item.value}
          subText={item.subText}
          titleStyle={{
            fontSize: fontPixel(15),
            fontWeight: 'medium',
          }}
          valueStyle={{
            fontSize: fontPixel(15),
            fontWeight: 'medium',
          }}
          onLongPress={() => handleLongPress(item.id)}
          onPress={() => handleCardPress(item.id)}
        />
      </View>
    </View>
  );

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
              onPress={() => {
                router.navigate({
                  pathname: '/auth/RecurringExpenses',
                  params: {fromExpenses: 'true', isEdit: 'true', budgetId},
                });
              }}
              style={{
                backgroundColor: color.notificationbg,
                borderRadius: 50,
                padding: 7,
              }}>
              <Feather name="edit" size={20} color={color.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAction}
              style={{
                backgroundColor: color.notificationbg,
                borderRadius: 50,
                padding: 7,
              }}>
              <Ionicons name="trash-outline" size={20} color={color.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text size={15} variant="medium" color={color.black}>
          Expenses
        </Text>
        <Spacer height={10} />
        {expenses.length > 0 ? (
          expenses.map(renderItem)
        ) : (
          <Text size={14} color={color.tabicon}>
            No expenses in this pay cycle yet.
          </Text>
        )}

        <Spacer height={20} />
        <Text size={15} variant="medium" color={color.black}>
          Debt
        </Text>
        <Spacer height={10} />
        {debts.length > 0 ? (
          debts.map(renderItem)
        ) : (
          <Text size={14} color={color.tabicon}>
            No debts added yet.
          </Text>
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
    </Wrapper>
  );
};

export default ExpensesScreen;

const styles = StyleSheet.create({});
