import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import InteractionsService from '../services/InteractionService';
import type { Interaction } from '../types';

/** Fetch all interactions for a contact (real-time) */
export function useInteractions(userId: string, contactId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Interaction[]>({
    queryKey: ['interactions', userId, contactId],
    queryFn: () => InteractionsService.fetchInteractions(userId, contactId),
    staleTime: Infinity,
    enabled: !!userId && !!contactId,
  });

  useEffect(() => {
    if (!userId || !contactId) return;
    const unsub = InteractionsService.subscribeToInteractions(userId, contactId, (interactions) => {
      queryClient.setQueryData(['interactions', userId, contactId], interactions);
    });
    return () => unsub();
  }, [userId, contactId, queryClient]);

  return query;
}

type CreateInteractionVariables = {
  userId: string;
  contactId: string;
  interaction: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>;
};

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation<Interaction, unknown, CreateInteractionVariables>({
    mutationFn: ({ userId, contactId, interaction }) =>
      InteractionsService.createInteraction(userId, contactId, interaction),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.userId, variables.contactId] });
    },
  });
}

type UpdateInteractionVariables = {
  userId: string;
  contactId: string;
  interactionId: string;
  updates: Partial<Interaction>;
};

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, UpdateInteractionVariables>({
    mutationFn: ({ userId, contactId, interactionId, updates }) =>
      InteractionsService.updateInteraction(userId, contactId, interactionId, updates),
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ['interactions', variables.userId, variables.contactId] });
      }
    },
  });
}

type DeleteInteractionVariables = {
  userId: string;
  contactId: string;
  interactionId: string;
};

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeleteInteractionVariables>({
    mutationFn: ({ userId, contactId, interactionId }) =>
      InteractionsService.deleteInteraction(userId, contactId, interactionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.userId, variables.contactId] });
    },
  });
}
