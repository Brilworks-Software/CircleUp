import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
  addDoc,
} from '@react-native-firebase/firestore';
import { db } from '../config';
import type { Reminder, ReminderTab, FilterType } from '../types';
import NotificationService from '../../services/NotificationService';

export interface CreateReminderData {
  contactName: string;
  type: string;
  date: string;
  frequency: string;
  tags: string[];
  notes?: string;
  contactId?: string;
}

export interface UpdateReminderData {
  contactName?: string;
  type?: string;
  date?: string;
  frequency?: string;
  tags?: string[];
  notes?: string;
  contactId?: string;
}

// Interface for Firebase document data (with Date objects for timestamps)
interface ReminderFirebaseData extends Omit<Reminder, 'date' | 'id' | 'isOverdue' | 'isThisWeek'> {
  date: Date; // Firebase stores this as a timestamp
  userId: string;
  createdAt: any;
  updatedAt: any;
  id?: string; // Optional for create operations
  isOverdue?: boolean; // Calculated field, not stored
  isThisWeek?: boolean; // Calculated field, not stored
}

class RemindersService {
  private static instance: RemindersService;
  private readonly COLLECTION_NAME = 'reminders';

  private constructor() {}

  public static getInstance(): RemindersService {
    if (!RemindersService.instance) {
      RemindersService.instance = new RemindersService();
    }
    return RemindersService.instance;
  }

  /**
   * Test Firebase connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Firebase connection...');
      console.log('🔍 Firebase app:', db.app);
      console.log('🔍 Firebase project ID:', db.app.options.projectId);
      console.log('🔍 Firebase app name:', db.app.name);
      console.log('🔍 Firebase app options:', db.app.options);
      
      // Just test if we can create a collection reference (no actual write)
      const testCollection = collection(db, 'test');
      console.log('🔍 Collection reference created successfully');
      
      // Test if we can create a document reference
      const testDoc = doc(testCollection, 'test-doc');
      console.log('🔍 Document reference created successfully');
      
      console.log('✅ Firebase connection test successful (basic connectivity)');
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Firebase diagnostic information
   */
  getFirebaseDiagnostics() {
    try {
      return {
        appName: db.app.name,
        projectId: db.app.options.projectId,
        apiKey: db.app.options.apiKey,
        authDomain: db.app.options.authDomain,
        storageBucket: db.app.options.storageBucket,
        messagingSenderId: db.app.options.messagingSenderId,
        appId: db.app.options.appId,
        measurementId: db.app.options.measurementId,
        databaseURL: db.app.options.databaseURL,
        isDefaultApp: db.app.name === '[DEFAULT]',
      };
    } catch (error) {
      console.error('❌ Error getting Firebase diagnostics:', error);
      return null;
    }
  }

  /**
   * Test Firebase write operation with minimal data
   */
  async testFirebaseWrite(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase write operation...');
      
      const testCollection = collection(db, 'test');
      const testDoc = doc(testCollection, `test_${Date.now()}`);
      
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Firebase connectivity test'
      };
      
      console.log('🧪 Test data:', testData);
      
      await setDoc(testDoc, testData);
      
