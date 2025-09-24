import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { db } from '../config';
import type { Reminder } from '../types';

export default class RemindersService {
  static getCollectionRef(userId: string) {
    return collection(db, `users/${userId}/reminders`);
  }

  static async createReminder(
    userId: string,
    data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Reminder> {
    const docRef = doc(this.getCollectionRef(userId));
    const reminder: Reminder = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, reminder);
    return { id: docRef.id, ...reminder };
  }

  static async fetchReminder(userId: string, reminderId: string): Promise<Reminder> {
    const docRef = doc(this.getCollectionRef(userId), reminderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Reminder not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as Reminder;
  }

  static async updateReminder(
    userId: string,
    reminderId: string,
    updates: Partial<Reminder>
  ): Promise<void> {
    const docRef = doc(this.getCollectionRef(userId), reminderId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
  }

  static async deleteReminder(userId: string, reminderId: string): Promise<void> {
    const docRef = doc(this.getCollectionRef(userId), reminderId);
    await deleteDoc(docRef);
  }

  static async fetchReminders(userId: string): Promise<Reminder[]> {
    const q = query(this.getCollectionRef(userId), orderBy('dueDate', 'asc'));
    const snap = await getDocs(q);
    const reminders: Reminder[] = [];
    snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnap.data() || {};
      reminders.push({ id: docSnap.id, ...data } as Reminder);
    });
    return reminders;
  }

  static subscribeToReminders(
    userId: string,
    callback: (reminders: Reminder[]) => void
  ) {
    const q = query(this.getCollectionRef(userId), orderBy('dueDate', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const reminders: Reminder[] = [];
      snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data() || {};
        reminders.push({ id: docSnap.id, ...data } as Reminder);
      });
      callback(reminders);
    });
  }
}
