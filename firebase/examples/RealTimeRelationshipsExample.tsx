import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ScrollView, Alert } from 'react-native';
import { useRelationships } from '../hooks/useRelationships';
import { useAuth } from '../hooks/useAuth';
import type { Relationship, ContactMethod, ReminderFrequency } from '../types';

/**
 * Example component demonstrating real-time relationships updates
 * This shows how relationships data updates automatically across the app
 */
export default function RealTimeRelationshipsExample() {
  const { currentUser } = useAuth();
  const { 
    relationships, 
    isLoading, 
    error, 
    createRelationship, 
    updateRelationship, 
    deleteRelationship,
    updateLastContact 
  } = useRelationships();

  const [newContactName, setNewContactName] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  const handleCreateRelationship = async () => {
    if (!currentUser?.uid || !newContactName.trim()) return;

    try {
      const relationshipData = {
        contactId: `contact_${Date.now()}`,
        contactName: newContactName.trim(),
        lastContactDate: new Date().toISOString(),
        lastContactMethod: 'phone' as ContactMethod,
        reminderFrequency: 'month' as ReminderFrequency,
        nextReminderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        tags: ['example'],
        notes: 'Created from real-time example',
        familyInfo: {
          kids: '',
          siblings: '',
          spouse: '',
        },
      };

      await createRelationship(relationshipData);
      setNewContactName('');
      Alert.alert('Success', 'Relationship created! Watch it appear in real-time.');
    } catch (error) {
      Alert.alert('Error', 'Failed to create relationship');
    }
  };

  const handleUpdateRelationship = async (relationship: Relationship) => {
    if (!currentUser?.uid) return;

    try {
      const updates = {
        notes: `${relationship.notes} (Updated at ${new Date().toLocaleTimeString()})`,
      };

      await updateRelationship(relationship.id, updates);
      Alert.alert('Success', 'Relationship updated! Watch it change in real-time.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update relationship');
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    try {
      await deleteRelationship(relationshipId);
      Alert.alert('Success', 'Relationship deleted! Watch it disappear in real-time.');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete relationship');
    }
  };

  const handleUpdateLastContact = async (relationship: Relationship) => {
    try {
      await updateLastContact(
        relationship.id,
        new Date(),
        'email' as ContactMethod
      );
      Alert.alert('Success', 'Last contact updated! Watch the date change in real-time.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update last contact');
    }
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not signed in</Text>
        <Text style={styles.subtitle}>Relationships will update in real-time when you sign in</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Real-Time Relationships Example</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Relationship:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter contact name"
          value={newContactName}
          onChangeText={setNewContactName}
        />
        <Button 
          title="Create Relationship" 
          onPress={handleCreateRelationship}
          disabled={!newContactName.trim()}
        />
        <Text style={styles.note}>
          Watch the new relationship appear in the list below in real-time!
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Relationships ({relationships.length}):
        </Text>
        
        {isLoading ? (
          <Text>Loading relationships...</Text>
        ) : error ? (
          <Text style={styles.error}>Error: {error}</Text>
        ) : relationships.length === 0 ? (
          <Text style={styles.empty}>No relationships found. Create one above!</Text>
        ) : (
          relationships.map((relationship) => (
            <View key={relationship.id} style={styles.relationshipCard}>
              <Text style={styles.contactName}>{relationship.contactName}</Text>
              <Text style={styles.notes}>{relationship.notes}</Text>
              <Text style={styles.lastContact}>
                Last Contact: {new Date(relationship.lastContactDate).toLocaleDateString()}
              </Text>
              <Text style={styles.nextReminder}>
                Next Reminder: {relationship.nextReminderDate ? 
                  new Date(relationship.nextReminderDate).toLocaleDateString() : 'Never'
                }
              </Text>
              <Text style={styles.tags}>
                Tags: {relationship.tags.join(', ')}
              </Text>
              
              <View style={styles.buttonRow}>
                <Button 
                  title="Update" 
                  onPress={() => handleUpdateRelationship(relationship)}
                />
                <Button 
                  title="Update Contact" 
                  onPress={() => handleUpdateLastContact(relationship)}
                />
                <Button 
                  title="Delete" 
                  onPress={() => handleDeleteRelationship(relationship.id)}
                  color="red"
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-Time Features:</Text>
        <Text style={styles.feature}>✅ Create relationships and see them appear instantly</Text>
        <Text style={styles.feature}>✅ Update relationships and see changes immediately</Text>
        <Text style={styles.feature}>✅ Delete relationships and see them disappear instantly</Text>
        <Text style={styles.feature}>✅ Update last contact dates and see them change in real-time</Text>
        <Text style={styles.feature}>✅ All changes sync across multiple devices</Text>
      </View>
    </ScrollView>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  relationshipCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastContact: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  nextReminder: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  tags: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  error: {
    color: 'red',
    fontSize: 14,
  },
  empty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  feature: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});