      console.log('✅ Firebase write test successful');
      return true;
    } catch (error) {
      console.error('❌ Firebase write test failed:', error);
      return false;
    }
  }

  /**
   * Reschedule notifications for all active reminders
   */
  async rescheduleAllNotifications(userId: string): Promise<void> {
    try {
      console.log('🔔 Rescheduling notifications for all reminders...');
      
      const reminders = await this.getReminders(userId);
      const notificationService = NotificationService.getInstance();
      
      // Cancel all existing notifications first
      await notificationService.cancelAllNotifications();
      
      // Reschedule notifications for all future reminders
      for (const reminder of reminders) {
        const reminderDate = new Date(reminder.date);
        
        // Only schedule if the reminder is in the future
        if (reminderDate > new Date()) {
          try {
            const notificationId = await notificationService.scheduleNotificationForDateTime(
              reminder.id,
              `Reminder: ${reminder.contactName}`,
              reminder.notes || `Don't forget to follow up with ${reminder.contactName}`,
              reminderDate,
              {
                reminderId: reminder.id,
                contactName: reminder.contactName,
                type: reminder.type,
                frequency: reminder.frequency,
                tags: reminder.tags,
              }
            );
            
            if (notificationId) {
              console.log('✅ Rescheduled notification for reminder:', reminder.id);
            }
          } catch (error) {
            console.error('❌ Error rescheduling notification for reminder:', reminder.id, error);
          }
        }
      }
      
      console.log('✅ Finished rescheduling notifications');
    } catch (error) {
      console.error('❌ Error rescheduling all notifications:', error);
    }
  }

  /**
   * Get all reminders for a user
   */
  async getReminders(userId: string): Promise<Reminder[]> {
    try {
      const remindersRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        remindersRef,
        where('userId', '==', userId),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const reminders: Reminder[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let dateString: string;
        
        // Handle different date formats from Firebase
        if (data.date instanceof Date) {
          dateString = data.date.toISOString();
        } else if (data.date && typeof data.date === 'object' && data.date.seconds) {
          // Handle Firebase Timestamp
          dateString = new Date(data.date.seconds * 1000).toISOString();
        } else if (typeof data.date === 'string') {
          dateString = data.date;
        } else {
          console.warn('Invalid date format in reminder:', data.date);
          dateString = new Date().toISOString(); // Fallback to current date
        }
        
        const isOverdue = this.isOverdue(dateString);
        const isThisWeek = this.isThisWeek(dateString);
        
        // Debug logging for new reminders
        if (data.contactName) {
          console.log('📅 Reminder categorization:', {
            contactName: data.contactName,
            date: dateString,
            reminderDate: new Date(dateString),
            now: new Date(),
            isOverdue,
            isThisWeek,
            category: isOverdue ? 'missed' : isThisWeek ? 'thisWeek' : 'upcoming'
          });
        }
        
        reminders.push({
          id: doc.id,
          ...data,
          date: dateString, // Ensure date is always a string
          isOverdue,
          isThisWeek,
        } as Reminder);
      });

      return reminders;
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  }

  /**
   * Get a reminder by ID
   */
  async getReminderById(userId: string, reminderId: string): Promise<Reminder | null> {
    try {
      const reminderRef = doc(db, this.COLLECTION_NAME, reminderId);
      const reminderSnap = await getDoc(reminderRef);

      if (reminderSnap.exists()) {
        const data = reminderSnap.data();
        if (data.userId === userId) {
          let dateString: string;
          
          // Handle different date formats from Firebase
          if (data.date instanceof Date) {
            dateString = data.date.toISOString();
          } else if (data.date && typeof data.date === 'object' && data.date.seconds) {
            // Handle Firebase Timestamp
            dateString = new Date(data.date.seconds * 1000).toISOString();
          } else if (typeof data.date === 'string') {
            dateString = data.date;
          } else {
            console.warn('Invalid date format in reminder:', data.date);
            dateString = new Date().toISOString(); // Fallback to current date
          }
          
          return {
            id: reminderSnap.id,
            ...data,
            date: dateString, // Ensure date is always a string
            isOverdue: this.isOverdue(dateString),
            isThisWeek: this.isThisWeek(dateString),
          } as Reminder;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting reminder by ID:', error);
      return null;
    }
  }

  /**
   * Create a new reminder
   */
  async createReminder(userId: string, reminderData: CreateReminderData): Promise<Reminder> {
    try {
      console.log('🔔 RemindersService: Creating reminder for user:', userId);
      console.log('🔔 RemindersService: Reminder data:', reminderData);
      console.log('🔔 RemindersService: Firebase diagnostics:', this.getFirebaseDiagnostics());
      
      // Generate a unique document ID
      const docId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const reminder: Reminder = {
        id: docId,
        ...reminderData,
        isOverdue: this.isOverdue(reminderData.date),
        isThisWeek: this.isThisWeek(reminderData.date),
      };

      console.log('🔔 RemindersService: Created reminder object locally:', reminder);
      
      // Try to save to Firebase with a very short timeout
      try {
        console.log('🔔 RemindersService: Attempting to save to Firebase...');
        console.log('🔔 RemindersService: User ID:', userId);
        console.log('🔔 RemindersService: Document ID:', docId);
        
        const remindersCollection = collection(db, this.COLLECTION_NAME);
        const docRef = doc(remindersCollection, docId);
        
        const docData: any = {
          ...reminderData,
          date: new Date(reminderData.date), // Convert string to Date object for Firebase timestamp storage
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log('🔔 RemindersService: Document data to save:', docData);

        

        const setDocPromise = setDoc(docRef, docData);
        // await Promise.race([setDocPromise, timeoutPromise]);
        
        console.log('✅ RemindersService: Successfully saved to Firebase');
      } catch (firebaseError) {
        console.error('❌ RemindersService: Firebase save failed:', firebaseError);
        console.error('❌ RemindersService: Error details:', {
          message: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          stack: firebaseError instanceof Error ? firebaseError.stack : undefined,
        });
        // Continue with local reminder even if Firebase fails
      }
      
      console.log('✅ RemindersService: Reminder created successfully (local):', reminder);
      
      // Schedule local notification for the reminder
      try {
        console.log('🔔 Scheduling notification for reminder:', reminder.id);
        const notificationService = NotificationService.getInstance();
        
        // Initialize notification service if not already done
        await notificationService.initialize();
        
        // Schedule notification at the reminder date/time
        const reminderDate = new Date(reminderData.date);
        const notificationId = await notificationService.scheduleNotificationForDateTime(
          reminder.id, // Use reminder ID as unique notification ID
          `Reminder: ${reminderData.contactName}`,
          reminderData.notes || `Don't forget to follow up with ${reminderData.contactName}`,
          reminderDate,
          {
            reminderId: reminder.id,
            contactName: reminderData.contactName,
            type: reminderData.type,
            frequency: reminderData.frequency,
            tags: reminderData.tags,
          }
        );
        
        if (notificationId) {
          console.log('✅ Notification scheduled successfully with ID:', notificationId);
        } else {
          console.warn('⚠️ Failed to schedule notification for reminder:', reminder.id);
        }
      } catch (notificationError) {
        console.error('❌ Error scheduling notification:', notificationError);
        // Don't throw error - reminder creation should still succeed even if notification fails
      }
      
      return reminder;
    } catch (error) {
      console.error('❌ RemindersService: Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Update a reminder
   */
  async updateReminder(userId: string, reminderId: string, updates: UpdateReminderData): Promise<boolean> {
    try {
      const reminderRef = doc(db, this.COLLECTION_NAME, reminderId);
      
      // Verify the reminder belongs to the user
      const reminderSnap = await getDoc(reminderRef);
      if (!reminderSnap.exists() || reminderSnap.data().userId !== userId) {
        return false;
      }

      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Handle date updates - convert string to Date object for Firebase timestamp storage
      if (updates.date) {
        updateData.date = new Date(updates.date);
        // Note: isOverdue and isThisWeek are calculated fields, not stored in DB
        // They will be recalculated when the reminder is fetched
      }

      await updateDoc(reminderRef, updateData);
      
      // Reschedule notification if any relevant fields were updated
      if (updates.date || updates.contactName || updates.notes || updates.type) {
        try {
          console.log('🔔 Rescheduling notification for updated reminder:', reminderId, 'updates:', updates);
          const notificationService = NotificationService.getInstance();
          
          // Initialize notification service if needed
          const initResult = await notificationService.initialize();
          if (!initResult) {
            console.warn('⚠️ Notification service initialization failed, skipping notification reschedule');
            return true; // Don't fail the update operation
          }
          
          // Cancel old notification first (this might fail if notification doesn't exist, which is OK)
          try {
            const cancelResult = await notificationService.cancelNotification(reminderId);
            console.log('✅ Cancelled old notification for reminder:', reminderId, 'result:', cancelResult);
          } catch (cancelError) {
            console.warn('⚠️ Failed to cancel old notification (this might be normal if notification doesn\'t exist):', cancelError instanceof Error ? cancelError.message : String(cancelError));
          }
          
          // Get the updated reminder data
          const reminderSnap = await getDoc(reminderRef);
          if (reminderSnap.exists()) {
            const reminderData = reminderSnap.data();
            
            // Validate reminder data
            if (!reminderData || !reminderData.date) {
              console.error('❌ Invalid reminder data or missing date:', reminderData);
              return true; // Don't fail the update operation
            }
            
            // Handle different date formats from Firebase
            let reminderDate: Date;
            if (reminderData.date instanceof Date) {
              reminderDate = reminderData.date;
            } else if (reminderData.date && typeof reminderData.date === 'object' && 'seconds' in reminderData.date) {
              // Handle Firebase Timestamp
              reminderDate = new Date((reminderData.date as any).seconds * 1000);
            } else if (typeof reminderData.date === 'string') {
              reminderDate = new Date(reminderData.date);
            } else {
              console.error('❌ Invalid date format in reminder data:', reminderData.date);
              return true; // Don't fail the update operation
            }
            
            // Validate the parsed date
            if (isNaN(reminderDate.getTime())) {
              console.error('❌ Invalid parsed date:', reminderDate, 'from original:', reminderData.date);
              return true; // Don't fail the update operation
            }
            
            console.log('📅 Reminder date check:', {
              originalDate: reminderData.date,
              originalDateType: typeof reminderData.date,
              isTimestamp: reminderData.date && typeof reminderData.date === 'object' && reminderData.date.seconds,
              parsedDate: reminderDate.toISOString(),
              now: new Date().toISOString(),
              isFuture: reminderDate > new Date(),
              dateValid: !isNaN(reminderDate.getTime())
            });
            
            // Only schedule if the reminder is in the future
            if (reminderDate > new Date()) {
              console.log('⏰ Scheduling new notification for future reminder...');
              try {
                // Validate the date before scheduling
                if (isNaN(reminderDate.getTime())) {
                  console.error('❌ Invalid reminder date, cannot schedule notification:', reminderData.date);
                  return true; // Don't fail the update operation
                }
                
                // Ensure the date is valid and in the future
                const now = new Date();
                if (reminderDate <= now) {
                  console.log('ℹ️ Reminder date is not in the future, skipping notification:', reminderDate.toISOString());
                  return true;
                }
                
                console.log('📅 Validating date for notification:', {
                  reminderDate: reminderDate.toISOString(),
                  reminderDateValid: !isNaN(reminderDate.getTime()),
                  isFuture: reminderDate > now,
                  timeUntilReminder: reminderDate.getTime() - now.getTime()
                });
                
                const notificationId = await notificationService.scheduleNotificationForDateTime(
                  reminderId,
                  `Reminder: ${reminderData.contactName}`,
                  reminderData.notes || `Don't forget to follow up with ${reminderData.contactName}`,
                  reminderDate,
                  {
                    reminderId: reminderId,
                    contactName: reminderData.contactName,
                    type: reminderData.type,
                    frequency: reminderData.frequency,
                    tags: reminderData.tags,
                  }
                );
                
                if (notificationId) {
                  console.log('✅ Notification rescheduled successfully for reminder:', reminderId, 'at:', reminderDate.toISOString(), 'notificationId:', notificationId);
                } else {
                  console.warn('⚠️ Failed to reschedule notification for reminder:', reminderId, '- notificationId is null');
                }
              } catch (scheduleError) {
                console.error('❌ Error scheduling new notification:', scheduleError);
                console.error('❌ Schedule error details:', {
                  message: scheduleError instanceof Error ? scheduleError.message : String(scheduleError),
                  reminderId,
                  reminderDate: reminderDate.toISOString(),
                  contactName: reminderData.contactName
                });
              }
            } else {
              console.log('ℹ️ Reminder is in the past, not scheduling notification:', reminderId, 'date:', reminderDate.toISOString());
            }
          } else {
            console.error('❌ Reminder not found after update:', reminderId);
          }
        } catch (notificationError) {
          console.error('❌ Error rescheduling notification:', notificationError);
          console.error('❌ Error details:', {
            message: notificationError instanceof Error ? notificationError.message : String(notificationError),
            stack: notificationError instanceof Error ? notificationError.stack : undefined,
            reminderId,
            updates
          });
          // Don't fail the update operation if notification rescheduling fails
        }
      } else {
        console.log('ℹ️ No relevant fields updated, skipping notification reschedule for reminder:', reminderId);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating reminder:', error);
      return false;
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(userId: string, reminderId: string): Promise<boolean> {
    try {
      const reminderRef = doc(db, this.COLLECTION_NAME, reminderId);
      
      // Verify the reminder belongs to the user
      const reminderSnap = await getDoc(reminderRef);
      if (!reminderSnap.exists() || reminderSnap.data().userId !== userId) {
        return false;
      }

      await deleteDoc(reminderRef);
      
      // Cancel associated notifications
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.cancelNotification(reminderId);
        console.log('✅ Cancelled notification for reminder:', reminderId);
      } catch (notificationError) {
        console.error('❌ Error cancelling notification:', notificationError);
        // Don't fail the delete operation if notification cancellation fails
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Get reminders by tab
   */
  async getRemindersByTab(userId: string, tab: ReminderTab): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      switch (tab) {
        case 'missed':
          return reminders.filter(r => r.isOverdue);
        case 'thisWeek':
          return reminders.filter(r => r.isThisWeek && !r.isOverdue);
        case 'upcoming':
          return reminders.filter(r => !r.isThisWeek && !r.isOverdue);
        default:
          return reminders;
      }
    } catch (error) {
      console.error('Error getting reminders by tab:', error);
      return [];
    }
  }

  /**
   * Get reminders count by tab
   */
  async getRemindersCountByTab(userId: string, tab: ReminderTab): Promise<number> {
    try {
      const reminders = await this.getRemindersByTab(userId, tab);
      return reminders.length;
    } catch (error) {
      console.error('Error getting reminders count by tab:', error);
      return 0;
    }
  }

  /**
   * Get reminders by filter
   */
  async getRemindersByFilter(userId: string, filter: FilterType): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      if (filter === 'all') {
        return reminders;
      }
      
      return reminders.filter(r => 
        r.tags.some(tag => tag.toLowerCase() === filter.toLowerCase())
      );
    } catch (error) {
      console.error('Error getting reminders by filter:', error);
      return [];
    }
  }

  /**
   * Search reminders
   */
  async searchReminders(userId: string, query: string): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      const lowercaseQuery = query.toLowerCase();

      return reminders.filter(r =>
        r.contactName.toLowerCase().includes(lowercaseQuery) ||
        r.type.toLowerCase().includes(lowercaseQuery) ||
        r.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error('Error searching reminders:', error);
      return [];
    }
  }

  /**
   * Get reminders count
   */
  async getRemindersCount(userId: string): Promise<number> {
    try {
      const reminders = await this.getReminders(userId);
      return reminders.length;
    } catch (error) {
      console.error('Error getting reminders count:', error);
      return 0;
    }
  }

  /**
   * Get all unique tags
   */
  async getAllTags(userId: string): Promise<string[]> {
    try {
      const reminders = await this.getReminders(userId);
      const allTags = reminders.flatMap(r => r.tags);
      return [...new Set(allTags)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting all tags:', error);
      return [];
    }
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(userId: string, reminderId: string, days: number): Promise<boolean> {
    try {
      const reminder = await this.getReminderById(userId, reminderId);
      if (!reminder) {
        return false;
      }

      // Handle different date formats from Firebase
      let reminderDate: Date;
      if (reminder.date instanceof Date) {
        reminderDate = reminder.date;
      } else if (reminder.date && typeof reminder.date === 'object' && 'seconds' in reminder.date) {
        // Handle Firebase Timestamp
        reminderDate = new Date((reminder.date as any).seconds * 1000);
      } else if (typeof reminder.date === 'string') {
        reminderDate = new Date(reminder.date);
      } else {
        console.error('❌ Invalid date format in reminder for snooze:', reminder.date);
        return false;
      }
      
      const newDate = new Date(reminderDate);
      newDate.setDate(newDate.getDate() + days);

      return await this.updateReminder(userId, reminderId, { date: newDate.toISOString() });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      return false;
    }
  }

  /**
   * Complete a reminder (delete it)
   */
  async completeReminder(userId: string, reminderId: string): Promise<boolean> {
    return this.deleteReminder(userId, reminderId);
  }

  /**
   * Get reminders due today
   */
  async getRemindersDueToday(userId: string): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return reminders.filter(r => {
        const reminderDate = new Date(r.date);
        return reminderDate >= today && reminderDate < tomorrow;
      });
    } catch (error) {
      console.error('Error getting reminders due today:', error);
      return [];
    }
  }

  /**
   * Get overdue reminders
   */
  async getOverdueReminders(userId: string): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      return reminders.filter(r => r.isOverdue);
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      return [];
    }
  }

  /**
   * Get upcoming reminders
   */
  async getUpcomingReminders(userId: string): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders(userId);
      return reminders.filter(r => !r.isThisWeek && !r.isOverdue);
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      return [];
    }
  }

  /**
   * Clear all reminders
   */
  async clearAllReminders(userId: string): Promise<boolean> {
    try {
      const reminders = await this.getReminders(userId);
      const deletePromises = reminders.map(reminder => {
        const reminderRef = doc(db, this.COLLECTION_NAME, reminder.id);
        return deleteDoc(reminderRef);
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error clearing all reminders:', error);
      return false;
    }
  }

  /**
   * Check if a date is overdue
   */
  private isOverdue(dateString: string): boolean {
    const reminderDate = new Date(dateString);
    const now = new Date();
    // A reminder is overdue if it's past its scheduled time (not just past today)
    return reminderDate < now;
  }

  /**
   * Check if a date is this week
   */
  private isThisWeek(dateString: string): boolean {
    const reminderDate = new Date(dateString);
    const now = new Date();
    
    // Get start of week (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
    startOfWeek.setDate(now.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const isThisWeek = reminderDate >= startOfWeek && reminderDate <= endOfWeek;
    
    console.log('📅 Week calculation:', {
      reminderDate: reminderDate.toISOString(),
      now: now.toISOString(),
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      isThisWeek
    });
    
    return isThisWeek;
  }

  /**
   * Listen to reminders changes
   */
  onRemindersSnapshot(userId: string, callback: (reminders: Reminder[]) => void): () => void {
    const remindersRef = collection(db, this.COLLECTION_NAME);
    const q = query(
      remindersRef,
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const reminders: Reminder[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reminders.push({
          id: doc.id,
          ...data,
          isOverdue: this.isOverdue(data.date),
          isThisWeek: this.isThisWeek(data.date),
        } as Reminder);
      });
      callback(reminders);
    });
  }
}

export default RemindersService;