import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import UsersService, { type CreateUserData } from '../services/UserService';
import { userStore } from '../stores/userStore';
import type { User } from '../types';

export function useUser(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => UsersService.fetchUser(userId),
    staleTime: Infinity,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const unsub = UsersService.subscribeToUser(userId, (user) => {
      queryClient.setQueryData(['user', userId], user);
      // Also update the userStore for global state management
      userStore.setUser(user);
    });
    return () => unsub();
  }, [userId, queryClient]);

  return query;
}

type UpdateUserVariables = { userId: string; updates: Partial<User> };

/**
 * Mutation hook to update a user profile.
 * Uses optimistic update to keep react-query cache and local userStore in sync.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateUserVariables,
    { previous?: User }
  >({
    mutationFn: (variables?: UpdateUserVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { userId, updates } = variables;
      return UsersService.updateUser(userId, updates);
    },
    onMutate: async (variables?: UpdateUserVariables) => {
      if (!variables) return { previous: undefined };
      const { userId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['user', userId] });
      const previous = queryClient.getQueryData<User>(['user', userId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as User;
        queryClient.setQueryData(['user', userId], optimistic);
        try {
          userStore.updateUser(updates);
        } catch (err) {
          console.warn('Failed to optimistic update userStore:', err);
        }
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateUserVariables | undefined,
      context: { previous?: User } | undefined
    ) => {
      if (variables?.userId && context?.previous) {
        queryClient.setQueryData(['user', variables.userId], context.previous);
        try {
          // rollback local store
          userStore.setUser(context.previous || null);
        } catch (e) {
          // ignore
        }
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateUserVariables | undefined
    ) => {
      if (variables?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new user profile.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<User>,
    unknown,
    { userId: string; userData: CreateUserData }
  >({
    mutationFn: ({ userId, userData }) => 
      UsersService.createUser(userId, userData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      // Update user store with the new user data
      if (data) {
        userStore.setUser(data as User);
      }
    },
  });

  return mutation;
}
