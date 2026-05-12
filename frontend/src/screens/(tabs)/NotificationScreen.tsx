import React, {useState} from 'react';
import {Image, ScrollView, TouchableOpacity, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BottomSheet, Header, Spacer, Text, Wrapper} from '@/components';
import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface Notification {
  id: string;
  message: string;
  time?: string;
  category: 'today' | 'yesterday';
  isRead: boolean;
}

const NotificationScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
    // Delete selected notifications and return to previous content
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const todayNotifications = notifications.filter(n => n.category === 'today');
  const yesterdayNotifications = notifications.filter(
    n => n.category === 'yesterday',
  );

  const renderNotification = (notification: Notification) => {
    const isSelected = selectedIds.has(notification.id);

    return (
      <TouchableOpacity
        key={notification.id}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(notification.id)}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(notification.id);
          } else {
            setSelectedNotification(notification);
            setShowNotificationSheet(true);
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
                notification.category === 'today' && !notification.isRead
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
        {notification.time && (
          <Text size={14} variant="medium" color={color.black}>
            {notification.time}
          </Text>
        )}
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
