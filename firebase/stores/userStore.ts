import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable } from 'mobx';
import { User } from '../types';

class UserStore {
  user: User | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.initializeUser();
  }

  private async initializeUser() {
    try {
      this.setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');

      if (userData) {
        this.user = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      this.setError('Failed to load user data');
    } finally {
      this.setLoading(false);
    }
  }

  setUser(user: User | null) {
    this.user = user;
    this.error = null;

    if (user) {
      this.persistUser(user);
    } else {
      this.clearPersistedUser();
    }
  }

  updateUser(updates: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...updates };
      this.persistUser(this.user);
    }
  }

  clearUser() {
    this.user = null;
    this.error = null;
    this.clearPersistedUser();
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  private async persistUser(user: User) {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to persist user data:', error);
      this.setError('Failed to save user data');
    }
  }

  private async clearPersistedUser() {
    try {
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Computed values
  get isUserLoaded() {
    return !this.isLoading && this.user !== null;
  }

  get userName() {
    return this.user?.name || '';
  }

  get userEmail() {
    return this.user?.email || '';
  }
}

export const userStore = new UserStore();
