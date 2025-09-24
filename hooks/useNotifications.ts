import { useEffect, useState } from 'react';
import NotificationService, { type NotificationData, type ScheduledNotification } from '../services/NotificationService';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const initialized = await notificationService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const enabled = await notificationService.areNotificationsEnabled();
        setHasPermission(enabled);
        setScheduledNotifications(notificationService.getScheduledNotifications());
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const scheduleNotification = async (notificationData: NotificationData) => {
    const notificationId = await notificationService.scheduleNotification(notificationData);
    if (notificationId) {
      setScheduledNotifications(notificationService.getScheduledNotifications());
    }
    return notificationId;
  };

  const scheduleMultipleNotifications = async (notifications: NotificationData[]) => {
    const notificationIds = await notificationService.scheduleMultipleNotifications(notifications);
    setScheduledNotifications(notificationService.getScheduledNotifications());
    return notificationIds;
  };

  const scheduleNotificationForDateTime = async (
    id: string,
    title: string,
    body: string,
    date: Date,
    data?: any
  ) => {
    const notificationId = await notificationService.scheduleNotificationForDateTime(
      id,
      title,
      body,
      date,
      data
    );
    if (notificationId) {
      setScheduledNotifications(notificationService.getScheduledNotifications());
    }
    return notificationId;
  };

  const scheduleNotificationsForDateTimes = async (
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      date: Date;
      data?: any;
    }>
  ) => {
    const notificationIds = await notificationService.scheduleNotificationsForDateTimes(notifications);
    setScheduledNotifications(notificationService.getScheduledNotifications());
    return notificationIds;
  };

  const scheduleReminderNotifications = async (
    reminder: any,
    intervals: number[] = [15, 30, 60]
  ) => {
    const notificationIds = await notificationService.scheduleReminderNotifications(reminder, intervals);
    setScheduledNotifications(notificationService.getScheduledNotifications());
    return notificationIds;
  };

  const cancelNotification = async (notificationId: string) => {
    const success = await notificationService.cancelNotification(notificationId);
    if (success) {
      setScheduledNotifications(notificationService.getScheduledNotifications());
    }
    return success;
  };

  const cancelReminderNotifications = async (reminderId: string) => {
    const success = await notificationService.cancelReminderNotifications(reminderId);
    if (success) {
      setScheduledNotifications(notificationService.getScheduledNotifications());
    }
    return success;
  };

  const cancelAllNotifications = async () => {
    const success = await notificationService.cancelAllNotifications();
    if (success) {
      setScheduledNotifications([]);
    }
    return success;
  };

  const refreshNotifications = () => {
    setScheduledNotifications(notificationService.getScheduledNotifications());
  };

  return {
    isInitialized,
    hasPermission,
    scheduledNotifications,
    scheduleNotification,
    scheduleMultipleNotifications,
    scheduleNotificationForDateTime,
    scheduleNotificationsForDateTimes,
    scheduleReminderNotifications,
    cancelNotification,
    cancelReminderNotifications,
    cancelAllNotifications,
    refreshNotifications,
    notificationService,
  };
};
