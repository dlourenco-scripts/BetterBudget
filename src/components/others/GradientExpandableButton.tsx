import React, {useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Entypo} from '@expo/vector-icons';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import Text from '../common/Text';

interface Props {
  title: string;
  value?: string;
  children?: React.ReactNode;
  subText?: string;
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  valueStyle?: TextStyle;
  customGradientColors?: {
    default: [string, string];
  };
  customBorderColor?: string;
  expandedGradientColors?: {
    default: [string, string];
  };
  onLongPress?: () => void;
  onPress?: () => void;
}

const GradientExpandableCard = ({
  title,
  value,
  children,
  subText,
  badge,
  badgeColor = '#FFF3E0',
  badgeTextColor,
  containerStyle = {},
  titleStyle = {},
  valueStyle = {},
  customGradientColors,
  customBorderColor,
  expandedGradientColors,
  onLongPress,
  onPress,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const color = useThemeColor();
  const isDark = color.bg === colors.dark.bg;
  const isExpandable = !!children;

  const toggleExpand = () => {
    if (!isExpandable) return;

    const newValue = !expanded;
    setExpanded(newValue);

    Animated.timing(rotateAnim, {
      toValue: newValue ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getGradientColors = (): [string, string, ...string[]] => {
    if (expanded && expandedGradientColors) {
      return expandedGradientColors.default as [string, string, ...string[]];
    }

    // In dark mode, if not expanded, return dark background colors
    if (isDark && !expanded) {
      return [colors.dark.inputField, colors.dark.inputField];
    }

    return customGradientColors
      ? (customGradientColors.default as [string, string, ...string[]])
      : ['#FFFFFF', '#FFFFFF'];
  };

  const getTextColor = () => {
    if (expanded) return '#000'; // Always black when expanded (orange bg)
    if (isDark) return '#FFF'; // White when collapsed in dark mode
    return '#000'; // Black when collapsed in light mode
  };

  const {currencySymbol} = useCurrency();
  const textColor = getTextColor();

  const formattedValue = value
    ? value.startsWith('$') || // Check for common hardcoded symbols to avoid double symbol
      value.startsWith('£') ||
      value.startsWith('€') ||
      value.startsWith('¥') ||
      value.startsWith(currencySymbol) // Check if it already starts with the dynamic symbol
      ? value
      : `${currencySymbol}${value}` // Prepend if no symbol
    : undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* HEADER */}
      <TouchableOpacity
        activeOpacity={isExpandable ? 0.9 : 0.9}
        onPress={() => {
          if (onPress) {
            onPress();
          } else {
            toggleExpand();
          }
        }}
        onLongPress={onLongPress}
        delayLongPress={500}>
        <LinearGradient
          colors={getGradientColors()}
          style={[
            styles.gradientBox,
            customBorderColor && {borderColor: customBorderColor},
            expanded &&
              expandedGradientColors && {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottomWidth: 0,
              },
            // Remove border in dark mode when collapsed if desired,
            // or keep it if it fits the design. The mocked image shows a border.
            // But usually dark mode cards might have different borders.
            // For now we keep the border logic as is, just changing background.
          ]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}>
            {subText && (
              <Text size={14} color={textColor}>
                {subText}
              </Text>
            )}
            <Text
              size={18}
              variant="medium"
              color={textColor}
              style={titleStyle}>
              {title}
            </Text>
            {badge && (
              <View
                style={{
                  backgroundColor: isDark ? '#332a1b' : badgeColor,
                  paddingHorizontal: 13,
                  paddingVertical: 6,
                  borderRadius: 7,
                  marginLeft: 5,
                }}>
                <Text
                  size={10}
                  variant="regular"
                  color={badgeTextColor || color.walletbg}>
                  {badge}
                </Text>
              </View>
            )}
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {value && (
              <Text
                size={18}
                variant="medium"
                color={textColor}
                style={{marginRight: 10, ...valueStyle}}>
                {formattedValue}
              </Text>
            )}
            {isExpandable && (
              <Animated.View style={{transform: [{rotate}]}}>
                <Entypo name="chevron-small-down" size={24} color={textColor} />
              </Animated.View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
      {isExpandable && expanded && (
        <View style={styles.expandBox}>{children}</View>
      )}
    </View>
  );
};

export default GradientExpandableCard;

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  gradientBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFAF3F',
    shadowColor: '#FFAF3F',
    shadowOffset: {width: 3, height: 3},
    shadowOpacity: 2.12,
    shadowRadius: 8,
    elevation: 5,
  },
  expandBox: {
    backgroundColor: colors.light.dropdownbg,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    padding: 15,
    marginTop: -8,
  },
});
