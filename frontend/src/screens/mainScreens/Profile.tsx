import React, {useCallback, useState} from 'react';
import {
  Image,
  Modal,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useFocusEffect} from 'expo-router';
import {
  BottomSheet,
  Button,
  Header,
  Spacer,
  Text,
  TextInput,
  UnlockFeaturesModal,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {userApi} from '@/network/api';
import {
  fontPixel,
  heightPixel,
  hp,
  widthPixel,
  wp,
} from '@/services/responsive';
import {useAuthStore} from '@/store';

const Profile = () => {
  const color = useThemeColor();
  const [isFullAccess, setIsFullAccess] = useState(false);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<'savings' | 'debt'>(
    'savings',
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [draftSavingsGoal, setDraftSavingsGoal] = useState('');
  const [showEditSavingsModal, setShowEditSavingsModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const updateUserData = useAuthStore(state => state.updateUserData);

  const applyUser = useCallback((user: any) => {
    setFullName(user?.fullName || '');
    setEmail(user?.email || '');
    setSelectedGoal(user?.goalType === 'debt' ? 'debt' : 'savings');
    setSavingsGoal(String(Number(user?.savingsGoal || 0)));
    setDraftSavingsGoal(String(Number(user?.savingsGoal || 0)));
    setIsFullAccess(Boolean(user?.paydayReminderEnabled));
  }, []);

  useFocusEffect(
    useCallback(() => {
      applyUser(useAuthStore.getState().userData);
      userApi.me().then(response => {
        if (response.success && response.data) {
          updateUserData(response.data);
          applyUser(response.data);
        }
      });
    }, [applyUser, updateUserData]),
  );

  const updateProfile = async (values: any) => {
    const response = await userApi.update(values);
    if (response.success && response.data) {
      updateUserData(response.data);
      applyUser(response.data);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleFullAccessToggle = (value: boolean) => {
    setIsFullAccess(value);
    updateProfile({paydayReminderEnabled: value});
  };

  return (
    <Wrapper>
      <Header
        title="Profile"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack
      />
      <Spacer height={heightPixel(100)} />
      <View
        style={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: 12,
          paddingTop: heightPixel(70),
          paddingBottom: heightPixel(24),
          paddingHorizontal: widthPixel(20),
        }}>
        <Image
          source={appImages.UserDemoimg}
          style={{
            height: heightPixel(110),
            width: heightPixel(110),
            position: 'absolute',
            top: hp(-6),
            alignSelf: 'center',
          }}
        />
        <Text
          size={24}
          variant="semibold"
          style={{
            textAlign: 'center',
          }}>
          {fullName || email || 'Profile'}
        </Text>
        <Spacer height={heightPixel(16)} />
        <View
          style={{
            height: 1,
            backgroundColor: color.dividerColor,
            width: '100%',
          }}
        />
        <Spacer height={heightPixel(20)} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setIsPremiumModalVisible(true)}
          style={{
            backgroundColor: color.primary,
            borderRadius: 12,
            paddingVertical: heightPixel(16),
            paddingHorizontal: widthPixel(20),
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text
            size={15}
            variant="medium"
            color={color.bg === '#121212' ? '#1E1E1E' : color.upgradeText}>
            Basic Plan
          </Text>
          <Text
            size={15}
            variant="medium"
            color={color.bg === '#121212' ? '#1E1E1E' : color.upgradeText}>
            Upgrade
          </Text>
        </TouchableOpacity>
      </View>
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Full Name"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        placeholderTextColor={color.shareBudgetText}
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        onBlur={() => updateProfile({fullName})}
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: 50,
          paddingVertical: heightPixel(15),
        }}
      />
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Email"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        placeholderTextColor={color.shareBudgetText}
        placeholder="Email"
        value={email}
        editable={false}
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: 50,
          paddingVertical: heightPixel(15),
        }}
      />
      <Spacer height={heightPixel(25)} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: 50,
          paddingVertical: heightPixel(13),
          paddingHorizontal: widthPixel(10),
          gap: widthPixel(10),
          shadowColor: color.bg === '#121212' ? '#000000' : '#9a9898ff',
          shadowOffset: {
            width: 2,
            height: 2,
          },
          shadowOpacity: 0.13,
          shadowRadius: 1.84,
        }}>
        <Image
          source={appImages.Goals}
          style={{
            height: heightPixel(24),
            width: heightPixel(24),
            resizeMode: 'contain',
            marginLeft: widthPixel(10),
          }}
        />
        <Text
          size={14}
          variant="regular"
          color={color.shareBudgetText}
          style={{
            flex: 1,
          }}>
          Main Goal
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 50,
            borderWidth: 1,
            borderColor: color.border,
          }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setSelectedGoal('savings');
              updateProfile({goalType: 'save'});
            }}
            style={{
              backgroundColor:
                selectedGoal === 'savings'
                  ? color.bg === '#121212'
                    ? '#D1D1D6'
                    : color.tabBackground
                  : 'transparent',
              paddingVertical: heightPixel(8),
              paddingHorizontal: widthPixel(10),
              borderTopLeftRadius: 50,
              borderBottomLeftRadius: 50,
            }}>
            <Text
              size={8}
              color={
                selectedGoal === 'savings'
                  ? color.bg === '#121212'
                    ? '#1E1E1E'
                    : undefined
                  : color.bg === '#121212'
                    ? color.white
                    : undefined
              }>
              Build Savings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setSelectedGoal('debt');
              updateProfile({goalType: 'debt'});
            }}
            style={{
              backgroundColor:
                selectedGoal === 'debt'
                  ? color.bg === '#121212'
                    ? '#D1D1D6'
                    : color.tabBackground
                  : 'transparent',
              paddingVertical: heightPixel(8),
              paddingHorizontal: widthPixel(10),
              borderTopRightRadius: 50,
              borderBottomRightRadius: 50,
            }}>
            <Text
              size={8}
              color={
                selectedGoal === 'debt'
                  ? color.bg === '#121212'
                    ? '#1E1E1E'
                    : undefined
                  : color.bg === '#121212'
                    ? color.white
                    : undefined
              }>
              Pay off Debt
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Spacer height={heightPixel(20)} />
      {selectedGoal === 'savings' ? (
        <>
          <TextInput
            title="Saving Goals"
            onPress={() => setShowEditSavingsModal(true)}
            titleStyle={{
              fontSize: fontPixel(14),
              color: color.tabicon,
              fontFamily: 'regular',
            }}
            placeholderTextColor={color.black}
            placeholder="0"
            value={savingsGoal}
            editable={false}
            keyboardType="numeric"
            useCurrencyIcon={true}
            rightIconComponent={
              <Image
                source={appImages.Edit}
                style={{
                  height: heightPixel(20),
                  width: heightPixel(20),
                  resizeMode: 'contain',
                  marginRight: widthPixel(10),
                  tintColor: color.black,
                }}
              />
            }
            inputContainerStyle={{
              backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
              borderRadius: 50,
              paddingVertical: heightPixel(15),
            }}
          />
          <Spacer height={heightPixel(25)} />
        </>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: widthPixel(5),
          gap: widthPixel(10),
        }}>
        <Image
          source={appImages.Reminder}
          style={{
            height: heightPixel(24),
            width: heightPixel(24),
            resizeMode: 'contain',
            marginLeft: widthPixel(5),
            tintColor: color.bg === '#121212' ? color.white : undefined,
          }}
        />
        <Text
          size={14}
          variant="regular"
          color={color.shareBudgetText}
          style={{
            flex: 1,
          }}>
          Reminders
        </Text>
        <Switch
          style={{
            transform: [{scaleX: 0.7}, {scaleY: 0.7}],
          }}
          value={isFullAccess}
          onValueChange={handleFullAccessToggle}
          trackColor={{false: '#D1D1D6', true: color.primary}}
          thumbColor={color.white}
          ios_backgroundColor="#D1D1D6"
        />
      </View>
      {isFullAccess && (
        <>
          <Spacer height={heightPixel(20)} />
          <TextInput
            title="Paycheck Reminders"
            onPress={() => setShowTimePicker(true)}
            titleStyle={{
              fontSize: fontPixel(14),
              color: color.tabicon,
              fontFamily: 'regular',
            }}
            placeholderTextColor={color.shareBudgetText}
            placeholder="Select Time"
            value={selectedTime ? formatTime(selectedTime) : ''}
            editable={false}
            rightIconComponent={
              <Image
                source={appImages.Time}
                style={{
                  height: heightPixel(20),
                  width: heightPixel(20),
                  resizeMode: 'contain',
                  marginRight: widthPixel(10),
                  tintColor: color.black,
                }}
              />
            }
            inputContainerStyle={{
              backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
              borderRadius: 50,
              paddingVertical: heightPixel(15),
            }}
          />
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedTime || new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
          {showTimePicker && Platform.OS === 'ios' && (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showTimePicker}>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'flex-end',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}>
                <View
                  style={{
                    backgroundColor:
                      color.bg === '#121212' ? '#242830' : '#fff',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingBottom: 30,
                    alignItems: 'center',
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: color.border,
                      alignSelf: 'stretch',
                    }}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text size={16} color={color.primary} variant="semibold">
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedTime || new Date()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={color.bg === '#121212' ? '#fff' : '#000'}
                  />
                </View>
              </View>
            </Modal>
          )}
        </>
      )}

      {/* Unlock Features Modal */}
      <UnlockFeaturesModal
        visible={isPremiumModalVisible}
        onClose={() => setIsPremiumModalVisible(false)}
      />

      <BottomSheet
        visible={showEditSavingsModal}
        onClose={() => setShowEditSavingsModal(false)}
        title={'Update Saving Goals'}
        maxHeight={550}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={draftSavingsGoal}
          onChangeText={setDraftSavingsGoal}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          keyboardType="numeric"
          useCurrencyIcon={true}
        />
        <Spacer height={heightPixel(40)} />
        <Button
          title="Update"
          onPress={() => {
            updateProfile({savingsGoal: Number(draftSavingsGoal || 0)});
            setShowEditSavingsModal(false);
          }}
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
    </Wrapper>
  );
};

export default Profile;
