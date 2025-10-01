import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    UserCredential,
  } from 'firebase/auth';
  import { auth } from '../config';
  import UsersService from './UserService';
  
  export interface AuthCredentials {
    email: string;
    password: string;
  }
  
export interface RegisterCredentials extends AuthCredentials {
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
}
  
  export interface AuthService {
    signIn: (
      credentials: AuthCredentials
    ) => Promise<UserCredential>;
    signUp: (
      credentials: RegisterCredentials
    ) => Promise<UserCredential>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    getCurrentUser: () => User | null;
    deleteAccount: () => Promise<void>;
    reauthenticate: (password: string) => Promise<void>;
    onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  }
  
  class FirebaseAuthService implements AuthService {
    async signIn({ email, password }: AuthCredentials) {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        return userCredential;
      } catch (error) {
        console.log('Error signing in:', error);
        throw this.handleAuthError(error);
      }
    }
  
  async signUp({ email, password }: RegisterCredentials) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      return userCredential;
    } catch (error) {
      console.log('Error signing up:', error);
      throw this.handleAuthError(error);
    }
  }
  
    async signOut() {
      try {
        
        await signOut(auth);
      } catch (error) {
        throw this.handleAuthError(error);
      }
    }
  
    async resetPassword(email: string) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        throw this.handleAuthError(error);
      }
    }
  
    async deleteAccount() {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');
  
  
        // Finally delete Firebase Auth user
        await user.delete();
      } catch (error) {
        console.log('Error deleting account:', error);
        // If Firebase asks for recent login, rethrow the raw error so UI can trigger re-auth flow
        if (error && (error as any).code === 'auth/requires-recent-login') {
          throw error;
        }
        throw this.handleAuthError(error);
      }
    }
  
    async reauthenticate(password: string) {
      try {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('No authenticated user');
  
        // Use signInWithEmailAndPassword to refresh credentials for the current user
        await signInWithEmailAndPassword(auth, user.email, password);
      } catch (error) {
        throw this.handleAuthError(error);
      }
    }
  
    getCurrentUser() {
      return auth.currentUser;
    }

    onAuthStateChanged(callback: (user: User | null) => void) {
      return onAuthStateChanged(auth, callback);
    }
  
    private handleAuthError(error: any): Error {
      if (error.code === 'auth/email-already-in-use') {
        return new Error('Email address is already in use');
      }
      if (error.code === 'auth/invalid-email') {
        return new Error('Invalid email address');
      }
      if (error.code === 'auth/operation-not-allowed') {
        return new Error('Operation not allowed');
      }
      if (error.code === 'auth/weak-password') {
        return new Error('Please enter a stronger password');
      }
      if (error.code === 'auth/user-disabled') {
        return new Error('User account has been disabled');
      }
      if (error.code === 'auth/user-not-found') {
        return new Error('User not found');
      }
      if (error.code === 'auth/wrong-password') {
        return new Error('Invalid password');
      }
      if (error.code === 'auth/requires-recent-login') {
        return new Error('Please re-authenticate to perform this action');
      }
      if (error.code === 'auth/invalid-credential') {
        return new Error('Invalid password');
      }
      return new Error('Authentication failed');
    }
  }
  
  export const authService = new FirebaseAuthService();
  