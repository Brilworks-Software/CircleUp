import { useState, useEffect, useCallback } from 'react';
import BusinessCardService from '../services/BusinessCardService';
import type { BusinessCard } from '../types';
import { useAuth } from './useAuth';

export const useBusinessCard = () => {
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const businessCardService = BusinessCardService.getInstance();
  const { currentUser: user } = useAuth();

  // Load business card on mount
  useEffect(() => {
    if (user?.uid) {
      loadBusinessCard();
    }
  }, [user?.uid]);

  const loadBusinessCard = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const card = await businessCardService.getBusinessCard(user.uid);
      setBusinessCard(card);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business card');
    } finally {
      setIsLoading(false);
    }
  }, [businessCardService, user?.uid]);

  const saveBusinessCard = useCallback(async (card: BusinessCard): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await businessCardService.saveBusinessCard(user.uid, card);
      if (success) {
        setBusinessCard(card);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save business card');
      return false;
    }
  }, [businessCardService, user?.uid]);

  const updateBusinessCard = useCallback(async (updates: Partial<BusinessCard>): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await businessCardService.updateBusinessCard(user.uid, updates);
      if (success) {
        // Reload the business card to get the updated version
        await loadBusinessCard();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business card');
      return false;
    }
  }, [businessCardService, loadBusinessCard, user?.uid]);

  const initializeWithUserProfile = useCallback(async (userProfile: { name?: string; email?: string; phone?: string }): Promise<BusinessCard> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const initializedCard = await businessCardService.initializeWithUserProfile(user.uid, userProfile);
      setBusinessCard(initializedCard);
      return initializedCard;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize business card');
      throw err;
    }
  }, [businessCardService, user?.uid]);

  const clearBusinessCard = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      setError(null);
      const success = await businessCardService.clearBusinessCard(user.uid);
      if (success) {
        setBusinessCard(null);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear business card');
      return false;
    }
  }, [businessCardService, user?.uid]);

  const hasBusinessCard = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await businessCardService.hasBusinessCard(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check business card existence');
      return false;
    }
  }, [businessCardService, user?.uid]);

  const getBusinessCardWithDefaults = useCallback(async (): Promise<BusinessCard> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      setError(null);
      const card = await businessCardService.getBusinessCardWithDefaults(user.uid);
      setBusinessCard(card);
      return card;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get business card with defaults');
      throw err;
    }
  }, [businessCardService, user?.uid]);

  return {
    businessCard,
    isLoading,
    error,
    loadBusinessCard,
    saveBusinessCard,
    updateBusinessCard,
    initializeWithUserProfile,
    clearBusinessCard,
    hasBusinessCard,
    getBusinessCardWithDefaults,
  };
};
