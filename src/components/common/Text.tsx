import React from 'react';
import {TextProps, Text as TextRN, TextStyle} from 'react-native';
import {fonts, FontWeight} from '@/constants/fonts';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel} from '@/services/responsive';

interface AppTextProps extends TextProps {
  variant?: FontWeight;
  size?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
}

const Text: React.FC<AppTextProps> = ({
  variant = 'regular',
  size = 14,
  color,
  style,
  children,
  ...rest
}) => {
  const colors = useThemeColor();
  const textStyle: TextStyle = {
    fontFamily: fonts[variant],
    fontSize: fontPixel(size),
    color: color || colors.black,
  };

  return (
    <TextRN style={[textStyle, style]} {...rest}>
      {children}
    </TextRN>
  );
};

export default Text;
