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
import type { Contact, ContactInteraction } from '../types';
import * as ExpoContacts from 'expo-contacts';
import { Platform } from 'react-native';

export interface CreateContactData {
  name: string;
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
}

export interface UpdateContactData {
  name?: string;
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
}

export interface CreateInteractionData {
  contactId: string;
  type: string;
  notes?: string;
}

class ContactsService {
  private static instance: ContactsService;
  private readonly CONTACTS_COLLECTION = 'contacts';
  private readonly INTERACTIONS_COLLECTION = 'contact_interactions';

  private constructor() {}

  public static getInstance(): ContactsService {
    if (!ContactsService.instance) {
      ContactsService.instance = new ContactsService();
    }
    return ContactsService.instance;
  }

  /**
   * Request contacts permission
   */
  async requestContactsPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // For web, skip permission request and return false
        return false;
      }
      
      const { status } = await ExpoContacts.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Get contacts permission status
   */
  async getContactsPermissionStatus(): Promise<ExpoContacts.PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        // For web, return denied status
        return ExpoContacts.PermissionStatus.DENIED;
      }
      
      const { status } = await ExpoContacts.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting contacts permission status:', error);
      return ExpoContacts.PermissionStatus.UNDETERMINED;
    }
  }

  /**
   * Import contacts from device
   */
  async importContacts(userId: string): Promise<Contact[]> {
    try {
      if (Platform.OS === 'web') {
        // For web, return empty array as contacts cannot be imported
        return [];
      }
      
      const { status } = await ExpoContacts.getPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Contacts permission not granted');
      }

      const { data } = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.PhoneNumbers, ExpoContacts.Fields.Emails],
      });

      const formattedContacts: Contact[] = data.map(c => ({
        id: c.id || Math.random().toString(36).substring(7),
        name: c.name || 'Unknown Contact',
        phoneNumbers: c.phoneNumbers?.map(p => ({ number: p.number || '' })),
        emails: c.emails?.map(e => ({ email: e.email || '' })),
      }));

      // Save contacts to Firestore
      const batch = [];
      for (const contact of formattedContacts) {
        const contactRef = doc(collection(db, this.CONTACTS_COLLECTION));
        batch.push(setDoc(contactRef, {
          ...contact,
          id: contactRef.id,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
      }

      await Promise.all(batch);
      return formattedContacts;
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw error;
    }
  }

  /**
   * Get all contacts for a user
   */
  async getContacts(userId: string): Promise<Contact[]> {
    try {
      const contactsRef = collection(db, this.CONTACTS_COLLECTION);
      const q = query(
        contactsRef,
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const contacts: Contact[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contacts.push({
          id: doc.id,
          ...data,
        } as Contact);
      });

      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  /**
   * Get a contact by ID
   */
  async getContactById(userId: string, contactId: string): Promise<Contact | null> {
    try {
      const contactRef = doc(db, this.CONTACTS_COLLECTION, contactId);
      const contactSnap = await getDoc(contactRef);

      if (contactSnap.exists()) {
        const data = contactSnap.data();
        if (data.userId === userId) {
          return {
            id: contactSnap.id,
            ...data,
          } as Contact;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting contact by ID:', error);
      return null;
    }
  }

  /**
   * Search contacts by name, phone, or email
   */
  async searchContacts(userId: string, searchQuery: string): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts(userId);
      const lowercaseQuery = searchQuery.toLowerCase();

      return contacts.filter(contact =>
        contact.name.toLowerCase().includes(lowercaseQuery) ||
        (contact.phoneNumbers && contact.phoneNumbers.some(phone => 
          phone.number.includes(searchQuery)
        )) ||
        (contact.emails && contact.emails.some(email => 
          email.email.toLowerCase().includes(lowercaseQuery)
        ))
      );
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Create a new contact
   */
  async createContact(userId: string, contactData: CreateContactData): Promise<Contact> {
    try {
      const contactRef = doc(collection(db, this.CONTACTS_COLLECTION));
      const contact: Contact = {
        id: contactRef.id,
        name: contactData.name,
        phoneNumbers: contactData.phoneNumbers || [],
        emails: contactData.emails || [],
        website: contactData.website || '',
        linkedin: contactData.linkedin || '',
        twitter: contactData.twitter || '',
        instagram: contactData.instagram || '',
        facebook: contactData.facebook || '',
        company: contactData.company || '',
        jobTitle: contactData.jobTitle || '',
        address: contactData.address || '',
        birthday: contactData.birthday || '',
        notes: contactData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(contactRef, {
        ...contact,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return contact;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update a contact
   */
  async updateContact(userId: string, contactId: string, updateData: UpdateContactData): Promise<boolean> {
    try {
      const contactRef = doc(db, this.CONTACTS_COLLECTION, contactId);
      
      // Verify the contact belongs to the user
      const contactSnap = await getDoc(contactRef);
      if (!contactSnap.exists() || contactSnap.data().userId !== userId) {
        return false;
      }

      await updateDoc(contactRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  /**
   * Delete a contact
   */
  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    try {
      const contactRef = doc(db, this.CONTACTS_COLLECTION, contactId);
      
      // Verify the contact belongs to the user
      const contactSnap = await getDoc(contactRef);
      if (!contactSnap.exists() || contactSnap.data().userId !== userId) {
        return false;
      }

      await deleteDoc(contactRef);
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  /**
   * Get contacts count
   */
  async getContactsCount(userId: string): Promise<number> {
    try {
      const contacts = await this.getContacts(userId);
      return contacts.length;
    } catch (error) {
      console.error('Error getting contacts count:', error);
      return 0;
    }
  }

  /**
   * Create a contact interaction
   */
  async recordInteraction(userId: string, contactId: string, type: string, notes?: string): Promise<ContactInteraction> {
    try {
      const interactionRef = doc(collection(db, this.INTERACTIONS_COLLECTION));
      const interaction: ContactInteraction = {
        id: interactionRef.id,
        contactId,
        date: new Date().toISOString(),
        type,
        notes,
      };

      await setDoc(interactionRef, {
        ...interaction,
        userId,
        createdAt: serverTimestamp(),
      });

      return interaction;
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  }

  /**
   * Get all interactions for a user
   */
  async getContactInteractions(userId: string): Promise<ContactInteraction[]> {
    try {
      const interactionsRef = collection(db, this.INTERACTIONS_COLLECTION);
      const q = query(
        interactionsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const interactions: ContactInteraction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        interactions.push({
          id: doc.id,
          ...data,
        } as ContactInteraction);
      });

      return interactions;
    } catch (error) {
      console.error('Error getting contact interactions:', error);
      return [];
    }
  }

  /**
   * Get interactions for a specific contact
   */
  async getContactInteractionsById(userId: string, contactId: string): Promise<ContactInteraction[]> {
    try {
      const interactionsRef = collection(db, this.INTERACTIONS_COLLECTION);
      const q = query(
        interactionsRef,
        where('userId', '==', userId),
        where('contactId', '==', contactId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const interactions: ContactInteraction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        interactions.push({
          id: doc.id,
          ...data,
        } as ContactInteraction);
      });

      return interactions;
    } catch (error) {
      console.error('Error getting contact interactions by ID:', error);
      return [];
    }
  }

  /**
   * Get last interaction for a contact
   */
  async getLastInteraction(userId: string, contactId: string): Promise<ContactInteraction | null> {
    try {
      const interactions = await this.getContactInteractionsById(userId, contactId);
      return interactions[0] || null;
    } catch (error) {
      console.error('Error getting last interaction:', error);
      return null;
    }
  }

  /**
   * Get interactions count
   */
  async getInteractionsCount(userId: string): Promise<number> {
    try {
      const interactions = await this.getContactInteractions(userId);
      return interactions.length;
    } catch (error) {
      console.error('Error getting interactions count:', error);
      return 0;
    }
  }

  /**
   * Get contacts with their last interaction
   */
  async getContactsWithLastInteraction(userId: string): Promise<(Contact & { lastInteraction?: ContactInteraction })[]> {
    try {
      const [contacts, interactions] = await Promise.all([
        this.getContacts(userId),
        this.getContactInteractions(userId),
      ]);

      return contacts.map(contact => {
        const contactInteractions = interactions.filter(i => i.contactId === contact.id);
        const lastInteraction = contactInteractions[0] || null;
        
        return {
          ...contact,
          lastInteraction,
        };
      });
    } catch (error) {
      console.error('Error getting contacts with last interaction:', error);
      return [];
    }
  }

  /**
   * Delete an interaction
   */
  async deleteInteraction(userId: string, interactionId: string): Promise<boolean> {
    try {
      const interactionRef = doc(db, this.INTERACTIONS_COLLECTION, interactionId);
      
      // Verify the interaction belongs to the user
      const interactionSnap = await getDoc(interactionRef);
      if (!interactionSnap.exists() || interactionSnap.data().userId !== userId) {
        return false;
      }

      await deleteDoc(interactionRef);
      return true;
    } catch (error) {
      console.error('Error deleting interaction:', error);
      return false;
    }
  }

  /**
   * Clear all contacts and interactions
   */
  async clearAllData(userId: string): Promise<boolean> {
    try {
      // Get all contacts and interactions for the user
      const [contacts, interactions] = await Promise.all([
        this.getContacts(userId),
        this.getContactInteractions(userId),
      ]);

      // Delete all interactions
      const deleteInteractionPromises = interactions.map(interaction =>
        this.deleteInteraction(userId, interaction.id)
      );

      // Delete all contacts
      const deleteContactPromises = contacts.map(contact => {
        const contactRef = doc(db, this.CONTACTS_COLLECTION, contact.id);
        return deleteDoc(contactRef);
      });

      await Promise.all([...deleteInteractionPromises, ...deleteContactPromises]);
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  /**
   * Listen to contacts changes
   */
  onContactsSnapshot(userId: string, callback: (contacts: Contact[]) => void): () => void {
    const contactsRef = collection(db, this.CONTACTS_COLLECTION);
    const q = query(
      contactsRef,
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const contacts: Contact[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contacts.push({
          id: doc.id,
          ...data,
        } as Contact);
      });
      callback(contacts);
    });
  }

  /**
   * Listen to interactions changes
   */
  onInteractionsSnapshot(userId: string, callback: (interactions: ContactInteraction[]) => void): () => void {
    const interactionsRef = collection(db, this.INTERACTIONS_COLLECTION);
    const q = query(
      interactionsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const interactions: ContactInteraction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        interactions.push({
          id: doc.id,
          ...data,
        } as ContactInteraction);
      });
      callback(interactions);
    });
  }
}

export default ContactsService;