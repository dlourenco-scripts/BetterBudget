import React, {useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import {Button, FullFlex, Header, Spacer, Text, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {CurrencyCode, useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const SelectCurrency = () => {
  const color = useThemeColor();
  const {selectedCurrency, setCurrency} = useCurrency();
  const [localCurrency, setLocalCurrency] =
    useState<CurrencyCode>(selectedCurrency);

  const currencyOptions = [
    {label: 'US Dollar (USD)', value: 'USD'},
    {label: 'Great Britain Pound (GBP)', value: 'GBP'},
    {label: 'Euro (EUR)', value: 'EUR'},
    {label: 'Japanese Yen (JPY)', value: 'JPY'},
    {label: 'Australian Dollar (AUD)', value: 'AUD'},
    {label: 'Canadian Dollar (CAD)', value: 'CAD'},
    {label: 'Swiss Franc (CHF)', value: 'CHF'},
    {label: 'Chinese Yuan Renminbi (CNY)', value: 'CNY'},
    {label: 'Swedish Krona (SEK)', value: 'SEK'},
    {label: 'New Zealand Dollar (NZD)', value: 'NZD'},
    {label: 'Pakistani Rupee (PKR)', value: 'PKR'},
  ];

  const renderItem = ({item}: any) => {
    const isSelected = localCurrency === item.value;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setLocalCurrency(item.value)}
        style={styles.row}>
        <Text size={16} variant="regular" style={{color: color.black}}>
          {item.label}
        </Text>

        <Image
          source={
            isSelected ? appImages.EllipseSelected : appImages.EllipseUnselected
          }
          resizeMode="contain"
          style={styles.radioIcon}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Wrapper>
      <Header
        canGoBack={false}
        title="Select Currency"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={20} />
      <FlatList
        data={currencyOptions}
        keyExtractor={item => item.value}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <FullFlex />
      <Button
        title="Next"
        onPress={async () => {
          await setCurrency(localCurrency);
          router.push('/auth/CreateProfle');
        }}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: heightPixel(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: heightPixel(12),
  },
  label: {
    fontSize: fontPixel(14),
  },
  radioIcon: {
    width: 25,
    height: 25,
  },
});

export default SelectCurrency;
