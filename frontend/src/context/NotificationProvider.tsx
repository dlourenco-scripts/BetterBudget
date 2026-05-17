import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '@/store';

export type AppNotification = {
  id: string;
  title?: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: 'additional_income' | 'payday_reminder' | 'general';
  action?: 'open_additional_income' | 'view';
  dedupeKey?: string;
  payload?: Record<string, any>;
};

type AddNotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & {
  id?: string;
  createdAt?: string;
  isRead?: boolean;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: AddNotificationInput) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const storageKeyForEmail = (email?: string) =>
  `betterbudget.notifications.${email || 'default'}`;

const isActivePendingAction = (notification: AppNotification) =>
  notification.action === 'open_additional_income' ||
  (notification.type === 'additional_income' &&
    (notification.title === 'Additional income available' ||
      /available to add|ready to be added/i.test(notification.message)));

export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const userEmail = useAuthStore(state => state.userData?.email);
  const storageKey = storageKeyForEmail(userEmail);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);

  const persist = useCallback(
    async (nextNotifications: AppNotification[]) => {
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextNotifications));
    },
    [storageKey],
  );

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey)
      .then(value => {
        if (!mounted) {
          return;
        }
        const nextNotifications = value ? JSON.parse(value) : [];
        notificationsRef.current = nextNotifications;
        setNotifications(nextNotifications);
      })
      .catch(() => {
        if (mounted) {
          setNotifications([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const addNotification = useCallback(
    async (notification: AddNotificationInput) => {
      const now = new Date().toISOString();
      const nextNotification: AppNotification = {
        id:
          notification.id ||
          `${notification.type || 'notification'}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        createdAt: notification.createdAt || now,
        isRead: notification.isRead ?? false,
        type: notification.type || 'general',
        ...notification,
      };

      const nextNotifications = [
        nextNotification,
        ...notificationsRef.current.filter(existing => {
          if (nextNotification.dedupeKey) {
            return existing.dedupeKey !== nextNotification.dedupeKey;
          }
          return existing.id !== nextNotification.id;
        }),
      ];

      await persist(nextNotifications);
    },
    [persist],
  );

  const markRead = useCallback(
    async (id: string) => {
      await persist(
        notificationsRef.current.map(notification =>
          notification.id === id ? {...notification, isRead: true} : notification,
        ),
      );
    },
    [persist],
  );

  const deleteNotifications = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      await persist(notificationsRef.current.filter(notification => !idSet.has(notification.id)));
    },
    [persist],
  );

  const unreadCount = notifications.filter(
    notification => !notification.isRead && !isActivePendingAction(notification),
  ).length;

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markRead,
      deleteNotifications,
    }),
    [addNotification, deleteNotifications, markRead, notifications, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
