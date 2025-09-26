import { useEffect, useState } from 'react';
import { userStore } from '../stores/userStore';
import type { User } from '../types';

/**
 * Hook to access the userStore for real-time user data
 * This provides reactive access to the global user state
 */
export const useUserStore = () => {
  const [user, setUser] = useState<User | null>(userStore.user);
  const [isLoading, setIsLoading] = useState(userStore.isLoading);
  const [error, setError] = useState<string | null>(userStore.error);

  useEffect(() => {
    // Subscribe to userStore changes
    const updateUser = () => {
      setUser(userStore.user);
      setIsLoading(userStore.isLoading);
      setError(userStore.error);
    };

    // Initial update
    updateUser();

    // Set up a simple polling mechanism for real-time updates
    // This ensures the component re-renders when userStore changes
    const interval = setInterval(updateUser, 50); // Check every 50ms for responsiveness

    return () => clearInterval(interval);
  }, []);

  return {
    user,
    isLoading,
    error,
    isUserLoaded: userStore.isUserLoaded,
    userName: userStore.userName,
    userEmail: userStore.userEmail,
  };
};
