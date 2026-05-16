import React, {useCallback, useRef} from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  ImageStyle,
  View,
  ViewStyle,
} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {useFocusEffect} from 'expo-router';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {wp} from '@/services/responsive';
import Spacer from './Spacer';

interface WrapperProps {
  children: React.ReactNode;
  keyboadEnabled?: boolean;
  containerStyle?: ViewStyle;
  statusbar?: boolean;
  StatusBarColor?: string;
  backgroundColor?: string;
  backgroundImage?: ImageSourcePropType;
  backgroundImageStyle?: ImageStyle;
  backgroundImageResizeMode?:
    | 'cover'
    | 'contain'
    | 'stretch'
    | 'repeat'
    | 'center';
  keyboardProps?: KeyboardAwareScrollViewProps;
  bottomSpace?: boolean;
  resetScrollOnFocus?: boolean;
}

const Wrapper = (props: WrapperProps) => {
  const {
    children,
    keyboadEnabled = true,
    containerStyle = {},
    statusbar = true,
    StatusBarColor = 'transparent',
    backgroundColor,
    keyboardProps,
    backgroundImage,
    backgroundImageStyle,
    backgroundImageResizeMode = 'cover',
    bottomSpace = true,
    resetScrollOnFocus = true,
  } = props;

  const colors = useThemeColor();
  const colorScheme = useColorScheme();
  const {top, bottom} = useSafeAreaInsets();
  const scrollRef = useRef<any>(null);

  const statusBarColor = StatusBarColor ?? colors.bg;

  useFocusEffect(
    useCallback(() => {
      if (!resetScrollOnFocus || !keyboadEnabled) {
        return undefined;
      }

      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo?.({x: 0, y: 0, animated: false});
      });

      return () => cancelAnimationFrame(frame);
    }, [keyboadEnabled, resetScrollOnFocus]),
  );

  // ----------------------------------------
  // Content Block Extracted for Reuse
  // ----------------------------------------
  const Content = (
    <View
      style={{
        flex: 1,
        paddingHorizontal: wp(5),
        ...containerStyle,
      }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {keyboadEnabled ? (
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={{flex: 1}}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{flexGrow: 1}}
          bounces={false}
          {...keyboardProps}>
          {children}
          {bottomSpace && <Spacer height={bottom + 10} />}
        </KeyboardAwareScrollView>
      ) : (
        <>
          {children}
          {bottomSpace && <Spacer height={bottom + 10} />}
        </>
      )}
    </View>
  );

  // ----------------------------------------
  // MAIN RETURN
  // ----------------------------------------
  return (
    <View style={{flex: 1, backgroundColor: backgroundColor ?? colors.bg}}>
      {statusbar && (
        <View
          style={{
            paddingTop: top,
            backgroundColor: statusBarColor,
          }}
        />
      )}

      {backgroundImage ? (
        <ImageBackground
          source={backgroundImage}
          resizeMode={backgroundImageResizeMode}
          imageStyle={backgroundImageStyle}
          style={{flex: 1}}>
          {Content}
        </ImageBackground>
      ) : (
        Content
      )}
    </View>
  );
};

export default Wrapper;
