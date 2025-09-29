import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CreateEditRelationshipModal from '../components/CreateEditRelationshipModal';
import type { Relationship } from '../firebase/types';

export default function CreateEditRelationshipExample() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  const handleCreateRelationship = () => {
    setShowCreateModal(true);
  };

  const handleEditRelationship = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setShowEditModal(true);
  };

  const handleRelationshipSaved = (relationship: Relationship) => {
    console.log('Relationship saved:', relationship);
    // Handle the saved relationship (e.g., refresh the list, show success message)
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedRelationship(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create/Edit Relationship Modal Example</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCreateRelationship}
      >
        <Text style={styles.buttonText}>Create New Relationship</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.editButton]} 
        onPress={() => handleEditRelationship({
          id: 'example-id',
          contactId: 'contact-123',
          contactName: 'John Doe',
          lastContactDate: new Date().toISOString(),
          lastContactMethod: 'call',
          reminderFrequency: 'month',
          nextReminderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['client', 'important'],
          notes: 'This is an example relationship',
          familyInfo: {
            kids: '2 kids',
            siblings: '1 brother',
            spouse: 'Jane Doe'
          },
          contactData: {
            phoneNumbers: [{ number: '+1234567890', label: 'mobile' }],
            emails: [{ email: 'john@example.com', label: 'work' }],
            company: 'Example Corp',
            jobTitle: 'Software Engineer'
          }
        })}
      >
        <Text style={styles.buttonText}>Edit Example Relationship</Text>
      </TouchableOpacity>

      {/* Create Relationship Modal */}
      <CreateEditRelationshipModal
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        relationship={null} // null means we're creating
        onRelationshipSaved={handleRelationshipSaved}
      />

      {/* Edit Relationship Modal */}
      <CreateEditRelationshipModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        relationship={selectedRelationship} // existing relationship means we're editing
        onRelationshipSaved={handleRelationshipSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#111827',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
