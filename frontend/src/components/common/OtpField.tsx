import React from 'react';
import {StyleSheet, View} from 'react-native';
import {CodeField, Cursor} from 'react-native-confirmation-code-field';
//@ts-ignore
import {ThemeColors} from '@/constants/colors';
import {useThemeColor} from '@/hooks/useThemeColor';
import {widthPixel} from '@/services/responsive';
import Text from './Text';

interface OtpFieldProps {
  otp: string;
  setOtp: (otp: string) => void;
}

const OtpField = (props: OtpFieldProps) => {
  const {otp, setOtp} = props;
  const colors = useThemeColor();
  const styles = createStyles(colors);
  return (
    <CodeField
      rootStyle={styles.codeFieldRoot}
      keyboardType="number-pad"
      renderCell={({index, symbol, isFocused}) => {
        const isFilled = !!symbol;
        return (
          <View
            key={index}
            style={[
              styles.cellContainer,
              isFocused && styles.focusedCell,
              isFilled && styles.filledCell,
            ]}>
            <Text size={20} variant="medium" style={styles.cell}>
              {symbol || (isFocused ? <Cursor /> : '')}
            </Text>
          </View>
        );
      }}
      cellCount={6}
      value={otp}
      onChangeText={setOtp}
    />
  );
};

export default OtpField;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    codeFieldRoot: {
      flexDirection: 'row',
      justifyContent: 'center',
      // width: widthPixel(270),
      alignSelf: 'center',
      gap: 17,
    },
    cellContainer: {
      width: widthPixel(46),
      height: widthPixel(46),
      backgroundColor: colors.bg,
      borderRadius: widthPixel(50),
      borderWidth: 3,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    focusedCell: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    filledCell: {
      // backgroundColor: colors.primary,
    },
    cell: {
      textAlign: 'center',
    },
  });
