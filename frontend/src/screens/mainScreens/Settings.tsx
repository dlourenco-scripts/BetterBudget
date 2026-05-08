import React, {useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import {
  Header,
  LanguagePickerModal,
  Spacer,
  Text,
  TextInput,
  UnlockFeaturesModal,
  Wrapper,
} from '@/components';
import {
  BottomSheet,
  RadioList,
  RadioOption,
} from '@/components/common/BottomSheet';
import {appImages} from '@/constants/assets';
import {CurrencyCode, useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {useThemeStore} from '@/store';

const Settings = () => {
  const color = useThemeColor();
  const {theme, setTheme} = useThemeStore();
  const [isThemeSheetVisible, setIsThemeSheetVisible] = useState(false);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const [isCurrencySheetVisible, setIsCurrencySheetVisible] = useState(false);
  const {selectedCurrency, setCurrency} = useCurrency();
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const themeOptions: RadioOption[] = [
    {label: 'Light', value: 'light'},
    {label: 'Dark', value: 'dark'},
  ];

  const currencyOptions = [
    {label: 'US Dollar (USD)', value: 'USD'},
    {label: 'Great Britain Pound (GBP)', value: 'GBP'},
    {label: 'Euro (EUR)', value: 'EUR'},
    {label: 'Japanese Yen (JPY)', value: 'JPY'},
    {label: 'Australian Dollar (AUD)', value: 'AUD'},
    {label: 'Canadian Dollar (CAD)', value: 'CAD'},
    {label: 'Swiss Franc (CHF)', value: 'CHF'},
    {label: 'Chinese Yuan Renminbi (CNY)', value: 'CNY'},
    {label: 'Swedish Krona (SEK)', value: 'SEK'},
    {label: 'New Zealand Dollar (NZD)', value: 'NZD'},
    {label: 'Pakistani Rupee (PKR)', value: 'PKR'},
  ];

  const handleThemeSelect = (value: string) => {
    setTheme(value as 'light' | 'dark');
  };

  const profileOptions = [
    {
      id: '1',
      title: 'Account Information',
      image: appImages.AccountInfo,
      onPress: () => router.navigate('/mainScreens/Profile'),
    },
    {
      id: '2',
      title: 'Upgrade To Pro',
      image: appImages.UpgradePro,
      onPress: () => setIsPremiumModalVisible(true),
    },
    {
      id: '3',
      title: 'Sharing Budget',
      image: appImages.SharingBudget,
      onPress: () =>
        router.navigate('/mainScreens/SharingBudget?fromSettings=true'),
    },
    {
      id: '4',
      title: 'Currency',
      image: appImages.Currency,
      onPress: () => setIsCurrencySheetVisible(true),
    },
    {
      id: '5',
      title: 'Default Pay Source  (Credit Card)',
      image: appImages.DefaultPay,
      onPress: () => router.navigate('/mainScreens/PaySource'),
    },
    {
      id: '6',
      title: 'Language',
      image: appImages.Language,
      onPress: () => setShowLanguageSheet(true),
    },
    {
      id: '7',
      title: 'App Theme',
      image: appImages.AppTheme,
      onPress: () => setIsThemeSheetVisible(true),
    },
    {
      id: '8',
      title: 'Invite Friends',
      image: appImages.InviteFriends,
      onPress: () => {},
    },
    {
      id: '9',
      title: 'Logout',
      image: appImages.Logout,
      onPress: () => router.replace('/auth/SignIn'),
    },
  ];

  const renderSettingItem = ({
    item,
    index,
  }: {
    item: (typeof profileOptions)[0];
    index: number;
  }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: widthPixel(12),
        borderRadius: 12,
        backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
        paddingVertical: heightPixel(30),
        paddingHorizontal: widthPixel(16),
        shadowColor: color.bg === '#121212' ? '#000000' : color.border,
        shadowOffset: {
          width: 2,
          height: 2,
        },
        shadowOpacity: color.bg === '#121212' ? 0.5 : 0.32,
        shadowRadius: 1.41,
        elevation: 2,
      }}
      activeOpacity={0.8}
      onPress={item.onPress}>
      <Image
        source={item.image}
        style={{
          height: heightPixel(26),
          width: widthPixel(26),
          resizeMode: 'contain',
        }}
      />
      <Text
        size={16}
        variant="medium"
        color={color.ProfileText}
        style={{flex: 1}}>
        {item.title}
      </Text>
      {index < profileOptions.length - 3 && (
        <Image
          source={appImages.ArrowRight}
          style={{
            height: heightPixel(15),
            width: widthPixel(15),
            resizeMode: 'contain',
            tintColor: color.bg === '#121212' ? '#7A7F8C' : undefined,
          }}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Wrapper keyboadEnabled={false}>
      <Header
        title="Settings"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />
      <Spacer height={heightPixel(20)} />
      <FlatList
        data={profileOptions}
        renderItem={renderSettingItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Spacer height={heightPixel(20)} />}
        // contentContainerStyle={{
        //   paddingBottom: heightPixel(20),
        // }}
        showsVerticalScrollIndicator={false}
      />

      {/* Theme Selection Bottom Sheet */}
      <BottomSheet
        visible={isThemeSheetVisible}
        onClose={() => setIsThemeSheetVisible(false)}
        title="Select App Theme"
        maxHeight={600}
        backgroundColor={color.inputField}>
        <RadioList
          options={themeOptions}
          selectedValue={theme}
          onSelect={handleThemeSelect}
          onClose={() => setIsThemeSheetVisible(false)}
        />
      </BottomSheet>

      {/* Unlock Features Modal */}
      <UnlockFeaturesModal
        visible={isPremiumModalVisible}
        onClose={() => setIsPremiumModalVisible(false)}
      />

      <BottomSheet
        visible={isCurrencySheetVisible}
        onClose={() => setIsCurrencySheetVisible(false)}
        title="Currency"
        maxHeight={heightPixel(900)}
        backgroundColor={color.inputField}>
        <RadioList
          options={currencyOptions}
          selectedValue={selectedCurrency}
          onSelect={val => setCurrency(val as CurrencyCode)}
          onClose={() => setIsCurrencySheetVisible(false)}
        />
      </BottomSheet>

      {/* Language Picker Modal */}
      <LanguagePickerModal
        visible={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        selectedLanguage={selectedLanguage}
        onLanguageSelect={setSelectedLanguage}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({});

export default Settings;
