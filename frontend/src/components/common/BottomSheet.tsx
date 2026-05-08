import React, {ReactNode, useEffect, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useColorScheme as useAppColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Text from './Text';

export interface RadioOption {
  label: string;
  value: string;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  maxHeight?: number;
  hideTitleLine?: boolean;
  backgroundColor?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  maxHeight = 600,
  hideTitleLine = false,
  backgroundColor,
}) => {
  const color = useThemeColor();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const titleLineColor = isDark ? '#BDBDBD' : color.border;
  const translateY = useSharedValue(maxHeight);
  const opacity = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {duration: 300});
      translateY.value = withTiming(0, {duration: 250});
      // translateY.value = withSpring(0, {
      //     // damping: 20,
      //     stiffness: 150,
      // });
    } else {
      opacity.value = withTiming(0, {duration: 200});
      translateY.value = withTiming(maxHeight, {duration: 250});
    }
  }, [visible]);

  // Keyboard event listeners for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        e => {
          setKeyboardHeight(e.endCoordinates.height);
        },
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
        },
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          Platform.OS === 'android' && {paddingBottom: keyboardHeight + 15},
        ]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          style={styles.keyboardAvoidingView}>
          <Animated.View
            style={[
              styles.sheetContainer,
              sheetStyle,
              {
                backgroundColor: backgroundColor || color.bottomSheet,
                maxHeight: heightPixel(maxHeight),
              },
            ]}>
            {title ? (
              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor: titleLineColor,
                    borderBottomWidth: hideTitleLine ? 0 : 1,
                    marginHorizontal: widthPixel(30),
                  },
                ]}>
                <Text
                  variant="medium"
                  size={22}
                  color={color.black}
                  style={styles.title}>
                  {title}
                </Text>
              </View>
            ) : null}
            <ScrollView
              style={styles.content}
              contentContainerStyle={
                (styles.scrollContent, {paddingBottom: heightPixel(15)})
              }
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

interface RadioListProps {
  options: RadioOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose?: () => void;
}

export const RadioList: React.FC<RadioListProps> = ({
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const color = useThemeColor();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose?.();
  };

  // In dark mode, unselected radio circles should be white for visibility
  const unselectedBorderColor = isDark ? '#FFFFFF' : color.radioColor;

  return (
    <View style={styles.radioContainer}>
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => handleSelect(option.value)}
            style={styles.radioItem}>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: isSelected
                    ? color.primary
                    : unselectedBorderColor,
                },
              ]}>
              {isSelected && (
                <View
                  style={[styles.radioInner, {backgroundColor: color.primary}]}
                />
              )}
            </View>
            <Text
              variant="regular"
              size={16}
              color={color.black}
              style={styles.radioLabel}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: heightPixel(20),
    paddingHorizontal: widthPixel(20),
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: widthPixel(30),
  },
  scrollContent: {
    flexGrow: 1,
  },
  radioContainer: {
    paddingBottom: heightPixel(20),
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: heightPixel(16),
    gap: widthPixel(12),
  },
  radioCircle: {
    width: widthPixel(24),
    height: widthPixel(24),
    borderRadius: widthPixel(12),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: widthPixel(12),
    height: widthPixel(12),
    borderRadius: widthPixel(6),
  },
  radioLabel: {
    flex: 1,
  },
});
