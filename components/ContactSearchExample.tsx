import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import ContactSearchInput from './ContactSearchInput';

interface ContactSearchExampleProps {
  onContactSelected?: (contact: { id: string; name: string }) => void;
}

export default function ContactSearchExample({ 
  onContactSelected 
}: ContactSearchExampleProps) {
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleContactSelect = (contact: { id: string; name: string }) => {
    setSelectedContact(contact);
    setValidationError('');
    onContactSelected?.(contact);
    
    Alert.alert(
      'Contact Selected',
      `You selected: ${contact.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const handleValidate = () => {
    if (!selectedContact && !searchQuery.trim()) {
      setValidationError('Please select a contact or enter a contact name');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (handleValidate()) {
      const contactName = selectedContact?.name || searchQuery.trim();
      Alert.alert(
        'Success',
        `Processing contact: ${contactName}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleClear = () => {
    setSelectedContact(null);
    setSearchQuery('');
    setValidationError('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Contact Search Example</Text>
        <Text style={styles.description}>
          This example demonstrates how to use the ContactSearchInput component.
          It follows the same pattern as the AddActivityModal contact search.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Usage</Text>
          <ContactSearchInput
            onContactSelect={handleContactSelect}
            placeholder="Search for a contact..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            error={validationError}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With Search Icon</Text>
          <ContactSearchInput
            onContactSelect={handleContactSelect}
            placeholder="Search with icon..."
            showSearchIcon={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disabled State</Text>
          <ContactSearchInput
            onContactSelect={handleContactSelect}
            placeholder="This is disabled..."
            disabled={true}
            value="Disabled input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With Error</Text>
          <ContactSearchInput
            onContactSelect={handleContactSelect}
            placeholder="This has an error..."
            error="This field is required"
          />
        </View>

        {selectedContact && (
          <View style={styles.selectedContactContainer}>
            <Text style={styles.selectedContactTitle}>Selected Contact:</Text>
            <View style={styles.selectedContactCard}>
              <Text style={styles.selectedContactName}>{selectedContact.name}</Text>
              <Text style={styles.selectedContactId}>ID: {selectedContact.id}</Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Features:</Text>
          <Text style={styles.infoText}>• Real-time search as you type</Text>
          <Text style={styles.infoText}>• Works with both device contacts (mobile) and relationships (web)</Text>
          <Text style={styles.infoText}>• Dropdown with search results</Text>
          <Text style={styles.infoText}>• Click outside to close dropdown</Text>
          <Text style={styles.infoText}>• Error handling and validation</Text>
          <Text style={styles.infoText}>• Customizable placeholder and styling</Text>
          <Text style={styles.infoText}>• Disabled state support</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  selectedContactContainer: {
    marginBottom: 24,
  },
  selectedContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectedContactCard: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  selectedContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  selectedContactId: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});
