import { useState, useEffect, useCallback } from 'react';
import RemindersService from '../services/RemindersService';
import type { Reminder, ReminderTab, FilterType } from '../types';
import { useAuth } from './useAuth';

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const remindersService = RemindersService.getInstance();
  const { currentUser: user } = useAuth();

  // Set up real-time listener for reminders
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    // Set up real-time listener
    const unsubscribe = remindersService.onRemindersSnapshot(user.uid, (reminders) => {
      setReminders(reminders);
      setFilteredReminders(reminders);
      setIsLoading(false);
    });

    // Cleanup listener on unmount or user change
    return () => {
      unsubscribe();
    };
  }, [user?.uid, remindersService]);

  const loadReminders = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const loadedReminders = await remindersService.getReminders(user.uid);
      setReminders(loadedReminders);
      setFilteredReminders(loadedReminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  }, [remindersService, user?.uid]);

  const createReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'isOverdue' | 'isThisWeek'>): Promise<Reminder> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      console.log('🔔 useReminders: Creating reminder with data:', reminderData);
      console.log('🔔 useReminders: User ID:', user.uid);
      
      setError(null);
      const newReminder = await remindersService.createReminder(user.uid, reminderData);
      
      console.log('✅ useReminders: Reminder created successfully:', newReminder);
      
      // Real-time listener will automatically update the state
      return newReminder;
    } catch (err) {
      console.error('❌ useReminders: Error creating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
      throw err;
    }
  }, [remindersService, user?.uid]);

  const updateReminder = useCallback(async (reminderId: string, updates: Partial<Reminder>): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await remindersService.updateReminder(user.uid, reminderId, updates);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reminder');
      return false;
    }
  }, [remindersService, user?.uid]);

  const deleteReminder = useCallback(async (reminderId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await remindersService.deleteReminder(user.uid, reminderId);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reminder');
      return false;
    }
  }, [remindersService, user?.uid]);

  const getReminderById = useCallback(async (reminderId: string): Promise<Reminder | null> => {
    if (!user?.uid) return null;
    
    try {
      setError(null);
      return await remindersService.getReminderById(user.uid, reminderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminder');
      return null;
    }
  }, [remindersService, user?.uid]);

  const getRemindersByTab = useCallback(async (tab: ReminderTab): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getRemindersByTab(user.uid, tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders by tab');
      return [];
    }
  }, [remindersService, user?.uid]);

  const getRemindersCountByTab = useCallback(async (tab: ReminderTab): Promise<number> => {
    if (!user?.uid) return 0;
    
    try {
      return await remindersService.getRemindersCountByTab(user.uid, tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders count by tab');
      return 0;
    }
  }, [remindersService, user?.uid]);

  const getRemindersByFilter = useCallback(async (filter: FilterType): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getRemindersByFilter(user.uid, filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders by filter');
      return [];
    }
  }, [remindersService, user?.uid]);

  const searchReminders = useCallback(async (query: string): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.searchReminders(user.uid, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search reminders');
      return [];
    }
  }, [remindersService, user?.uid]);

  const getRemindersCount = useCallback(async (): Promise<number> => {
    if (!user?.uid) return 0;
    
    try {
      return await remindersService.getRemindersCount(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders count');
      return 0;
    }
  }, [remindersService, user?.uid]);

  const getAllTags = useCallback(async (): Promise<string[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getAllTags(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get all tags');
      return [];
    }
  }, [remindersService, user?.uid]);

  const snoozeReminder = useCallback(async (reminderId: string, days: number): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await remindersService.snoozeReminder(user.uid, reminderId, days);
      if (success) {
        // Reload reminders to get updated data
        await loadReminders();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snooze reminder');
      return false;
    }
  }, [remindersService, loadReminders, user?.uid]);

  const completeReminder = useCallback(async (reminderId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await remindersService.completeReminder(user.uid, reminderId);
      if (success) {
        // Update local state
        setReminders(prev => prev.filter(r => r.id !== reminderId));
        setFilteredReminders(prev => prev.filter(r => r.id !== reminderId));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete reminder');
      return false;
    }
  }, [remindersService, user?.uid]);

  const clearAllReminders = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await remindersService.clearAllReminders(user.uid);
      if (success) {
        setReminders([]);
        setFilteredReminders([]);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all reminders');
      return false;
    }
  }, [remindersService, user?.uid]);

  const getRemindersDueToday = useCallback(async (): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getRemindersDueToday(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders due today');
      return [];
    }
  }, [remindersService, user?.uid]);

  const getOverdueReminders = useCallback(async (): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getOverdueReminders(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get overdue reminders');
      return [];
    }
  }, [remindersService, user?.uid]);

  const getUpcomingReminders = useCallback(async (): Promise<Reminder[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await remindersService.getUpcomingReminders(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get upcoming reminders');
      return [];
    }
  }, [remindersService, user?.uid]);

  // Helper functions for local filtering
  const filterRemindersByTab = useCallback((tab: ReminderTab): Reminder[] => {
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
  }, [reminders]);

  const filterRemindersByFilter = useCallback((filter: FilterType): Reminder[] => {
    if (filter === 'all') {
      return reminders;
    }
    
    return reminders.filter(r => 
      r.tags.some(tag => tag.toLowerCase() === filter.toLowerCase())
    );
  }, [reminders]);

  const searchRemindersLocal = useCallback((query: string): Reminder[] => {
    if (!query.trim()) {
      return reminders;
    }

    const lowercaseQuery = query.toLowerCase();
    return reminders.filter(r =>
      r.contactName.toLowerCase().includes(lowercaseQuery) ||
      r.type.toLowerCase().includes(lowercaseQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [reminders]);

  const getRemindersCountByTabLocal = useCallback((tab: ReminderTab): number => {
    return filterRemindersByTab(tab).length;
  }, [filterRemindersByTab]);

  const getRemindersCountLocal = useCallback((): number => {
    return reminders.length;
  }, [reminders]);

  const getAllTagsLocal = useCallback((): string[] => {
    const allTags = reminders.flatMap(r => r.tags);
    return [...new Set(allTags)]; // Remove duplicates
  }, [reminders]);

  const getOverdueRemindersLocal = useCallback((): Reminder[] => {
    return reminders.filter(r => r.isOverdue);
  }, [reminders]);

  const getUpcomingRemindersLocal = useCallback((): Reminder[] => {
    return reminders.filter(r => !r.isThisWeek && !r.isOverdue);
  }, [reminders]);

  const getRemindersDueTodayLocal = useCallback((): Reminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return reminders.filter(r => {
      const reminderDate = new Date(r.date);
      return reminderDate >= today && reminderDate < tomorrow;
    });
  }, [reminders]);

  return {
    // State
    reminders,
    filteredReminders,
    isLoading,
    error,
    
    // Actions
    loadReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    getReminderById,
    getRemindersByTab,
    getRemindersCountByTab,
    getRemindersByFilter,
    searchReminders,
    getRemindersCount,
    getAllTags,
    snoozeReminder,
    completeReminder,
    clearAllReminders,
    getRemindersDueToday,
    getOverdueReminders,
    getUpcomingReminders,
    
    // Helper functions for local operations
    filterRemindersByTab,
    filterRemindersByFilter,
    searchRemindersLocal,
    getRemindersCountByTabLocal,
    getRemindersCountLocal,
    getAllTagsLocal,
    getOverdueRemindersLocal,
    getUpcomingRemindersLocal,
    getRemindersDueTodayLocal,
    
    // Utility function to update filtered reminders
    setFilteredReminders,
  };
};
