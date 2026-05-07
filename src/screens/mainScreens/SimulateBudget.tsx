import React, {useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {router} from 'expo-router';
import {AntDesign} from '@expo/vector-icons';
import {
  Button,
  FullFlex,
  Header,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const expensesData = [
  {id: '1', title: 'Gas Bill', value: '360.96'},
  {id: '2', title: 'Rent', value: '360.96'},
  {id: '3', title: 'Gas Bill', value: '360.96'},
];

const debtData = [{id: '1', title: 'Loan', value: '2360.96'}];

const SimulateBudget = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const [date, setDate] = useState(dayjs('2024-12-15'));

  const goPrev = () => {
    setDate(prev => prev.subtract(1, 'month'));
  };

  const goNext = () => {
    setDate(prev => prev.add(1, 'month'));
  };

  const renderExpenseItem = ({
    item,
  }: {
    item: {id: string; title: string; value: string};
  }) => (
    <GradientExpandableCard
      title={item.title}
      titleStyle={{
        fontSize: fontPixel(18),
        fontFamily: 'medium',
        fontWeight: '500',
      }}
      value={item.value}
      valueStyle={{
        fontSize: fontPixel(18),
        fontFamily: 'medium',
        fontWeight: '500',
      }}
      customGradientColors={{
        default: ['#F7EBDF', '#F7EBDF'],
      }}
      customBorderColor={color.simulatebudgetborder}
    />
  );

  return (
    <Wrapper>
      <Header
        title={'Simulated Budget'}
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={heightPixel(20)} />
      <View
        style={{
          backgroundColor: color.simulatebudgetbg,
          borderWidth: 1,
          borderColor: color.simulatebudgetborder,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 15,
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
                  tintColor: color.white,
                }}
              />
              <Text size={16} color={color.black} variant="semibold">
                Total remaining
              </Text>
            </View>
            <Spacer height={10} />
            <Text size={18} variant="semibold" color={color.primary}>
              {currencySymbol}500.00
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
                  tintColor: color.white,
                }}
              />
              <Text size={16} color={color.black} variant="medium">
                Total expenses
              </Text>
            </View>
            <Spacer height={10} />
            <Text
              size={18}
              variant="semibold"
              color={color.black}
              style={{textAlign: 'right'}}>
              {currencySymbol}10,000
            </Text>
          </View>
        </View>
      </View>
      <Spacer height={20} />
      <View style={styles.row}>
        <Text size={16} color={color.black} variant="semibold">
          Pay Date
        </Text>
        <TouchableOpacity onPress={goPrev} style={styles.arrowBtn}>
          <AntDesign name="left" size={14} color={color.dateText} />
        </TouchableOpacity>
        <Text style={[styles.dateText, {color: color.primary}]}>
          {date.format('MMMM, DD, YYYY')}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.arrowBtn}>
          <AntDesign name="right" size={14} color={color.dateText} />
        </TouchableOpacity>
      </View>
      <Spacer height={20} />
      <Text size={15} color={color.black} variant="medium">
        Expenses
      </Text>
      <View>
        <FlatList
          scrollEnabled={false}
          data={expensesData}
          keyExtractor={item => item.id}
          renderItem={renderExpenseItem}
        />
      </View>
      <Spacer height={20} />
      <Text size={15} color={color.black} variant="medium">
        Total Debt Loan/other payments
      </Text>
      <View>
        <FlatList
          scrollEnabled={false}
          data={expensesData}
          keyExtractor={item => item.id}
          renderItem={renderExpenseItem}
        />
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
  },
  arrowBtn: {
    padding: 5,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: 'medium',
    marginHorizontal: 12,
  },
});

export default SimulateBudget;
