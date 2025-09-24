import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';
import { db } from '../config';
import type { User } from '../types';

export interface CreateUserData {
  email: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  photoUrl?: string;
  settings?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}

export default class UsersService {
  static readonly COLLECTION_NAME: string = 'users';

  /**
   * Create a new user profile in Firestore
   */
  static async createUser(
    userId: string,
    userData: CreateUserData
  ): Promise<Partial<User>> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const userProfile = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userDocRef, userProfile);
    return { id: userId, ...userProfile } as Partial<User>;
  }

  /**
   * Query function to get a user profile by id
   */
  static async fetchUser(userId: string): Promise<User> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) throw new Error('User not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as User;
  }

  /**
   * Update a user's profile
   */
  static async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Subscribe to a user's profile document
   */
  static subscribeToUser(userId: string, callback: (user: User) => void) {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    return onSnapshot(
      userDocRef,
      (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          callback({ id: snap.id, ...data } as User);
        }
      }
    );
  }

  /**
   * Delete a user's profile document from Firestore.
   * This is best-effort and will throw if deletion fails.
   */
  static async deleteUser(userId: string): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    await deleteDoc(userDocRef);
  }
}
