//@ts-ignore
import React, {JSX, forwardRef, useMemo, useRef, useState} from 'react';
import {
  Image,
  Platform,
  Pressable,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {ThemeColors} from '@/constants/colors';
import {fonts} from '@/constants/fonts';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel, wp} from '@/services/responsive';
import Text from './Text';

interface InputFieldProps extends React.ComponentProps<typeof RNTextInput> {
  title?: string;
  noTitle?: boolean;
  infoicon?: any;
  infoIconPosition?: 'beside' | 'right';
  onInfoIconPress?: () => void;
  leftIcon?: any;
  leftIconComponent?: JSX.Element;
  useCurrencyIcon?: boolean;
  rightIcon?: any;
  rightIconComponent?: JSX.Element;
  rightIconPress?: () => void;

  containerStyle?: any;
  inputContainerStyle?: any;
  inputStyle?: any;
  titleStyle?: any;
  leftIconStyle?: any;
  rightIconStyle?: any;

  onPress?: () => void;
  replaceOnFirstType?: boolean;

  error?: string;
  touched?: boolean;
  errorStyle?: any;
  errorContainerStyle?: any;
}

const normalizeCurrencyText = (text: string) => {
  const withoutCommas = text.replace(/,/g, '');
  const digitsAndDecimal = withoutCommas.replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = digitsAndDecimal.split('.');
  if (decimalParts.length === 0) {
    return integerPart;
  }
  return `${integerPart}.${decimalParts.join('')}`;
};

