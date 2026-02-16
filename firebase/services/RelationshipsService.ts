import type { DocumentSnapshot, QuerySnapshot, Unsubscribe } from 'firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config';
import type { Relationship, LastContactOption, ContactMethod, ReminderFrequency } from '../types';

export interface CreateRelationshipData {
  contactId: string;
  contactName: string;
  lastContactDate: string;
  lastContactMethod: string;
  reminderFrequency: string;
  nextReminderDate: string;
  tags: string[];
  notes: string;
  familyInfo: {
    kids: string;
    siblings: string;
    spouse: string;
  };
  contactData?: {
    phoneNumbers?: { number: string; label?: string }[];
    emails?: { email: string; label?: string }[];
    website?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    birthday?: string;
    notes?: string;
  };
}

export interface UpdateRelationshipData {
  contactId?: string;
  contactName?: string;
  lastContactDate?: string;
  lastContactMethod?: string;
  reminderFrequency?: string;
  nextReminderDate?: string;
  tags?: string[];
  notes?: string;
  familyInfo?: {
    kids: string;
    siblings: string;
    spouse: string;
  };
  contactData?: {
    phoneNumbers?: { number: string; label?: string }[];
    emails?: { email: string; label?: string }[];
    website?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    birthday?: string;
    notes?: string;
  };
}

class RelationshipsService {
  private static instance: RelationshipsService;
  private readonly COLLECTION_NAME = 'relationships';

  private constructor() {}

  public static getInstance(): RelationshipsService {
    if (!RelationshipsService.instance) {
      RelationshipsService.instance = new RelationshipsService();
    }
    return RelationshipsService.instance;
  }

  /**
   * Get all relationships for a user
   */
  async getRelationships(userId: string): Promise<Relationship[]> {
    try {
      const relationshipsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        relationshipsRef,
        where('userId', '==', userId),
        orderBy('contactName', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const relationships: Relationship[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        relationships.push({
          ...data,
          id: doc.id,
        } as Relationship);
      });
      

      return relationships;
    } catch (error) {
      console.error('Error getting relationships:', error);
      return [];
    }
  }

  /**
   * Get a relationship by ID
   */
  async getRelationshipById(userId: string, relationshipId: string): Promise<Relationship | null> {
    try {
      const relationshipRef = doc(db, this.COLLECTION_NAME, relationshipId);
      const relationshipSnap = await getDoc(relationshipRef);

      if (relationshipSnap.exists()) {
        const data = relationshipSnap.data();
        if (data.userId === userId) {
          return {
            ...data,
            id: relationshipSnap.id,
          } as Relationship;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting relationship by ID:', error);
      return null;
    }
  }

  /**
   * Get a relationship by contact ID
   */
  async getRelationshipByContactId(userId: string, contactId: string): Promise<Relationship | null> {
    try {
      const relationshipsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        relationshipsRef,
        where('userId', '==', userId),
        where('contactId', '==', contactId)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        } as Relationship;
      }
      return null;
    } catch (error) {
      console.error('Error getting relationship by contact ID:', error);
      return null;
    }
  }

