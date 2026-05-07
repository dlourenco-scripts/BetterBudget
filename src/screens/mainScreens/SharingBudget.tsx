import React, {useState} from 'react';
import {Image, StyleSheet, Switch, TouchableOpacity, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {Feather} from '@expo/vector-icons';
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

const SharingBudget = () => {
  const color = useThemeColor();
  const {fromSettings} = useLocalSearchParams();
  const [isViewOnly, setIsViewOnly] = useState(true);
  const [isFullAccess, setIsFullAccess] = useState(false);

  const handleViewOnlyToggle = (value: boolean) => {
    setIsViewOnly(value);
  };

  const handleFullAccessToggle = (value: boolean) => {
    setIsFullAccess(value);
  };

  return (
    <Wrapper>
      <Header
        title="Sharing Budget"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
        rightComponent={
          <TouchableOpacity
            style={{
              borderRadius: 50,
              backgroundColor: color.tabBackground,
              padding: 8,
            }}
            activeOpacity={0.8}
            onPress={() => router.navigate('/mainScreens/History')}>
            <Image
              source={appImages.Timer}
              style={{
                height: 20,
                width: 20,
                tintColor: color.tabicon,
              }}
            />
          </TouchableOpacity>
        }
      />
      <Spacer height={heightPixel(30)} />
      <Text size={16} variant="medium" color={color.primary}>
        Share your budget & stay in sync
      </Text>
      <Spacer height={heightPixel(15)} />
      <Text color={color.shareBudgetText}>
        Share your budget with a partner and collaborate on expenses, savings,
        and financial goals.
      </Text>
      <Spacer height={heightPixel(50)} />
      <TextInput
        title="Select Budget"
        placeholder="Home Budget"
        // rightIcon={appImages.ArrowDown}
        // rightIconStyle={{
        //   tintColor: color.shareBudgetText,
        //   height: 15,
        //   width: 15,
        // }}
        titleStyle={{color: color.shareBudgetText, fontFamily: 'regular'}}
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: heightPixel(50),
          paddingHorizontal: widthPixel(18),
        }}
      />
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Full Name"
        placeholder="John Doe"
        titleStyle={{color: color.shareBudgetText, fontFamily: 'regular'}}
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: heightPixel(50),
          paddingHorizontal: widthPixel(18),
        }}
      />
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Email"
        placeholder="johndoe@gmail.com"
        titleStyle={{color: color.shareBudgetText, fontFamily: 'regular'}}
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: heightPixel(50),
          paddingHorizontal: widthPixel(18),
        }}
      />
      <Spacer height={heightPixel(40)} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: color.bg === '#121212' ? '#242830' : '#FFFFFF',
          borderRadius: 50,
          paddingVertical: heightPixel(12),
          paddingLeft: widthPixel(15),
          paddingRight: widthPixel(1),
          shadowColor: color.bg === '#121212' ? '#000000' : '#9a9898ff',
          shadowOffset: {
            width: 2,
            height: 2,
          },
          shadowOpacity: color.bg === '#121212' ? 0.5 : 0.29,
          shadowRadius: 2.84,
          elevation: 5,
        }}>
        <Text
          color={color.black}
          variant="regular"
          size={15}
          style={{marginLeft: widthPixel(8)}}>
          View Only
        </Text>
        <Switch
          style={{
            transform: [{scaleX: 0.7}, {scaleY: 0.7}],
          }}
          value={isViewOnly}
          onValueChange={handleViewOnlyToggle}
          trackColor={{false: '#D1D1D6', true: color.primary}}
          thumbColor={color.white}
          ios_backgroundColor="#D1D1D6"
        />
      </View>
      <Spacer height={heightPixel(25)} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: color.bg === '#121212' ? '#242830' : '#FFFFFF',
          borderRadius: 50,
          paddingVertical: heightPixel(12),
          paddingLeft: widthPixel(15),
          paddingRight: widthPixel(1),
          shadowColor: color.bg === '#121212' ? '#000000' : '#9a9898ff',
          shadowOffset: {
            width: 2,
            height: 2,
          },
          shadowOpacity: color.bg === '#121212' ? 0.5 : 0.29,
          shadowRadius: 2.84,
          elevation: 5,
        }}>
        <Text
          color={color.black}
          variant="regular"
          size={15}
          style={{marginLeft: widthPixel(8)}}>
          Full Access
        </Text>
        <Switch
          style={{
            transform: [{scaleX: 0.7}, {scaleY: 0.7}],
          }}
          value={isFullAccess}
          onValueChange={handleFullAccessToggle}
          trackColor={{false: '#D1D1D6', true: color.primary}}
          thumbColor={color.white}
          ios_backgroundColor="#D1D1D6"
        />
      </View>
      <FullFlex />
      <Button
        title="Send Invite"
        onPress={() => {
          if (fromSettings === 'true') {
            router.back();
          } else {
            router.navigate('/mainScreens/History');
          }
        }}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({});

export default SharingBudget;
