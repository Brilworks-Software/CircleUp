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
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import type { Reminder, ReminderTab, FilterType } from '../types';

export interface CreateReminderData {
  contactName: string;
  type: string;
  date: string;
  frequency: string;
  tags: string[];
  notes?: string;
  contactId?: string;
  relationshipId?: string;
}

export interface UpdateReminderData {
  contactName?: string;
  type?: string;
  date?: string;
  frequency?: string;
  tags?: string[];
  notes?: string;
  contactId?: string;
  relationshipId?: string;
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
  relationshipId?: string; // Reference to relationship document
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
      // Just test if we can create a collection reference (no actual write)
      const testCollection = collection(db, 'test');
      
      // Test if we can create a document reference
      const testDoc = doc(testCollection, 'test-doc');
      
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
      const testCollection = collection(db, 'test');
      const testDoc = doc(testCollection, `test_${Date.now()}`);
      
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Firebase connectivity test'
      };
      
      await setDoc(testDoc, testData);
      
      return true;
    } catch (error) {
      console.error('❌ Firebase write test failed:', error);
      return false;
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
        
        // Categorize reminders
        if (data.contactName) {
          // Reminder categorization logic
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
      // Generate a unique document ID
      const docId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const reminder: Reminder = {
        id: docId,
        ...reminderData,
        isOverdue: this.isOverdue(reminderData.date),
        isThisWeek: this.isThisWeek(reminderData.date),
      };
      
      // Try to save to Firebase with a very short timeout
      try {
        const remindersCollection = collection(db, this.COLLECTION_NAME);
        const docRef = doc(remindersCollection, docId);
        
        const docData: any = {
          ...reminderData,
          date: new Date(reminderData.date), // Convert string to Date object for Firebase timestamp storage
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const setDocPromise = setDoc(docRef, docData);
        // await Promise.race([setDocPromise, timeoutPromise]);
        
      } catch (firebaseError) {
        console.error('❌ RemindersService: Firebase save failed:', firebaseError);
        console.error('❌ RemindersService: Error details:', {
          message: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          stack: firebaseError instanceof Error ? firebaseError.stack : undefined,
        });
        // Continue with local reminder even if Firebase fails
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
      if (typeof reminder.date === 'string') {
        reminderDate = new Date(reminder.date);
      } else if (reminder.date && typeof reminder.date === 'object' && 'seconds' in reminder.date) {
        // Handle Firebase Timestamp
        reminderDate = new Date((reminder.date as any).seconds * 1000);
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
    try {
      const reminderDate = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(reminderDate.getTime())) {
        console.warn('Invalid date in isOverdue:', dateString);
        return false; // Treat invalid dates as not overdue
      }
      
      const now = new Date();
      // A reminder is overdue if it's past its scheduled time (not just past today)
      return reminderDate < now;
    } catch (error) {
      console.error('Error in isOverdue:', error, 'dateString:', dateString);
      return false; // Treat errors as not overdue
    }
  }

  /**
   * Check if a date is this week
   */
  private isThisWeek(dateString: string): boolean {
    try {
      const reminderDate = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(reminderDate.getTime())) {
        console.warn('Invalid date in isThisWeek:', dateString);
        return false; // Treat invalid dates as not this week
      }
      
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
      
      return isThisWeek;
    } catch (error) {
      console.error('Error in isThisWeek:', error, 'dateString:', dateString);
      return false; // Treat errors as not this week
    }
  }

  /**
   * Listen to reminders changes
   */
  onRemindersSnapshot(userId: string, callback: (reminders: Reminder[]) => void): Unsubscribe {
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
          console.warn('Invalid date format in reminder snapshot:', data.date);
          dateString = new Date().toISOString(); // Fallback to current date
        }
        
        const isOverdue = this.isOverdue(dateString);
        const isThisWeek = this.isThisWeek(dateString);
        
        reminders.push({
          id: doc.id,
          ...data,
          date: dateString, // Ensure date is always a string
          isOverdue,
          isThisWeek,
        } as Reminder);
      });
      callback(reminders);
    });
  }
}

export default RemindersService;