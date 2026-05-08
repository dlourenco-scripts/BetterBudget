// @ts-ignore
import React from 'react';
import {Modal, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Chase} from 'react-native-animated-spinkit';
import {wp} from '@/services/responsive';
import {colors} from '../../constants/colors';

const Loader = ({
  visible = false,
  text = '',
  size = wp(15),
  color = colors.light.primary,
  transparent = true,
  overlay = true,
  style,
}: {
  visible?: boolean;
  text?: string;
  size?: number;
  color?: string;
  transparent?: boolean;
  overlay?: boolean;
  style?: ViewStyle;
}) => {
  return overlay ? (
    <Modal
      transparent={transparent}
      animationType={'fade'}
      visible={visible}
      statusBarTranslucent={true}>
      <View style={[styles.overlay, {backgroundColor: 'rgba(0, 0, 0, 0.5)'}]}>
        <Chase size={size} color={color} />
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    </Modal>
  ) : (
    <View style={[styles.overlay, style]}>
      <Chase size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
