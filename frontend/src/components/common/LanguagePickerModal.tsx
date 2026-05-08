import React, {useState} from 'react';
import {Image, Modal, ScrollView, TouchableOpacity, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Spacer from './Spacer';
import Text from './Text';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguage?: string;
  onLanguageSelect?: (languageCode: string) => void;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  visible,
  onClose,
  selectedLanguage = 'en',
  onLanguageSelect,
}) => {
  const color = useThemeColor();
  const [selected, setSelected] = useState(selectedLanguage);

  const languages: Language[] = [
    {code: 'en', name: 'English', flag: '🇬🇧'},
    {code: 'zh', name: 'Chinese', flag: '🇨🇳'},
    {code: 'fr', name: 'French', flag: '🇫🇷'},
    {code: 'ja', name: 'Japanese', flag: '🇯🇵'},
    {code: 'ar', name: 'Arabic', flag: '🇸🇦'},
    {code: 'ur', name: 'Urdu', flag: '🇵🇰'},
    {code: 'bn', name: 'Bengali', flag: '🇧🇩'},
    {code: 'hi', name: 'Hindi', flag: '🇮🇳'},
    {code: 'de', name: 'German', flag: '🇩🇪'},
  ];

  const handleLanguageSelect = (languageCode: string) => {
    setSelected(languageCode);
    if (onLanguageSelect) {
      onLanguageSelect(languageCode);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: color.bg,
          paddingTop: heightPixel(40),
          paddingHorizontal: widthPixel(20),
          paddingBottom: heightPixel(40),
        }}>
        {/* Header */}
        <Spacer height={heightPixel(30)} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: heightPixel(30),
          }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: heightPixel(40),
              height: heightPixel(40),
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: color.inputField,
              borderRadius: 12,
            }}>
            <Ionicons name="chevron-back" size={24} color={color.black} />
          </TouchableOpacity>
          <Spacer width={widthPixel(70)} />
          <Text size={22} variant="medium" color={color.black}>
            Select Language
          </Text>
        </View>
        <Spacer height={heightPixel(20)} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: heightPixel(40),
          }}>
          {languages.map((language, index) => {
            const isSelected = selected === language.code;
            return (
              <React.Fragment key={language.code}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleLanguageSelect(language.code)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: color.inputField,
                    borderRadius: 12,
                    paddingVertical: heightPixel(16),
                    paddingHorizontal: widthPixel(16),
                    borderWidth: 2,
                    borderColor: isSelected ? color.primary : color.inputField,
                  }}>
                  {/* Flag */}
                  <Text size={28} style={{marginRight: widthPixel(12)}}>
                    {language.flag}
                  </Text>

                  {/* Language Name */}
                  <Text
                    size={16}
                    variant="medium"
                    color={color.black}
                    style={{flex: 1}}>
                    {language.name}
                  </Text>

                  {/* Radio Button */}
                  <Image
                    source={
                      isSelected
                        ? appImages.EllipseSelected
                        : appImages.EllipseUnselected
                    }
                    resizeMode="contain"
                    style={{width: 25, height: 25}}
                  />
                </TouchableOpacity>
                {index < languages.length - 1 && (
                  <Spacer height={heightPixel(12)} />
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default LanguagePickerModal;
