import React, {useState} from 'react';
import {Image, TouchableOpacity, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {router} from 'expo-router';
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

const NotificationScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {
    notifications,
    markRead,
    deleteNotifications,
  } = useNotifications();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);

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
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
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

  const todayNotifications = notifications.filter(n => {
    const createdAt = new Date(n.createdAt);
    return createdAt.toDateString() === new Date().toDateString();
  });
  const yesterdayNotifications = notifications.filter(
    n => {
      const createdAt = new Date(n.createdAt);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return createdAt.toDateString() === yesterday.toDateString();
    },
  );

  const openNotification = async (notification: AppNotification) => {
    await markRead(notification.id);
    if (notification.action === 'open_additional_income') {
      router.push({
        pathname: '/(tabs)/HomeScreen',
        params: {
          selectedBudgetId: String(notification.payload?.budgetId || ''),
          openAdditionalIncomeId: String(notification.payload?.incomeId || ''),
        },
      });
      return;
    }

    setSelectedNotification(notification);
    setShowNotificationSheet(true);
  };

  const renderNotification = (notification: AppNotification) => {
    const isSelected = selectedIds.has(notification.id);
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
            !isDarkMode && notification.isRead
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
                !notification.isRead
                  ? color.primary
                  : color.bg,
              alignSelf: 'flex-start',
              padding: 10,
            }}>
            <Image
              source={appImages.Bellimg}
              tintColor={isDarkMode ? color.white : color.placeholdertext}
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
                {selectedIds.size === notifications.length ? (
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
          {notifications.length === 0 && !isSelectionMode && (
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
