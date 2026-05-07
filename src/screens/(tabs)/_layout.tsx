import React from 'react';
import {Image, Platform} from 'react-native';
// import {Image} from 'react-native';
import {Tabs} from 'expo-router';
import {Text} from '@/components';
import {appImages} from '@/constants/assets';
// import {appImages} from '@/constants/assets';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

export default function TabsLayout() {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const activeColor = isDarkMode ? color.primary : color.black;
  const inactiveColor = isDarkMode ? '#666666' : color.tabiconFocus;
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
            <Image
              source={appImages.Notificationimg}
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
              Notifications
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
