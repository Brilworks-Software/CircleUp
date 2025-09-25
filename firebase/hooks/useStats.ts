import { useState, useEffect, useCallback } from 'react';
import StatsService from '../services/StatsService';
import type { AppStats } from '../types';
import { useAuth } from './useAuth';

export const useStats = () => {
  const [stats, setStats] = useState<AppStats>({
    totalContacts: 0,
    totalRelationships: 0,
    totalReminders: 0,
    totalInteractions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const statsService = StatsService.getInstance();
  const { currentUser: user } = useAuth();

  // Load stats on mount
  useEffect(() => {
    if (user?.uid) {
      loadStats();
    }
  }, [user?.uid]);

  const loadStats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const loadedStats = await statsService.getStats(user.uid);
      setStats(loadedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [statsService, user?.uid]);

  const updateStats = useCallback(async (): Promise<AppStats> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const updatedStats = await statsService.updateStats(user.uid);
      setStats(updatedStats);
      return updatedStats;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stats');
      throw err;
    }
  }, [statsService, user?.uid]);

  const getCachedStats = useCallback(async (): Promise<AppStats | null> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      return await statsService.getCachedStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get cached stats');
      throw err;
    }
  }, [statsService, user?.uid]);

  const getContactsStats = useCallback(async () => {
    if (!user?.uid) return { total: 0, withInteractions: 0, withoutInteractions: 0 };
    
    try {
      setError(null);
      return await statsService.getContactsStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contacts stats');
      return { total: 0, withInteractions: 0, withoutInteractions: 0 };
    }
  }, [statsService, user?.uid]);

  const getRelationshipsStats = useCallback(async () => {
    if (!user?.uid) return { total: 0, byTag: {}, needingFollowUp: 0, withReminders: 0 };
    
    try {
      setError(null);
      return await statsService.getRelationshipsStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationships stats');
      return { total: 0, byTag: {}, needingFollowUp: 0, withReminders: 0 };
    }
  }, [statsService, user?.uid]);

  const getRemindersStats = useCallback(async () => {
    if (!user?.uid) return { total: 0, overdue: 0, thisWeek: 0, upcoming: 0, byTag: {} };
    
    try {
      setError(null);
      return await statsService.getRemindersStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminders stats');
      return { total: 0, overdue: 0, thisWeek: 0, upcoming: 0, byTag: {} };
    }
  }, [statsService, user?.uid]);

  const getInteractionsStats = useCallback(async () => {
    if (!user?.uid) return { total: 0, byType: {}, recent: 0 };
    
    try {
      setError(null);
      return await statsService.getInteractionsStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get interactions stats');
      return { total: 0, byType: {}, recent: 0 };
    }
  }, [statsService, user?.uid]);

  const getComprehensiveStats = useCallback(async () => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      return await statsService.getComprehensiveStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get comprehensive stats');
      throw err;
    }
  }, [statsService, user?.uid]);

  const getDashboardStats = useCallback(async () => {
    if (!user?.uid) return {
      totalContacts: 0,
      totalRelationships: 0,
      totalReminders: 0,
      overdueReminders: 0,
      relationshipsNeedingFollowUp: 0,
      recentInteractions: 0,
    };
    
    try {
      setError(null);
      return await statsService.getDashboardStats(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get dashboard stats');
      return {
        totalContacts: 0,
        totalRelationships: 0,
        totalReminders: 0,
        overdueReminders: 0,
        relationshipsNeedingFollowUp: 0,
        recentInteractions: 0,
      };
    }
  }, [statsService, user?.uid]);

  const clearCachedStats = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await statsService.clearCachedStats(user.uid);
      if (success) {
        // Reload stats after clearing cache
        await loadStats();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cached stats');
      return false;
    }
  }, [statsService, loadStats, user?.uid]);

  return {
    // State
    stats,
    isLoading,
    error,
    
    // Actions
    loadStats,
    updateStats,
    getCachedStats,
    getContactsStats,
    getRelationshipsStats,
    getRemindersStats,
    getInteractionsStats,
    getComprehensiveStats,
    getDashboardStats,
    clearCachedStats,
  };
};