  /**
   * Create a new relationship
   */
  async createRelationship(userId: string, relationshipData: CreateRelationshipData): Promise<Relationship> {
    try {
      const relationshipRef = doc(collection(db, this.COLLECTION_NAME));
      const relationship: Relationship = {
        ...relationshipData,
        id: relationshipRef.id,
      };

      await setDoc(relationshipRef, {
        ...relationship,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return relationship;
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
  }

  /**
   * Update a relationship
   */
  async updateRelationship(userId: string, relationshipId: string, updates: UpdateRelationshipData): Promise<boolean> {
    try {
      const relationshipRef = doc(db, this.COLLECTION_NAME, relationshipId);
      
      // Verify the relationship belongs to the user
      const relationshipSnap = await getDoc(relationshipRef);
      if (!relationshipSnap.exists() || relationshipSnap.data().userId !== userId) {
        return false;
      }

      await updateDoc(relationshipRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating relationship:', error);
      return false;
    }
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(userId: string, relationshipId: string): Promise<boolean> {
    try {
      const relationshipRef = doc(db, this.COLLECTION_NAME, relationshipId);
      
      // Verify the relationship belongs to the user
      const relationshipSnap = await getDoc(relationshipRef);
      if (!relationshipSnap.exists() || relationshipSnap.data().userId !== userId) {
        return false;
      }

      await deleteDoc(relationshipRef);
      return true;
    } catch (error) {
      console.error('Error deleting relationship:', error);
      return false;
    }
  }

  /**
   * Check if a relationship exists for a contact
   */
  async hasRelationshipForContact(userId: string, contactId: string): Promise<boolean> {
    try {
      const relationship = await this.getRelationshipByContactId(userId, contactId);
      return relationship !== null;
    } catch (error) {
      console.error('Error checking relationship existence:', error);
      return false;
    }
  }

  /**
   * Get relationships count
   */
  async getRelationshipsCount(userId: string): Promise<number> {
    try {
      const relationships = await this.getRelationships(userId);
      return relationships.length;
    } catch (error) {
      console.error('Error getting relationships count:', error);
      return 0;
    }
  }

  /**
   * Get relationships by tag
   */
  async getRelationshipsByTag(userId: string, tag: string): Promise<Relationship[]> {
    try {
      const relationships = await this.getRelationships(userId);
      return relationships.filter(r => r.tags.includes(tag));
    } catch (error) {
      console.error('Error getting relationships by tag:', error);
      return [];
    }
  }

  /**
   * Get all unique tags
   */
  async getAllTags(userId: string): Promise<string[]> {
    try {
      const relationships = await this.getRelationships(userId);
      const allTags = relationships.flatMap(r => r.tags);
      return [...new Set(allTags)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting all tags:', error);
      return [];
    }
  }

  /**
   * Get relationships needing follow-up
   */
  async getRelationshipsNeedingFollowUp(userId: string): Promise<Relationship[]> {
    try {
      const relationships = await this.getRelationships(userId);
      const now = new Date();
      
      return relationships.filter(r => {
        if (!r.nextReminderDate) return false;
        const nextReminderDate = new Date(r.nextReminderDate);
        return nextReminderDate <= now;
      });
    } catch (error) {
      console.error('Error getting relationships needing follow-up:', error);
      return [];
    }
  }

  /**
   * Update last contact information
   */
  async updateLastContact(userId: string, relationshipId: string, lastContactDate: Date, contactMethod: ContactMethod): Promise<boolean> {
    try {
      const relationship = await this.getRelationshipById(userId, relationshipId);
      if (!relationship) {
        return false;
      }

      const nextReminderDate = this.calculateNextReminderDate(lastContactDate, relationship.reminderFrequency as ReminderFrequency);

      return await this.updateRelationship(userId, relationshipId, {
        lastContactDate: lastContactDate.toISOString(),
        lastContactMethod: contactMethod,
        nextReminderDate,
      });
    } catch (error) {
      console.error('Error updating last contact:', error);
      return false;
    }
  }

  /**
   * Search relationships
   */
  async searchRelationships(userId: string, query: string): Promise<Relationship[]> {
    try {
      const relationships = await this.getRelationships(userId);
      const lowercaseQuery = query.toLowerCase();

      return relationships.filter(r => {
        // Search in basic relationship data
        const basicMatch = r.contactName.toLowerCase().includes(lowercaseQuery) ||
          r.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
          r.notes.toLowerCase().includes(lowercaseQuery);
        
        // Search in contact data if available
        const contactDataMatch = r.contactData ? (
          r.contactData.company?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.jobTitle?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.website?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.linkedin?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.twitter?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.instagram?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.facebook?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.address?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.notes?.toLowerCase().includes(lowercaseQuery) ||
          r.contactData.emails?.some(email => email.email.toLowerCase().includes(lowercaseQuery)) ||
          r.contactData.phoneNumbers?.some(phone => phone.number.includes(lowercaseQuery))
        ) : false;
        
        return basicMatch || contactDataMatch;
      });
    } catch (error) {
      console.error('Error searching relationships:', error);
      return [];
    }
  }

  /**
   * Clear all relationships
   */
  async clearAllRelationships(userId: string): Promise<boolean> {
    try {
      const relationships = await this.getRelationships(userId);
      const deletePromises = relationships.map(relationship => {
        const relationshipRef = doc(db, this.COLLECTION_NAME, relationship.id);
        return deleteDoc(relationshipRef);
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error clearing all relationships:', error);
      return false;
    }
  }

  /**
   * Calculate next reminder date based on frequency
   */
  calculateNextReminderDate(lastContactDate: Date, frequency: ReminderFrequency): string {
    if (frequency === 'never') return '';

    const nextDate = new Date(lastContactDate);

    switch (frequency) {
      case 'week':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case '3months':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case '6months':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
    }

    return nextDate.toISOString();
  }

  /**
   * Get last contact date from option
   */
  getLastContactDate(option: LastContactOption, customDate?: string): Date {
    const now = new Date();
    
    switch (option) {
      case 'today':
        return now;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      case '3months':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return threeMonthsAgo;
      case '6months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return sixMonthsAgo;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return yearAgo;
      case 'custom':
        return customDate ? new Date(customDate) : now;
      default:
        return now;
    }
  }

  /**
   * Get last contact option from date
   */
  getLastContactOptionFromDate(dateString: string): LastContactOption {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 7) return 'week';
    if (diffDays <= 30) return 'month';
    if (diffDays <= 90) return '3months';
    if (diffDays <= 180) return '6months';
    if (diffDays <= 365) return 'year';
    return 'custom';
  }

  /**
   * Listen to relationships changes
   */
  onRelationshipsSnapshot(userId: string, callback: (relationships: Relationship[]) => void): () => void {
    const relationshipsRef = collection(db, this.COLLECTION_NAME);
    const q = query(
      relationshipsRef,
      where('userId', '==', userId),
      orderBy('contactName', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const relationships: Relationship[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        relationships.push({
          ...data,
          id: doc.id,
        } as Relationship);
      });
      callback(relationships);
    });
  }
}

export default RelationshipsService;