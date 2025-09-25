import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from './useAuth';
import RemindersService from '../services/RemindersService';
import type { Reminder, ReminderTab, FilterType } from '../types';

const REMINDERS_PER_PAGE = 20;

export const useRemindersInfinite = (
  activeTab: ReminderTab = 'thisWeek',
  searchQuery: string = '',
  selectedFilter: FilterType = 'all'
) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const remindersService = RemindersService.getInstance();

  // Infinite query for reminders
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['reminders', currentUser?.uid, activeTab, searchQuery, selectedFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      
      console.log('🔄 Fetching reminders page:', pageParam, 'activeTab:', activeTab, 'searchQuery:', searchQuery, 'selectedFilter:', selectedFilter);
      
      // Get all reminders first (since Firebase doesn't have built-in pagination)
      const allReminders = await remindersService.getReminders(currentUser.uid);
      
      // Apply filters
      let filtered = allReminders;
      
      // Filter by tab
      filtered = filterRemindersByTab(filtered, activeTab);
      
      // Filter by search query
      if (searchQuery.trim()) {
        filtered = searchRemindersLocal(filtered, searchQuery);
      }
      
      // Filter by selected filter
      if (selectedFilter !== 'all') {
        console.log('🔍 Applying filter:', selectedFilter);
        filtered = filterRemindersByFilter(filtered, selectedFilter);
        console.log('🔍 After filter, count:', filtered.length);
      }
      
      // Sort by date (most recent first)
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Apply pagination
      const startIndex = pageParam * REMINDERS_PER_PAGE;
      const endIndex = startIndex + REMINDERS_PER_PAGE;
      const pageData = filtered.slice(startIndex, endIndex);
      
      console.log('📄 Page data:', {
        page: pageParam,
        startIndex,
        endIndex,
        pageDataLength: pageData.length,
        totalFiltered: filtered.length,
        hasMore: endIndex < filtered.length
      });
      
      return {
        reminders: pageData,
        nextCursor: endIndex < filtered.length ? pageParam + 1 : undefined,
        hasMore: endIndex < filtered.length,
        totalCount: filtered.length,
      };
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Flatten all pages into a single array
  const reminders = data?.pages.flatMap((page: any) => page.reminders) ?? [];
  // Get totalCount from the most recent page (it should be consistent across pages)
  const totalCount = data?.pages[data.pages.length - 1]?.totalCount ?? 0;
  
  // Calculate counts for all tabs
  // We need to get all reminders without tab filtering to calculate accurate counts
  const [refreshTimestamp, setRefreshTimestamp] = useState(0);
  
  const { data: tabCounts = { missed: 0, thisWeek: 0, upcoming: 0 }, isLoading: isLoadingTabCounts, refetch: refetchTabCounts } = useQuery({
    queryKey: ['tabCounts', currentUser?.uid, searchQuery, selectedFilter, refreshTimestamp],
    queryFn: async () => {
      console.log('🔄 Calculating tab counts...', { searchQuery, selectedFilter });
      if (!currentUser?.uid) return { missed: 0, thisWeek: 0, upcoming: 0 };
      
      try {
        // Get all reminders without any filtering
        const allReminders = await remindersService.getReminders(currentUser.uid);
        
        // Apply search and filter filters but not tab filter
        let filtered = allReminders;
        
        // Filter by search query
        if (searchQuery.trim()) {
          filtered = searchRemindersLocal(filtered, searchQuery);
        }
        
        // Filter by selected filter
        if (selectedFilter !== 'all') {
          filtered = filterRemindersByFilter(filtered, selectedFilter);
        }
        
        // Calculate counts for each tab
        const counts = {
          missed: filtered.filter(r => r.isOverdue).length,
          thisWeek: filtered.filter(r => r.isThisWeek && !r.isOverdue).length,
          upcoming: filtered.filter(r => !r.isThisWeek && !r.isOverdue).length,
        };
        
        console.log('📊 Tab counts calculated:', {
          totalReminders: allReminders.length,
          filteredReminders: filtered.length,
          searchQuery,
          selectedFilter,
          counts,
          timestamp: new Date().toISOString()
        });
        
        return counts;
      } catch (error) {
        console.error('Error calculating tab counts:', error);
        return { missed: 0, thisWeek: 0, upcoming: 0 };
      }
    },
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: Omit<Reminder, 'id' | 'isOverdue' | 'isThisWeek'>) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      console.log('🔄 Creating reminder...', reminderData);
      return await remindersService.createReminder(currentUser.uid, reminderData);
    },
    onSuccess: () => {
      console.log('✅ Create mutation successful, invalidating cache...');
      // Remove all cached data and refetch
      queryClient.removeQueries({ queryKey: ['reminders'] });
      queryClient.removeQueries({ queryKey: ['tabCounts'] });
      // Force refresh by updating timestamp
      setRefreshTimestamp(Date.now());
      // Force refetch both queries
      refetch();
      refetchTabCounts();
    },
    onError: (error) => {
      console.error('❌ Create mutation failed:', error);
    },
  });

  // Update reminder mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({ reminderId, updates }: { reminderId: string; updates: Partial<Reminder> }) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      console.log('🔄 Updating reminder...', { reminderId, updates });
      return await remindersService.updateReminder(currentUser.uid, reminderId, updates);
    },
    onSuccess: () => {
      console.log('✅ Update mutation successful, invalidating cache...');
      // Remove all cached data and refetch
      queryClient.removeQueries({ queryKey: ['reminders'] });
      queryClient.removeQueries({ queryKey: ['tabCounts'] });
      // Force refresh by updating timestamp
      setRefreshTimestamp(Date.now());
      // Force refetch both queries
      refetch();
      refetchTabCounts();
    },
    onError: (error) => {
      console.error('❌ Update mutation failed:', error);
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      console.log('🔄 Deleting reminder...', reminderId);
      return await remindersService.deleteReminder(currentUser.uid, reminderId);
    },
    onSuccess: () => {
      console.log('✅ Delete mutation successful, invalidating cache...');
      // Remove all cached data and refetch
      queryClient.removeQueries({ queryKey: ['reminders'] });
      queryClient.removeQueries({ queryKey: ['tabCounts'] });
      // Force refresh by updating timestamp
      setRefreshTimestamp(Date.now());
      // Force refetch both queries
      refetch();
      refetchTabCounts();
    },
    onError: (error) => {
      console.error('❌ Delete mutation failed:', error);
    },
  });

  // Helper functions for filtering
  const filterRemindersByTab = (reminders: Reminder[], tab: ReminderTab): Reminder[] => {
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
  };

  const searchRemindersLocal = (reminders: Reminder[], query: string): Reminder[] => {
    if (!query.trim()) return reminders;
    
    const lowercaseQuery = query.toLowerCase();
    return reminders.filter(reminder =>
      reminder.contactName.toLowerCase().includes(lowercaseQuery) ||
      reminder.notes?.toLowerCase().includes(lowercaseQuery) ||
      reminder.type.toLowerCase().includes(lowercaseQuery) ||
      reminder.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  const filterRemindersByFilter = (reminders: Reminder[], filter: FilterType): Reminder[] => {
    if (filter === 'all') return reminders;
    
    console.log('🔍 Filtering reminders by:', filter);
    console.log('🔍 Total reminders before filter:', reminders.length);
    
    const filtered = reminders.filter(reminder => {
      // Filter by tags - check if any of the reminder's tags match the selected filter
      const matches = reminder.tags.some(tag => 
        tag.toLowerCase() === filter.toLowerCase()
      );
      
      if (matches) {
        console.log('✅ Reminder matches filter:', reminder.contactName, 'tags:', reminder.tags);
      }
      
      return matches;
    });
    
    console.log('🔍 Filtered reminders count:', filtered.length);
    return filtered;
  };

  return {
    // Data
    reminders,
    totalCount,
    tabCounts,
    
    // Loading states
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    isLoadingTabCounts,
    
    // Pagination
    hasNextPage,
    fetchNextPage,
    
    // Actions
    refetch,
    
    // Mutations
    createReminder: createReminderMutation.mutateAsync,
    updateReminder: updateReminderMutation.mutateAsync,
    deleteReminder: deleteReminderMutation.mutateAsync,
    
    // Mutation states
    isCreating: createReminderMutation.isPending,
    isUpdating: updateReminderMutation.isPending,
    isDeleting: deleteReminderMutation.isPending,
  };
};
