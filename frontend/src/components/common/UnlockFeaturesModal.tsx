import React from 'react';
import {Image, Modal, ScrollView, TouchableOpacity, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, hp, widthPixel, wp} from '@/services/responsive';
import Spacer from './Spacer';
import Text from './Text';
import Wrapper from './Wrapper';

interface UnlockFeaturesModalProps {
  visible: boolean;
  onClose: () => void;
}

const UnlockFeaturesModal: React.FC<UnlockFeaturesModalProps> = ({
  visible,
  onClose,
}) => {
  const color = useThemeColor();

  const features = [
    'Forecast your savings & debt payoff',
    'Automatically add savings & debt goals',
    'Track multiple income sources',
    'Manage multiple budgets with ease',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      backdropColor={color.bg}
      onRequestClose={onClose}>
      <Spacer height={heightPixel(60)} />
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: widthPixel(20),
          }}>
          <TouchableOpacity onPress={onClose}>
            <View
              style={{
                backgroundColor:
                  color.bg === '#121212' ? '#171A21' : 'transparent',
                padding: heightPixel(8),
                borderRadius: 50,
              }}>
              <Ionicons name="chevron-back" size={26} color={color.black} />
            </View>
          </TouchableOpacity>
          <Spacer width={widthPixel(45)} />
          <Text size={22} variant="medium" color={color.black}>
            Unlock Pro Features
          </Text>
          <Spacer width={widthPixel(7)} />
          <View>
            <Image
              source={appImages.FillCheck}
              style={{
                width: heightPixel(25),
                height: heightPixel(25),
                resizeMode: 'contain',
              }}
            />
          </View>
        </View>
        <Spacer height={heightPixel(80)} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: widthPixel(20),
            marginBottom: heightPixel(40),
          }}>
          <View
            style={{
              alignItems: 'center',
              marginVertical: heightPixel(20),
            }}>
            <Image
              source={appImages.FinanceModalImg}
              style={{
                width: widthPixel(270),
                height: heightPixel(271),
                resizeMode: 'contain',
              }}
            />
          </View>
          <Spacer height={heightPixel(20)} />
          <Text size={17} variant="medium" color={color.black}>
            Gain Complete Control Over Your Finances
          </Text>
          <Spacer height={heightPixel(30)} />
          <View
            style={{gap: heightPixel(15), marginHorizontal: widthPixel(10)}}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: widthPixel(12),
                }}>
                <Image
                  source={appImages.Check}
                  style={{
                    width: heightPixel(17),
                    height: heightPixel(17),
                    resizeMode: 'contain',
                    tintColor: color.primary,
                  }}
                />
                <Text size={14} variant="medium" color={color.black}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          <Spacer height={heightPixel(70)} />
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor:
                color.bg === '#121212' ? '#171A21' : color.featureText,
              borderRadius: 12,
              paddingVertical: heightPixel(16),
              paddingHorizontal: widthPixel(20),
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <View>
              <Text size={17} variant="medium" color={color.primary}>
                $4.99 / Month
              </Text>
              <Spacer height={heightPixel(6)} />
              <Text
                size={12}
                variant="medium"
                color={color.bg === '#121212' ? color.white : color.tabicon}>
                With 7 Day Free Trial
              </Text>
            </View>
            <View
              style={{
                backgroundColor: color.bg === '#121212' ? '#1E1E1E' : color.bg,
                padding: heightPixel(8),
                borderRadius: 50,
              }}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={color.bg === '#121212' ? color.white : color.tabicon}
              />
            </View>
          </TouchableOpacity>
          <Spacer height={heightPixel(20)} />
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor:
                color.bg === '#121212' ? '#171A21' : color.featureText,
              borderRadius: 12,
              paddingVertical: heightPixel(16),
              paddingHorizontal: widthPixel(20),
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: heightPixel(40),
            }}>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text size={17} variant="medium" color={color.primary}>
                  $49.99 / Year
                </Text>
                <Text
                  size={12}
                  variant="medium"
                  color={color.primary}
                  style={{marginLeft: widthPixel(6)}}>
                  ( $4.16/Month )
                </Text>
              </View>
              <Text
                size={12}
                variant="medium"
                color={color.bg === '#121212' ? color.white : color.tabicon}>
                With 7 Day Free Trial
              </Text>
            </View>
            <Image
              source={appImages.BestValue}
              style={{
                width: heightPixel(50),
                height: heightPixel(50),
                resizeMode: 'contain',
                position: 'absolute',
                top: heightPixel(0),
                right: widthPixel(80),
              }}
            />
            <View
              style={{
                backgroundColor: color.bg === '#121212' ? '#1E1E1E' : color.bg,
                padding: heightPixel(8),
                borderRadius: 50,
              }}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={color.bg === '#121212' ? color.white : color.tabicon}
              />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default UnlockFeaturesModal;
