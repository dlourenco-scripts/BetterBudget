import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, hp, widthPixel, wp} from '@/services/responsive';
import Text from './common/Text';

interface IconToggleOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface IconToggleButtonProps {
  options: IconToggleOption[];
  selectedIndex: number;
  onToggle: (index: number) => void;
  style?: any;
  activeColors?: string[];
}

export default function IconToggleButton({
  options,
  selectedIndex,
  onToggle,
  style,
  activeColors,
}: IconToggleButtonProps) {
  const color = useThemeColor();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
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

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: isDark ? 'transparent' : color.newbg},
        style,
      ]}
      onLayout={handleLayout}>
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
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                !isSelected &&
                  isDark && {
                    backgroundColor: '#171A21',
                    borderRadius: widthPixel(14),
                  },
              ]}
              onPress={() => onToggle(index)}
              activeOpacity={0.9}>
              <View style={styles.buttonContent}>
                <Image
                  source={
                    option.label === 'Breakdown'
                      ? appImages.Breakdown
                      : appImages.Comparison
                  }
                  style={{
                    width: widthPixel(24),
                    height: heightPixel(24),
                    resizeMode: 'contain',
                    tintColor: isSelected && isDark ? '#000000' : color.black,
                  }}
                />
                <Text
                  size={14}
                  variant="medium"
                  color={isSelected && isDark ? '#000000' : color.black}
                  style={[
                    isSelected
                      ? styles.buttonTextActive
                      : styles.buttonTextInactive,
                  ]}>
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingVertical: heightPixel(9),
    paddingHorizontal: widthPixel(10),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: widthPixel(8),
  },
  buttonTextActive: {
    // Color handled by Text component color prop
  },
  buttonTextInactive: {
    // Color handled by Text component color prop
  },
});
