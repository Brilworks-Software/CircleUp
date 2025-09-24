import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from '../firebase/types';

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

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  scheduledTime: Date;
  reminderId?: string;
  contactId?: string;
  type: 'reminder' | 'follow_up' | 'custom';
}

export interface ScheduledNotification extends NotificationData {
  notificationId: string; // Expo notification ID
  isActive: boolean;
  createdAt: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private readonly STORAGE_KEY = 'scheduled_notifications';

  private constructor() {
    this.loadScheduledNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification permissions and load existing notifications
   */
  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Load existing scheduled notifications
      await this.loadScheduledNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Schedule a single notification
   */
  async scheduleNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      // Check if notification is in the future
      if (notificationData.scheduledTime <= new Date()) {
        console.warn('Cannot schedule notification in the past');
        return null;
      }

      // Create notification content
      const content: Notifications.NotificationContentInput = {
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        sound: 'default',
      };

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: notificationData.scheduledTime,
      });

      // Store the scheduled notification
      const scheduledNotification: ScheduledNotification = {
        ...notificationData,
        notificationId,
        isActive: true,
        createdAt: new Date(),
      };

      this.scheduledNotifications.set(notificationData.id, scheduledNotification);
      await this.saveScheduledNotifications();

      console.log(`Notification scheduled: ${notificationData.title} at ${notificationData.scheduledTime}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule a notification for a specific date and time
   */
  async scheduleNotificationForDateTime(
    id: string,
    title: string,
    body: string,
    date: Date,
    data?: any
  ): Promise<string | null> {
    const notificationData: NotificationData = {
      id,
      title,
      body,
      data,
      scheduledTime: date,
      type: 'custom',
    };

    return await this.scheduleNotification(notificationData);
  }

  /**
   * Schedule multiple notifications for specific dates and times
   */
  async scheduleNotificationsForDateTimes(
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      date: Date;
      data?: any;
    }>
  ): Promise<string[]> {
    const notificationDataArray: NotificationData[] = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      scheduledTime: notification.date,
      type: 'custom',
    }));

    return await this.scheduleMultipleNotifications(notificationDataArray);
  }

  /**
   * Schedule multiple notifications at different times
   */
  async scheduleMultipleNotifications(notifications: NotificationData[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const notification of notifications) {
      const notificationId = await this.scheduleNotification(notification);
      if (notificationId) {
        results.push(notificationId);
      }
    }

    return results;
  }

  /**
   * Schedule notifications for a reminder with multiple time intervals
   */
  async scheduleReminderNotifications(
    reminder: Reminder,
    intervals: number[] = [15, 30, 60] // minutes before due date
  ): Promise<string[]> {
    const dueDate = new Date(reminder.dueDate);
    const notifications: NotificationData[] = [];

    // Schedule notifications at different intervals before due date
    intervals.forEach((minutes, index) => {
      const notificationTime = new Date(dueDate.getTime() - (minutes * 60 * 1000));
      
      // Only schedule if the notification time is in the future
      if (notificationTime > new Date()) {
        notifications.push({
          id: `${reminder.id}_${minutes}m`,
          title: 'Reminder',
          body: `${reminder.title} is due in ${minutes} minutes`,
          data: { reminderId: reminder.id, contactId: reminder.contactId },
          scheduledTime: notificationTime,
          reminderId: reminder.id,
          contactId: reminder.contactId,
          type: 'reminder',
        });
      }
    });

    // Schedule notification at exact due time
    if (dueDate > new Date()) {
      notifications.push({
        id: `${reminder.id}_due`,
        title: 'Reminder Due',
        body: `${reminder.title} is due now!`,
        data: { reminderId: reminder.id, contactId: reminder.contactId },
        scheduledTime: dueDate,
        reminderId: reminder.id,
        contactId: reminder.contactId,
        type: 'reminder',
      });
    }

    return await this.scheduleMultipleNotifications(notifications);
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      const scheduledNotification = this.scheduledNotifications.get(notificationId);
      if (scheduledNotification) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotification.notificationId);
        scheduledNotification.isActive = false;
        await this.saveScheduledNotifications();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  /**
   * Cancel all notifications for a specific reminder
   */
  async cancelReminderNotifications(reminderId: string): Promise<boolean> {
    try {
      const reminderNotifications = Array.from(this.scheduledNotifications.values())
        .filter(notification => notification.reminderId === reminderId);

      for (const notification of reminderNotifications) {
        await this.cancelNotification(notification.id);
      }

      return true;
    } catch (error) {
      console.error('Error canceling reminder notifications:', error);
      return false;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
      await this.saveScheduledNotifications();
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  /**
   * Get all scheduled notifications
   */
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values());
  }

  /**
   * Get notifications for a specific reminder
   */
  getReminderNotifications(reminderId: string): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
      .filter(notification => notification.reminderId === reminderId);
  }

  /**
   * Update notification time
   */
  async updateNotificationTime(
    notificationId: string, 
    newTime: Date
  ): Promise<boolean> {
    try {
      const scheduledNotification = this.scheduledNotifications.get(notificationId);
      if (!scheduledNotification) {
        return false;
      }

      // Cancel the old notification
      await Notifications.cancelScheduledNotificationAsync(scheduledNotification.notificationId);

      // Schedule new notification
      const newNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: scheduledNotification.title,
          body: scheduledNotification.body,
          data: scheduledNotification.data,
          sound: 'default',
        },
        trigger: {
          type: 'date',
          date: newTime,
        },
      });

      // Update the stored notification
      scheduledNotification.notificationId = newNotificationId;
      scheduledNotification.scheduledTime = newTime;
      await this.saveScheduledNotifications();

      return true;
    } catch (error) {
      console.error('Error updating notification time:', error);
      return false;
    }
  }

  /**
   * Schedule recurring notifications (daily, weekly, etc.)
   */
  async scheduleRecurringNotification(
    notificationData: Omit<NotificationData, 'id'>,
    recurrence: 'daily' | 'weekly' | 'monthly',
    endDate?: Date
  ): Promise<string[]> {
    const notifications: NotificationData[] = [];
    const startDate = new Date(notificationData.scheduledTime);
    const end = endDate || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // Default 30 days

    let currentDate = new Date(startDate);
    let count = 0;

    while (currentDate <= end && count < 100) { // Limit to 100 notifications
      notifications.push({
        ...notificationData,
        id: `recurring_${count}`,
        scheduledTime: new Date(currentDate),
      });

      // Increment date based on recurrence
      switch (recurrence) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      count++;
    }

    return await this.scheduleMultipleNotifications(notifications);
  }

  /**
   * Private method to load scheduled notifications from storage
   */
  private async loadScheduledNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const notifications = JSON.parse(stored);
        this.scheduledNotifications = new Map(notifications);
      }
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  }

  /**
   * Private method to save scheduled notifications to storage
   */
  private async saveScheduledNotifications(): Promise<void> {
    try {
      const notifications = Array.from(this.scheduledNotifications.entries());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data?.reminderId) {
        // Navigate to reminder or contact
        console.log('Reminder notification tapped:', data.reminderId);
      }
    });
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await this.getPermissionsStatus();
    return status === 'granted';
  }
}

export default NotificationService;
