import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const scheduledReminderKey = (id: string) =>
  `betterbudget.localNotification.${id}`;

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function schedulePaydayLocalNotification(
  id: string,
  reminderDate: Date,
) {
  if (!id || Number.isNaN(reminderDate.getTime())) {
    return;
  }

  const storageKey = scheduledReminderKey(id);
  const existingNotificationId = await AsyncStorage.getItem(storageKey);
  if (existingNotificationId) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payday-reminders', {
      name: 'Payday reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Payday reminder',
      body: "It's payday! Time to check your budget and plan ahead.",
      data: {type: 'payday_reminder', reminderId: id},
    },
    trigger: reminderDate.getTime() <= Date.now() ? null : (reminderDate as any),
  });

  await AsyncStorage.setItem(storageKey, notificationId);
}
