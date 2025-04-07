import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestNotificationPermissions } from '../utils/notifications';

interface NotificationContextType {
  isNotificationsEnabled: boolean;
  toggleNotifications: () => Promise<void>;
  scheduleTaskNotification: (taskTitle: string, dueDate: Date) => Promise<void>;
  cancelTaskNotification: (taskId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isNotificationsEnabled: false,
  toggleNotifications: async () => {},
  scheduleTaskNotification: async () => {},
  cancelTaskNotification: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  useEffect(() => {
    setupNotifications();
    loadNotificationPreference();
  }, []);

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão para notificações não foi concedida');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  };

  const loadNotificationPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('notificationsEnabled');
      if (savedPreference !== null) {
        setIsNotificationsEnabled(JSON.parse(savedPreference));
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de notificações:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      const newValue = !isNotificationsEnabled;
      setIsNotificationsEnabled(newValue);
      await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
    } catch (error) {
      console.error('Erro ao salvar preferência de notificações:', error);
    }
  };

  const scheduleTaskNotification = async (taskTitle: string, dueDate: Date) => {
    if (!isNotificationsEnabled) return;

    try {
      const trigger = new Date(dueDate);
      trigger.setHours(trigger.getHours() - 1); // Notificar 1 hora antes

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete de Tarefa',
          body: `A tarefa "${taskTitle}" está próxima do prazo!`,
        },
        trigger: {
          date: trigger,
          channelId: 'default',
        },
      });
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
    }
  };

  const cancelTaskNotification = async (taskId: string) => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const taskNotification = notifications.find(
        (notification) => notification.content.data?.taskId === taskId
      );

      if (taskNotification) {
        await Notifications.cancelScheduledNotificationAsync(taskNotification.identifier);
      }
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        isNotificationsEnabled,
        toggleNotifications,
        scheduleTaskNotification,
        cancelTaskNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 