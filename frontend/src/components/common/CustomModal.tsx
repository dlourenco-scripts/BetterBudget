import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {AntDesign} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Spacer from './Spacer';
import Text from './Text';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  message,
  onPrimaryPress,
  onSecondaryPress,
  primaryButtonText,
  secondaryButtonText,
}) => {
  const color = useThemeColor();
  const isDarkMode = useColorScheme() === 'dark';
  console.log(isDarkMode);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDarkMode ? '#171A21' : '#FFFFFF',
            },
          ]}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text size={16} variant="semibold" color={color.primary}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <AntDesign name="close" size={15} color={color.primary} />
            </TouchableOpacity>
          </View>
          <Spacer height={heightPixel(20)} />
          <Text size={11} variant="regular" color={color.black}>
            {message}
          </Text>
          <Spacer height={heightPixel(30)} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={{
                backgroundColor: color.tabBackground,
                paddingVertical: heightPixel(15),
                paddingHorizontal: widthPixel(20),
                borderRadius: heightPixel(30),
                flex: 1,
              }}
              onPress={onSecondaryPress}>
              <Text
                size={12}
                variant="medium"
                color={isDarkMode ? color.white : color.black}
                style={{textAlign: 'center'}}>
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: color.primary,
                paddingVertical: heightPixel(15),
                paddingHorizontal: widthPixel(20),
                borderRadius: heightPixel(30),
                flex: 1,
              }}
              onPress={onPrimaryPress}>
              <Text
                size={12}
                variant="medium"
                color={isDarkMode ? color.bg : color.black}
                style={{textAlign: 'center'}}>
                {primaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: widthPixel(386),
    borderRadius: heightPixel(10),
    paddingHorizontal: widthPixel(17),
    paddingVertical: heightPixel(10),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: widthPixel(12),
  },
  button: {
    flex: 1,
  },
});

export default CustomModal;
