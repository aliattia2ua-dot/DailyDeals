// Placeholder for push notification service
// This will be implemented when Firebase is integrated

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_TOPICS } from '../constants/config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get Expo push token (for future Firebase integration)
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E63946',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'offer-catalog', // Placeholder
      });

      this.expoPushToken = token.data;
      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: trigger || null, // null means show immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Subscribe to a topic (placeholder for Firebase)
  async subscribeToTopic(topic: string): Promise<boolean> {
    // Firebase topic subscription will be implemented here
    console.log(`Subscribed to topic: ${topic}`);
    return true;
  }

  // Unsubscribe from a topic (placeholder for Firebase)
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    // Firebase topic unsubscription will be implemented here
    console.log(`Unsubscribed from topic: ${topic}`);
    return true;
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    return Notifications.getAllScheduledNotificationsAsync();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
