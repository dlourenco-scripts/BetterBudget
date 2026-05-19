import React from 'react';
import {Image, Platform, View} from 'react-native';
// import {Image} from 'react-native';
import {Redirect, Tabs} from 'expo-router';
import {Text} from '@/components';
import {appImages} from '@/constants/assets';
import {useNotifications} from '@/context/NotificationProvider';
// import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

export default function TabsLayout() {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {unreadCount} = useNotifications();
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const token = useAuthStore(state => state.token);

  const activeColor = isDarkMode ? color.primary : color.black;
  const inactiveColor = isDarkMode ? '#666666' : color.tabiconFocus;

  if (!hasHydrated) {
    return null;
  }

  if (!isLoggedIn || !token) {
    return <Redirect href="/auth/SignIn" />;
  }

  return (
    <Tabs
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: color.tabBackground,
          borderTopWidth: 0,
          height: heightPixel(Platform.OS === 'ios' ? 90 : 120),
        },
      }}>
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'My Budget',
          tabBarIcon: ({focused}) => (
            <Image
              source={appImages.Homeimg}
              style={{
                width: widthPixel(24),
                height: heightPixel(24),
                resizeMode: 'contain',
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
          tabBarLabel: ({focused}) => (
            <Text color={focused ? activeColor : inactiveColor} size={14}>
              My Budget
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="ExpensesScreen"
        options={{
          title: 'Expenses',
          tabBarIcon: ({focused}) => (
            <Image
              source={appImages.Expenseimg}
              style={{
                width: widthPixel(24),
                height: heightPixel(24),
                resizeMode: 'contain',
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
          tabBarLabel: ({focused}) => (
            <Text color={focused ? activeColor : inactiveColor} size={14}>
              Expenses
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="InsightScreen"
        options={{
          title: 'Insight',
          tabBarIcon: ({focused}) => (
            <Image
              source={appImages.Insightimg}
              style={{
                width: widthPixel(24),
                height: heightPixel(24),
                resizeMode: 'contain',
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
          tabBarLabel: ({focused}) => (
            <Text color={focused ? activeColor : inactiveColor} size={14}>
              Insights
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="NotificationScreen"
        options={{
          title: 'Notification',
          tabBarIcon: ({focused}) => (
            <View>
              <Image
                source={appImages.Notificationimg}
                style={{
                  width: widthPixel(24),
                  height: heightPixel(24),
                  resizeMode: 'contain',
                  tintColor: focused ? activeColor : inactiveColor,
                }}
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#E53935',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                  <Text size={10} variant="semibold" color="#FFFFFF">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({focused}) => (
            <Text color={focused ? activeColor : inactiveColor} size={14}>
              Notifications
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
