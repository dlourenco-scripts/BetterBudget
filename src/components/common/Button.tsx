import React from 'react';
import {
  Platform,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {Flow} from 'react-native-animated-spinkit';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Text from './Text';

interface ButtonProps {
  isLoading?: boolean;
  onPress: () => void;
  title: string;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  width?: number;
  leftIcon?: any;
  titleStyle?: TextStyle;
  rightIcon?: boolean;
  containerStyle?: ViewStyle;
}

const Button = (props: ButtonProps) => {
  const {
    isLoading = false,
    disabled = false,
    variant = 'primary',
    style,
    onPress,
    title,
    leftIcon,
    titleStyle = {},
    containerStyle,
    rightIcon = true,
    ...rest
  } = props;
  const colors = useThemeColor();
  // Size configurations
  const sizeConfig = {
    small: {
      height: heightPixel(38),
      fontSize: 16,
    },
    medium: {
      height: heightPixel(60),
      fontSize: 16,
    },
    large: {
      height: heightPixel(60),
      fontSize: 20,
    },
  };

  // Variant configurations
  const getVariantStyles = () => {
    const isDisabled = isLoading || disabled;

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? colors?.disabled : colors?.primary,
          borderColor: isDisabled ? colors?.disabled : colors?.primary,
          borderWidth: 0,
          textColor: colors?.primaryButtonText,
        };
      case 'secondary':
        return {
          backgroundColor: isDisabled
            ? colors?.disabled
            : colors.primaryLightBrand,
          borderColor: isDisabled
            ? colors?.disabled
            : colors?.primaryLightBrand,
          borderWidth: 0,
          textColor: colors?.secondaryBodyText,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: isDisabled ? colors?.primary : colors?.primary,
          borderWidth: 1,
          textColor: isDisabled ? colors?.disabled : colors?.secondaryBodyText,
        };
      default:
        return {
          backgroundColor: isDisabled ? colors?.disabled : colors?.primary,
          borderColor: isDisabled ? colors?.disabled : colors?.primary,
          borderWidth: 0,
          textColor: colors?.bg,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isLoading || disabled || !onPress}
      style={[
        {
          width: widthPixel(380),
          borderRadius: 50,
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          height: heightPixel(54),
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variantStyles.borderWidth,
          overflow: 'hidden',
          marginBottom: Platform.OS === 'android' ? heightPixel(20) : 0,
        },
        containerStyle,
        style,
      ]}>
      {isLoading ? (
        <Flow color={variantStyles.textColor} size={20} />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {leftIcon && <View style={{marginRight: 15}}>{leftIcon}</View>}
          <Text
            variant="semibold"
            size={17}
            color={variantStyles.textColor}
            style={[
              {
                textAlign: 'center',
                textTransform: 'capitalize',
              },
              titleStyle,
            ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;