const formatCurrencyText = (text?: string | number | null) => {
  const normalized = normalizeCurrencyText(String(text ?? ''));
  if (!normalized) {
    return '';
  }

  const hasDecimal = normalized.includes('.');
  const [integerPart = '0', decimalPart = ''] = normalized.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return hasDecimal ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

const getFirstTypedAmountText = (previousText: string, nextText: string) => {
  const previous = normalizeCurrencyText(previousText);
  const next = normalizeCurrencyText(nextText);

  if (!next || next === previous) {
    return next;
  }

  if (previous && next.startsWith(previous)) {
    return next.slice(previous.length);
  }

  const previousDigits = previous.replace(/\D/g, '');
  const nextDigits = next.replace(/\D/g, '');
  if (previousDigits && nextDigits.startsWith(previousDigits)) {
    return nextDigits.slice(previousDigits.length);
  }

  return next;
};

const TextInput = forwardRef<RNTextInput, InputFieldProps>(({
  title,
  noTitle,
  infoicon,
  infoIconPosition = 'beside',
  onInfoIconPress,
  leftIcon,
  leftIconComponent,
  useCurrencyIcon,
  rightIcon,
  rightIconComponent,
  rightIconPress,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  titleStyle,
  leftIconStyle,
  rightIconStyle,
  onPress,
  replaceOnFirstType,
  error,
  touched,
  errorStyle,
  errorContainerStyle,
  multiline,
  onFocus,
  onBlur,
  onChangeText,
  placeholder,
  value,
  keyboardType,
  selection,
  selectTextOnFocus,
  ...rest
}, ref) => {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showError = touched && error;
  const {getCurrencyIcon} = useCurrency();
  const [isFocused, setIsFocused] = useState(false);
  const shouldReplaceOnNextInputRef = useRef(false);
  const displayValue = useCurrencyIcon ? formatCurrencyText(value as string) : value;
  const shouldSelectTextOnFocus =
    replaceOnFirstType
      ? false
      : selectTextOnFocus ??
        Boolean(
          useCurrencyIcon ||
            keyboardType === 'numeric' ||
            keyboardType === 'decimal-pad' ||
            keyboardType === 'number-pad',
        );
  const [focusSelection, setFocusSelection] = useState<
    {start: number; end: number} | undefined
  >(undefined);

  // --------------------
  // TITLE + INFO ICON UI
  // --------------------
  const renderTitle = () => {
    if (noTitle) return null;

    const icon = infoicon ? (
      <TouchableOpacity activeOpacity={0.7} onPress={onInfoIconPress}>
        <Image source={infoicon} style={styles.infoIcon} />
      </TouchableOpacity>
    ) : null;

    if (infoIconPosition === 'right') {
      return (
        <View style={styles.titleRowRight}>
          {!!title && (
            <Text
              variant="medium"
              color={colors.black}
              size={15}
              style={titleStyle}>
              {title}
            </Text>
          )}
          {icon}
        </View>
      );
    }

    return (
      <View style={styles.titleRowBeside}>
        {!!title && (
          <Text
            variant="medium"
            color={colors.black}
            size={15}
            style={titleStyle}>
            {title}
          </Text>
        )}
        {icon}
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {renderTitle()}

      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={[
          styles.inputContainer,
          multiline && styles.multilineContainer,
          inputContainerStyle,
          showError && styles.inputError,
        ]}>
        {useCurrencyIcon ? (
          <View style={styles.currencyIconWrapper}>
            {getCurrencyIcon(colors.black)}
          </View>
        ) : (
          <>
            {leftIcon && (
              <Image
                source={leftIcon}
                style={[styles.leftIcon, leftIconStyle]}
              />
            )}
            {leftIconComponent}
          </>
        )}

        <RNTextInput
          ref={ref}
          {...rest}
          keyboardType={keyboardType}
          selectTextOnFocus={shouldSelectTextOnFocus}
          selection={focusSelection || selection}
          value={displayValue}
          onChangeText={text => {
            setFocusSelection(undefined);
            const nextText =
              replaceOnFirstType && shouldReplaceOnNextInputRef.current
                ? getFirstTypedAmountText(String(displayValue ?? ''), text)
                : text;
            shouldReplaceOnNextInputRef.current = false;
            onChangeText?.(useCurrencyIcon ? normalizeCurrencyText(nextText) : nextText);
          }}
          multiline={multiline}
          onFocus={event => {
            setIsFocused(true);
            shouldReplaceOnNextInputRef.current =
              Boolean(replaceOnFirstType) && String(displayValue ?? '').length > 0;
            if (shouldSelectTextOnFocus) {
              const nextValue = String(displayValue ?? '');
              if (nextValue.length > 0) {
                setFocusSelection({start: 0, end: nextValue.length});
              }
            }
            if (
              useCurrencyIcon &&
              onChangeText &&
              /^0+(\.0+)?$/.test(normalizeCurrencyText(String(value ?? '')).trim())
            ) {
              onChangeText('');
            }
            onFocus?.(event);
          }}
          onBlur={event => {
            setIsFocused(false);
            setFocusSelection(undefined);
            shouldReplaceOnNextInputRef.current = false;
            onBlur?.(event);
          }}
          placeholder={isFocused ? '' : placeholder}
          placeholderTextColor={colors.placeholdertext}
          pointerEvents={onPress ? 'none' : 'auto'}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            showError && {color: colors.errortext || '#FF0000'},
            inputStyle,
          ]}
        />

        {(rightIcon || rightIconComponent) && (
          <TouchableOpacity onPress={rightIconPress} hitSlop={10}>
            {rightIconComponent ? (
              rightIconComponent
            ) : (
              <Image
                source={rightIcon}
                style={[
                  styles.rightIcon,
                  showError && {tintColor: colors.errortext || '#FF0000'},
                  rightIconStyle,
                ]}
              />
            )}
          </TouchableOpacity>
        )}
      </Pressable>

      {showError && (
        <View style={[styles.errorContainer, errorContainerStyle]}>
          <Text size={14} style={[styles.errorText, errorStyle]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;

// --------------------
// STYLES
// --------------------
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: heightPixel(10),
    },

    // Title → info beside
    titleRowBeside: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: widthPixel(10),
      flexShrink: 1,
      maxWidth: '100%',
    },

    // Title → info right side
    titleRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: widthPixel(10),
    },

    infoIcon: {
      height: heightPixel(20),
      width: widthPixel(20),
      resizeMode: 'contain',
    },

    inputContainer: {
      height: heightPixel(48),
      width: '100%',
      marginTop: heightPixel(12),
      paddingHorizontal: widthPixel(12),
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tabBackground,
      borderRadius: heightPixel(18),
    },

    multilineContainer: {
      height: heightPixel(200),
      alignItems: 'flex-start',
    },

    leftIcon: {
      width: wp(7),
      height: wp(7),
      resizeMode: 'contain',
      marginRight: 6,
    },

    currencyIconWrapper: {
      marginRight: 6,
    },

    rightIcon: {
      width: widthPixel(20),
      height: heightPixel(20),
      resizeMode: 'contain',
    },

    input: {
      flex: 1,
      height: heightPixel(48),
      fontSize: fontPixel(14),
      marginTop: Platform.OS === 'ios' ? 0 : 3,
      fontFamily: fonts.regular,
      paddingLeft: 4,
      color: colors.placeholdertext,
    },

    multilineInput: {
      height: heightPixel(200),
      textAlignVertical: 'top',
    },

    inputError: {
      borderWidth: 1,
      borderColor: colors.errortext || '#FF0000',
    },

    errorContainer: {
      marginTop: 6,
      paddingHorizontal: 4,
    },

    errorText: {
      color: colors.errortext || '#FF0000',
    },
  });
