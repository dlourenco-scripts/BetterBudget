import React, {useCallback, useState} from 'react';
import {Image, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {router, useFocusEffect} from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BottomSheet, Header, Spacer, Text, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {
  AppNotification,
  useNotifications,
} from '@/context/NotificationProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';
import {budgetApi} from '@/network/api';
import {useAuthStore} from '@/store';

const getManualAppliedAmount = (income: any, cycleId?: string) => {
  if (!cycleId) {
    return 0;
  }
  const match = String(income?.notes || '').match(
    new RegExp(`manual_applied:${cycleId}:([0-9.]+)`),
  );
  return Math.max(0, Number(match?.[1] || 0));
};

const getManualRemainingAmount = (income: any, cycleId?: string) =>
  Math.max(0, Number(income?.amount || 0) - getManualAppliedAmount(income, cycleId));

const isPendingAdditionalIncomeNotification = (notification: AppNotification) =>
  notification.action === 'open_additional_income';

const NotificationScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const userEmail = useAuthStore(state => state.userData?.email);
  const activeBudgetStorageKey = `betterbudget.activeBudgetId.${userEmail || 'default'}`;
  const {
    notifications,
    markRead,
    deleteNotifications,
  } = useNotifications();
  const [activeBudgetId, setActiveBudgetId] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      AsyncStorage.getItem(activeBudgetStorageKey)
        .then(value => {
          if (mounted) {
            setActiveBudgetId(value || '');
          }
        })
        .catch(error => {
          console.error('Unable to load active budget id for notifications:', error);
        });

      return () => {
        mounted = false;
      };
    }, [activeBudgetStorageKey]),
  );

  const visibleNotifications = notifications.filter(notification => {
    const notificationBudgetId = String(notification.payload?.budgetId || '');
    const isBudgetCycleNotification =
      notification.type === 'additional_income' ||
      notification.type === 'payday_reminder' ||
      Boolean(notification.payload?.cycleId);

    if (!isBudgetCycleNotification) {
      return true;
    }

    return Boolean(activeBudgetId && notificationBudgetId === activeBudgetId);
  });
  const pendingActionNotifications = visibleNotifications.filter(
    isPendingAdditionalIncomeNotification,
  );
  const informationalNotifications = visibleNotifications.filter(
    notification => !isPendingAdditionalIncomeNotification(notification),
  );

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === visibleNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleNotifications.map(n => n.id)));
    }
  };

  const handleEmailAction = () => {
    // Return to previous content by exiting selection mode
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteAction = () => {
    deleteNotifications([...selectedIds]);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const todayNotifications = informationalNotifications.filter(n => {
    const createdAt = new Date(n.createdAt);
    return createdAt.toDateString() === new Date().toDateString();
  });
  const yesterdayNotifications = informationalNotifications.filter(
    n => {
      const createdAt = new Date(n.createdAt);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return createdAt.toDateString() === yesterday.toDateString();
    },
  );

  const openNotification = async (notification: AppNotification) => {
    if (notification.action === 'open_additional_income') {
      const budgetId = String(notification.payload?.budgetId || '');
      const cycleId = String(notification.payload?.cycleId || '');
      const incomeId = String(notification.payload?.incomeId || '');
      if (!budgetId || (activeBudgetId && budgetId !== activeBudgetId)) {
        return;
      }
      await markRead(notification.id);
      try {
        const response = budgetId ? await budgetApi.get(budgetId) : null;
        const income = response?.data?.incomes?.find((item: any) => item.id === incomeId);
        if (!income || getManualRemainingAmount(income, cycleId) <= 0) {
          await deleteNotifications([notification.id]);
          return;
        }
      } catch (error) {
        console.error('Unable to validate additional income notification:', error);
      }
      router.navigate({
        pathname: '/(tabs)/HomeScreen',
        params: {
          selectedBudgetId: budgetId,
          openAdditionalIncomeId: incomeId,
          openAdditionalIncomeCycleId: cycleId,
          openAdditionalIncomeRequestId: `${Date.now()}`,
        },
      });
      return;
    }

    await markRead(notification.id);
    setSelectedNotification(notification);
    setShowNotificationSheet(true);
  };

  const renderNotification = (notification: AppNotification) => {
    const isSelected = selectedIds.has(notification.id);
    const isPendingAction = isPendingAdditionalIncomeNotification(notification);
    const createdDate = new Date(notification.createdAt);
    const time = createdDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        key={notification.id}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(notification.id)}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(notification.id);
          } else {
            openNotification(notification);
          }
        }}
        style={{
          backgroundColor:
            isPendingAction
              ? color.notificationbg
              : !isDarkMode && notification.isRead
              ? color.white
              : color.notificationbg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          marginBottom: 10,
        }}>
        {isSelectionMode && (
          <TouchableOpacity
            onPress={() => toggleSelection(notification.id)}
            style={{
              padding: 5,
            }}>
            <Image
              source={isSelected ? appImages.SelectBox : appImages.UnSelectBox}
              tintColor={isDarkMode ? color.white : color.primary}
              style={{
                width: widthPixel(22),
                height: heightPixel(22),
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        )}
        {!isSelectionMode && (
          <View
            style={{
              borderRadius: 50,
              backgroundColor:
                isPendingAction || !notification.isRead
                  ? color.primary
                  : color.bg,
              alignSelf: 'flex-start',
              padding: 10,
            }}>
            <Image
              source={appImages.Bellimg}
              tintColor={isPendingAction || !notification.isRead ? color.white : isDarkMode ? color.white : color.placeholdertext}
              style={{
                height: heightPixel(22),
                width: widthPixel(22),
                resizeMode: 'contain',
              }}
            />
          </View>
        )}
        <Text size={14} variant="medium" color={color.black} style={{flex: 1}}>
          {notification.message}
        </Text>
        <Text size={12} variant="medium" color={color.tabicon}>
          {time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <View style={{flex: 1}}>
        <Wrapper
          containerStyle={{
            paddingHorizontal: 0,
          }}
          keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
          <Header
            title="Notifications"
            titleStyle={{
              color: color.black,
              fontSize: fontPixel(22),
              fontFamily: 'medium',
              fontWeight: '500',
            }}
            containerStyle={{
              paddingHorizontal: 15,
            }}
            canGoBack={isSelectionMode}
            onBackPress={() => {
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            }}
          />
          <Spacer height={20} />

          {isSelectionMode && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 15,
                paddingVertical: 10,
                marginBottom: 10,
              }}>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                {selectedIds.size === visibleNotifications.length ? (
                  <TouchableOpacity onPress={handleSelectAll}>
                    <Image
                      source={appImages.SelectBox}
                      style={{
                        width: widthPixel(22),
                        height: heightPixel(22),
                        resizeMode: 'contain',
                      }}
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      backgroundColor: color.primary,
                      borderRadius: 20,
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text size={14} variant="medium" color={color.white}>
                      {selectedIds.size}
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={handleSelectAll}>
                  <Text
                    size={14}
                    variant="medium"
                    color={color.black}
                    style={{
                      textDecorationLine: 'underline',
                      textDecorationColor: color.black,
                    }}>
                    Select All
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{flexDirection: 'row', gap: 15}}>
                <TouchableOpacity
                  onPress={handleEmailAction}
                  style={{
                    backgroundColor: color.notificationbg,
                    borderRadius: 50,
                    padding: 10,
                  }}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={isDarkMode ? color.white : color.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAction}
                  style={{
                    backgroundColor: color.notificationbg,
                    borderRadius: 50,
                    padding: 10,
                  }}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={isDarkMode ? color.white : color.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Spacer height={10} />

          {pendingActionNotifications.map(renderNotification)}

          {/* Today Section */}
          {todayNotifications.length > 0 && (
            <>
              <Text
                size={14}
                variant="regular"
                style={{
                  marginHorizontal: 15,
                }}>
                Today
              </Text>
              <Spacer height={10} />
              {todayNotifications.map(renderNotification)}
            </>
          )}

          {/* Yesterday Section */}
          {yesterdayNotifications.length > 0 && (
            <>
              <Spacer height={20} />
              <Text
                size={14}
                variant="regular"
                style={{
                  marginHorizontal: 15,
                }}>
                Yesterday
              </Text>
              <Spacer height={10} />
              {yesterdayNotifications.map(renderNotification)}
            </>
          )}
          {visibleNotifications.length === 0 && !isSelectionMode && (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 30,
                paddingTop: heightPixel(120),
              }}>
              <Image
                source={appImages.Bellimg}
                tintColor={isDarkMode ? color.white : color.placeholdertext}
                style={{
                  height: heightPixel(68),
                  width: widthPixel(68),
                  resizeMode: 'contain',
                }}
              />
              <Spacer height={heightPixel(20)} />
              <Text size={18} variant="medium" color={color.black}>
                No Notifications
              </Text>
              <Spacer height={heightPixel(8)} />
              <Text
                size={14}
                color={color.tabicon}
                style={{textAlign: 'center'}}>
                New budget updates and reminders will appear here.
              </Text>
            </View>
          )}
        </Wrapper>
      </View>

      {/* Notification Detail Bottom Sheet */}
      <BottomSheet
        visible={showNotificationSheet}
        onClose={() => setShowNotificationSheet(false)}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View
          style={{
            alignItems: 'center',
            gap: 15,
          }}>
          <View
            style={{
              borderRadius: 50,
              backgroundColor: color.primary,
              padding: 15,
            }}>
            <Image
              source={appImages.Bellimg}
              tintColor={color.white}
              style={{
                height: heightPixel(32),
                width: widthPixel(32),
                resizeMode: 'contain',
              }}
            />
          </View>
          <Text
            size={14}
            variant="medium"
            color={color.black}
            style={{textAlign: 'center', paddingHorizontal: 20}}>
            {selectedNotification?.message}
          </Text>
        </View>
        <Spacer height={heightPixel(40)} />
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default NotificationScreen;
