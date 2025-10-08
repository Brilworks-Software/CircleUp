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
  limit,
  startAfter,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { ReminderTypes } from '../../constants/ReminderTypes';
import type { 
  Activity, 
  CreateActivityData, 
  UpdateActivityData, 
  ActivityStats,
  ActivityType 
} from '../types';

class ActivityService {
  private static instance: ActivityService;
  private readonly COLLECTION_NAME = 'activities';

  private constructor() {}

  /**
   * Safely convert Firestore timestamp to Date
   */
  private safeTimestampToDate(timestamp: any): Date {
    if (!timestamp) {
      return new Date(); // Return current date if timestamp is null/undefined
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Firebase Timestamp object
      return new Date(timestamp.seconds * 1000);
    }
    
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Fallback to current date
    return new Date();
  }

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  /**
   * Create a new activity
   */
  async createActivity(userId: string, activityData: CreateActivityData): Promise<Activity> {
    try {
      const activitiesRef = collection(db, this.COLLECTION_NAME);
      
      const baseData = {
        userId,
        type: activityData.type,
        // title: activityData.title,
        description: activityData.description,
        tags: activityData.tags || [],
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let activityDataToSave: any = { ...baseData };

      // Add type-specific fields
      switch (activityData.type) {
        case 'note':
          activityDataToSave = {
            ...activityDataToSave,
            content: activityData.content || '',
            category: activityData.category || 'general',
            contactId: activityData.contactId || '',
            contactName: activityData.contactName || '',
          };
          break;
        case 'interaction':
          activityDataToSave = {
            ...activityDataToSave,
            contactId: activityData.contactId || '',
            contactName: activityData.contactName || '',
            interactionType: activityData.interactionType || 'call',
            date: activityData.date || new Date().toISOString(),
            duration: activityData.duration || 0,
            location: activityData.location || '',
          };
          break;
        case 'reminder':
          activityDataToSave = {
            ...activityDataToSave,
            contactId: activityData.contactId || '',
            contactName: activityData.contactName || '',
            reminderDate: activityData.reminderDate || new Date().toISOString(),
            reminderType: activityData.reminderType || ReminderTypes.FollowUp,
            frequency: activityData.frequency || 'month',
            reminderId: activityData.reminderId || '', // Store reference to reminder document
            isCompleted: activityData.isCompleted !== undefined ? activityData.isCompleted : false,
            completedAt: activityData.completedAt || null,
          };
          break;
      }

      const docRef = await addDoc(activitiesRef, activityDataToSave);
      
      // Get the created document to return with ID
      const createdDoc = await getDoc(docRef);
      if (!createdDoc.exists()) {
        throw new Error('Failed to create activity');
      }

      return {
        id: docRef.id,
        ...(createdDoc.data() || {}),
      } as Activity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Get all activities for a user
   */
  async getActivities(userId: string): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const activities: Activity[] = [];

      querySnapshot.forEach((doc: any) => {
        activities.push({
          id: doc.id,
          ...(doc.data() || {}),
        } as Activity);
      });

      return activities;
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(userId: string, type: ActivityType): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        where('type', '==', type),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const activities: Activity[] = [];

      querySnapshot.forEach((doc: any) => {
        activities.push({
          id: doc.id,
          ...(doc.data() || {}),
        } as Activity);
      });

      return activities;
    } catch (error) {
      console.error('Error getting activities by type:', error);
      throw error;
    }
  }

  /**
   * Get a single activity by ID
   */
  async getActivityById(userId: string, activityId: string): Promise<Activity | null> {
    try {
      const activityRef = doc(db, this.COLLECTION_NAME, activityId);
      const activitySnap = await getDoc(activityRef);

      if (activitySnap.exists()) {
        const data = activitySnap.data();
        // Verify the activity belongs to the user
        if (data && data.userId === userId) {
          return {
            id: activitySnap.id,
            ...data,
          } as Activity;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting activity by ID:', error);
      throw error;
    }
  }

  /**
   * Update an activity
   */
  async updateActivity(userId: string, activityId: string, updates: UpdateActivityData): Promise<boolean> {
    try {
      const activityRef = doc(db, this.COLLECTION_NAME, activityId);
      
      // Verify the activity belongs to the user
      const activitySnap = await getDoc(activityRef);
      if (!activitySnap.exists() || !activitySnap.data() || activitySnap.data()!.userId !== userId) {
        throw new Error('Activity not found or access denied');
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Handle reminderId updates for reminder activities
      if (updates.reminderId !== undefined) {
        updateData.reminderId = updates.reminderId;
      }

      await updateDoc(activityRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }

  /**
   * Delete an activity
   */
  async deleteActivity(userId: string, activityId: string): Promise<boolean> {
    try {
      const activityRef = doc(db, this.COLLECTION_NAME, activityId);
      
      // Verify the activity belongs to the user
      const activitySnap = await getDoc(activityRef);
      if (!activitySnap.exists() || !activitySnap.data() || activitySnap.data()!.userId !== userId) {
        throw new Error('Activity not found or access denied');
      }

      await deleteDoc(activityRef);
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  /**
   * Archive an activity (soft delete)
   */
  async archiveActivity(userId: string, activityId: string): Promise<boolean> {
    try {
      return await this.updateActivity(userId, activityId, { isArchived: true });
    } catch (error) {
      console.error('Error archiving activity:', error);
      throw error;
    }
  }

  /**
   * Complete a reminder activity
   */
  async completeReminder(userId: string, activityId: string): Promise<boolean> {
    try {
      const updates: UpdateActivityData = {
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };
      return await this.updateActivity(userId, activityId, updates);
    } catch (error) {
      console.error('Error completing reminder:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId: string): Promise<ActivityStats> {
    try {
      const activities = await this.getActivities(userId);
      
      const stats: ActivityStats = {
        totalActivities: activities.length,
        notesCount: activities.filter(a => a.type === 'note').length,
        interactionsCount: activities.filter(a => a.type === 'interaction').length,
        remindersCount: activities.filter(a => a.type === 'reminder').length,
        completedReminders: activities.filter(a => a.type === 'reminder' && (a as any).isCompleted).length,
        pendingReminders: activities.filter(a => a.type === 'reminder' && !(a as any).isCompleted).length,
        recentActivities: activities.filter(a => {
          const createdAt = this.safeTimestampToDate(a.createdAt);
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return createdAt >= oneWeekAgo;
        }).length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Search activities
   */
  async searchActivities(userId: string, searchQuery: string): Promise<Activity[]> {
    try {
      const activities = await this.getActivities(userId);
      const lowercaseQuery = searchQuery.toLowerCase();

      return activities.filter(activity => 
        // activity.title.toLowerCase().includes(lowercaseQuery) ||
        activity.description.toLowerCase().includes(lowercaseQuery) ||
        activity.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
        (activity.type === 'note' && (activity as any).content?.toLowerCase().includes(lowercaseQuery)) ||
        (activity.type === 'interaction' && (activity as any).contactName?.toLowerCase().includes(lowercaseQuery)) ||
        (activity.type === 'reminder' && (activity as any).contactName?.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error('Error searching activities:', error);
      throw error;
    }
  }

  /**
   * Get activities by tags
   */
  async getActivitiesByTags(userId: string, tags: string[]): Promise<Activity[]> {
    try {
      const activities = await this.getActivities(userId);
      
      return activities.filter(activity => 
        tags.some(tag => activity.tags.includes(tag))
      );
    } catch (error) {
      console.error('Error getting activities by tags:', error);
      throw error;
    }
  }

  /**
   * Listen to activities changes
   */
  onActivitiesSnapshot(userId: string, callback: (activities: Activity[]) => void): () => void {
    const activitiesRef = collection(db, this.COLLECTION_NAME);
    const q = query(
      activitiesRef,
      where('userId', '==', userId),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const activities: Activity[] = [];
      querySnapshot.forEach((doc: any) => {
        activities.push({
          id: doc.id,
          ...(doc.data() || {}),
        } as Activity);
      });
      callback(activities);
    });
  }

  /**
   * Get all unique tags for a user
   */
  async getAllTags(userId: string): Promise<string[]> {
    try {
      const activities = await this.getActivities(userId);
      const allTags = activities.flatMap(activity => activity.tags);
      return [...new Set(allTags)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting all tags:', error);
      return [];
    }
  }

  /**
   * Get activity by reminder ID (for direct editing)
   */
  async getActivityByReminderId(userId: string, reminderId: string): Promise<Activity | null> {
    try {
      const activitiesRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        where('reminderId', '==', reminderId),
        where('isArchived', '==', false)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...(doc.data() || {}),
      } as Activity;
    } catch (error) {
      console.error('Error getting activity by reminder ID:', error);
      throw error;
    }
  }
}

export default ActivityService;
