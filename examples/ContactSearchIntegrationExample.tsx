import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Calendar, Clock } from 'lucide-react-native';
import ContactSearchInput from '../components/ContactSearchInput';
import WebCompatibleDateTimePicker from '../components/WebCompatibleDateTimePicker';
import { Platform } from 'react-native';

/**
 * This example shows how to integrate the ContactSearchInput component
 * into an existing screen, replacing the manual contact search implementation.
 * 
 * This follows the same pattern used in AddActivityModal and EditActivityModal.
 */

export default function ContactSearchIntegrationExample() {
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  
  // Reminder form state
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
  });
  const [reminderTime, setReminderTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderType, setReminderType] = useState('follow_up');
  const [reminderFrequency, setReminderFrequency] = useState('once');

  const handleContactSelect = (contact: { id: string; name: string }) => {
    setSelectedContact(contact);
    setContactSearchQuery(contact.name);
    setValidationError('');
    
    Alert.alert(
      'Contact Selected',
      `You selected: ${contact.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleSearchChange = (query: string) => {
    setContactSearchQuery(query);
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const handleCreateReminder = () => {
    // Validate form
    if (!selectedContact && !contactSearchQuery.trim()) {
      setValidationError('Please select a contact or enter a contact name');
      return;
    }

    if (!reminderNote.trim()) {
      Alert.alert('Error', 'Please enter a reminder note');
      return;
    }

    const contactName = selectedContact?.name || contactSearchQuery.trim();
    
    Alert.alert(
      'Reminder Created',
      `Reminder for ${contactName}: ${reminderNote}`,
      [{ text: 'OK' }]
    );

    // Reset form
    setSelectedContact(null);
    setContactSearchQuery('');
    setReminderNote('');
    setValidationError('');
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContact(null);
    setContactSearchQuery('');
    setReminderNote('');
    setValidationError('');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Contact Search Integration Example</Text>
        <Text style={styles.description}>
          This example shows how to integrate the ContactSearchInput component
          into an existing screen, replacing manual contact search implementation.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before: Manual Implementation</Text>
          <Text style={styles.codeBlock}>
{`// Old way - manual contact search
const [contactSearchQuery, setContactSearchQuery] = useState('');
const [showContactPicker, setShowContactPicker] = useState(false);
const [filteredContacts, setFilteredContacts] = useState([]);

const handleContactSearch = (query) => {
  setContactSearchQuery(query);
  const filtered = relationships.filter(rel => 
    rel.contactName.toLowerCase().includes(query.toLowerCase())
  );
  setFilteredContacts(filtered);
  setShowContactPicker(true);
};`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>After: Using ContactSearchInput</Text>
          <Text style={styles.codeBlock}>
{`// New way - using ContactSearchInput component
<ContactSearchInput
  onContactSelect={handleContactSelect}
  placeholder="Search for a contact..."
  value={contactSearchQuery}
  onChangeText={handleSearchChange}
  error={validationError}
/>`}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.demoButton}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.demoButtonText}>Try the Integration</Text>
        </TouchableOpacity>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Benefits of Using ContactSearchInput:</Text>
          <Text style={styles.featureText}>• Reduces code duplication</Text>
          <Text style={styles.featureText}>• Consistent UI across the app</Text>
          <Text style={styles.featureText}>• Built-in error handling</Text>
          <Text style={styles.featureText}>• Cross-platform support</Text>
          <Text style={styles.featureText}>• Easy to maintain and update</Text>
          <Text style={styles.featureText}>• Reusable across different screens</Text>
        </View>
      </ScrollView>

      {/* Demo Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Reminder</Text>
            <TouchableOpacity onPress={handleCloseModal}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact *</Text>
              <ContactSearchInput
                onContactSelect={handleContactSelect}
                placeholder="Search for a contact..."
                value={contactSearchQuery}
                onChangeText={handleSearchChange}
                error={validationError}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reminder Note *</Text>
              <TextInput
                style={styles.textInput}
                value={reminderNote}
                onChangeText={setReminderNote}
                placeholder="Enter reminder note..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.dateTimeButtonText}>
                    {reminderDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.dateTimeButtonText}>
                    {reminderTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                {['follow_up', 'meeting', 'call', 'birthday', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      reminderType === type && styles.activeTypeButton,
                    ]}
                    onPress={() => setReminderType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        reminderType === type && styles.activeTypeButtonText,
                      ]}
                    >
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {['once', 'daily', 'week', 'month', '3months', '6months', 'yearly'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      reminderFrequency === freq && styles.activeFrequencyButton,
                    ]}
                    onPress={() => setReminderFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        reminderFrequency === freq && styles.activeFrequencyButtonText,
                      ]}
                    >
                      {freq === '3months' ? '3 months' : 
                     freq === '6months' ? '6 months' : 
                     freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateReminder}>
              <Text style={styles.createButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      {Platform.OS !== 'web' && showDatePicker && (
        <WebCompatibleDateTimePicker
          value={reminderDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {Platform.OS !== 'web' && showTimePicker && (
        <WebCompatibleDateTimePicker
          value={reminderTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
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
  codeBlock: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  demoButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  featuresSection: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  activeTypeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#ffffff',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  frequencyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: '22%',
    alignItems: 'center',
  },
  activeFrequencyButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeFrequencyButtonText: {
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
