import { useState, useEffect, useCallback } from 'react';
import ContactsService from '../services/ContactsService';
import type { Contact, ContactInteraction } from '../types';
import { useAuth } from './useAuth';

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const contactsService = ContactsService.getInstance();
  const { currentUser: user } = useAuth();

  // Load data on mount
  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user?.uid]);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [savedContacts, savedInteractions] = await Promise.all([
        contactsService.getContacts(user.uid),
        contactsService.getContactInteractions(user.uid),
      ]);
      
      setContacts(savedContacts);
      setFilteredContacts(savedContacts);
      setInteractions(savedInteractions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts data');
    } finally {
      setIsLoading(false);
    }
  }, [contactsService, user?.uid]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const granted = await contactsService.requestContactsPermission();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request contacts permission');
      return false;
    }
  }, [contactsService]);

  const importContacts = useCallback(async (): Promise<Contact[]> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const importedContacts = await contactsService.importContacts(user.uid);
      setContacts(importedContacts);
      setFilteredContacts(importedContacts);
      return importedContacts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
      throw err;
    }
  }, [contactsService, user?.uid]);

  const searchContacts = useCallback(async (query: string): Promise<Contact[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      const searchResults = await contactsService.searchContacts(user.uid, query);
      setFilteredContacts(searchResults);
      return searchResults;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search contacts');
      return [];
    }
  }, [contactsService, user?.uid]);

  const getContactById = useCallback(async (contactId: string): Promise<Contact | null> => {
    if (!user?.uid) return null;
    
    try {
      setError(null);
      return await contactsService.getContactById(user.uid, contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contact');
      return null;
    }
  }, [contactsService, user?.uid]);

  const recordInteraction = useCallback(async (contactId: string, type: string, notes?: string): Promise<ContactInteraction> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const newInteraction = await contactsService.recordInteraction(user.uid, contactId, type, notes);
      
      // Update local state
      setInteractions(prev => [...prev, newInteraction]);
      
      return newInteraction;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record interaction');
      throw err;
    }
  }, [contactsService, user?.uid]);

  const getContactInteractions = useCallback(async (contactId: string): Promise<ContactInteraction[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await contactsService.getContactInteractionsById(user.uid, contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contact interactions');
      return [];
    }
  }, [contactsService, user?.uid]);

  const getLastInteraction = useCallback(async (contactId: string): Promise<ContactInteraction | null> => {
    if (!user?.uid) return null;
    
    try {
      setError(null);
      return await contactsService.getLastInteraction(user.uid, contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get last interaction');
      return null;
    }
  }, [contactsService, user?.uid]);

  const deleteInteraction = useCallback(async (interactionId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await contactsService.deleteInteraction(user.uid, interactionId);
      
      if (success) {
        // Update local state
        setInteractions(prev => prev.filter(interaction => interaction.id !== interactionId));
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete interaction');
      return false;
    }
  }, [contactsService, user?.uid]);

  const clearAllData = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await contactsService.clearAllData(user.uid);
      
      if (success) {
        setContacts([]);
        setFilteredContacts([]);
        setInteractions([]);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all data');
      return false;
    }
  }, [contactsService, user?.uid]);

  const getContactsCount = useCallback(async (): Promise<number> => {
    if (!user?.uid) return 0;
    
    try {
      return await contactsService.getContactsCount(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contacts count');
      return 0;
    }
  }, [contactsService, user?.uid]);

  const getInteractionsCount = useCallback(async (): Promise<number> => {
    if (!user?.uid) return 0;
    
    try {
      return await contactsService.getInteractionsCount(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get interactions count');
      return 0;
    }
  }, [contactsService, user?.uid]);

  const getContactsWithLastInteraction = useCallback(async (): Promise<(Contact & { lastInteraction?: ContactInteraction })[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await contactsService.getContactsWithLastInteraction(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contacts with last interaction');
      return [];
    }
  }, [contactsService, user?.uid]);

  // Helper function to filter contacts locally (for immediate UI updates)
  const filterContacts = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(lowercaseQuery) ||
      (contact.phoneNumbers && contact.phoneNumbers.some(phone => 
        phone.number.includes(query)
      )) ||
      (contact.emails && contact.emails.some(email => 
        email.email.toLowerCase().includes(lowercaseQuery)
      ))
    );
    setFilteredContacts(filtered);
  }, [contacts]);

  // Helper function to get last interaction from local state
  const getLastInteractionLocal = useCallback((contactId: string): ContactInteraction | null => {
    const contactInteractions = interactions
      .filter(i => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return contactInteractions[0] || null;
  }, [interactions]);

  return {
    // State
    contacts,
    filteredContacts,
    interactions,
    isLoading,
    error,
    hasPermission,
    
    // Actions
    loadData,
    requestPermission,
    importContacts,
    searchContacts,
    getContactById,
    recordInteraction,
    getContactInteractions,
    getLastInteraction,
    deleteInteraction,
    clearAllData,
    getContactsCount,
    getInteractionsCount,
    getContactsWithLastInteraction,
    
    // Helper functions
    filterContacts,
    getLastInteractionLocal,
  };
};
