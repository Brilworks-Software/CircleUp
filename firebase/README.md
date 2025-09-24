# Firebase Authentication Integration

This document explains how to use the updated authentication flow that separates concerns between authentication (`useAuth`) and user document management (`useUser`).

## Overview

The authentication system now follows a clean separation of concerns:

- **`useAuth`**: Handles Firebase Authentication (login, signup, logout)
- **`useUser`**: Manages user documents in Firestore (create, read, update user profiles)

## Key Features

### 1. Authentication with `useAuth`

The `useAuth` hook provides all authentication functionality:

```typescript
const {
  currentUser,           // Current Firebase Auth user
  isLoadingUser,        // Loading state for auth check
  signIn,              // Login function
  signUp,              // Signup function (creates both auth user and Firestore document)
  signOut,             // Logout function
  isSigningIn,         // Login loading state
  isSigningUp,         // Signup loading state
  signInError,         // Login error
  signUpError,         // Signup error
  // ... other auth methods
} = useAuth();
```

### 2. User Document Management with `useUser`

The `useUser` hook manages user profiles in Firestore:

```typescript
// Get user profile
const { data: userProfile, isLoading } = useUser(userId);

// Update user profile
const updateUserMutation = useUpdateUser();
await updateUserMutation.mutateAsync({
  userId: 'user123',
  updates: { name: 'New Name', phone: '+1234567890' }
});

// Create user profile (used internally by useAuth)
const createUserMutation = useCreateUser();
await createUserMutation.mutateAsync({
  userId: 'user123',
  userData: { name: 'John Doe', email: 'john@example.com' }
});
```

## Usage Examples

### Basic Login/Signup Flow

```typescript
import { useAuth } from '../firebase/hooks/useAuth';

function LoginScreen() {
  const { signIn, isSigningIn, signInError } = useAuth();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn({ email, password });
      // User is now authenticated and user document is available
    } catch (error) {
      console.error('Login failed:', signInError?.message);
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={() => handleLogin('user@example.com', 'password')}
      disabled={isSigningIn}
    >
      <Text>{isSigningIn ? 'Signing In...' : 'Sign In'}</Text>
    </TouchableOpacity>
  );
}
```

### Signup with User Profile Creation

```typescript
import { useAuth } from '../firebase/hooks/useAuth';

function SignupScreen() {
  const { signUp, isSigningUp, signUpError } = useAuth();
  
  const handleSignup = async (formData: {
    email: string;
    password: string;
    name: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    phone?: string;
  }) => {
    try {
      await signUp(formData);
      // This automatically:
      // 1. Creates Firebase Auth user
      // 2. Creates user document in Firestore with profile data
    } catch (error) {
      console.error('Signup failed:', signUpError?.message);
    }
  };
}
```

### Accessing User Profile Data

```typescript
import { useAuth } from '../firebase/hooks/useAuth';
import { useUser } from '../firebase/hooks/useUser';

function ProfileScreen() {
  const { currentUser } = useAuth();
  const { data: userProfile, isLoading } = useUser(currentUser?.uid || '');
  
  if (isLoading) return <Text>Loading...</Text>;
  if (!userProfile) return <Text>No profile data</Text>;
  
  return (
    <View>
      <Text>Name: {userProfile.name}</Text>
      <Text>Email: {userProfile.email}</Text>
      <Text>Phone: {userProfile.phone}</Text>
      <Text>Age: {userProfile.age}</Text>
      <Text>Gender: {userProfile.gender}</Text>
    </View>
  );
}
```

### Updating User Profile

```typescript
import { useUser } from '../firebase/hooks/useUser';

function EditProfileScreen() {
  const { currentUser } = useAuth();
  const updateUserMutation = useUpdateUser();
  
  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    
    try {
      await updateUserMutation.mutateAsync({
        userId: currentUser.uid,
        updates
      });
      // Profile updated successfully
    } catch (error) {
      console.error('Update failed:', error);
    }
  };
}
```

## Data Flow

### Signup Process

1. User fills out signup form with profile data
2. `useAuth.signUp()` is called with `RegisterCredentials`
3. Firebase Auth user is created
4. User document is automatically created in Firestore with profile data
5. User is redirected to main app

### Login Process

1. User enters email/password
2. `useAuth.signIn()` is called with `AuthCredentials`
3. Firebase Auth authenticates user
4. User document is fetched from Firestore (if exists)
5. User is redirected to main app

### Profile Management

1. Use `useUser(userId)` to fetch user profile
2. Use `useUpdateUser()` to modify profile data
3. Changes are automatically synced to Firestore and local state

## Type Definitions

### RegisterCredentials

```typescript
interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
}
```

### User Profile

```typescript
interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  createdAt: any;
  updatedAt?: any;
  settings?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}
```

## Error Handling

All authentication and user operations include proper error handling:

- Network errors are caught and displayed to users
- Firebase Auth errors are translated to user-friendly messages
- Optimistic updates are rolled back on failure
- Loading states prevent duplicate operations

## Best Practices

1. **Always check authentication state** before accessing user data
2. **Use loading states** to provide feedback during operations
3. **Handle errors gracefully** with user-friendly messages
4. **Validate form data** before submitting
5. **Use the provided hooks** instead of calling services directly
6. **Leverage optimistic updates** for better UX

## Example Component

See `firebase/examples/AuthExample.tsx` for a complete working example of the authentication flow.
