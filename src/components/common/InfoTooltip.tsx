import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Entypo, Feather} from '@expo/vector-icons';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Text from './Text';

interface InfoTooltipProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
  position?: 'top' | 'middle' | 'bottom' | 'top-middle' | 'bottom-middle';
}

const InfoTooltip = ({
  visible,
  title,
  content,
  onClose,
  position = 'middle',
}: InfoTooltipProps) => {
  const color = useThemeColor();
  const styles = createStyles(color);
  const getContainerStyle = () => {
    switch (position) {
      case 'top':
        return {
          justifyContent: 'flex-start' as const,
          paddingTop: heightPixel(210),
        };
      case 'top-middle':
        return {
          justifyContent: 'flex-start' as const,
          paddingTop: heightPixel(310),
        };
      case 'middle':
        return {
          justifyContent: 'center' as const,
          paddingBottom: heightPixel(70),
        };
      case 'bottom':
        return {
          justifyContent: 'flex-end' as const,
          paddingBottom: heightPixel(190),
        };
      case 'bottom-middle':
        return {
          justifyContent: 'flex-end' as const,
          paddingBottom: heightPixel(270),
        };
      default:
        return {justifyContent: 'center' as const};
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, getContainerStyle()]}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={[styles.card, {backgroundColor: color.inputField}]}>
                <View style={styles.header}>
                  <Text
                    variant="semibold"
                    size={13}
                    style={{color: color.primary, flex: 1}}
                    numberOfLines={2}>
                    {title}
                  </Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
                    <Entypo name="cross" size={15} color={color.primary} />
                  </TouchableOpacity>
                </View>
                <Text
                  variant="regular"
                  size={13}
                  color={color.black}
                  style={{
                    lineHeight: heightPixel(20),
                  }}>
                  {content}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default InfoTooltip;

const createStyles = (color: any) => {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: widthPixel(20),
    },
    modalContainer: {
      width: '100%',
    },
    card: {
      borderRadius: heightPixel(12),
      padding: widthPixel(20),
      paddingBottom: heightPixel(15),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: heightPixel(10),
    },
    content: {
      lineHeight: heightPixel(20),
    },
  });
};
