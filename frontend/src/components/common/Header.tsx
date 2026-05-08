import React, {useMemo} from 'react';
import {
  Image,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {router} from 'expo-router';
import {ThemeColors} from '@/constants/colors';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import {appImages} from '../../constants/assets';
import Text from './Text';

type HeaderProps = {
  title?: string;
  canGoBack?: boolean;
  onBackPress?: () => void;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
};

const Header: React.FC<HeaderProps> = ({
  title,
  canGoBack = true,
  onBackPress,
  leftComponent,
  rightComponent,
  containerStyle,
  titleStyle = {},
}) => {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.side}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBackPress ?? (() => router.back())}>
            <Image
              source={appImages.ArrowBack}
              style={{
                height: heightPixel(20),
                width: widthPixel(20),
                resizeMode: 'contain',
                tintColor: colors.tabicon,
              }}
            />
          </TouchableOpacity>
        ) : (
          (leftComponent ?? <View style={styles.placeholder} />)
        )}
      </View>

      {title ? (
        <View style={styles.titleWrapper}>
          <Text
            size={24}
            variant="semibold"
            color={colors.primary}
            style={[styles.title, titleStyle]}>
            {title}
          </Text>
        </View>
      ) : null}

      <View style={[styles.side, {alignItems: 'flex-end'}]}>
        {rightComponent ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

export default Header;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      backgroundColor: colors.bg,
    },
    side: {
      flex: 1,
      alignItems: 'flex-start',
    },
    backButton: {
      height: 35,
      width: 35,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.headerIconBg,
      borderRadius: 50,
    },
    placeholder: {
      width: widthPixel(44),
    },
    titleWrapper: {
      // flex: 1,
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
      textTransform: 'capitalize',
    },
  });
