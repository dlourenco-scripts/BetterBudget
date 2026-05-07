import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {router} from 'expo-router';
import {
  Button,
  FullFlex,
  Header,
  Spacer,
  TextInput,
  Wrapper,
} from '@/components';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel} from '@/services/responsive';

const EditCurrentSavings = () => {
  const color = useThemeColor();
  return (
    <Wrapper>
      <Header
        title={'Edit Current Savings'}
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Current Savings"
        titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
        placeholder={'0'}
        keyboardType="numeric"
        useCurrencyIcon={true}
        inputContainerStyle={{
          backgroundColor: color.white,
        }}
      />
      <FullFlex />
      <Button title="Update" onPress={() => router.back()} />
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
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default EditCurrentSavings;
