import RemindersService from '../firebase/services/RemindersService';
import NotificationService from './NotificationService';
import type { Reminder } from '../firebase/types';

export interface ReminderWithNotifications extends Reminder {
  notificationIds?: string[];
  hasNotifications?: boolean;
}

class ReminderNotificationService {
  private static instance: ReminderNotificationService;
  private notificationService: NotificationService;
  private remindersService: RemindersService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.remindersService = RemindersService.getInstance();
  }

  public static getInstance(): ReminderNotificationService {
    if (!ReminderNotificationService.instance) {
      ReminderNotificationService.instance = new ReminderNotificationService();
    }
    return ReminderNotificationService.instance;
  }

  /**
   * Create a reminder and schedule notifications
   */
  async createReminderWithNotifications(
    userId: string,
    reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>,
    notificationIntervals: number[] = [15, 30, 60] // minutes before due date
  ): Promise<ReminderWithNotifications> {
    try {
      // Create the reminder in Firestore
      const reminder = await this.remindersService.createReminder(userId, reminderData);

      // Schedule notifications for the reminder
      const notificationIds = await this.notificationService.scheduleReminderNotifications(
        reminder,
        notificationIntervals
      );

      return {
        ...reminder,
        notificationIds,
        hasNotifications: notificationIds.length > 0,
      };
    } catch (error) {
      console.error('Error creating reminder with notifications:', error);
      throw error;
    }
  }

  /**
   * Update a reminder and reschedule notifications
   */
  async updateReminderWithNotifications(
    userId: string,
    reminderId: string,
    updates: Partial<Reminder>,
    notificationIntervals: number[] = [15, 30, 60]
  ): Promise<ReminderWithNotifications> {
    try {
      // Cancel existing notifications for this reminder
      await this.notificationService.cancelReminderNotifications(reminderId);

      // Update the reminder in Firestore
      await this.remindersService.updateReminder(userId, reminderId, updates);

      // Get the updated reminder
      const updatedReminder = await this.remindersService.getReminderById(userId, reminderId);

      // Schedule new notifications if due date is in the future
      let notificationIds: string[] = [];
      if (updatedReminder && updatedReminder.date && new Date(updatedReminder.date) > new Date()) {
        notificationIds = await this.notificationService.scheduleReminderNotifications(
          updatedReminder,
          notificationIntervals
        );
      }

      if (!updatedReminder) {
        throw new Error('Reminder not found after update');
      }

      return {
        ...updatedReminder,
        notificationIds,
        hasNotifications: notificationIds.length > 0,
      };
    } catch (error) {
      console.error('Error updating reminder with notifications:', error);
      throw error;
    }
  }

  /**
   * Delete a reminder and cancel its notifications
   */
  async deleteReminderWithNotifications(
    userId: string,
    reminderId: string
  ): Promise<void> {
    try {
      // Cancel all notifications for this reminder
      await this.notificationService.cancelReminderNotifications(reminderId);

      // Delete the reminder from Firestore
      await this.remindersService.deleteReminder(userId, reminderId);
    } catch (error) {
      console.error('Error deleting reminder with notifications:', error);
      throw error;
    }
  }

  /**
   * Get all reminders with notification status
   */
  async getRemindersWithNotifications(userId: string): Promise<ReminderWithNotifications[]> {
    try {
      const reminders = await this.remindersService.getReminders(userId);
      const scheduledNotifications = this.notificationService.getScheduledNotifications();

      return reminders.map(reminder => {
        const reminderNotifications = scheduledNotifications.filter(
          notification => notification.reminderId === reminder.id
        );

        return {
          ...reminder,
          notificationIds: reminderNotifications.map(n => n.notificationId),
          hasNotifications: reminderNotifications.length > 0,
        };
      });
    } catch (error) {
      console.error('Error getting reminders with notifications:', error);
      throw error;
    }
  }

  /**
   * Add notifications to an existing reminder
   */
  async addNotificationsToReminder(
    reminder: Reminder,
    notificationIntervals: number[] = [15, 30, 60]
  ): Promise<string[]> {
    try {
      return await this.notificationService.scheduleReminderNotifications(
        reminder,
        notificationIntervals
      );
    } catch (error) {
      console.error('Error adding notifications to reminder:', error);
      throw error;
    }
  }

  /**
   * Remove notifications from a reminder
   */
  async removeNotificationsFromReminder(reminderId: string): Promise<boolean> {
    try {
      return await this.notificationService.cancelReminderNotifications(reminderId);
    } catch (error) {
      console.error('Error removing notifications from reminder:', error);
      throw error;
    }
  }

  /**
   * Mark reminder as completed and cancel future notifications
   */
  async completeReminder(
    userId: string,
    reminderId: string
  ): Promise<ReminderWithNotifications> {
    try {
      // Cancel future notifications
      await this.notificationService.cancelReminderNotifications(reminderId);

      // Mark reminder as completed by deleting it (as per the completeReminder method)
      await this.remindersService.completeReminder(userId, reminderId);

      // Since we completed the reminder by deleting it, we don't need to fetch it
      // Return a completed reminder object
      return {
        id: reminderId,
        contactName: '',
        type: '',
        date: new Date().toISOString(),
        frequency: 'never',
        tags: [],
        isOverdue: false,
        isThisWeek: false,
        notificationIds: [],
        hasNotifications: false,
      };
    } catch (error) {
      console.error('Error completing reminder:', error);
      throw error;
    }
  }

  /**
   * Get upcoming reminders (due within next 24 hours)
   */
  async getUpcomingReminders(userId: string): Promise<ReminderWithNotifications[]> {
    try {
      const allReminders = await this.getRemindersWithNotifications(userId);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return allReminders.filter(reminder => {
        const dueDate = new Date(reminder.date);
        return dueDate > now && dueDate <= tomorrow;
      });
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      throw error;
    }
  }

  /**
   * Get overdue reminders
   */
  async getOverdueReminders(userId: string): Promise<ReminderWithNotifications[]> {
    try {
      const allReminders = await this.getRemindersWithNotifications(userId);
      const now = new Date();

      return allReminders.filter(reminder => {
        const dueDate = new Date(reminder.date);
        return dueDate < now;
      });
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      throw error;
    }
  }

  /**
   * Schedule custom notifications for a reminder
   */
  async scheduleCustomReminderNotifications(
    reminder: Reminder,
    customTimes: Date[]
  ): Promise<string[]> {
    try {
      const notifications = customTimes.map((time, index) => ({
        id: `${reminder.id}_custom_${index}`,
        title: 'Custom Reminder',
        body: `${reminder.title} - Custom notification`,
        data: { reminderId: reminder.id, contactId: reminder.contactId },
        scheduledTime: time,
        reminderId: reminder.id,
        contactId: reminder.contactId,
        type: 'reminder' as const,
      }));

      return await this.notificationService.scheduleMultipleNotifications(notifications);
    } catch (error) {
      console.error('Error scheduling custom reminder notifications:', error);
      throw error;
    }
  }
}

export default ReminderNotificationService;
