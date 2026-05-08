import React from 'react';
import {View, ViewStyle} from 'react-native';
import {heightPixel, widthPixel} from '@/services/responsive';

type SpacerProps = {
  height?: number;
  width?: number;
  style?: ViewStyle;
};

const Spacer: React.FC<SpacerProps> = ({height = 0, width = 0, style}) => {
  return (
    <View
      style={[{height: heightPixel(height), width: widthPixel(width)}, style]}
    />
  );
};

export default Spacer;
