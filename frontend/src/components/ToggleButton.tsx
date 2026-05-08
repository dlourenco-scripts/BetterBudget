import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, TouchableOpacity, View} from 'react-native';
import {colors} from '@/constants/colors';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, hp, widthPixel, wp} from '@/services/responsive';
import Text from './common/Text';

interface ToggleButtonProps {
  options: string[];
  selectedIndex: number;
  onToggle: (index: number) => void;
  style?: any;
  activeColors?: string[];
}

export default function ToggleButton({
  options,
  selectedIndex,
  onToggle,
  style,
  activeColors,
}: ToggleButtonProps) {
  const color = useThemeColor();
  const isDark = color.bg === colors.dark.bg;

  const slideAnim = useRef(new Animated.Value(selectedIndex)).current;
  const containerWidth = useRef(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedIndex,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [selectedIndex]);

  const handleLayout = (event: any) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  const buttonWidth = containerWidth.current / options.length;
  const translateX = slideAnim.interpolate({
    inputRange: [0, options.length - 1],
    outputRange: [0, buttonWidth * (options.length - 1)],
  });

  const currentBackgroundColor = activeColors
    ? activeColors[selectedIndex]
    : color.primary;

  const styles = getStyles(color, isDark);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View style={styles.innerContainer}>
        <Animated.View
          style={[
            styles.slider,
            {
              width: `${100 / options.length}%`,
              transform: [{translateX}],
              backgroundColor: currentBackgroundColor,
            },
          ]}
        />

        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const textColor = isSelected ? '#1E1E1E' : color.black;
          return (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={() => onToggle(index)}
              activeOpacity={0.9}>
              <Text size={11} variant="medium" color={textColor}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (color: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#343946' : color.iconCardBg,
      borderRadius: widthPixel(14),
      marginHorizontal: widthPixel(1),
      paddingVertical: widthPixel(1),
    },
    innerContainer: {
      flexDirection: 'row',
      position: 'relative',
      borderRadius: widthPixel(7),
      overflow: 'hidden',
    },
    slider: {
      position: 'absolute',
      height: '100%',
      borderRadius: widthPixel(14),
    },
    button: {
      flex: 1,
      paddingVertical: heightPixel(12),
      paddingHorizontal: widthPixel(10),
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
  });
