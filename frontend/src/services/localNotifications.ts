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

type ScheduledReminderRecord = {
  notificationId: string;
  reminderAt: string;
};

const PAYDAY_REMINDER_MESSAGE =
  'It’s payday! Time to check your budget and plan ahead.';

const readScheduledReminderRecord = async (
  storageKey: string,
): Promise<ScheduledReminderRecord | null> => {
  const rawRecord = await AsyncStorage.getItem(storageKey);
  if (!rawRecord) {
    return null;
  }

  try {
    const parsedRecord = JSON.parse(rawRecord);
    if (parsedRecord?.notificationId) {
      return parsedRecord;
    }
  } catch {
    return {
      notificationId: rawRecord,
      reminderAt: '',
    };
  }

  return null;
};

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
  const reminderAt = reminderDate.toISOString();
  const existingRecord = await readScheduledReminderRecord(storageKey);
  if (existingRecord?.notificationId && existingRecord.reminderAt === reminderAt) {
    return;
  }

  if (existingRecord?.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(existingRecord.notificationId);
    await AsyncStorage.removeItem(storageKey);
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
      body: PAYDAY_REMINDER_MESSAGE,
      data: {type: 'payday_reminder', reminderId: id},
    },
    trigger: reminderDate.getTime() <= Date.now() ? null : (reminderDate as any),
  });

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify({
      notificationId,
      reminderAt,
    }),
  );
}

export async function cancelPaydayLocalNotification(id: string) {
  if (!id) {
    return;
  }

  const storageKey = scheduledReminderKey(id);
  const existingRecord = await readScheduledReminderRecord(storageKey);
  if (existingRecord?.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(existingRecord.notificationId);
  }
  await AsyncStorage.removeItem(storageKey);
}
