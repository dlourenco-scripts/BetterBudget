import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {userApi} from '@/network/api';
import {budgetApi} from '@/network/api';
import {
  fontPixel,
  heightPixel,
  hp,
  widthPixel,
  wp,
} from '@/services/responsive';
import {useAuthStore} from '@/store';

const AmountDoneAction = ({
  active,
  color,
  onPressIn,
  onPress,
}: {
  active: boolean;
  color: string;
  onPressIn: () => void;
  onPress: () => void;
}) => {
  const [mounted, setMounted] = useState(active);
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [active, opacity]);

  if (!mounted) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={!active}
      onPressIn={onPressIn}
      onPress={onPress}>
      <Animated.Text
        style={{
          color,
          opacity,
          fontSize: fontPixel(12),
          fontFamily: 'medium',
          marginRight: widthPixel(14),
        }}>
        Done
      </Animated.Text>
    </TouchableOpacity>
  );
};

const Profile = () => {
  const color = useThemeColor();
  const [isFullAccess, setIsFullAccess] = useState(false);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<'savings' | 'debt'>(
    'savings',
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [savedSavingsGoal, setSavedSavingsGoal] = useState('');
  const [primaryBudgetId, setPrimaryBudgetId] = useState('');
  const [reserveAmount, setReserveAmount] = useState('');
  const [savedReserveAmount, setSavedReserveAmount] = useState('');
  const [reserveAmountChanged, setReserveAmountChanged] = useState(false);
  const [savingsGoalChanged, setSavingsGoalChanged] = useState(false);
  const [showSetupSavingsModal, setShowSetupSavingsModal] = useState(false);
  const [setupCurrentSavings, setSetupCurrentSavings] = useState('');
  const [setupSavingsGoal, setSetupSavingsGoal] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const editableValueColor = isDarkMode ? '#F5F5F7' : color.black;
  const lockedValueColor = isDarkMode ? '#8B909A' : '#7A7F89';
  const confirmingAmountRef = useRef<'reserve' | 'savings' | null>(null);
  const updateUserData = useAuthStore(state => state.updateUserData);

  const getReminderDate = (timeValue?: string) => {
    const [hours = '9', minutes = '0'] = String(timeValue || '09:00').split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date;
  };

  const applyUser = useCallback((user: any) => {
    setFullName(user?.fullName || '');
    setEmail(user?.email || '');
    setProfileImage(user?.profileImage || '');
    setSelectedGoal(user?.goalType === 'debt' ? 'debt' : 'savings');
    setSavingsGoal(String(Number(user?.savingsGoal || 0)));
    setSavedSavingsGoal(String(Number(user?.savingsGoal || 0)));
    setSavingsGoalChanged(false);
    setIsFullAccess(Boolean(user?.paydayReminderEnabled));
    setSelectedTime(getReminderDate(user?.paydayReminderTime));
  }, []);

  const loadPrimaryBudgetSettings = useCallback(async (userEmail?: string) => {
    try {
      const budgetsResponse = await budgetApi.list();
      const budgetList = budgetsResponse.data || [];
      const storedPrimaryBudgetId = await AsyncStorage.getItem(
        `betterbudget.primaryBudgetId.${userEmail || 'default'}`,
      );
      const targetBudget =
        budgetList.find((budget: any) => budget.id === storedPrimaryBudgetId) ||
        budgetList[0];

      if (!targetBudget?.id) {
        setPrimaryBudgetId('');
        setReserveAmount('');
        return;
      }

      setPrimaryBudgetId(String(targetBudget.id));
      const nextReserveAmount = String(Number(targetBudget.reserveAmount || 0));
      setReserveAmount(nextReserveAmount);
      setSavedReserveAmount(nextReserveAmount);
      setReserveAmountChanged(false);
    } catch (error) {
      console.error('Unable to load budget account settings:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cachedUser = useAuthStore.getState().userData;
      applyUser(cachedUser);
      loadPrimaryBudgetSettings(cachedUser?.email);
      userApi.me().then(response => {
        if (response.success && response.data) {
          updateUserData(response.data);
          applyUser(response.data);
          loadPrimaryBudgetSettings(response.data.email);
        }
      });
    }, [applyUser, loadPrimaryBudgetSettings, updateUserData]),
  );

  const updateProfile = async (values: any) => {
    const response = await userApi.update(values);
    if (response.success && response.data) {
      updateUserData(response.data);
      applyUser(response.data);
    }
  };

  const updateBudgetsGoal = async (goalType: 'save' | 'debt', extraValues = {}) => {
    const budgetsResponse = await budgetApi.list();
    const budgetList = budgetsResponse.data || [];
    await Promise.all(
      budgetList.map((budget: any) =>
        budgetApi.update(budget.id, {goalType, ...extraValues}),
      ),
    );
  };

  const updateGoalType = async (goalType: 'save' | 'debt') => {
    if (
      goalType === 'save' &&
      selectedGoal === 'debt' &&
      Number(savingsGoal || 0) <= 0
    ) {
      setSetupCurrentSavings('0');
      setSetupSavingsGoal('');
      setShowSetupSavingsModal(true);
      return;
    }

    setSelectedGoal(goalType === 'debt' ? 'debt' : 'savings');
    await updateProfile({goalType});

    try {
      await updateBudgetsGoal(goalType);
    } catch (error) {
      console.error('Unable to update budget goals:', error);
    }
  };

  const saveSetupSavings = async () => {
    const nextSavingsGoal = Number(setupSavingsGoal || 0);
    if (nextSavingsGoal <= 0) {
      return;
    }

    const nextCurrentSavings = Number(setupCurrentSavings || 0);
    try {
      setSelectedGoal('savings');
      setSavingsGoal(String(nextSavingsGoal));
      setSavedSavingsGoal(String(nextSavingsGoal));
      setSavingsGoalChanged(false);
      await updateProfile({goalType: 'save', savingsGoal: nextSavingsGoal});
      await updateBudgetsGoal('save', {
        currentSavings: nextCurrentSavings,
        savingsGoal: nextSavingsGoal,
        autoFillEnabled: true,
      });
      setShowSetupSavingsModal(false);
    } catch (error) {
      setSelectedGoal('debt');
      console.error('Unable to set up savings:', error);
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
      updateProfile({
        paydayReminderTime: `${String(date.getHours()).padStart(2, '0')}:${String(
          date.getMinutes(),
        ).padStart(2, '0')}`,
      });
    }
  };

  const handleFullAccessToggle = (value: boolean) => {
    setIsFullAccess(value);
    updateProfile({paydayReminderEnabled: value});
  };

  const updateProfilePhoto = async () => {
    const {pickImage} = await import('@/services/helpingMethods');
    const uri = await pickImage({
      mode: 'gallery',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (uri) {
      setProfileImage(uri);
      updateProfile({profileImage: uri});
    }
  };

  const updateReserveAmount = async () => {
    if (!primaryBudgetId) {
      return;
    }

    try {
      const nextReserveAmount = Number(reserveAmount || 0);
      const response = await budgetApi.update(primaryBudgetId, {
        reserveAmount: nextReserveAmount,
      });
      if (response.success && response.data) {
        const savedAmount = String(Number(response.data.reserveAmount || nextReserveAmount));
        setReserveAmount(savedAmount);
        setSavedReserveAmount(savedAmount);
        setReserveAmountChanged(false);
        Keyboard.dismiss();
      }
    } catch (error) {
      setReserveAmount(savedReserveAmount);
      console.error('Unable to update reserve amount:', error);
    } finally {
      confirmingAmountRef.current = null;
    }
  };

  const updateSavingsGoalAmount = async () => {
    const nextSavingsGoal = Number(savingsGoal || 0);
    try {
      await updateProfile({savingsGoal: nextSavingsGoal});
      await updateBudgetsGoal('save', {savingsGoal: nextSavingsGoal});
      const savedAmount = String(nextSavingsGoal);
      setSavingsGoal(savedAmount);
      setSavedSavingsGoal(savedAmount);
      setSavingsGoalChanged(false);
      Keyboard.dismiss();
    } catch (error) {
      setSavingsGoal(savedSavingsGoal);
      console.error('Unable to update budget savings goals:', error);
    } finally {
      confirmingAmountRef.current = null;
    }
  };

  const revertReserveAmountIfUnconfirmed = () => {
    if (confirmingAmountRef.current === 'reserve') {
      return;
    }
    if (reserveAmountChanged) {
      setReserveAmount(savedReserveAmount);
      setReserveAmountChanged(false);
    }
  };

  const revertSavingsGoalIfUnconfirmed = () => {
    if (confirmingAmountRef.current === 'savings') {
      return;
    }
    if (savingsGoalChanged) {
      setSavingsGoal(savedSavingsGoal);
      setSavingsGoalChanged(false);
    }
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
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={updateProfilePhoto}
          style={{
            height: heightPixel(110),
            width: heightPixel(110),
            borderRadius: heightPixel(55),
            position: 'absolute',
            top: hp(-6),
            alignSelf: 'center',
            backgroundColor: color.profileBackground,
            borderWidth: 1,
            borderColor: color.dividerColor,
          }}>
          {profileImage ? (
            <Image
              source={{uri: profileImage}}
              style={{
                height: heightPixel(110),
                width: heightPixel(110),
                borderRadius: heightPixel(55),
              }}
            />
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={updateProfilePhoto}
          style={{
            alignSelf: 'center',
            marginTop: heightPixel(10),
          }}>
          <Text size={13} color={color.primary} variant="medium">
            {profileImage ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
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
        inputStyle={{color: editableValueColor}}
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
        inputStyle={{color: lockedValueColor}}
        rightIconComponent={
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={lockedValueColor}
            style={{marginRight: widthPixel(10)}}
          />
        }
        inputContainerStyle={{
          backgroundColor: color.bg === '#121212' ? '#242830' : color.white,
          borderRadius: 50,
          paddingVertical: heightPixel(15),
        }}
      />
      <Spacer height={heightPixel(20)} />
      <TextInput
        title="Balance To Keep After Expenses"
        titleStyle={{
          fontSize: fontPixel(14),
          color: color.tabicon,
          fontFamily: 'regular',
        }}
        placeholderTextColor={color.shareBudgetText}
        placeholder="0"
        value={reserveAmount}
        onChangeText={value => {
          setReserveAmount(value);
          setReserveAmountChanged(value !== savedReserveAmount);
        }}
        onBlur={revertReserveAmountIfUnconfirmed}
        editable={Boolean(primaryBudgetId)}
        keyboardType="numeric"
        useCurrencyIcon={true}
        replaceOnFirstType
        inputStyle={{color: editableValueColor}}
        rightIconComponent={
          <AmountDoneAction
            active={reserveAmountChanged}
            color={color.primary}
            onPressIn={() => {
              confirmingAmountRef.current = 'reserve';
            }}
            onPress={updateReserveAmount}
          />
        }
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
              updateGoalType('save');
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
              updateGoalType('debt');
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
            inputStyle={{color: editableValueColor}}
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
        visible={showSetupSavingsModal}
        onClose={() => setShowSetupSavingsModal(false)}
        title="Set Up Savings"
        maxHeight={620}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Current Savings"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={setupCurrentSavings}
          onChangeText={setSetupCurrentSavings}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          keyboardType="numeric"
          useCurrencyIcon={true}
          replaceOnFirstType
        />
        <Spacer height={heightPixel(18)} />
        <TextInput
          title="Savings Goal"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          value={setupSavingsGoal}
          onChangeText={setSetupSavingsGoal}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          keyboardType="numeric"
          useCurrencyIcon={true}
          replaceOnFirstType
          error={Number(setupSavingsGoal || 0) <= 0 ? 'Savings Goal required' : undefined}
          touched={setupSavingsGoal.length > 0}
        />
        <Spacer height={heightPixel(28)} />
        <Button title="Save & Continue" onPress={saveSetupSavings} />
        <Spacer height={heightPixel(12)} />
        <Button
          title="Cancel"
          onPress={() => {
            setShowSetupSavingsModal(false);
            setSelectedGoal('debt');
          }}
          style={{backgroundColor: 'transparent', borderWidth: 1, borderColor: color.primary}}
          titleStyle={{color: color.primary}}
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
    </Wrapper>
  );
};

export default Profile;
