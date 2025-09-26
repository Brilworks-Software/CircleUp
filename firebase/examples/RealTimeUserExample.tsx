import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { useUserStore } from '../hooks/useUserStore';
import { useUpdateUser } from '../hooks/useUser';

/**
 * Example component demonstrating real-time user data updates
 * This shows how user data updates automatically across the app
 */
export default function RealTimeUserExample() {
  const { currentUser, signOut } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(currentUser?.uid || '');
  const { user: storeUser, userName, userEmail } = useUserStore();
  const updateUserMutation = useUpdateUser();

  const handleUpdateName = async () => {
    if (!currentUser?.uid) return;
    
    const newName = `Updated ${Date.now()}`;
    await updateUserMutation.mutateAsync({
      userId: currentUser.uid,
      updates: { name: newName }
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not signed in</Text>
        <Text style={styles.subtitle}>User data will update in real-time when you sign in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Real-Time User Data Example</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firebase Auth User:</Text>
        <Text>UID: {currentUser.uid}</Text>
        <Text>Email: {currentUser.email}</Text>
        <Text>Last Sign In: {currentUser.metadata?.lastSignInTime}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile (from Firestore):</Text>
        {isLoadingProfile ? (
          <Text>Loading profile...</Text>
        ) : (
          <>
            <Text>Name: {userProfile?.name || 'Not set'}</Text>
            <Text>Phone: {userProfile?.phone || 'Not set'}</Text>
            <Text>Age: {userProfile?.age || 'Not set'}</Text>
            <Text>Gender: {userProfile?.gender || 'Not set'}</Text>
            <Text>Created: {userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}</Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Store (Global State):</Text>
        <Text>Name: {userName}</Text>
        <Text>Email: {userEmail}</Text>
        <Text>Store User ID: {storeUser?.id || 'Not set'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Update Name (Real-time)" 
          onPress={handleUpdateName}
          disabled={updateUserMutation.isPending}
        />
        <Text style={styles.note}>
          Watch how all three data sources update in real-time!
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
          color="red"
        />
        <Text style={styles.note}>
          All user data will be cleared when you sign out
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    marginVertical: 10,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

