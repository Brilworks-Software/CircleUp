import { useState, useEffect, useCallback } from 'react';
import RelationshipsService from '../services/RelationshipsService';
import type { Relationship, LastContactOption, ContactMethod, ReminderFrequency } from '../types';
import { useAuth } from './useAuth';

export const useRelationships = () => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const relationshipsService = RelationshipsService.getInstance();
  const { currentUser: user } = useAuth();

  // Set up real-time listener for relationships
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    // Set up real-time listener
    const unsubscribe = relationshipsService.onRelationshipsSnapshot(user.uid, (relationships) => {
      setRelationships(relationships);
      setIsLoading(false);
    });

    // Cleanup listener on unmount or user change
    return () => {
      unsubscribe();
    };
  }, [user?.uid, relationshipsService]);

  const loadRelationships = useCallback(async () => {
    if (!user?.uid) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const loadedRelationships = await relationshipsService.getRelationships(user.uid);
      setRelationships(loadedRelationships);
    } catch (err) {
      console.error('❌ Error loading relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to load relationships');
    } finally {
      setIsLoading(false);
    }
  }, [relationshipsService, user?.uid]);

  const createRelationship = useCallback(async (relationshipData: Omit<Relationship, 'id'>): Promise<Relationship> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const newRelationship = await relationshipsService.createRelationship(user.uid, relationshipData);
      // Real-time listener will automatically update the state
      return newRelationship;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
      throw err;
    }
  }, [relationshipsService, user?.uid]);

  const updateRelationship = useCallback(async (relationshipId: string, updates: Partial<Relationship>): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await relationshipsService.updateRelationship(user.uid, relationshipId, updates);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update relationship');
      return false;
    }
  }, [relationshipsService, user?.uid]);

  const deleteRelationship = useCallback(async (relationshipId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await relationshipsService.deleteRelationship(user.uid, relationshipId);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
      return false;
    }
  }, [relationshipsService, user?.uid]);

  const getRelationshipById = useCallback(async (relationshipId: string): Promise<Relationship | null> => {
    if (!user?.uid) return null;
    
    try {
      setError(null);
      return await relationshipsService.getRelationshipById(user.uid, relationshipId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationship');
      return null;
    }
  }, [relationshipsService, user?.uid]);

  const getRelationshipByContactId = useCallback(async (contactId: string): Promise<Relationship | null> => {
    if (!user?.uid) return null;
    
    try {
      setError(null);
      return await relationshipsService.getRelationshipByContactId(user.uid, contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationship by contact ID');
      return null;
    }
  }, [relationshipsService, user?.uid]);

  const hasRelationshipForContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await relationshipsService.hasRelationshipForContact(user.uid, contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check relationship existence');
      return false;
    }
  }, [relationshipsService, user?.uid]);

  const getRelationshipsCount = useCallback(async (): Promise<number> => {
    if (!user?.uid) return 0;
    
    try {
      return await relationshipsService.getRelationshipsCount(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationships count');
      return 0;
    }
  }, [relationshipsService, user?.uid]);

  const getRelationshipsByTag = useCallback(async (tag: string): Promise<Relationship[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await relationshipsService.getRelationshipsByTag(user.uid, tag);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationships by tag');
      return [];
    }
  }, [relationshipsService, user?.uid]);

  const getAllTags = useCallback(async (): Promise<string[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await relationshipsService.getAllTags(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get all tags');
      return [];
    }
  }, [relationshipsService, user?.uid]);

  const getRelationshipsNeedingFollowUp = useCallback(async (): Promise<Relationship[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await relationshipsService.getRelationshipsNeedingFollowUp(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relationships needing follow-up');
      return [];
    }
  }, [relationshipsService, user?.uid]);

  const updateLastContact = useCallback(async (
    relationshipId: string, 
    lastContactDate: Date, 
    contactMethod: ContactMethod
  ): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await relationshipsService.updateLastContact(user.uid, relationshipId, lastContactDate, contactMethod);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update last contact');
      return false;
    }
  }, [relationshipsService, user?.uid]);

  const clearAllRelationships = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await relationshipsService.clearAllRelationships(user.uid);
      // Real-time listener will automatically update the state
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all relationships');
      return false;
    }
  }, [relationshipsService, user?.uid]);

  const searchRelationships = useCallback(async (query: string): Promise<Relationship[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      return await relationshipsService.searchRelationships(user.uid, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search relationships');
      return [];
    }
  }, [relationshipsService, user?.uid]);

  // Helper functions
  const getLastContactDate = useCallback((option: LastContactOption, customDate?: string): Date => {
    return relationshipsService.getLastContactDate(option, customDate);
  }, [relationshipsService]);

  const getLastContactOptionFromDate = useCallback((dateString: string): LastContactOption => {
    return relationshipsService.getLastContactOptionFromDate(dateString);
  }, [relationshipsService]);

  // Helper function to get relationship from local state
  const getRelationshipByContactIdLocal = useCallback((contactId: string): Relationship | null => {
    return relationships.find(r => r.contactId === contactId) || null;
  }, [relationships]);

  // Helper function to filter relationships locally
  const filterRelationships = useCallback((query: string): Relationship[] => {
    if (!query.trim()) {
      return relationships;
    }

    const lowercaseQuery = query.toLowerCase();
    return relationships.filter(r =>
      r.contactName.toLowerCase().includes(lowercaseQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      r.notes.toLowerCase().includes(lowercaseQuery)
    );
  }, [relationships]);

  // Helper function to get relationships by tag from local state
  const getRelationshipsByTagLocal = useCallback((tag: string): Relationship[] => {
    return relationships.filter(r => r.tags.includes(tag));
  }, [relationships]);

  // Helper function to get relationships needing follow-up from local state
  const getRelationshipsNeedingFollowUpLocal = useCallback((): Relationship[] => {
    const now = new Date();
    return relationships.filter(r => {
      if (!r.nextReminderDate) return false;
      const nextReminderDate = new Date(r.nextReminderDate);
      return nextReminderDate <= now;
    });
  }, [relationships]);

  return {
    // State
    relationships,
    isLoading,
    error,
    
    // Actions
    loadRelationships,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    getRelationshipById,
    getRelationshipByContactId,
    hasRelationshipForContact,
    getRelationshipsCount,
    getRelationshipsByTag,
    getAllTags,
    getRelationshipsNeedingFollowUp,
    updateLastContact,
    clearAllRelationships,
    searchRelationships,
    
    // Helper functions
    getLastContactDate,
    getLastContactOptionFromDate,
    getRelationshipByContactIdLocal,
    filterRelationships,
    getRelationshipsByTagLocal,
    getRelationshipsNeedingFollowUpLocal,
  };
};
