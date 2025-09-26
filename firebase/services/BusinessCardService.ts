import type { DocumentSnapshot, QuerySnapshot, Unsubscribe } from 'firebase/firestore';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import type { BusinessCard } from '../types';

class BusinessCardService {
  private static instance: BusinessCardService;
  private readonly COLLECTION_NAME = 'business_cards';

  private constructor() {}

  public static getInstance(): BusinessCardService {
    if (!BusinessCardService.instance) {
      BusinessCardService.instance = new BusinessCardService();
    }
    return BusinessCardService.instance;
  }

  /**
   * Get the saved business card from Firestore
   */
  async getBusinessCard(userId: string): Promise<BusinessCard | null> {
    try {
      const businessCardRef = doc(db, this.COLLECTION_NAME, userId);
      const businessCardSnap = await getDoc(businessCardRef);

      if (businessCardSnap.exists()) {
        const data = businessCardSnap.data();
        return {
          id: businessCardSnap.id,
          ...data,
        } as BusinessCard;
      }
      return null;
    } catch (error) {
      console.error('Error loading business card:', error);
      return null;
    }
  }

  /**
   * Save business card to Firestore
   */
  async saveBusinessCard(userId: string, businessCard: BusinessCard): Promise<boolean> {
    try {
      const businessCardRef = doc(db, this.COLLECTION_NAME, userId);
      await setDoc(businessCardRef, {
        ...businessCard,
        userId,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error saving business card:', error);
      return false;
    }
  }

  /**
   * Update specific fields of the business card
   */
  async updateBusinessCard(userId: string, updates: Partial<BusinessCard>): Promise<boolean> {
    try {
      const businessCardRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(businessCardRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating business card:', error);
      return false;
    }
  }

  /**
   * Initialize business card with user profile data
   */
  async initializeWithUserProfile(userId: string, userProfile: { name?: string; email?: string; phone?: string }): Promise<BusinessCard> {
    try {
      const currentCard = await this.getBusinessCard(userId);
      const initializedCard: BusinessCard = {
        fullName: userProfile.name || currentCard?.fullName || '',
        about: currentCard?.about || '',
        company: currentCard?.company || '',
        jobTitle: currentCard?.jobTitle || '',
        email: userProfile.email || currentCard?.email || '',
        phone: userProfile.phone || currentCard?.phone || '',
        website: currentCard?.website || '',
        address: currentCard?.address || '',
        notes: currentCard?.notes || '',
      };

      await this.saveBusinessCard(userId, initializedCard);
      return initializedCard;
    } catch (error) {
      console.error('Error initializing business card:', error);
      throw error;
    }
  }

  /**
   * Clear business card from Firestore
   */
  async clearBusinessCard(userId: string): Promise<boolean> {
    try {
      const businessCardRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(businessCardRef);
      return true;
    } catch (error) {
      console.error('Error clearing business card:', error);
      return false;
    }
  }

  /**
   * Check if business card exists
   */
  async hasBusinessCard(userId: string): Promise<boolean> {
    try {
      const businessCard = await this.getBusinessCard(userId);
      return businessCard !== null;
    } catch (error) {
      console.error('Error checking business card existence:', error);
      return false;
    }
  }

  /**
   * Get business card with default values if none exists
   */
  async getBusinessCardWithDefaults(userId: string): Promise<BusinessCard> {
    try {
      const existingCard = await this.getBusinessCard(userId);
      if (existingCard) {
        return existingCard;
      }

      const defaultCard: BusinessCard = {
        fullName: '',
        about: '',
        company: '',
        jobTitle: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        notes: '',
      };

      await this.saveBusinessCard(userId, defaultCard);
      return defaultCard;
    } catch (error) {
      console.error('Error getting business card with defaults:', error);
      throw error;
    }
  }
}

export default BusinessCardService;