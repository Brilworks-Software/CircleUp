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
import type { Interaction } from '../types';

export default class InteractionsService {
  static getCollectionRef(userId: string, contactId: string) {
    return collection(db, `users/${userId}/contacts/${contactId}/interactions`);
  }

  static async createInteraction(
    userId: string,
    contactId: string,
    data: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Interaction> {
    const docRef = doc(this.getCollectionRef(userId, contactId));
    const interaction: Interaction = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, interaction);
    return { id: docRef.id, ...interaction };
  }

  static async fetchInteraction(
    userId: string,
    contactId: string,
    interactionId: string
  ): Promise<Interaction> {
    const docRef = doc(this.getCollectionRef(userId, contactId), interactionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Interaction not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as Interaction;
  }

  static async updateInteraction(
    userId: string,
    contactId: string,
    interactionId: string,
    updates: Partial<Interaction>
  ): Promise<void> {
    const docRef = doc(this.getCollectionRef(userId, contactId), interactionId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
  }

  static async deleteInteraction(
    userId: string,
    contactId: string,
    interactionId: string
  ): Promise<void> {
    const docRef = doc(this.getCollectionRef(userId, contactId), interactionId);
    await deleteDoc(docRef);
  }

  static async fetchInteractions(
    userId: string,
    contactId: string
  ): Promise<Interaction[]> {
    const q = query(
      this.getCollectionRef(userId, contactId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    const interactions: Interaction[] = [];
    snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnap.data() || {};
      interactions.push({ id: docSnap.id, ...data } as Interaction);
    });
    return interactions;
  }

  static subscribeToInteractions(
    userId: string,
    contactId: string,
    callback: (interactions: Interaction[]) => void
  ) {
    const q = query(this.getCollectionRef(userId, contactId), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const interactions: Interaction[] = [];
      snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data() || {};
        interactions.push({ id: docSnap.id, ...data } as Interaction);
      });
      callback(interactions);
    });
  }
}
