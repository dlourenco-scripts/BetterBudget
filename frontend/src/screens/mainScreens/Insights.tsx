import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from 'expo-router';
import {Header, Spacer, Text, Wrapper} from '@/components';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

const Insights = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const userEmail = useAuthStore(state => state.userData?.email);
  const primaryBudgetStorageKey = `betterbudget.primaryBudgetId.${userEmail || 'default'}`;
  const [budget, setBudget] = useState<any>(null);

  const expenses = budget?.expenses || [];
  const totalSpending = expenses.reduce(
    (sum: number, expense: any) => sum + Number(expense.amount || 0),
    0,
  );

  const categoryTotals = useMemo(() => {
    return (expenses as any[]).reduce((groups: Record<string, number>, expense) => {
      const category = expense.category || 'Uncategorized';
      groups[category] = (groups[category] || 0) + Number(expense.amount || 0);
      return groups;
    }, {});
  }, [expenses]);
  const sortedCategoryTotals = Object.entries(categoryTotals).sort(
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
      console.error('Unable to load detailed insights:', error);
      setBudget(null);
    }
  }, [primaryBudgetStorageKey]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [loadInsights]),
  );

  return (
    <Wrapper>
      <Header
        canGoBack={true}
        title="Detailed Expenses"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={heightPixel(20)} />
      <Text size={12} variant="regular" color={color.black}>
        Total Spending
      </Text>
      <Text size={24} variant="medium" color={color.black}>
        {currencySymbol}
        {totalSpending.toFixed(2)}
      </Text>
      <Spacer height={heightPixel(30)} />
      <Text size={16} variant="medium" color={color.black}>
        Categories
      </Text>
      <Spacer height={heightPixel(10)} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedCategoryTotals.length > 0 ? (
          sortedCategoryTotals.map(([category, amount]) => {
            const percent = totalSpending
              ? Math.round((Number(amount) / totalSpending) * 100)
              : 0;

            return (
            <View
              key={category}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: color.inputField,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
              }}>
              <Text size={15} variant="medium" color={color.black}>
                {category}
              </Text>
              <Text size={15} variant="medium" color={color.primary}>
                {currencySymbol}
                {Number(amount).toFixed(2)} ({percent}%)
              </Text>
            </View>
            );
          })
        ) : (
          <Text size={14} color={color.tabicon}>
            No expenses added yet.
          </Text>
        )}
      </ScrollView>
    </Wrapper>
  );
};

export default Insights;
