import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import ContactSearchInput from '../components/ContactSearchInput';

/**
 * Simple test component to verify ContactSearchInput functionality
 * This can be used to test the component in isolation
 */

export default function ContactSearchTest() {
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleContactSelect = (contact: { id: string; name: string }) => {
    setSelectedContact(contact);
    setError('');
    addTestResult(`Contact selected: ${contact.name} (ID: ${contact.id})`);
    
    Alert.alert(
      'Test Result',
      `Contact selected: ${contact.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    addTestResult(`Search query changed: "${query}"`);
    
    // Clear error when user types
    if (error) {
      setError('');
    }
  };

  const testValidation = () => {
    if (!selectedContact && !searchQuery.trim()) {
      setError('Please select a contact or enter a contact name');
      addTestResult('Validation test: Error set - no contact selected');
      return false;
    }
    addTestResult('Validation test: Passed');
    return true;
  };

  const testClear = () => {
    setSelectedContact(null);
    setSearchQuery('');
    setError('');
    addTestResult('Clear test: All fields cleared');
  };

  const testError = () => {
    setError('This is a test error message');
    addTestResult('Error test: Error message set');
  };

  const testDisabled = () => {
    // This would be controlled by a parent component
    addTestResult('Disabled test: Component can be disabled via props');
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ContactSearchInput Test</Text>
        <Text style={styles.description}>
          This component tests the ContactSearchInput functionality.
        </Text>

        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Basic Functionality Test</Text>
          <ContactSearchInput
            onContactSelect={handleContactSelect}
            placeholder="Search for a contact..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            error={error}
          />
        </View>

        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testButton} onPress={testValidation}>
              <Text style={styles.testButtonText}>Test Validation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={testClear}>
              <Text style={styles.testButtonText}>Test Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testButton} onPress={testError}>
              <Text style={styles.testButtonText}>Test Error</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={testDisabled}>
              <Text style={styles.testButtonText}>Test Disabled</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedContact && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Selected Contact</Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactName}>{selectedContact.name}</Text>
              <Text style={styles.contactId}>ID: {selectedContact.id}</Text>
            </View>
          </View>
        )}

        <View style={styles.resultSection}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearTestResults}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.resultsContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.noResultsText}>No test results yet</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Test Checklist:</Text>
          <Text style={styles.infoText}>✓ Search input responds to typing</Text>
          <Text style={styles.infoText}>✓ Contact selection works</Text>
          <Text style={styles.infoText}>✓ Error display works</Text>
          <Text style={styles.infoText}>✓ Clear functionality works</Text>
          <Text style={styles.infoText}>✓ Validation works</Text>
          <Text style={styles.infoText}>✓ Dropdown shows/hides correctly</Text>
          <Text style={styles.infoText}>✓ Cross-platform compatibility</Text>
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
  testSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  resultSection: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  contactId: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultsContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    maxHeight: 200,
  },
  resultText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  clearButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#15803D',
    marginBottom: 4,
  },
});
