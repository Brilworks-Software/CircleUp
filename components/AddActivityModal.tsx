import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import WebCompatibleDateTimePicker from './WebCompatibleDateTimePicker';
import { X, ChevronDown, Search } from 'lucide-react-native';
import { useActivity } from '../firebase/hooks/useActivity';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { useAuth } from '../firebase/hooks/useAuth';
import ReminderNotificationService from '../services/ReminderNotificationService';

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  contactId?: string;
  contactName?: string;
  onActivityCreated?: () => void;
  editingActivity?: any; // Activity being edited
  onActivityUpdated?: () => void; // Callback when activity is updated
}

export default function AddActivityModal({
  visible,
  onClose,
  contactId = '',
  contactName = '',
  onActivityCreated,
  editingActivity,
  onActivityUpdated,
}: AddActivityModalProps) {
  const { createActivity, updateActivity } = useActivity();
  const { relationships, createRelationship } = useRelationships();
  const { currentUser } = useAuth();
  

  // Load device contacts on mobile when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      loadDeviceContacts();
    }
  }, [visible]);

  // Helper function to ensure relationship exists for a contact
  const ensureRelationshipExists = async (contactName: string, deviceContact?: Contacts.Contact) => {
    try {
      // Check if relationship already exists
      const existingRelationship = relationships.find(rel => 
        rel.contactName.toLowerCase() === contactName.toLowerCase()
      );
      
      if (existingRelationship) {
        return existingRelationship;
      }
      
      // Create new relationship
      
      // If we have device contact data, use it to populate the relationship
      const contactData = deviceContact ? {
        phoneNumbers: deviceContact.phoneNumbers?.map(phone => ({
          number: phone.number || '',
          label: phone.label
        })) || [],
        emails: deviceContact.emails?.map(email => ({
          email: email.email || '',
          label: email.label
        })) || [],
        website: '',
        linkedin: '',
        twitter: '',
        instagram: '',
        facebook: '',
        company: '',
        jobTitle: '',
        address: '',
        birthday: '',
        notes: '',
      } : {
        phoneNumbers: [],
        emails: [],
        website: '',
        linkedin: '',
        twitter: '',
        instagram: '',
        facebook: '',
        company: '',
        jobTitle: '',
        address: '',
        birthday: '',
        notes: '',
      };
      
      const newRelationship = await createRelationship({
        contactId: (deviceContact as any)?.id || `contact_${Date.now()}`, // Use device contact ID if available
        contactName: contactName,
        lastContactDate: new Date().toISOString(),
        lastContactMethod: 'other',
        reminderFrequency: 'month',
        nextReminderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        tags: [],
        notes: '',
        familyInfo: { kids: '', siblings: '', spouse: '' },
        contactData,
      });
      
      return newRelationship;
    } catch (error) {
      console.error('❌ Error creating relationship for:', contactName, error);
      // Don't throw error, just log it and continue
      return null;
    }
  };
  
  const reminderNotificationService = ReminderNotificationService.getInstance();
  const [activeActivityTab, setActiveActivityTab] = useState<
    'note' | 'interaction' | 'reminder'
  >('note');

  // Contact picker states
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
  } | null>(null);
  
  // Direct contact search states
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Array<{id: string; name: string}>>([]);
  const searchContainerRef = useRef<any>(null);
  
  // Device contacts state (for mobile)
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [hasContactPermission, setHasContactPermission] = useState(false);

  // Animation states for tabs
  const tabAnimations = useRef({
    note: new Animated.Value(1),
    interaction: new Animated.Value(1),
    reminder: new Animated.Value(1),
  }).current;

  // Note activity states
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);

  // Local contact name state for when not provided by parent
  const [localContactName, setLocalContactName] = useState(contactName);

  // Determine if contact is provided by parent (read-only) or needs to be selected
  const isContactProvided = contactId && contactName;
  const currentContactId = isContactProvided
    ? contactId
    : selectedContact?.id || '';
  const currentContactName = isContactProvided
    ? contactName
    : selectedContact?.name || localContactName;

  // Interaction activity states
  const [interactionType, setInteractionType] = useState<
    'call' | 'text' | 'email' | 'inPerson'
  >('call');
  const [interactionDate, setInteractionDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - 30 * 60 * 1000); // Current time - 30 minutes
  });
  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionDuration, setInteractionDuration] = useState('');
  const [interactionLocation, setInteractionLocation] = useState('');

  // Reminder activity states
  const [activityReminderTitle, setActivityReminderTitle] = useState('');
  const [activityReminderDate, setActivityReminderDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
  });
  const [activityReminderType, setActivityReminderType] = useState('follow_up');
  const [activityReminderFrequency, setActivityReminderFrequency] = useState<
    | 'once'
    | 'daily'
    | 'week'
    | 'month'
    | '3months'
    | '6months'
    | 'yearly'
    | 'never'
  >('month');
  const [activityReminderNotes, setActivityReminderNotes] = useState('');

  // Validation states
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Date picker states
  const [showInteractionDatePicker, setShowInteractionDatePicker] =
    useState(false);
  const [showInteractionTimePicker, setShowInteractionTimePicker] =
    useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  // Update contact name when prop changes
  useEffect(() => {
    setLocalContactName(contactName);
  }, [contactName]);

  // Populate form when editing an activity
  useEffect(() => {
    if (editingActivity && visible) {
      setActiveActivityTab(editingActivity.type);

      if (editingActivity.type === 'note') {
        setNoteTitle(editingActivity.title || '');
        setNoteContent(
          editingActivity.content || editingActivity.description || ''
        );
      } else if (editingActivity.type === 'interaction') {
        setInteractionType(editingActivity.interactionType || 'call');
        setInteractionDate(
          editingActivity.date ? new Date(editingActivity.date) : new Date()
        );
        setInteractionNotes(editingActivity.description || '');
        setInteractionDuration(editingActivity.duration?.toString() || '');
        setInteractionLocation(editingActivity.location || '');
      } else if (editingActivity.type === 'reminder') {
        setActivityReminderTitle(editingActivity.title || '');
        setActivityReminderDate(
          editingActivity.reminderDate
            ? new Date(editingActivity.reminderDate)
            : new Date()
        );
        setActivityReminderType(editingActivity.reminderType || 'follow_up');
        setActivityReminderFrequency(editingActivity.frequency || 'month');
        setActivityReminderNotes(editingActivity.description || '');
      }
    }
  }, [editingActivity, visible]);

  const resetActivityForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setLocalContactName(contactName);
    setSelectedContact(null);
    setContactSearchQuery('');
    setShowContactPicker(false);
    setShowContactSearch(false);
    setFilteredContacts([]);
    setInteractionType('call');
    setInteractionDate(() => {
      const now = new Date();
      return new Date(now.getTime() - 30 * 60 * 1000); // Current time - 30 minutes
    });
    setInteractionNotes('');
    setInteractionDuration('');
    setInteractionLocation('');
    setActivityReminderTitle('');
    setActivityReminderDate(() => {
      const now = new Date();
      return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
    });
    setActivityReminderType('follow_up');
    setActivityReminderFrequency('month');
    setActivityReminderNotes('');
    setValidationErrors({});
    setActiveActivityTab('note');
  };

  const handleTabSwitch = (tab: 'note' | 'interaction' | 'reminder') => {
    setActiveActivityTab(tab);

    // Animate tab switches
    Object.keys(tabAnimations).forEach((key) => {
      Animated.timing(tabAnimations[key as keyof typeof tabAnimations], {
        toValue: key === tab ? 1.1 : 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Date picker handlers
  const openInteractionDatePicker = () => {
    setShowInteractionDatePicker(true);
  };

  const openInteractionTimePicker = () => {
    setShowInteractionTimePicker(true);
  };

  const openReminderDatePicker = () => {
    setShowReminderDatePicker(true);
  };

  const openReminderTimePicker = () => {
    setShowReminderTimePicker(true);
  };

  const handleInteractionDateChange = (event: any, selectedDate?: Date) => {
    setShowInteractionDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInteractionDate(selectedDate);

      // Clear validation error when date changes
      setValidationErrors((prev) => ({ ...prev, interactionDate: '' }));

      // Validate if the new date is in the past (allow current date)
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60000);
      if (selectedDate > oneMinuteFromNow) {
        setValidationErrors((prev) => ({
          ...prev,
          interactionDate: 'Interaction date must be in the past or present',
        }));
      }
    }
  };

  const handleInteractionTimeChange = (event: any, selectedTime?: Date) => {
    setShowInteractionTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setInteractionDate((prev) => {
        const newDate = new Date(prev);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());

        // Validate if the new date/time is in the past (allow current date/time)
        const now = new Date();
        const oneMinuteFromNow = new Date(now.getTime() + 60000);
        if (newDate > oneMinuteFromNow) {
          setValidationErrors((prev) => ({
            ...prev,
            interactionDate: 'Interaction date must be in the past or present',
          }));
        } else {
          // Clear validation error if date is valid
          setValidationErrors((prev) => ({ ...prev, interactionDate: '' }));
        }

        return newDate;
      });
    }
  };

  const handleReminderDateChange = (event: any, selectedDate?: Date) => {
    setShowReminderDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setActivityReminderDate(selectedDate);

      // Clear validation error when date changes
      setValidationErrors((prev) => ({ ...prev, reminderDate: '' }));

      // Validate if the new date is in the future
      const now = new Date();
      if (selectedDate <= now) {
        setValidationErrors((prev) => ({
          ...prev,
          reminderDate: 'Reminder date must be in the future',
        }));
      }
    }
  };

  const handleReminderTimeChange = (event: any, selectedTime?: Date) => {
    setShowReminderTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setActivityReminderDate((prev) => {
        const newDate = new Date(prev);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());

        // Validate if the new date/time is in the future
        const now = new Date();
        if (newDate <= now) {
          setValidationErrors((prev) => ({
            ...prev,
            reminderDate: 'Reminder date must be in the future',
          }));
        } else {
          // Clear validation error if date is valid
          setValidationErrors((prev) => ({ ...prev, reminderDate: '' }));
        }

        return newDate;
      });
    }
  };

  const validateActivityForm = () => {
    const errors: Record<string, string> = {};

    if (activeActivityTab === 'note') {
      if (!currentContactName.trim()) {
        errors.contactName = 'Contact name is required';
      }
      // if (!noteTitle.trim()) {
      //   errors.noteTitle = 'Note title is required';
      // }
      if (!noteContent.trim()) {
        errors.noteContent = 'Note content is required';
      }
    } else if (activeActivityTab === 'interaction') {
      if (!currentContactName.trim()) {
        errors.contactName = 'Contact name is required for interactions';
      }
      if (!interactionNotes.trim()) {
        errors.interactionNotes = 'Interaction notes are required';
      }
      if (!interactionDate) {
        errors.interactionDate = 'Interaction date is required';
      } else {
        // Check if interaction date is in the past (allow current date/time)
        const now = new Date();
        const interactionDateTime = new Date(interactionDate);
        // Allow dates up to 1 minute in the future to account for time differences
        const oneMinuteFromNow = new Date(now.getTime() + 60000);
        if (interactionDateTime > oneMinuteFromNow) {
          errors.interactionDate = 'Interaction date must be in the past or present';
        }
      }
    } else if (activeActivityTab === 'reminder') {
      if (!currentContactName.trim()) {
        errors.contactName = 'Contact name is required for reminders';
      }
      // if (!activityReminderTitle.trim()) {
      //   errors.reminderTitle = 'Reminder title is required';
      // }
      if (!activityReminderDate) {
        errors.reminderDate = 'Reminder date is required';
      } else {
        // Check if reminder date is in the future
        const now = new Date();
        const reminderDateTime = new Date(activityReminderDate);
        if (reminderDateTime <= now) {
          errors.reminderDate = 'Reminder date must be in the future';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createNoteActivity = async () => {
    if (!currentContactName.trim()) {
      Alert.alert('Error', 'Contact name is required');
      return;
    }

    try {
      // Ensure relationship exists for the contact
      await ensureRelationshipExists(currentContactName);
      
      const activityData = {
        type: 'note' as const,
        // title: noteTitle.trim(),
        // title: '', // Default empty title
        description: noteContent.trim(),
        content: noteContent.trim(),
        tags: noteTags,
        contactId: currentContactId,
        contactName: currentContactName,
      };

      const result = await createActivity(activityData);

      Alert.alert('Success', 'Note activity created successfully!');
      onClose();
      resetActivityForm();
      onActivityCreated?.();
    } catch (error) {
      console.error('Error creating note activity:', error);
      Alert.alert('Error', 'Failed to create note activity. Please try again.');
    }
  };

  const createInteractionActivity = async () => {
    if (!currentContactName.trim()) {
      Alert.alert('Error', 'Contact name is required for interactions');
      return;
    }

    try {
      // Ensure relationship exists for the contact
      await ensureRelationshipExists(currentContactName);
      
      const activityData = {
        type: 'interaction' as const,
        // title: `${interactionType} with ${currentContactName}`,
        description: interactionNotes.trim(),
        contactId: currentContactId,
        contactName: currentContactName,
        interactionType: interactionType,
        date: interactionDate.toISOString(),
        duration: interactionDuration ? parseInt(interactionDuration) : 0,
        location: interactionLocation.trim(),
        tags: [],
      };

      const result = await createActivity(activityData);

      Alert.alert('Success', 'Interaction activity created successfully!');
      onClose();
      resetActivityForm();
      onActivityCreated?.();
    } catch (error) {
      console.error('Error creating interaction activity:', error);
      Alert.alert(
        'Error',
        'Failed to create interaction activity. Please try again.'
      );
    }
  };

  const createReminderActivity = async () => {
    if (!currentContactName.trim()) {
      Alert.alert('Error', 'Contact name is required for reminders');
      return;
    }

    if (!currentUser?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Ensure relationship exists for the contact
      const relationship = await ensureRelationshipExists(currentContactName);
      
      if (!relationship) {
        Alert.alert('Error', 'Failed to create or find relationship for this contact');
        return;
      }
      
      // First create the reminder document and schedule notifications
      const reminderData = {
        contactName: currentContactName,
        type: activityReminderType,
        date: activityReminderDate.toISOString(),
        frequency: activityReminderFrequency,
        tags: [],
        notes: activityReminderNotes.trim(),
        contactId: currentContactId,
        relationshipId: relationship.id,
        isOverdue: false,
        isThisWeek: false,
      };

      const reminderWithNotifications =
        await reminderNotificationService.createReminderWithNotifications(
          currentUser.uid,
          reminderData,
          [15, 30, 60] // 15 min, 30 min, 1 hour before due date
        );

      // Get the reminder document ID
      const reminderId = reminderWithNotifications.id;

      // Now create the activity with reference to the reminder document
      const activityData = {
        type: 'reminder' as const,
        // title: activityReminderTitle.trim(),
        // title: '', // Default empty title
        description: activityReminderNotes.trim(),
        contactId: currentContactId,
        contactName: currentContactName,
        reminderDate: activityReminderDate.toISOString(),
        reminderType: activityReminderType,
        frequency: activityReminderFrequency,
        reminderId: reminderId, // Reference to the reminder document
        tags: [],
      };

      const activity = await createActivity(activityData);

      Alert.alert(
        'Success',
        'Reminder activity created and notifications scheduled successfully!'
      );
      onClose();
      resetActivityForm();
      onActivityCreated?.();
    } catch (error) {
      console.error('Error creating reminder activity:', error);
      Alert.alert(
        'Error',
        'Failed to create reminder activity. Please try again.'
      );
    }
  };

  const updateReminderActivity = async () => {
    if (!editingActivity || !currentUser?.uid) {
      Alert.alert('Error', 'Invalid activity or user not authenticated');
      return;
    }

    try {
      // Ensure relationship exists for the contact
      await ensureRelationshipExists(currentContactName);
      
      // Update the activity
      const activityUpdates = {
        // title: activityReminderTitle.trim(),
        // title: '', // Default empty title
        description: activityReminderNotes.trim(),
        reminderDate: activityReminderDate.toISOString(),
        reminderType: activityReminderType,
        frequency: activityReminderFrequency,
        reminderId: editingActivity.reminderId, // Preserve the reminder ID
      };

      await updateActivity(editingActivity.id, activityUpdates);

      // Update the reminder document and reschedule notifications using the stored reminderId
      const reminderData = {
        contactName: currentContactName,
        type: activityReminderType,
        date: activityReminderDate.toISOString(),
        frequency: activityReminderFrequency,
        tags: [],
        notes: activityReminderNotes.trim(),
        contactId: currentContactId,
        isOverdue: false,
        isThisWeek: false,
      };

      // Use the reminderId from the activity document to update the correct reminder
      const reminderId = editingActivity.reminderId;

      if (reminderId) {
        try {
          await reminderNotificationService.updateReminderWithNotifications(
            currentUser.uid,
            reminderId, // Use the actual reminder document ID
            reminderData,
            [15, 30, 60]
          );
        } catch (reminderError) {
          console.warn('Could not update reminder document:', reminderError);
          // Continue with activity update even if reminder update fails
        }
      } else {
        console.warn(
          'No reminderId found in activity, cannot update reminder document'
        );
      }

      Alert.alert(
        'Success',
        'Reminder activity updated and notifications rescheduled!'
      );
      onClose();
      resetActivityForm();
      onActivityUpdated?.();
    } catch (error) {
      console.error('Error updating reminder activity:', error);
      Alert.alert(
        'Error',
        'Failed to update reminder activity. Please try again.'
      );
    }
  };

  const handleCreateActivity = async () => {
    if (!validateActivityForm()) {
      return;
    }

    // Ensure relationship exists for manually entered contact names
    if (!isContactProvided && currentContactName.trim()) {
      try {
        await ensureRelationshipExists(currentContactName.trim());
      } catch (error) {
        console.error('❌ Error ensuring relationship for manual entry:', error);
        // Continue with activity creation even if relationship creation fails
      }
    }

    if (editingActivity) {
      // Handle editing existing activities
      if (activeActivityTab === 'reminder') {
        await updateReminderActivity();
      } else {
        // For notes and interactions, use the existing update logic
        const updates =
          activeActivityTab === 'note'
            ? { /* title: noteTitle.trim(), */ /* title: '', */ description: noteContent.trim() }
            : {
                // title: `${interactionType} with ${currentContactName}`,
                // title: '', // Default empty title
                description: interactionNotes.trim(),
                interactionType,
                date: interactionDate.toISOString(),
                duration: interactionDuration
                  ? parseInt(interactionDuration)
                  : 0,
                location: interactionLocation.trim(),
              };

        await updateActivity(editingActivity.id, updates);
        Alert.alert('Success', 'Activity updated successfully!');
        onClose();
        resetActivityForm();
        onActivityUpdated?.();
      }
    } else {
      // Handle creating new activities
      if (activeActivityTab === 'note') {
        await createNoteActivity();
      } else if (activeActivityTab === 'interaction') {
        await createInteractionActivity();
      } else if (activeActivityTab === 'reminder') {
        await createReminderActivity();
      }
    }
  };

  // Contact picker functions
  const filteredRelationships = relationships.filter((rel) =>
    rel.contactName.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  const handleContactSelect = (contact: { id: string; name: string }) => {
    setSelectedContact(contact);
    setShowContactPicker(false);
    setContactSearchQuery('');
  };

  const handleContactPickerToggle = () => {
    if (!isContactProvided) {
      setShowContactPicker(!showContactPicker);
    }
  };

  // Load device contacts (mobile only)
  const loadDeviceContacts = async () => {
    if (Platform.OS === 'web') {
      setHasContactPermission(false);
      return;
    }
    
    try {
      setIsLoadingDeviceContacts(true);
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        setHasContactPermission(true);
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        setDeviceContacts(data);
      } else {
        setHasContactPermission(false);
      }
    } catch (error) {
      console.error('Error loading device contacts:', error);
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  };

  // Direct contact search functions
  const handleContactSearch = (query: string) => {
    setContactSearchQuery(query);
    
    if (query.trim()) {
      let filtered: Array<{id: string; name: string}> = [];
      
      if (Platform.OS === 'web') {
        // Web: Use relationship data
        filtered = relationships
          .filter(rel => 
            rel.contactName.toLowerCase().includes(query.toLowerCase())
          )
          .map(rel => ({
            id: rel.contactId,
            name: rel.contactName
          }))
          .slice(0, 5);
      } else {
        // Mobile: Use device contacts
        filtered = deviceContacts
          .filter(contact => 
            contact.name?.toLowerCase().includes(query.toLowerCase())
          )
          .map((contact, index) => ({
            id: (contact as any).id || `device_${Date.now()}_${index}`,
            name: contact.name || 'Unknown'
          }))
          .slice(0, 5);
      }
      
      setFilteredContacts(filtered);
      setShowContactSearch(true);
    } else {
      setShowContactSearch(false);
      setFilteredContacts([]);
    }
  };

  const handleDirectContactSelect = async (contact: { id: string; name: string }) => {
    setSelectedContact(contact);
    setShowContactSearch(false);
    setContactSearchQuery(contact.name);
    
    // Find the device contact if this is from device contacts
    const deviceContact = Platform.OS !== 'web' 
      ? deviceContacts.find(dc => (dc as any).id === contact.id || dc.name === contact.name)
      : undefined;
    
    // Ensure relationship exists for the contact
    try {
      await ensureRelationshipExists(contact.name, deviceContact);
    } catch (error) {
      console.error('❌ Error ensuring relationship:', error);
      Alert.alert('Error', 'Failed to create relationship for this contact');
    }
  };

  const handleClose = () => {
    onClose();
    resetActivityForm();
  };

  // Click outside handler for web
  const handleClickOutside = useCallback((event: any) => {
    if (Platform.OS === 'web' && searchContainerRef.current) {
      // Check if click is outside the search container
      const target = event.target;
      const container = searchContainerRef.current;
      
      // Close dropdown if clicking outside
      if (showContactSearch && !container.contains(target)) {
        setShowContactSearch(false);
        setFilteredContacts([]);
      }
    }
  }, [showContactSearch]);

  // Add click outside listener for web
  // useEffect(() => {
  //   if (Platform.OS === 'web') {
  //     document.addEventListener('mousedown', handleClickOutside);
  //     return () => {
  //       document.removeEventListener('mousedown', handleClickOutside);
  //     };
  //   }
  // }, [handleClickOutside]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.addActivityOverlay}>
        <View style={styles.addActivityContainer}>
          <View style={styles.addActivityHeader}>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.addActivityTitle}>
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </Text>
            
          </View>

          

          {/* Activity Content */}
          <ScrollView
            style={styles.addActivityContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >

            <View style={styles.activitySection}>
              <Text style={styles.activitySectionTitle}>
                {activeActivityTab === 'note'
                  ? 'Create Note'
                  : activeActivityTab === 'interaction'
                  ? 'Log Interaction'
                  : 'Set Reminder'}
              </Text>

              {activeActivityTab === 'note' && (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Name *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <View ref={searchContainerRef} style={styles.contactSearchContainer}>
                        <TextInput
                          style={[
                            styles.activityInput,
                            validationErrors.contactName && styles.inputError,
                          ]}
                          value={contactSearchQuery}
                          onChangeText={handleContactSearch}
                          placeholder={Platform.OS === 'web' ? "Search relationships..." : "Search device contacts..."}
                          placeholderTextColor="#9CA3AF"
                        />
                        {showContactSearch && (
                          <View style={[styles.contactSearchResults, {position: (Platform.OS === 'android') ? "absolute" : "sticky"}]}>
                            {filteredContacts.length > 0 ? (
                              <>
                                
                                {filteredContacts.map((contact) => (
                                  <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactSearchItem}
                                    onPress={() => handleDirectContactSelect(contact)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.contactSearchItemText}>
                                      {contact.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </>
                            ) : (
                              <Text style={styles.debugText}>
                                {Platform.OS === 'web' 
                                  ? `No contacts found (Total relationships: ${relationships.length})`
                                  : `No contacts found (Device contacts: ${deviceContacts.length})`
                                }
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                    {validationErrors.contactName && (
                      <Text style={styles.errorText}>
                        {validationErrors.contactName}
                      </Text>
                    )}
                  </View>

                  {/* <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Title *</Text>
                    <TextInput
                      style={[
                        styles.activityInput,
                        validationErrors.noteTitle && styles.inputError,
                      ]}
                      value={noteTitle}
                      onChangeText={setNoteTitle}
                      placeholder="Enter note title"
                      placeholderTextColor="#9CA3AF"
                    />
                    {validationErrors.noteTitle && (
                      <Text style={styles.errorText}>
                        {validationErrors.noteTitle}
                      </Text>
                    )}
                  </View> */}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Note *</Text>
                    <TextInput
                      style={[
                        styles.activityTextArea,
                        validationErrors.noteContent && styles.inputError,
                      ]}
                      value={noteContent}
                      onChangeText={setNoteContent}
                      placeholder="Write your note here..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                    />
                    {validationErrors.noteContent && (
                      <Text style={styles.errorText}>
                        {validationErrors.noteContent}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {activeActivityTab === 'interaction' && (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Name *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <View ref={searchContainerRef} style={styles.contactSearchContainer}>
                        <TextInput
                          style={[
                            styles.activityInput,
                            validationErrors.contactName && styles.inputError,
                          ]}
                          value={contactSearchQuery}
                          onChangeText={handleContactSearch}
                          placeholder={Platform.OS === 'web' ? "Search relationships..." : "Search device contacts..."}
                          placeholderTextColor="#9CA3AF"
                        />
                        {showContactSearch && (
                          <View style={[styles.contactSearchResults, {position: (Platform.OS === 'android') ? "absolute" : "sticky"}]}>
                            {filteredContacts.length > 0 ? (
                              <>
                                
                                {filteredContacts.map((contact) => (
                                  <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactSearchItem}
                                    onPress={() => handleDirectContactSelect(contact)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.contactSearchItemText}>
                                      {contact.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </>
                            ) : (
                              <Text style={styles.debugText}>
                                {Platform.OS === 'web' 
                                  ? `No contacts found (Total relationships: ${relationships.length})`
                                  : `No contacts found (Device contacts: ${deviceContacts.length})`
                                }
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                    {validationErrors.contactName && (
                      <Text style={styles.errorText}>
                        {validationErrors.contactName}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Interaction Type *</Text>
                    <View style={styles.interactionTypeButtons}>
                      {(['call', 'text', 'email', 'inPerson'] as const).map(
                        (type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.interactionTypeButton,
                              interactionType === type &&
                                styles.activeInteractionTypeButton,
                            ]}
                            onPress={() => setInteractionType(type)}
                          >
                            <Text
                              style={[
                                styles.interactionTypeButtonText,
                                interactionType === type &&
                                  styles.activeInteractionTypeButtonText,
                              ]}
                            >
                              {type === 'call'
                                ? '📞'
                                : type === 'text'
                                ? '💬'
                                : type === 'email'
                                ? '📧'
                                : '🤝'}{' '}
                              {type}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date & Time *</Text>
                    {Platform.OS === 'web' ? (
                      <View style={styles.dateTimeRow}>
                        <View style={[styles.webDateTimeInput, { flex: 1, marginRight: 8 }]}>
                          <input
                            type="date"
                            value={interactionDate.toISOString().slice(0, 10)}
                            onChange={(e) => {
                              const selectedDate = new Date(e.target.value);
                              selectedDate.setHours(interactionDate.getHours(), interactionDate.getMinutes());
                              setInteractionDate(selectedDate);
                              setValidationErrors((prev) => ({ ...prev, interactionDate: '' }));
                            }}
                            max={new Date().toISOString().slice(0, 10)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: validationErrors.interactionDate ? '1px solid #EF4444' : '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '16px',
                              backgroundColor: '#ffffff',
                              color: '#111827',
                              outline: 'none',
                            }}
                          />
                        </View>
                        <View style={[styles.webDateTimeInput, { flex: 1, marginLeft: 8 }]}>
                          <input
                            type="time"
                            value={interactionDate.toTimeString().slice(0, 5)}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(interactionDate);
                              newDate.setHours(hours, minutes);
                              setInteractionDate(newDate);
                              setValidationErrors((prev) => ({ ...prev, interactionDate: '' }));
                            }}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: validationErrors.interactionDate ? '1px solid #EF4444' : '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '16px',
                              backgroundColor: '#ffffff',
                              color: '#111827',
                              outline: 'none',
                            }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            validationErrors.interactionDate && styles.inputError,
                            { flex: 1, marginRight: 8 },
                          ]}
                          onPress={openInteractionDatePicker}
                        >
                          <Text style={styles.dateTimeButtonText}>
                            {interactionDate.toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            validationErrors.interactionDate && styles.inputError,
                            { flex: 1, marginLeft: 8 },
                          ]}
                          onPress={openInteractionTimePicker}
                        >
                          <Text style={styles.dateTimeButtonText}>
                            {interactionDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {validationErrors.interactionDate && (
                      <Text style={styles.errorText}>
                        {validationErrors.interactionDate}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes *</Text>
                    <TextInput
                      style={[
                        styles.activityTextArea,
                        validationErrors.interactionNotes && styles.inputError,
                      ]}
                      value={interactionNotes}
                      onChangeText={setInteractionNotes}
                      placeholder="Describe the interaction..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                    />
                    {validationErrors.interactionNotes && (
                      <Text style={styles.errorText}>
                        {validationErrors.interactionNotes}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.activityInput}
                      value={interactionDuration}
                      onChangeText={setInteractionDuration}
                      placeholder="e.g., 30"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput
                      style={styles.activityInput}
                      value={interactionLocation}
                      onChangeText={setInteractionLocation}
                      placeholder="e.g., Office, Coffee shop"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              )}

              {activeActivityTab === 'reminder' && (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Name *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <View ref={searchContainerRef} style={styles.contactSearchContainer}>
                        <TextInput
                          style={[
                            styles.activityInput,
                            validationErrors.contactName && styles.inputError,
                          ]}
                          value={contactSearchQuery}
                          onChangeText={handleContactSearch}
                          placeholder={Platform.OS === 'web' ? "Search relationships..." : "Search device contacts..."}
                          placeholderTextColor="#9CA3AF"
                        />
                        {showContactSearch && (
                          <View style={[styles.contactSearchResults, {position: (Platform.OS === 'android') ? "absolute" : "sticky"}]}>
                            {filteredContacts.length > 0 ? (
                              filteredContacts.map((contact) => (
                                <TouchableOpacity
                                  key={contact.id}
                                  style={styles.contactSearchItem}
                                  onPress={() => handleDirectContactSelect(contact)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.contactSearchItemText}>
                                    {contact.name}
                                  </Text>
                                </TouchableOpacity>
                              ))
                            ) : (
                              <Text style={styles.debugText}>
                                {Platform.OS === 'web' 
                                  ? `No contacts found (Total relationships: ${relationships.length})`
                                  : `No contacts found (Device contacts: ${deviceContacts.length})`
                                }
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                    {validationErrors.contactName && (
                      <Text style={styles.errorText}>
                        {validationErrors.contactName}
                      </Text>
                    )}
                  </View>

                  {/* <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Title *</Text>
                    <TextInput
                      style={[
                        styles.activityInput,
                        validationErrors.reminderTitle && styles.inputError,
                      ]}
                      value={activityReminderTitle}
                      onChangeText={setActivityReminderTitle}
                      placeholder="Enter reminder title"
                      placeholderTextColor="#9CA3AF"
                    />
                    {validationErrors.reminderTitle && (
                      <Text style={styles.errorText}>
                        {validationErrors.reminderTitle}
                      </Text>
                    )}
                  </View> */}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date & Time *</Text>
                    {Platform.OS === 'web' ? (
                      <View style={styles.dateTimeRow}>
                        <View style={[styles.webDateTimeInput, { flex: 1, marginRight: 8 }]}>
                          <input
                            type="date"
                            value={activityReminderDate.toISOString().slice(0, 10)}
                            onChange={(e) => {
                              const selectedDate = new Date(e.target.value);
                              selectedDate.setHours(activityReminderDate.getHours(), activityReminderDate.getMinutes());
                              setActivityReminderDate(selectedDate);
                              setValidationErrors((prev) => ({ ...prev, reminderDate: '' }));
                            }}
                            min={new Date().toISOString().slice(0, 10)}
                            style={{
                              padding: '12px',
                              border: validationErrors.reminderDate ? '1px solid #EF4444' : '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '16px',
                              backgroundColor: '#ffffff',
                              color: '#111827',
                              outline: 'none',
                            }}
                          />
                        </View>
                        <View style={[styles.webDateTimeInput, { flex: 1 }]}>
                          <input
                            type="time"
                            value={activityReminderDate.toTimeString().slice(0, 5)}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(activityReminderDate);
                              newDate.setHours(hours, minutes);
                              setActivityReminderDate(newDate);
                              setValidationErrors((prev) => ({ ...prev, reminderDate: '' }));
                            }}
                            style={{
                              
                              padding: '12px',
                              border: validationErrors.reminderDate ? '1px solid #EF4444' : '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '16px',
                              backgroundColor: '#ffffff',
                              color: '#111827',
                              outline: 'none',
                            }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            validationErrors.reminderDate && styles.inputError,
                            { flex: 1, marginRight: 8 },
                          ]}
                          onPress={openReminderDatePicker}
                        >
                          <Text style={styles.dateTimeButtonText}>
                            {activityReminderDate.toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            validationErrors.reminderDate && styles.inputError,
                            { flex: 1, marginLeft: 8 },
                          ]}
                          onPress={openReminderTimePicker}
                        >
                          <Text style={styles.dateTimeButtonText}>
                            {activityReminderDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {validationErrors.reminderDate && (
                      <Text style={styles.errorText}>
                        {validationErrors.reminderDate}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Type</Text>
                    <View style={styles.reminderTypeButtons}>
                      {[
                        'follow_up',
                        'meeting',
                        'call',
                        'birthday',
                        'other',
                      ].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.reminderTypeButton,
                            activityReminderType === type &&
                              styles.activeReminderTypeButton,
                          ]}
                          onPress={() => setActivityReminderType(type)}
                        >
                          <Text
                            style={[
                              styles.reminderTypeButtonText,
                              activityReminderType === type &&
                                styles.activeReminderTypeButtonText,
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
                      {(
                        [
                          'once',
                          'daily',
                          'week',
                          'month',
                          '3months',
                          '6months',
                          'yearly',
                          'never',
                        ] as const
                      ).map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          style={[
                            styles.frequencyButton,
                            activityReminderFrequency === freq &&
                              styles.activeFrequencyButton,
                          ]}
                          onPress={() => setActivityReminderFrequency(freq)}
                        >
                          <Text
                            style={[
                              styles.frequencyButtonText,
                              activityReminderFrequency === freq &&
                                styles.activeFrequencyButtonText,
                            ]}
                          >
                            {freq === '3months'
                              ? '3 months'
                              : freq === '6months'
                              ? '6 months'
                              : freq === 'once'
                              ? 'Once'
                              : freq === 'daily'
                              ? 'Daily'
                              : freq === 'yearly'
                              ? 'Yearly'
                              : freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      style={styles.activityTextArea}
                      value={activityReminderNotes}
                      onChangeText={setActivityReminderNotes}
                      placeholder="Additional notes..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Activity Type Tabs - Fixed at top */}
          <View style={{flexDirection: "row", justifyContent: "space-between"}}>
          <View style={styles.activityTypeTabs}>
            <Animated.View
              style={[
                { transform: [{ scale: tabAnimations.note }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.animatedTabButton,
                  activeActivityTab === 'note' &&
                    styles.activeActivityTypeTab,
                ]}
                onPress={() => handleTabSwitch('note')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabIconContainer,
                    activeActivityTab === 'note' &&
                      styles.activeTabIconContainer,
                  ]}
                >
                  <Text style={styles.tabIcon}>📝</Text>
                </View>
                
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                { transform: [{ scale: tabAnimations.interaction }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.animatedTabButton,
                  activeActivityTab === 'interaction' &&
                    styles.activeActivityTypeTab,
                ]}
                onPress={() => handleTabSwitch('interaction')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabIconContainer,
                    activeActivityTab === 'interaction' &&
                      styles.activeTabIconContainer,
                  ]}
                >
                  <Text style={styles.tabIcon}>🤝</Text>
                </View>
                
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                { transform: [{ scale: tabAnimations.reminder }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.animatedTabButton,
                  activeActivityTab === 'reminder' &&
                    styles.activeActivityTypeTab,
                ]}
                onPress={() => handleTabSwitch('reminder')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabIconContainer,
                    activeActivityTab === 'reminder' &&
                      styles.activeTabIconContainer,
                  ]}
                >
                  <Text style={styles.tabIcon}>⏰</Text>
                </View>
                
              </TouchableOpacity>
            </Animated.View>
          </View>
          <TouchableOpacity
              onPress={handleCreateActivity}
              style={styles.addActivitySaveButton}
            >
              <Text style={styles.addActivitySaveButtonText}>
                {editingActivity ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Pickers for Native Platforms */}
      {Platform.OS !== 'web' && showInteractionDatePicker && (
        <WebCompatibleDateTimePicker
          value={interactionDate}
          mode="date"
          display="default"
          onChange={handleInteractionDateChange}
          maximumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showInteractionTimePicker && (
        <WebCompatibleDateTimePicker
          value={interactionDate}
          mode="time"
          display="default"
          onChange={handleInteractionTimeChange}
        />
      )}

      {Platform.OS !== 'web' && showReminderDatePicker && (
        <WebCompatibleDateTimePicker
          value={activityReminderDate}
          mode="date"
          display="default"
          onChange={handleReminderDateChange}
        />
      )}

      {Platform.OS !== 'web' && showReminderTimePicker && (
        <WebCompatibleDateTimePicker
          value={activityReminderDate}
          mode="time"
          display="default"
          onChange={handleReminderTimeChange}
        />
      )}

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.contactPickerOverlay}>
          <View style={styles.contactPickerContainer}>
            <View style={styles.contactPickerHeader}>
              <Text style={styles.contactPickerTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.contactSearchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.contactSearchInput}
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
                placeholder="Search contacts..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <FlatList
              data={filteredRelationships}
              keyExtractor={(item) => item.id}
              style={styles.contactList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() =>
                    handleContactSelect({
                      id: item.contactId,
                      name: item.contactName,
                    })
                  }
                >
                  <View style={styles.contactItemContent}>
                    <Text style={styles.contactItemName}>
                      {item.contactName}
                    </Text>
                    <Text style={styles.contactItemType}>
                      {item.lastContactMethod}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContacts}>
                  <Text style={styles.emptyContactsText}>
                    No contacts found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addActivityOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addActivityContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    
  },
  addActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginRight:16
  },
  addActivityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  addActivitySaveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf:"center",
    marginRight:16,
  },
  addActivitySaveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Activity Type Tabs
  activityTypeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  // activityTypeTab: {
  //   flex: 1,
  // },
  animatedTabButton: {
    borderRadius: 20
  },
  activeActivityTypeTab: {
    backgroundColor: '#EBF8FF',
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabIconContainer: {
    backgroundColor: '#3B82F6',
  },
  tabIcon: {
    fontSize: 20,
  },
  activityTypeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeActivityTypeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Activity Content
  addActivityContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activitySection: {
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  activityInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  activityTextArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  // Interaction Type Buttons
  interactionTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interactionTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  activeInteractionTypeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  interactionTypeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activeInteractionTypeButtonText: {
    color: '#ffffff',
  },
  // Date Time Row
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  webDateTimeInput: {
    // Container for web datetime inputs
  },
  // Reminder Type Buttons
  reminderTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  activeReminderTypeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  reminderTypeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activeReminderTypeButtonText: {
    color: '#ffffff',
  },
  // Frequency Buttons
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
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
  // Contact picker styles
  readOnlyInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  contactPickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  contactPickerText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  contactPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: "hidden",
  },
  contactPickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    height: '70%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  contactPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  contactSearchContainer: {
    position: 'relative',
    zIndex: 1,
  },
  contactSearchResults: {
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 230,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // overflow: 'hidden',
  },
  contactSearchItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactSearchItemText: {
    fontSize: 16,
    color: '#111827',
  },
  debugText: {
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    padding: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  contactSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  contactItemType: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  emptyContacts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContactsText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
