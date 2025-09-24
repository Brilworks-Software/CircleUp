import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
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
  orderBy,
} from '@react-native-firebase/firestore';
import { db } from '../config';
import type { Contact } from '../types';

export default class ContactsService {
  static getCollectionRef(userId: string) {
    return collection(db, `users/${userId}/contacts`);
  }

  static async createContact(
    userId: string,
    contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Contact> {
    const contactDocRef = doc(this.getCollectionRef(userId));
    const contact: Contact = {
      ...contactData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(contactDocRef, contact);
    return { id: contactDocRef.id, ...contact };
  }

  static async fetchContact(userId: string, contactId: string): Promise<Contact> {
    const contactDocRef = doc(this.getCollectionRef(userId), contactId);
    const snap = await getDoc(contactDocRef);
    if (!snap.exists()) throw new Error('Contact not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as Contact;
  }

  static async updateContact(
    userId: string,
    contactId: string,
    data: Partial<Contact>
  ): Promise<void> {
    const contactDocRef = doc(this.getCollectionRef(userId), contactId);
    await updateDoc(contactDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  static subscribeToContact(
    userId: string,
    contactId: string,
    callback: (contact: Contact) => void
  ) {
    const contactDocRef = doc(this.getCollectionRef(userId), contactId);
    return onSnapshot(
      contactDocRef,
      (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          callback({ id: snap.id, ...data } as Contact);
        }
      }
    );
  }

  static async deleteContact(userId: string, contactId: string): Promise<void> {
    const contactDocRef = doc(this.getCollectionRef(userId), contactId);
    await deleteDoc(contactDocRef);
  }

  /**
   * Fetch all contacts for a user (one-time fetch)
   */
  static async fetchContacts(userId: string): Promise<Contact[]> {
    const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const contacts: Contact[] = [];
    snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnap.data() || {};
      contacts.push({ id: docSnap.id, ...data } as Contact);
    });
    return contacts;
  }

  /**
   * Subscribe to all contacts for a user (real-time updates)
   */
  static subscribeToContacts(
    userId: string,
    callback: (contacts: Contact[]) => void
  ) {
    const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snapshot => {
      const contacts: Contact[] = [];
      snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data() || {};
        contacts.push({ id: docSnap.id, ...data } as Contact);
      });
      callback(contacts);
    });
  }
}
