import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import RemindersService from '../services/ReminderService';
import type { Reminder } from '../types';

/** Fetch all reminders for a user with real-time updates */
export function useReminders(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Reminder[]>({
    queryKey: ['reminders', userId],
    queryFn: () => RemindersService.fetchReminders(userId),
    staleTime: Infinity,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const unsub = RemindersService.subscribeToReminders(userId, (reminders) => {
      queryClient.setQueryData(['reminders', userId], reminders);
    });
    return () => unsub();
  }, [userId, queryClient]);

  return query;
}

/** Fetch a single reminder by ID */
export function useReminder(userId: string, reminderId: string) {
  const queryClient = useQueryClient();

  return useQuery<Reminder>({
    queryKey: ['reminder', userId, reminderId],
    queryFn: () => RemindersService.fetchReminder(userId, reminderId),
    staleTime: Infinity,
    enabled: !!userId && !!reminderId,
  });
}

type CreateReminderVariables = {
  userId: string;
  reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>;
};

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation<Reminder, unknown, CreateReminderVariables>({
    mutationFn: ({ userId, reminder }) => RemindersService.createReminder(userId, reminder),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', variables.userId] });
    },
  });
}

type UpdateReminderVariables = {
  userId: string;
  reminderId: string;
  updates: Partial<Reminder>;
};

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, UpdateReminderVariables>({
    mutationFn: ({ userId, reminderId, updates }) =>
      RemindersService.updateReminder(userId, reminderId, updates),
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ['reminders', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['reminder', variables.userId, variables.reminderId] });
      }
    },
  });
}

type DeleteReminderVariables = {
  userId: string;
  reminderId: string;
};

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeleteReminderVariables>({
    mutationFn: ({ userId, reminderId }) => RemindersService.deleteReminder(userId, reminderId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', variables.userId] });
      queryClient.removeQueries({ queryKey: ['reminder', variables.userId, variables.reminderId] });
    },
  });
}
