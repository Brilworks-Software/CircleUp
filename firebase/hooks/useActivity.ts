import { useState, useEffect, useCallback } from 'react';
import ActivityService from '../services/ActivityService';
import type {
  Activity,
  CreateActivityData,
  UpdateActivityData,
  ActivityStats,
  ActivityType
} from '../types';
import { useAuth } from './useAuth';


export const useActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activityService = ActivityService.getInstance();
  const { currentUser: user } = useAuth();

  // Set up real-time listener for activities
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    // Set up real-time listener
    const unsubscribe = activityService.onActivitiesSnapshot(user.uid, (activities) => {
      setActivities(activities);
      setIsLoading(false);
    });

    // Cleanup listener on unmount or user change
    return () => {
      unsubscribe();
    };
  }, [user?.uid, activityService]);


  const createActivity = useCallback(async (activityData: CreateActivityData): Promise<Activity> => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      const newActivity = await activityService.createActivity(user.uid, activityData);

      // Real-time listener will automatically update the state

      // Log Activity Created Event
      // Log Activity Created Event
      // analyticsService.logEvent('activity_created', {
      //   type: activityData.type,
      // });

      return newActivity;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create activity');
      throw err;
    }
  }, [activityService, user?.uid]);

  const updateActivity = useCallback(async (activityId: string, updates: UpdateActivityData): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      setError(null);
      const success = await activityService.updateActivity(user.uid, activityId, updates);

      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity');
      return false;
    }
  }, [activityService, user?.uid]);

  const deleteActivity = useCallback(async (activityId: string): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      setError(null);
      const success = await activityService.deleteActivity(user.uid, activityId);

      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
      return false;
    }
  }, [activityService, user?.uid]);

  const archiveActivity = useCallback(async (activityId: string): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      setError(null);
      const success = await activityService.archiveActivity(user.uid, activityId);

      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive activity');
      return false;
    }
  }, [activityService, user?.uid]);

  const completeReminder = useCallback(async (activityId: string): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      setError(null);
      const success = await activityService.completeReminder(user.uid, activityId);

      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete reminder');
      return false;
    }
  }, [activityService, user?.uid]);

  const getActivityById = useCallback(async (activityId: string): Promise<Activity | null> => {
    if (!user?.uid) return null;

    try {
      setError(null);
      return await activityService.getActivityById(user.uid, activityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get activity');
      return null;
    }
  }, [activityService, user?.uid]);

  const getActivityByReminderId = useCallback(async (reminderId: string): Promise<Activity | null> => {
    if (!user?.uid) return null;

    try {
      setError(null);
      return await activityService.getActivityByReminderId(user.uid, reminderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get activity by reminder ID');
      return null;
    }
  }, [activityService, user?.uid]);

  const getActivitiesByType = useCallback(async (type: ActivityType): Promise<Activity[]> => {
    if (!user?.uid) return [];

    try {
      setError(null);
      return await activityService.getActivitiesByType(user.uid, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get activities by type');
      return [];
    }
  }, [activityService, user?.uid]);

  const searchActivities = useCallback(async (searchQuery: string): Promise<Activity[]> => {
    if (!user?.uid) return [];

    try {
      setError(null);
      return await activityService.searchActivities(user.uid, searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search activities');
      return [];
    }
  }, [activityService, user?.uid]);

  const getActivitiesByTags = useCallback(async (tags: string[]): Promise<Activity[]> => {
    if (!user?.uid) return [];

    try {
      setError(null);
      return await activityService.getActivitiesByTags(user.uid, tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get activities by tags');
      return [];
    }
  }, [activityService, user?.uid]);

  const getActivityStats = useCallback(async (): Promise<ActivityStats | null> => {
    if (!user?.uid) return null;

    try {
      setError(null);
      return await activityService.getActivityStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get activity stats');
      return null;
    }
  }, [activityService, user?.uid]);

  const getAllTags = useCallback(async (): Promise<string[]> => {
    if (!user?.uid) return [];

    try {
      setError(null);
      return await activityService.getAllTags(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get tags');
      return [];
    }
  }, [activityService, user?.uid]);

  // Filter activities by type
  const getFilteredActivities = useCallback((type?: ActivityType) => {
    if (!type) return activities;
    return activities.filter(activity => activity.type === type);
  }, [activities]);

  // Filter activities by completion status (for reminders)
  const getRemindersByStatus = useCallback((completed: boolean) => {
    return activities.filter(activity =>
      activity.type === 'reminder' &&
      (activity as any).isCompleted === completed
    );
  }, [activities]);

  // Safely convert Firestore timestamp to Date
  const safeTimestampToDate = useCallback((timestamp: any): Date => {
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
  }, []);

  // Get recent activities (last 7 days)
  const getRecentActivities = useCallback(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return activities.filter(activity => {
      const createdAt = safeTimestampToDate(activity.createdAt);
      return createdAt >= oneWeekAgo;
    });
  }, [activities, safeTimestampToDate]);

  return {
    // State
    activities,
    isLoading,
    error,

    // Actions
    createActivity,
    updateActivity,
    deleteActivity,
    archiveActivity,
    completeReminder,
    getActivityById,
    getActivityByReminderId,
    getActivitiesByType,
    searchActivities,
    getActivitiesByTags,
    getActivityStats,
    getAllTags,

    // Filters
    getFilteredActivities,
    getRemindersByStatus,
    getRecentActivities,
  };
};
