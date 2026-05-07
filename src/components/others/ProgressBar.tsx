import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import dayjs from 'dayjs';
import {AntDesign} from '@expo/vector-icons';
import {colors} from '@/constants/colors';
import {useThemeColor} from '@/hooks/useThemeColor';
import Spacer from '../common/Spacer';
import Text from '../common/Text';

const ProgressBar = () => {
  const color = useThemeColor();

  return (
    <View>
      <View
        style={{
          borderRadius: 15,
          backgroundColor: color.progressbarbg,
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: color.progressbarborder,
          shadowColor: '#00000040',
          shadowOffset: {
            width: 2,
            height: 2,
          },
          shadowOpacity: 1.9,
          shadowRadius: 2,
          elevation: 1,
        }}>
        <View
          style={{
            borderRadius: 13,
            paddingHorizontal: 5,
            minWidth: 60,
            paddingVertical: 2,
            backgroundColor: color.primary,
          }}>
          <Text size={13} color={color.white} variant="italic">
            05%
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}>
        <Text size={13} color={color.progressbartext} variant="regular">
          Savings Progress
        </Text>
        <Text size={13} color={color.progressbartext} variant="regular">
          Savings Goal
        </Text>
      </View>
    </View>
  );
};

export default ProgressBar;
