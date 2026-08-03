import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export type ReminderType = 'habit' | 'water' | 'workout';

interface ReminderConfig {
  type: ReminderType;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekday?: number; // 1=Sunday for workout reminders (e.g. Mon=2)
}

function webGuard(): boolean {
  if (Platform.OS === 'web') {
    Alert.alert('Not available', 'Push notifications are not supported in the web preview.');
    return true;
  }
  return false;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (webGuard()) return false;
  let perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') {
    perm = await Notifications.requestPermissionsAsync();
  }
  return perm.status === 'granted';
}

export async function scheduleReminder(config: ReminderConfig): Promise<string | null> {
  if (webGuard()) return null;
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  const trigger: Notifications.NotificationTriggerInput = config.weekday !== undefined
    ? {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: config.weekday,
        hour: config.hour,
        minute: config.minute,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: config.hour,
        minute: config.minute,
      };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: config.title,
      body: config.body,
      sound: 'default',
    },
    trigger,
  });

  return id;
}

export async function cancelReminder(notificationId: string | null | undefined) {
  if (webGuard()) return;
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}

export async function cancelAllReminders() {
  if (webGuard()) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

export async function listScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  if (webGuard()) return [];
  return Notifications.getAllScheduledNotificationsAsync().catch(() => []);
}
