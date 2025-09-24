import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Users, X, Calendar, MessageCircle, Phone, Mail, User, ChevronRight, Search, Filter } from 'lucide-react-native';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string }[];
  emails?: { email: string }[];
}

interface Relationship {
  id: string;
  contactId: string;
  contactName: string;
  lastContactDate: string;
  lastContactMethod: string;
  reminderFrequency: string;
  nextReminderDate: string;
  tags: string[];
  notes: string;
  familyInfo: {
    kids: string;
    siblings: string;
    spouse: string;
  };
}

type LastContactOption = 'today' | 'yesterday' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
type ContactMethod = 'call' | 'text' | 'email' | 'inPerson';
type ReminderFrequency = 'week' | 'month' | '3months' | '6months' | 'never';

export default function RelationshipsScreen() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Form state
  const [lastContactOption, setLastContactOption] = useState<LastContactOption>('today');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('call');
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [familyInfo, setFamilyInfo] = useState({ kids: '', siblings: '', spouse: '' });
  const [customDate, setCustomDate] = useState('');
  const [newTag, setNewTag] = useState('');

  const predefinedTags = ['Client', 'College', 'Family', 'Favorite', 'Friends', 'Prospect'];
  const lastContactOptions = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'A week ago' },
    { key: 'month', label: 'A month ago' },
    { key: '3months', label: '3 months ago' },
    { key: '6months', label: '6 months ago' },
    { key: 'year', label: 'A year ago' },
    { key: 'custom', label: 'Custom date' },
  ];

  const contactMethods = [
    { key: 'call', label: 'Call', icon: Phone },
    { key: 'text', label: 'Text', icon: MessageCircle },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'inPerson', label: 'Met in person', icon: User },
  ];

  const reminderFrequencies = [
    { key: 'week', label: 'Every week' },
    { key: 'month', label: 'Every month' },
    { key: '3months', label: 'Every 3 months' },
    { key: '6months', label: 'Every 6 months' },
    { key: 'never', label: "Don't remind me" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contactSearchQuery, contacts]);

  const loadData = async () => {
    try {
      const [savedRelationships, savedContacts] = await Promise.all([
        AsyncStorage.getItem('relationships'),
        AsyncStorage.getItem('imported_contacts')
      ]);
      
      if (savedRelationships) {
        setRelationships(JSON.parse(savedRelationships));
      }
      
      if (savedContacts) {
        const parsedContacts = JSON.parse(savedContacts);
        setContacts(parsedContacts);
        setFilteredContacts(parsedContacts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterContacts = () => {
    if (contactSearchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  };

  const openAddRelationship = () => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Please allow contact access to add relationships.');
      return;
    }
    setShowContactList(true);
  };

  const selectContact = (contact: Contact) => {
    // Check if relationship already exists
    const existingRelationship = relationships.find(r => r.contactId === contact.id);
    if (existingRelationship) {
      Alert.alert(
        'Relationship Exists',
        `You already have a relationship with ${contact.name}. Would you like to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => editRelationship(existingRelationship) },
        ]
      );
      return;
    }

    setSelectedContact(contact);
    setShowContactList(false);
    setShowAddModal(true);
  };

  const editRelationship = (relationship: Relationship) => {
    setSelectedContact({ id: relationship.contactId, name: relationship.contactName });
    setLastContactOption(getLastContactOptionFromDate(relationship.lastContactDate));
    setContactMethod(relationship.lastContactMethod as ContactMethod);
    setReminderFrequency(relationship.reminderFrequency as ReminderFrequency);
    setSelectedTags(relationship.tags);
    setNotes(relationship.notes);
    setFamilyInfo(relationship.familyInfo);
    setShowContactList(false);
    setShowAddModal(true);
  };

  const getLastContactOptionFromDate = (dateString: string): LastContactOption => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays <= 7) return 'week';
    if (diffInDays <= 30) return 'month';
    if (diffInDays <= 90) return '3months';
    if (diffInDays <= 180) return '6months';
    if (diffInDays <= 365) return 'year';
    return 'custom';
  };

  const calculateNextReminderDate = (lastDate: Date, frequency: ReminderFrequency): string => {
    if (frequency === 'never') return '';
    
    const nextDate = new Date(lastDate);
    
    switch (frequency) {
      case 'week':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case '3months':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case '6months':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
    }
    
    return nextDate.toISOString();
  };

  const getLastContactDate = (option: LastContactOption): Date => {
    const today = new Date();
    
    switch (option) {
      case 'today': return today;
      case 'yesterday':
        return new Date(today.setDate(today.getDate() - 1));
      case 'week':
        return new Date(today.setDate(today.getDate() - 7));
      case 'month':
        return new Date(today.setMonth(today.getMonth() - 1));
      case '3months':
        return new Date(today.setMonth(today.getMonth() - 3));
      case '6months':
        return new Date(today.setMonth(today.getMonth() - 6));
      case 'year':
        return new Date(today.setFullYear(today.getFullYear() - 1));
      case 'custom':
        return customDate ? new Date(customDate) : today;
      default:
        return today;
    }
  };

  const saveRelationship = async () => {
    if (!selectedContact) return;
    
    if (selectedTags.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one tag.');
      return;
    }

    if (lastContactOption === 'custom' && !customDate) {
      Alert.alert('Missing Date', 'Please select a custom date.');
      return;
    }
    
    const lastDate = getLastContactDate(lastContactOption);
    const nextReminderDate = calculateNextReminderDate(lastDate, reminderFrequency);
    
    const relationshipData: Relationship = {
      id: Date.now().toString(),
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      lastContactDate: lastDate.toISOString(),
      lastContactMethod: contactMethod,
      reminderFrequency,
      nextReminderDate,
      tags: selectedTags,
      notes,
      familyInfo,
    };

    // Check if editing existing relationship
    const existingIndex = relationships.findIndex(r => r.contactId === selectedContact.id);
    let updatedRelationships;
    
    if (existingIndex >= 0) {
      updatedRelationships = [...relationships];
      updatedRelationships[existingIndex] = { ...relationshipData, id: relationships[existingIndex].id };
    } else {
      updatedRelationships = [...relationships, relationshipData];
    }
    
    setRelationships(updatedRelationships);
    
    try {
      await AsyncStorage.setItem('relationships', JSON.stringify(updatedRelationships));
      
      // Save reminder if frequency is not 'never'
      if (reminderFrequency !== 'never') {
        const reminders = await AsyncStorage.getItem('reminders') || '[]';
        const parsedReminders = JSON.parse(reminders);
        
        // Remove existing reminder for this contact
        const filteredReminders = parsedReminders.filter((r: any) => 
          !r.contactName || r.contactName !== selectedContact.name
        );
        
        const newReminder = {
          id: Date.now().toString() + '_reminder',
          contactName: selectedContact.name,
          type: 'Follow-up',
          date: nextReminderDate,
          frequency: reminderFrequency,
          tags: selectedTags,
          isOverdue: false,
          isThisWeek: false,
        };
        
        filteredReminders.push(newReminder);
        await AsyncStorage.setItem('reminders', JSON.stringify(filteredReminders));
      }
      
      resetForm();
      setShowAddModal(false);
      Alert.alert('Success', 'Relationship saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save relationship.');
    }
  };

  const resetForm = () => {
    setSelectedContact(null);
    setLastContactOption('today');
    setContactMethod('call');
    setReminderFrequency('month');
    setSelectedTags([]);
    setNotes('');
    setFamilyInfo({ kids: '', siblings: '', spouse: '' });
    setCustomDate('');
    setNewTag('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addNewTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const deleteRelationship = async (relationshipId: string) => {
    Alert.alert(
      'Delete Relationship',
      'Are you sure you want to delete this relationship?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedRelationships = relationships.filter(r => r.id !== relationshipId);
            setRelationships(updatedRelationships);
            await AsyncStorage.setItem('relationships', JSON.stringify(updatedRelationships));
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRelationship = ({ item }: { item: Relationship }) => (
    <TouchableOpacity 
      style={styles.relationshipCard}
      onPress={() => editRelationship(item)}
      onLongPress={() => deleteRelationship(item.id)}
    >
      <View style={styles.relationshipHeader}>
        <Text style={styles.contactName}>{item.contactName}</Text>
        <ChevronRight size={16} color="#9CA3AF" />
      </View>
      
      <View style={styles.tags}>
        {item.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {item.tags.length > 3 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>+{item.tags.length - 3}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.relationshipDetails}>
        <View style={styles.detailRow}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            Last contact: {formatDate(item.lastContactDate)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          {item.lastContactMethod === 'call' && <Phone size={14} color="#6B7280" />}
          {item.lastContactMethod === 'text' && <MessageCircle size={14} color="#6B7280" />}
          {item.lastContactMethod === 'email' && <Mail size={14} color="#6B7280" />}
          {item.lastContactMethod === 'inPerson' && <User size={14} color="#6B7280" />}
          <Text style={styles.detailText}>
            Via {item.lastContactMethod.replace('inPerson', 'in person')}
          </Text>
        </View>
        
        {item.nextReminderDate && (
          <View style={styles.detailRow}>
            <Calendar size={14} color="#10B981" />
            <Text style={styles.reminderText}>
              Next reminder: {formatDate(item.nextReminderDate)}
            </Text>
          </View>
        )}
      </View>
      
      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => selectContact(item)}
    >
      <View style={styles.contactItemContent}>
        <Text style={styles.contactItemName}>{item.name}</Text>
        {item.phoneNumbers && item.phoneNumbers[0] && (
          <Text style={styles.contactItemPhone}>{item.phoneNumbers[0].number}</Text>
        )}
        {item.emails && item.emails[0] && (
          <Text style={styles.contactItemEmail}>{item.emails[0].email}</Text>
        )}
      </View>
      <ChevronRight size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relationships</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddRelationship}>
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {relationships.length > 0 ? (
          <FlatList
            data={relationships}
            renderItem={renderRelationship}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No relationships yet</Text>
            <Text style={styles.emptySubtitle}>
              Add relationships to keep track of your connections
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddRelationship}>
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.emptyButtonText}>Add First Relationship</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Contact Selection Modal */}
      <Modal visible={showContactList} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setShowContactList(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={contactSearchQuery}
              onChangeText={setContactSearchQuery}
              placeholder="Search contacts..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            style={styles.contactList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Relationship Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedContact?.name}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Last Contact Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When did you last speak?</Text>
              <View style={styles.optionsGrid}>
                {lastContactOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionButton,
                      lastContactOption === option.key && styles.selectedOption
                    ]}
                    onPress={() => setLastContactOption(option.key as LastContactOption)}
                  >
                    <Text style={[
                      styles.optionText,
                      lastContactOption === option.key && styles.selectedOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {lastContactOption === 'custom' && (
                <TextInput
                  style={styles.input}
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>

            {/* Contact Method Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How did you communicate?</Text>
              <View style={styles.methodsGrid}>
                {contactMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        styles.methodButton,
                        contactMethod === method.key && styles.selectedMethod
                      ]}
                      onPress={() => setContactMethod(method.key as ContactMethod)}
                    >
                      <IconComponent 
                        size={20} 
                        color={contactMethod === method.key ? '#ffffff' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.methodText,
                        contactMethod === method.key && styles.selectedMethodText
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reminder Frequency Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder frequency</Text>
              <View style={styles.optionsGrid}>
                {reminderFrequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq.key}
                    style={[
                      styles.optionButton,
                      reminderFrequency === freq.key && styles.selectedOption
                    ]}
                    onPress={() => setReminderFrequency(freq.key as ReminderFrequency)}
                  >
                    <Text style={[
                      styles.optionText,
                      reminderFrequency === freq.key && styles.selectedOptionText
                    ]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsGrid}>
                {predefinedTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      selectedTags.includes(tag) && styles.selectedTag
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[
                      styles.tagButtonText,
                      selectedTags.includes(tag) && styles.selectedTagText
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.newTagContainer}>
                <TextInput
                  style={styles.newTagInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Add new tag"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.addTagButton} onPress={addNewTag}>
                  <Plus size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Family Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Family Information</Text>
              <View style={styles.familyInputs}>
                <TextInput
                  style={styles.input}
                  value={familyInfo.spouse}
                  onChangeText={(text) => setFamilyInfo(prev => ({ ...prev, spouse: text }))}
                  placeholder="Spouse"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={styles.input}
                  value={familyInfo.kids}
                  onChangeText={(text) => setFamilyInfo(prev => ({ ...prev, kids: text }))}
                  placeholder="Kids"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={styles.input}
                  value={familyInfo.siblings}
                  onChangeText={(text) => setFamilyInfo(prev => ({ ...prev, siblings: text }))}
                  placeholder="Siblings"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveRelationship}>
              <Text style={styles.saveButtonText}>Save Relationship</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  relationshipCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  relationshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  relationshipDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reminderText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  notes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 8,
  },
  emptyButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  contactItemPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactItemEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  optionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
  },
  selectedMethod: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  methodText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedMethodText: {
    color: '#ffffff',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  tagButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTag: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tagButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#ffffff',
  },
  newTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newTagInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addTagButton: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
  },
  familyInputs: {
    gap: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});