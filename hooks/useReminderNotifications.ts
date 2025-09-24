import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import ReminderNotificationService, { type ReminderWithNotifications } from '../services/ReminderNotificationService';
import { useAuth } from '../firebase/hooks/useAuth';

/**
 * Hook to manage reminders with notifications
 */
export function useReminderNotifications() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const reminderService = ReminderNotificationService.getInstance();

  // Get all reminders with notification status
  const {
    data: reminders,
    isLoading,
    error,
  } = useQuery<ReminderWithNotifications[]>({
    queryKey: ['remindersWithNotifications', currentUser?.uid],
    queryFn: () => reminderService.getRemindersWithNotifications(currentUser?.uid || ''),
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get upcoming reminders (due within 24 hours)
  const {
    data: upcomingReminders,
    isLoading: isLoadingUpcoming,
  } = useQuery<ReminderWithNotifications[]>({
    queryKey: ['upcomingReminders', currentUser?.uid],
    queryFn: () => reminderService.getUpcomingReminders(currentUser?.uid || ''),
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get overdue reminders
  const {
    data: overdueReminders,
    isLoading: isLoadingOverdue,
  } = useQuery<ReminderWithNotifications[]>({
    queryKey: ['overdueReminders', currentUser?.uid],
    queryFn: () => reminderService.getOverdueReminders(currentUser?.uid || ''),
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create reminder with notifications mutation
  const createReminderMutation = useMutation({
    mutationFn: ({
      reminderData,
      notificationIntervals = [15, 30, 60],
    }: {
      reminderData: Omit<ReminderWithNotifications, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds' | 'hasNotifications'>;
      notificationIntervals?: number[];
    }) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return reminderService.createReminderWithNotifications(
        currentUser.uid,
        reminderData,
        notificationIntervals
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['upcomingReminders', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['overdueReminders', currentUser?.uid] });
    },
  });

  // Update reminder with notifications mutation
  const updateReminderMutation = useMutation({
    mutationFn: ({
      reminderId,
      updates,
      notificationIntervals = [15, 30, 60],
    }: {
      reminderId: string;
      updates: Partial<ReminderWithNotifications>;
      notificationIntervals?: number[];
    }) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return reminderService.updateReminderWithNotifications(
        currentUser.uid,
        reminderId,
        updates,
        notificationIntervals
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['upcomingReminders', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['overdueReminders', currentUser?.uid] });
    },
  });

  // Delete reminder with notifications mutation
  const deleteReminderMutation = useMutation({
    mutationFn: (reminderId: string) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return reminderService.deleteReminderWithNotifications(currentUser.uid, reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['upcomingReminders', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['overdueReminders', currentUser?.uid] });
    },
  });

  // Complete reminder mutation
  const completeReminderMutation = useMutation({
    mutationFn: (reminderId: string) => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return reminderService.completeReminder(currentUser.uid, reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['upcomingReminders', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['overdueReminders', currentUser?.uid] });
    },
  });

  // Add notifications to reminder mutation
  const addNotificationsMutation = useMutation({
    mutationFn: ({
      reminder,
      notificationIntervals = [15, 30, 60],
    }: {
      reminder: ReminderWithNotifications;
      notificationIntervals?: number[];
    }) => {
      return reminderService.addNotificationsToReminder(reminder, notificationIntervals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
    },
  });

  // Remove notifications from reminder mutation
  const removeNotificationsMutation = useMutation({
    mutationFn: (reminderId: string) => {
      return reminderService.removeNotificationsFromReminder(reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
    },
  });

  // Schedule custom notifications mutation
  const scheduleCustomNotificationsMutation = useMutation({
    mutationFn: ({
      reminder,
      customTimes,
    }: {
      reminder: ReminderWithNotifications;
      customTimes: Date[];
    }) => {
      return reminderService.scheduleCustomReminderNotifications(reminder, customTimes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remindersWithNotifications', currentUser?.uid] });
    },
  });

  return {
    // Data
    reminders: reminders || [],
    upcomingReminders: upcomingReminders || [],
    overdueReminders: overdueReminders || [],
    
    // Loading states
    isLoading,
    isLoadingUpcoming,
    isLoadingOverdue,
    
    // Error
    error,
    
    // Mutations
    createReminder: createReminderMutation.mutateAsync,
    isCreatingReminder: createReminderMutation.isPending,
    createReminderError: createReminderMutation.error,
    
    updateReminder: updateReminderMutation.mutateAsync,
    isUpdatingReminder: updateReminderMutation.isPending,
    updateReminderError: updateReminderMutation.error,
    
    deleteReminder: deleteReminderMutation.mutateAsync,
    isDeletingReminder: deleteReminderMutation.isPending,
    deleteReminderError: deleteReminderMutation.error,
    
    completeReminder: completeReminderMutation.mutateAsync,
    isCompletingReminder: completeReminderMutation.isPending,
    completeReminderError: completeReminderMutation.error,
    
    addNotifications: addNotificationsMutation.mutateAsync,
    isAddingNotifications: addNotificationsMutation.isPending,
    addNotificationsError: addNotificationsMutation.error,
    
    removeNotifications: removeNotificationsMutation.mutateAsync,
    isRemovingNotifications: removeNotificationsMutation.isPending,
    removeNotificationsError: removeNotificationsMutation.error,
    
    scheduleCustomNotifications: scheduleCustomNotificationsMutation.mutateAsync,
    isSchedulingCustomNotifications: scheduleCustomNotificationsMutation.isPending,
    scheduleCustomNotificationsError: scheduleCustomNotificationsMutation.error,
    
    // Service instance
    reminderService,
  };
}
