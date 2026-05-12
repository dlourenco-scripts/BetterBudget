import React, {useState} from 'react';
import {View} from 'react-native';
import {useThemeColor} from '@/hooks/useThemeColor';
import Text from '../common/Text';

type ProgressBarProps = {
  progressPercent?: number;
};

const ProgressBar = ({progressPercent = 0}: ProgressBarProps) => {
  const color = useThemeColor();
  const safePercent = Math.max(0, Math.min(100, progressPercent));

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
            width: `${Math.max(8, safePercent)}%`,
            paddingVertical: 2,
            backgroundColor: color.primary,
          }}>
          <Text size={13} color={color.white} variant="italic">
            {Math.round(safePercent)}%
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
