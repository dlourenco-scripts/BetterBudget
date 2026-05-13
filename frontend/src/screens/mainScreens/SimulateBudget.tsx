import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import dayjs from 'dayjs';
import {useLocalSearchParams} from 'expo-router';
import {AntDesign, Feather} from '@expo/vector-icons';
import {
  Header,
  Spacer,
  Text,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

type SimExpense = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
  category?: string;
  frequency?: string;
};

const SimulateBudget = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const {income: incomeParam, expenses: expensesParam} = useLocalSearchParams<{
    income?: string;
    expenses?: string;
  }>();
  const [monthOffset, setMonthOffset] = useState(0);

  const income = Number(incomeParam || 0);
  const expenses = useMemo<SimExpense[]>(() => {
    try {
      return expensesParam ? JSON.parse(String(expensesParam)) : [];
    } catch {
      return [];
    }
  }, [expensesParam]);

  const simulatedMonth = dayjs().startOf('month').add(monthOffset, 'month');
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const remaining = income - totalExpenses;

  const goPrev = () => {
    setMonthOffset(previous => Math.max(0, previous - 1));
  };

  const goNext = () => {
    setMonthOffset(previous => Math.min(3, previous + 1));
  };

  return (
    <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
      <Header
        title="Monthly Simulation"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack
      />
      <Spacer height={heightPixel(16)} />

      <View style={styles.row}>
        <Text size={16} color={color.black} variant="semibold">
          Month
        </Text>
        <TouchableOpacity
          onPress={goPrev}
          disabled={monthOffset === 0}
          style={[styles.arrowBtn, {opacity: monthOffset === 0 ? 0.35 : 1}]}>
          <AntDesign name="left" size={14} color={color.dateText} />
        </TouchableOpacity>
        <Text style={[styles.dateText, {color: color.primary}]}>
          {simulatedMonth.format('MMMM YYYY')}
        </Text>
        <TouchableOpacity
          onPress={goNext}
          disabled={monthOffset === 3}
          style={[styles.arrowBtn, {opacity: monthOffset === 3 ? 0.35 : 1}]}>
          <AntDesign name="right" size={14} color={color.dateText} />
        </TouchableOpacity>
      </View>

      <Spacer height={heightPixel(16)} />
      <View
        style={[
          styles.summaryCard,
          {backgroundColor: color.inputField, borderColor: color.primary},
        ]}>
        <View style={styles.summaryRow}>
          <View>
            <View style={styles.labelRow}>
              <Image
                source={appImages.Arrowimg}
                style={[styles.summaryIcon, {tintColor: color.primary}]}
              />
              <Text size={14} color={color.black} variant="semibold">
                Monthly Income
              </Text>
            </View>
            <Text size={20} variant="semibold" color={color.primary}>
              {currencySymbol}{income.toFixed(2)}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <View style={styles.labelRow}>
              <Feather name="credit-card" size={15} color="#D94343" />
              <Text size={14} color={color.black} variant="semibold">
                Expenses
              </Text>
            </View>
            <Text size={20} variant="semibold" color="#D94343">
              {currencySymbol}{totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.remainingDivider} />
        <View style={styles.summaryRow}>
          <Text size={15} color={color.black} variant="semibold">
            Monthly Remaining
          </Text>
          <Text
            size={22}
            variant="semibold"
            color={remaining < 0 ? '#D94343' : color.primary}>
            {currencySymbol}{remaining.toFixed(2)}
          </Text>
        </View>
      </View>

      <Spacer height={heightPixel(20)} />
      <Text size={16} color={color.black} variant="semibold">
        Expenses
      </Text>
      <Spacer height={heightPixel(8)} />
      {expenses.length > 0 ? (
        <View style={{gap: heightPixel(8)}}>
          {expenses.map(expense => (
            <View
              key={expense.id}
              style={[styles.expenseRow, {backgroundColor: color.inputField}]}>
              <View style={{flex: 1}}>
                <Text size={15} variant="semibold" color={color.black} numberOfLines={1}>
                  {expense.name}
                </Text>
                <Text size={12} color={color.tabicon} numberOfLines={1}>
                  {[expense.category, expense.frequency].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <Text size={15} variant="semibold" color={color.black}>
                {currencySymbol}{Number(expense.amount || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text size={14} color={color.tabicon}>
          No simulated expenses yet.
        </Text>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 5,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: widthPixel(14),
    paddingVertical: heightPixel(14),
    gap: heightPixel(12),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: widthPixel(12),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(5),
    marginBottom: heightPixel(6),
  },
  summaryIcon: {
    height: heightPixel(15),
    width: widthPixel(15),
    resizeMode: 'contain',
  },
  remainingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  expenseRow: {
    minHeight: heightPixel(58),
    borderRadius: 10,
    paddingHorizontal: widthPixel(12),
    paddingVertical: heightPixel(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(10),
  },
});

export default SimulateBudget;
