import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  authService,
  type AuthCredentials,
  type RegisterCredentials,
} from '../services/AuthService';
import { useCreateUser } from './useUser';
import { userStore } from '../stores/userStore';
import type { User } from 'firebase/auth';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const createUserMutation = useCreateUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Set up real-time auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoadingUser(false);
      
      // Update userStore when auth state changes
      if (user) {
        // User is signed in - invalidate queries to refetch user data
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['user', user.uid] });
      } else {
        // User is signed out - clear user data
        userStore.clearUser();
        queryClient.clear();
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const signInMutation = useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      authService.signIn(credentials),
    // Auth state listener will handle query invalidation
  });

  const signUpMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      // First, create the Firebase Auth user
      const userCredential = await authService.signUp(credentials);
      
      // Then, create the user document in Firestore
      if (userCredential.user) {
        await createUserMutation.mutateAsync({
          userId: userCredential.user.uid,
          userData: {
            email: credentials.email,
            name: credentials.name,
            age: credentials.age,
            gender: credentials.gender,
            phone: credentials.phone,
          }
        });
      }
      
      return userCredential;
    },
    // Auth state listener will handle query invalidation
  });

  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    // Auth state listener will handle query invalidation
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authService.deleteAccount(),
    // Auth state listener will handle query invalidation
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
  });

  const reauthMutation = useMutation({
    mutationFn: (password: string) => authService.reauthenticate(password),
  });

  return {
    currentUser,
    isLoadingUser,
    signIn: signInMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    signInError: signInMutation.error,
    signUp: signUpMutation.mutateAsync,
    isSigningUp: signUpMutation.isPending,
    signUpError: signUpMutation.error,
    signOut: signOutMutation.mutateAsync,
    isSigningOut: signOutMutation.isPending,
    signOutError: signOutMutation.error,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeletingAccount: deleteAccountMutation.isPending,
    deleteAccountError: deleteAccountMutation.error,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    reauthenticate: reauthMutation.mutateAsync,
    isReauthenticating: reauthMutation.isPending,
    reauthenticateError: reauthMutation.error,
    // User document creation functionality
    createUser: createUserMutation.mutateAsync,
    isCreatingUser: createUserMutation.isPending,
    createUserError: createUserMutation.error,
  };
};
