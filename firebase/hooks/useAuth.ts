import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authService,
  type AuthCredentials,
  type RegisterCredentials,
} from '../services/AuthService';
import { useCreateUser } from './useUser';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const createUserMutation = useCreateUser();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: Infinity,
  });

  const signInMutation = useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      authService.signIn(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authService.deleteAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
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
