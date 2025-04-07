import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function cancelTaskNotification(taskId: string) {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotification = notifications.find(
      notification => notification.content.data?.taskId === taskId
    );

    if (taskNotification) {
      await Notifications.cancelScheduledNotificationAsync(taskNotification.identifier);
    }
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
}

export async function scheduleTaskNotification(taskId: string, title: string, dueDate: Date) {
  try {
    const trigger = new Date(dueDate);
    trigger.setHours(trigger.getHours() - 1); // Notificar 1 hora antes

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lembrete de Tarefa',
        body: `A tarefa "${title}" vence em 1 hora!`,
        data: { taskId },
      },
      trigger: {
        date: trigger,
        channelId: 'default',
      },
    });
  } catch (error) {
    console.error('Erro ao agendar notificação:', error);
  }
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
} 