import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';

/**
 * Example component demonstrating how to use the updated authentication flow
 * with useAuth for login/signup and useUser for user document management
 */
export const AuthExample: React.FC = () => {
  const { 
    currentUser, 
    signIn, 
    signUp, 
    signOut, 
    isSigningIn, 
    isSigningUp, 
    signInError, 
    signUpError 
  } = useAuth();
  
  // Use useUser hook to manage user document when user is authenticated
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(currentUser?.uid || '');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: 'other' as 'male' | 'female' | 'other',
    phone: '',
  });

  const handleLogin = async () => {
    try {
      await signIn({
        email: loginForm.email,
        password: loginForm.password,
      });
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error) {
      Alert.alert('Login Failed', signInError?.message || 'Login failed');
    }
  };

  const handleSignup = async () => {
    try {
      await signUp({
        email: signupForm.email,
        password: signupForm.password,
        name: signupForm.name,
        age: signupForm.age ? parseInt(signupForm.age) : undefined,
        gender: signupForm.gender,
        phone: signupForm.phone,
      });
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      Alert.alert('Signup Failed', signUpError?.message || 'Signup failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>You are logged in as: {currentUser.email}</Text>
        
        {isLoadingProfile ? (
          <Text>Loading profile...</Text>
        ) : userProfile ? (
          <View style={styles.profileContainer}>
            <Text style={styles.profileText}>Name: {userProfile.name}</Text>
            <Text style={styles.profileText}>Email: {userProfile.email}</Text>
            {userProfile.phone && <Text style={styles.profileText}>Phone: {userProfile.phone}</Text>}
          </View>
        ) : (
          <Text>No profile data available</Text>
        )}
        
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Authentication Example</Text>
      
      {/* Login Form */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={loginForm.email}
          onChangeText={(text) => setLoginForm(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={loginForm.password}
          onChangeText={(text) => setLoginForm(prev => ({ ...prev, password: text }))}
          secureTextEntry
        />
        <TouchableOpacity 
          style={[styles.button, isSigningIn && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isSigningIn}
        >
          <Text style={styles.buttonText}>
            {isSigningIn ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Signup Form */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Sign Up</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={signupForm.name}
          onChangeText={(text) => setSignupForm(prev => ({ ...prev, name: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={signupForm.email}
          onChangeText={(text) => setSignupForm(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={signupForm.phone}
          onChangeText={(text) => setSignupForm(prev => ({ ...prev, phone: text }))}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={signupForm.age}
          onChangeText={(text) => setSignupForm(prev => ({ ...prev, age: text }))}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={signupForm.password}
          onChangeText={(text) => setSignupForm(prev => ({ ...prev, password: text }))}
          secureTextEntry
        />
        <TouchableOpacity 
          style={[styles.button, isSigningUp && styles.buttonDisabled]} 
          onPress={handleSignup}
          disabled={isSigningUp}
        >
          <Text style={styles.buttonText}>
            {isSigningUp ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  profileText: {
    fontSize: 16,
    marginBottom: 8,
  },
});
