import React, {useCallback, useState} from 'react';
import {FlatList, Image, TouchableOpacity, View} from 'react-native';
import dayjs from 'dayjs';
import {useFocusEffect} from 'expo-router';
import {Button, FullFlex, Header, Spacer, Text, Wrapper} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import {appImages} from '@/constants/assets';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  value: string;
  badge: string;
  badgeColor: string;
  badgeTextColor?: string;
  showCheckbox?: boolean;
}

const DebitCard = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [cycleTotal, setCycleTotal] = useState(0);

  const loadExpenses = useCallback(async () => {
    try {
      const budgetsResponse = await budgetApi.list();
      const firstBudget = budgetsResponse.data?.[0];
      if (!firstBudget?.id) {
        setExpenses([]);
        setCycleTotal(0);
        return;
      }

      const detailResponse = await budgetApi.get(firstBudget.id);
      const currentCycle = detailResponse.data?.currentCycle;
      const cycleExpenses = currentCycle?.expenses || [];
      setCycleTotal(Number(currentCycle?.totalExpenses || 0));
      setExpenses(
        cycleExpenses.map((expense: any) => ({
          id: expense.id,
          date: dayjs(expense.dueDate).format('MMM-DD'),
          title: expense.name,
          value: Number(expense.amount || 0).toFixed(2),
          badge: expense.type || expense.frequency || 'Expense',
          badgeColor: '#FFF3E0',
        })),
      );
    } catch (error) {
      console.error('Unable to load pay source expenses:', error);
      setExpenses([]);
      setCycleTotal(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const toggleSelection = (id: string) => {
    setSelectedItem(prev => {
      if (prev === id) {
        return null;
      } else {
        return id;
      }
    });
  };

  const renderItem = ({item}: {item: ExpenseItem}) => {
    const isSelected = selectedItem === item.id;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: widthPixel(10),
        }}>
        {item.showCheckbox && (
          <TouchableOpacity
            onPress={() => toggleSelection(item.id)}
            activeOpacity={0.7}>
            <Image
              source={
                isSelected
                  ? appImages.EllipseSelected
                  : appImages.EllipseUnselected
              }
              style={{
                width: 24,
                height: 24,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        <View style={{flex: 1}}>
          <GradientExpandableCard
            title={item.title}
            value={item.value}
            subText={item.date}
            badge={item.badge}
            badgeColor={item.badgeColor}
            badgeTextColor={item.badgeTextColor}
            containerStyle={{
              marginVertical: 5,
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <Wrapper>
      <Header
        title="Debit Card"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />

      <Spacer height={heightPixel(25)} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: widthPixel(10),
        }}>
        <Image
          source={appImages.ArrowUp}
          style={{height: 15, width: 15}}
          resizeMode="contain"
          tintColor={color.black}
        />
        <Text size={12} variant="regular" color={color.black}>
          This Cycle's Spending
        </Text>
        <Spacer height={heightPixel(10)} />
        <Text size={24} variant="medium" color={color.black}>
          {currencySymbol}{cycleTotal.toFixed(2)}
        </Text>
      </View>
      <Spacer height={heightPixel(20)} />
      <FlatList
        data={expenses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text size={14} color={color.tabicon}>
            No expenses in this pay cycle yet.
          </Text>
        }
        contentContainerStyle={{
          paddingBottom: heightPixel(20),
        }}
      />
      <FullFlex />
      <View
        style={{
          flexDirection: 'row',
          gap: widthPixel(10),
          paddingBottom: heightPixel(10),
          paddingHorizontal: widthPixel(10),
        }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: heightPixel(15),
            borderRadius: 100,
            borderWidth: 1,
            borderColor: color.primary,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => {
            // Handle delete action
          }}>
          <Text size={17} variant="semibold" color={color.primary}>
            Delete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: heightPixel(15),
            borderRadius: 100,
            backgroundColor: color.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => {
            // Handle edit action
          }}>
          <Text size={17} variant="semibold" color={color.black}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
};

export default DebitCard;
