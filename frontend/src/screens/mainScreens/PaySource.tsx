import React, {useCallback, useState} from 'react';
import {Image, StyleSheet, TouchableOpacity} from 'react-native';
import {router} from 'expo-router';
import {useFocusEffect} from 'expo-router';
import {
  BottomSheet,
  Button,
  FullFlex,
  Header,
  RadioList,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {budgetApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const PaySource = () => {
  const color = useThemeColor();
  const [paySources, setPaySources] = useState<string[]>([]);
  const [selectedPaySource, setSelectedPaySource] = useState('');
  const [showPaySourceSheet, setShowPaySourceSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadPaySources = async () => {
        try {
          const budgetsResponse = await budgetApi.list();
          const budgets = budgetsResponse.data || [];
          const details = await Promise.all(
            budgets.map((budget: any) => budgetApi.get(budget.id)),
          );
          const sources = details
            .flatMap(response => response.data?.expenses || [])
            .map((expense: any) => expense.notes?.trim())
            .filter(Boolean);
          const uniqueSources = Array.from(new Set(sources)) as string[];
          setPaySources(uniqueSources);
          setSelectedPaySource(current => current || uniqueSources[0] || '');
        } catch (error) {
          console.error('Unable to load pay sources:', error);
          setPaySources([]);
        }
      };

      loadPaySources();
    }, []),
  );

  return (
    <Wrapper>
      <Header
        title="Pay Source"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />
      <Spacer height={heightPixel(20)} />
      <Text color={color.shareBudgetText}>
        Please select default Pay Source for your expenses
      </Text>
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Select Pay Source"
        placeholder="Select Pay Source"
        value={selectedPaySource}
        titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
        editable={false}
        onPress={() => setShowPaySourceSheet(true)}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
        rightIconComponent={
          <TouchableOpacity onPress={() => setShowPaySourceSheet(true)}>
            <Image
              source={appImages.ArrowDown}
              style={{
                height: heightPixel(15),
                width: widthPixel(15),
                resizeMode: 'contain',
                tintColor: color.tabicon,
              }}
            />
          </TouchableOpacity>
        }
      />
      {paySources.length === 0 ? (
        <>
          <Spacer height={heightPixel(12)} />
          <Text color={color.tabicon}>No pay sources have been added yet.</Text>
        </>
      ) : null}
      <FullFlex />
      <Button
        title="Save"
        onPress={() => router.navigate('/mainScreens/Settings')}
      />
      <BottomSheet
        visible={showPaySourceSheet}
        onClose={() => setShowPaySourceSheet(false)}
        title="Select Pay Source"
        backgroundColor={color.inputField}>
        <RadioList
          options={paySources.map(source => ({label: source, value: source}))}
          selectedValue={selectedPaySource}
          onSelect={setSelectedPaySource}
          onClose={() => setShowPaySourceSheet(false)}
        />
      </BottomSheet>
    </Wrapper>
  );
};

const styles = StyleSheet.create({});

export default PaySource;
