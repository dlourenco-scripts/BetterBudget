import React from 'react';
import {Image, StyleSheet, TouchableOpacity} from 'react-native';
import {router} from 'expo-router';
import {
  Button,
  FullFlex,
  Header,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const PaySource = () => {
  const color = useThemeColor();
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
        titleStyle={{color: color.tabicon, fontFamily: 'regular'}}
        editable={false}
        inputContainerStyle={{
          backgroundColor: color.inputField,
        }}
        // rightIconComponent={
        //   <TouchableOpacity onPress={() => {}}>
        //     <Image
        //       source={appImages.ArrowDown}
        //       style={{
        //         height: heightPixel(15),
        //         width: widthPixel(15),
        //         resizeMode: 'contain',
        //         tintColor: color.tabicon,
        //       }}
        //     />
        //   </TouchableOpacity>
        // }
      />
      <FullFlex />
      <Button
        title="Save"
        onPress={() => router.navigate('/mainScreens/Settings')}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({});

export default PaySource;
