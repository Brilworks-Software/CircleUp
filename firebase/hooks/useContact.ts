import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import ContactsService from '../services/ContactService';
import type { Contact } from '../types';

/** Fetch all contacts for a user with real-time updates */
export function useContacts(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Contact[]>({
    queryKey: ['contacts', userId],
    queryFn: () => ContactsService.fetchContacts(userId),
    staleTime: Infinity,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const unsub = ContactsService.subscribeToContacts(userId, (contacts) => {
      queryClient.setQueryData(['contacts', userId], contacts);
    });
    return () => unsub();
  }, [userId, queryClient]);

  return query;
}

/** Fetch a single contact by ID with real-time updates */
export function useContact(userId: string, contactId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Contact>({
    queryKey: ['contact', userId, contactId],
    queryFn: () => ContactsService.fetchContact(userId, contactId),
    staleTime: Infinity,
    enabled: !!userId && !!contactId,
  });

  useEffect(() => {
    if (!userId || !contactId) return;
    const unsub = ContactsService.subscribeToContact(userId, contactId, (contact) => {
      queryClient.setQueryData(['contact', userId, contactId], contact);
    });
    return () => unsub();
  }, [userId, contactId, queryClient]);

  return query;
}

type CreateContactVariables = {
  userId: string;
  contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
};

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation<Contact, unknown, CreateContactVariables>({
    mutationFn: ({ userId, contact }) => ContactsService.createContact(userId, contact),
    onSuccess: (newContact, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.userId] });
    },
  });
}

type UpdateContactVariables = {
  userId: string;
  contactId: string;
  updates: Partial<Contact>;
};

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, UpdateContactVariables>({
    mutationFn: ({ userId, contactId, updates }) =>
      ContactsService.updateContact(userId, contactId, updates),
    onMutate: async ({ userId, contactId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['contact', userId, contactId] });
      const previous = queryClient.getQueryData<Contact>(['contact', userId, contactId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as Contact;
        queryClient.setQueryData(['contact', userId, contactId], optimistic);
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      const ctx = context as { previous?: Contact };
      if (variables && ctx?.previous) {
        queryClient.setQueryData(['contact', variables.userId, variables.contactId], ctx.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ['contacts', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['contact', variables.userId, variables.contactId] });
      }
    },
  });
}

type DeleteContactVariables = { userId: string; contactId: string };

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeleteContactVariables>({
    mutationFn: ({ userId, contactId }) => ContactsService.deleteContact(userId, contactId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.userId] });
      queryClient.removeQueries({ queryKey: ['contact', variables.userId, variables.contactId] });
    },
  });
}
