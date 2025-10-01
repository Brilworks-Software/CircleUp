import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Linking,
  Platform,
  Animated,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import WebCompatibleDateTimePicker from '../../components/WebCompatibleDateTimePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, X, Calendar, Clock, MessageCircle, Phone, Mail, User, ChevronRight, Search, Filter, ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { useRelationships } from '../../firebase/hooks/useRelationships';
import { useReminders } from '../../firebase/hooks/useReminders';
import { useAuth } from '../../firebase/hooks/useAuth';
import { useActivity } from '../../firebase/hooks/useActivity';
import AddActivityModal from '../../components/AddActivityModal';
import EditActivityModal from '../../components/EditActivityModal';
import CreateEditRelationshipModal from '../../components/CreateEditRelationshipModal';
import RemindersService from '../../firebase/services/RemindersService';
import { Tags } from '../../constants/Tags';
import type { Contact, Relationship } from '../../firebase/types';

type LastContactOption = 'today' | 'yesterday' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
type ContactMethod = 'call' | 'text' | 'email' | 'inPerson';
type ReminderFrequency = 'week' | 'month' | '3months' | '6months' | 'never';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    // Use browser's native confirm for simple alerts
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    
    // For alerts with buttons, use confirm for simple cases
    if (buttons.length === 2 && buttons[0].text === 'Cancel' && buttons[1].text === 'OK') {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons[1].onPress) {
        buttons[1].onPress();
      }
      return;
    }
    
    // For relationship exists alerts with multiple options
    if (buttons.length === 3 && buttons[1].text === 'Edit Existing' && buttons[2].text === 'Create New') {
      const result = window.confirm(`${title}\n\n${message}\n\nClick OK to edit existing relationship, or Cancel to create a new one.`);
      if (result) {
        // Edit existing relationship
        if (buttons[1].onPress) {
          buttons[1].onPress();
        }
      } else {
        // Create new relationship
        if (buttons[2].onPress) {
          buttons[2].onPress();
        }
      }
      return;
    }
    
    // For other complex alerts, use confirm as fallback
    const result = window.confirm(`${title}\n\n${message}\n\nClick OK to continue or Cancel to abort.`);
    if (result) {
      // Find the first non-cancel button and execute it
      const actionButton = buttons.find(btn => btn.text !== 'Cancel');
      if (actionButton && actionButton.onPress) {
        actionButton.onPress();
      }
    }
  } else {
    // Use React Native Alert for mobile
    Alert.alert(title, message, buttons);
  }
};

export default function RelationshipsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const { 
    relationships, 
    isLoading: isLoadingRelationships, 
    createRelationship, 
    updateRelationship,
    deleteRelationship
  } = useRelationships();
  
  const { createReminder, deleteReminder } = useReminders();
  const { activities, getActivitiesByTags, getFilteredActivities, createActivity, updateActivity, deleteActivity } = useActivity();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [showRelationshipDetail, setShowRelationshipDetail] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showContactActions, setShowContactActions] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showDetailActions, setShowDetailActions] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [relationshipToEdit, setRelationshipToEdit] = useState<Relationship | null>(null);
  
  // Tag filtering state
  const [showTagFilters, setShowTagFilters] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  
  // Reminder form state
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Device contacts state
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [filteredDeviceContacts, setFilteredDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state (kept for backward compatibility with existing functions)
  const [lastContactOption, setLastContactOption] = useState<LastContactOption>('today');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('call');
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [familyInfo, setFamilyInfo] = useState({ kids: '', siblings: '', spouse: '' });
  const [customDate, setCustomDate] = useState('');
  
  // Contact edit state
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactWebsite, setEditContactWebsite] = useState('');
  const [editContactLinkedin, setEditContactLinkedin] = useState('');
  const [editContactTwitter, setEditContactTwitter] = useState('');
  const [editContactInstagram, setEditContactInstagram] = useState('');
  const [editContactFacebook, setEditContactFacebook] = useState('');
  const [editContactCompany, setEditContactCompany] = useState('');
  const [editContactJobTitle, setEditContactJobTitle] = useState('');
  const [editContactAddress, setEditContactAddress] = useState('');
  const [editContactBirthday, setEditContactBirthday] = useState('');
  const [editContactNotes, setEditContactNotes] = useState('');
  
  // New contact form state
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactWebsite, setNewContactWebsite] = useState('');
  const [newContactLinkedin, setNewContactLinkedin] = useState('');
  const [newContactTwitter, setNewContactTwitter] = useState('');
  const [newContactInstagram, setNewContactInstagram] = useState('');
  const [newContactFacebook, setNewContactFacebook] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactJobTitle, setNewContactJobTitle] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactBirthday, setNewContactBirthday] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  
  // Validation states
  const [contactValidationErrors, setContactValidationErrors] = useState<Record<string, string>>({});
  const [noteValidationErrors, setNoteValidationErrors] = useState<Record<string, string>>({});
  const [familyInfoValidationErrors, setFamilyInfoValidationErrors] = useState<Record<string, string>>({});
  
  // Activity filtering state
  const [activityFilter, setActivityFilter] = useState<'all' | 'note' | 'interaction' | 'reminder'>('all');
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  
  // Editing states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingFamilyInfo, setIsEditingFamilyInfo] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [editedFamilyInfo, setEditedFamilyInfo] = useState({ kids: '', siblings: '', spouse: '' });
  
  // Edit modal states
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showEditFamilyInfoModal, setShowEditFamilyInfoModal] = useState(false);
  
  // Activity creation modal states
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'note' | 'interaction' | 'reminder'>('note');
  
  // Animation states for tabs
  const tabAnimations = useRef({
    note: new Animated.Value(1),
    interaction: new Animated.Value(1),
    reminder: new Animated.Value(1),
  }).current;

  // Handle tab switching with animation
  const handleTabSwitch = (tab: 'note' | 'interaction' | 'reminder') => {
    // Reset all animations
    Object.values(tabAnimations).forEach(anim => anim.setValue(1));
    
    // Animate the selected tab
    Animated.sequence([
      Animated.timing(tabAnimations[tab], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabAnimations[tab], {
        toValue: 1.02,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tabAnimations[tab], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setActiveActivityTab(tab);
  };
  
  // Note activity states
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  
  // Interaction activity states
  const [interactionType, setInteractionType] = useState<'call' | 'text' | 'email' | 'inPerson'>('call');
  const [interactionDate, setInteractionDate] = useState(new Date());
  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionDuration, setInteractionDuration] = useState('');
  const [interactionLocation, setInteractionLocation] = useState('');
  
  // Reminder activity states
  const [activityReminderTitle, setActivityReminderTitle] = useState('');
  const [activityReminderDate, setActivityReminderDate] = useState(new Date());
  const [activityReminderType, setActivityReminderType] = useState('follow_up');
  const [activityReminderFrequency, setActivityReminderFrequency] = useState<'week' | 'month' | '3months' | '6months' | 'never'>('month');
  const [activityReminderNotes, setActivityReminderNotes] = useState('');
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Date picker states
  const [showInteractionDatePicker, setShowInteractionDatePicker] = useState(false);
  const [showInteractionTimePicker, setShowInteractionTimePicker] = useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  const predefinedTags = Object.values(Tags);
  
  // Tag filter options
  const tagFilterOptions = [
    { key: 'all', label: 'All Relationships' },
    ...Object.values(Tags).map(tag => ({ key: tag, label: tag }))
  ];
  
  // Filter relationships based on selected tag
  const filteredRelationships = selectedTagFilter === 'all' 
    ? relationships 
    : relationships.filter(relationship => 
        relationship.tags && relationship.tags.includes(selectedTagFilter)
      );
  
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
  const reminderTypes = [
    { key: 'follow_up', label: 'Follow up' },
    { key: 'birthday', label: 'Birthday' },
    { key: 'anniversary', label: 'Anniversary' },
    { key: 'meeting', label: 'Meeting' },
    { key: 'call', label: 'Call' },
    { key: 'other', label: 'Other' },
  ];
  
  const activityFilterOptions = [
    { key: 'all', label: 'All Activities', icon: '📋' },
    { key: 'note', label: 'Notes', icon: '📝' },
    { key: 'interaction', label: 'Interactions', icon: '🤝' },
    { key: 'reminder', label: 'Reminders', icon: '⏰' },
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
    filterDeviceContacts(contactSearchQuery);
  }, [contactSearchQuery, deviceContacts]);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadDeviceContacts();
    }
  }, [hasPermission]);

  // Debug selectedTags changes

  // Stable function to set tags for editing
  const setTagsForEditing = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);


  const checkPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, skip permission check and set permission to false
        setHasPermission(false);
      } else {
        const { status } = await Contacts.getPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    } catch (error) {
      console.error('Error checking contacts permission:', error);
    }
  };

  const requestPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, skip permission request and set permission to false
        setHasPermission(false);
        return;
      } else {
        const { status } = await Contacts.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
          loadDeviceContacts();
        }
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      showAlert('Error', 'Failed to request contacts permission');
    }
  };

  const loadDeviceContacts = async () => {
    if (!hasPermission) return;
    
    try {
      setIsLoadingDeviceContacts(true);
      
      if (Platform.OS === 'web') {
        // For web, we can't load device contacts using Web Contacts API
        // The Web Contacts API is read-only and doesn't provide a way to list contacts
        setDeviceContacts([]);
        setFilteredDeviceContacts([]);
      } else {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails,
            Contacts.Fields.Image,
            Contacts.Fields.Company,
            Contacts.Fields.JobTitle,
            Contacts.Fields.Addresses,
            Contacts.Fields.Birthday,
            Contacts.Fields.Note,
          ],
        });
        
        // Filter out contacts without names
        const validContacts = data.filter(contact => contact.name && contact.name.trim() !== '');
        setDeviceContacts(validContacts);
        setFilteredDeviceContacts(validContacts);
      }
    } catch (error) {
      console.error('Error loading device contacts:', error);
      showAlert('Error', 'Failed to load device contacts');
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  };

  const filterDeviceContacts = (query: string) => {
    if (!query.trim()) {
      setFilteredDeviceContacts(deviceContacts);
      return;
    }
    
    const filtered = deviceContacts.filter(contact =>
      contact.name?.toLowerCase().includes(query.toLowerCase()) ||
      contact.phoneNumbers?.some(phone => 
        phone.number?.includes(query)
      ) ||
      contact.emails?.some(email => 
        email.email?.toLowerCase().includes(query.toLowerCase())
      )
    );
    setFilteredDeviceContacts(filtered);
  };

  const handleDeviceContactSelect = async (deviceContact: Contacts.Contact) => {
    if (!currentUser) {
      const alertMessage = Platform.OS === 'web'
        ? 'Please log in to add relationships. Make sure you have a stable internet connection.'
        : 'Please log in to add relationships';
      showAlert('Authentication Required', alertMessage);
      return;
    }

    try {
      // Convert device contact to our Contact format
      const newContact: Contact = {
        id: `device_${Date.now()}_${deviceContact.name}`,
        name: deviceContact.name || 'Unknown',
        phoneNumbers: deviceContact.phoneNumbers?.map(phone => ({
          number: phone.number || '',
          label: phone.label || 'mobile'
        })) || [],
        emails: deviceContact.emails?.map(email => ({
          email: email.email || '',
          label: email.label || 'work'
        })) || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Check if relationship already exists by name (since device contacts might have different IDs)
      const existingRelationship = relationships.find(r => 
        r.contactName.toLowerCase() === newContact.name.toLowerCase()
      );
      
      if (existingRelationship) {
        const alertTitle = Platform.OS === 'web' 
          ? 'Relationship Already Exists' 
          : 'Relationship Exists';
        
        const alertMessage = Platform.OS === 'web'
          ? `You already have a relationship with "${newContact.name}". Would you like to edit the existing relationship or create a new one?`
          : `You already have a relationship with ${newContact.name}. Would you like to edit it?`;
        
        const alertButtons = Platform.OS === 'web'
          ? [
              { text: 'Cancel', style: 'cancel' as const },
              { text: 'Edit Existing', onPress: () => editRelationship(existingRelationship) },
              { text: 'Create New', onPress: () => {
                // Allow creating a new relationship with a different name
                const newName = `${newContact.name} (${new Date().getFullYear()})`;
                setSelectedContact({ ...newContact, name: newName, id: `new_${Date.now()}` });
                setShowContactList(false);
                setShowAddModal(true);
              }},
            ]
          : [
              { text: 'Cancel', style: 'cancel' as const },
              { text: 'Edit', onPress: () => editRelationship(existingRelationship) },
            ];
        
        showAlert(alertTitle, alertMessage, alertButtons);
        return;
      }
      
      // Set the selected contact for the relationship form
      setSelectedContact(newContact);
      
      // Populate form fields with contact data
      setEditContactPhone(deviceContact?.phoneNumbers?.[0]?.number || '');
      setEditContactEmail(deviceContact?.emails?.[0]?.email || '');
      setEditContactWebsite(''); // Website not available in Expo Contacts
      setEditContactLinkedin(''); // LinkedIn not available in Expo Contacts
      setEditContactTwitter(''); // Twitter not available in Expo Contacts
      setEditContactInstagram(''); // Instagram not available in Expo Contacts
      setEditContactFacebook(''); // Facebook not available in Expo Contacts
      setEditContactCompany(deviceContact?.company || '');
      setEditContactJobTitle(deviceContact?.jobTitle || '');
      setEditContactAddress(deviceContact?.addresses?.[0]?.street || '');
      setEditContactBirthday(deviceContact?.birthday ? 
        `${deviceContact.birthday.month}/${deviceContact.birthday.day}/${deviceContact.birthday.year}` : '');
      setEditContactNotes(deviceContact?.note || '');
      
      setShowContactList(false);
      setShowAddModal(true);
      
    } catch (error) {
      console.error('Error selecting contact:', error);
      showAlert('Error', 'Failed to select contact');
    }
  };


  const openAddRelationship = () => {
    if(Platform.OS === "web"){
      setShowNewContactModal(true);
      return
    }
    if (!hasPermission) {
      showAlert('No Permission', 'Please allow contact access to add relationships.');
      return;
    }

    
    setShowContactList(true);
  };

  const showRelationshipDetails = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setActivityFilter('all'); // Reset filter when opening relationship details
    setShowRelationshipDetail(true);
  };

  const handleFrequencyChange = async (newFrequency: ReminderFrequency) => {
    if (!selectedRelationship || !currentUser) return;

    try {
      // Calculate new next reminder date based on the new frequency
      const lastContactDate = new Date(selectedRelationship.lastContactDate);
      const nextReminderDate = calculateNextReminderDate(lastContactDate, newFrequency);

      // Update the relationship with new frequency and next reminder date
      await updateRelationship(selectedRelationship.id, {
        reminderFrequency: newFrequency,
        nextReminderDate: nextReminderDate,
      });

      // Update the selected relationship state
      setSelectedRelationship(prev => prev ? {
        ...prev,
        reminderFrequency: newFrequency,
        nextReminderDate: nextReminderDate,
      } : null);

      setShowFrequencyModal(false);
      showAlert('Success', 'Reminder frequency updated successfully!');
    } catch (error) {
      console.error('Error updating reminder frequency:', error);
      showAlert('Error', 'Failed to update reminder frequency.');
    }
  };

  const handleCall = async () => {
    if (!selectedRelationship) return;
    
    // Try to get phone number from stored contact data first, then device contacts
    let phoneNumber = '';
    
    if (selectedRelationship.contactData?.phoneNumbers && selectedRelationship.contactData.phoneNumbers.length > 0) {
      phoneNumber = selectedRelationship.contactData.phoneNumbers[0].number;
    } else {
      // Fallback to device contacts
      const deviceContact = deviceContacts.find(contact => 
        contact.name === selectedRelationship.contactName
      );
      phoneNumber = deviceContact?.phoneNumbers?.[0]?.number || '';
    }
    
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          showAlert('Error', 'Phone app is not available');
        }
      } catch (error) {
        console.error('Error making call:', error);
        showAlert('Error', 'Failed to make call');
      }
    } else {
      showAlert('No Phone Number', 'No phone number available for this contact');
    }
  };

  const handleMessage = async () => {
    if (!selectedRelationship) return;
    
    // Try to get phone number from stored contact data first, then device contacts
    let phoneNumber = '';
    
    if (selectedRelationship.contactData?.phoneNumbers && selectedRelationship.contactData.phoneNumbers.length > 0) {
      phoneNumber = selectedRelationship.contactData.phoneNumbers[0].number;
    } else {
      // Fallback to device contacts
      const deviceContact = deviceContacts.find(contact => 
        contact.name === selectedRelationship.contactName
      );
      phoneNumber = deviceContact?.phoneNumbers?.[0]?.number || '';
    }
    
    if (phoneNumber) {
      const url = `sms:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          showAlert('Error', 'SMS app is not available');
        }
      } catch (error) {
        console.error('Error opening SMS:', error);
        showAlert('Error', 'Failed to open SMS');
      }
    } else {
      showAlert('No Phone Number', 'No phone number available for this contact');
    }
  };

  const handleWhatsApp = async () => {
    if (!selectedRelationship) return;
    
    // Try to get phone number from stored contact data first, then device contacts
    let phoneNumber = '';
    
    if (selectedRelationship.contactData?.phoneNumbers && selectedRelationship.contactData.phoneNumbers.length > 0) {
      phoneNumber = selectedRelationship.contactData.phoneNumbers[0].number;
    } else {
      // Fallback to device contacts
      const deviceContact = deviceContacts.find(contact => 
        contact.name === selectedRelationship.contactName
      );
      phoneNumber = deviceContact?.phoneNumbers?.[0]?.number || '';
    }
    
    if (phoneNumber) {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
      
      // Use different URL schemes for web vs mobile
      const url = Platform.OS === 'web' 
        ? `https://wa.me/${cleanPhoneNumber}`
        : `whatsapp://send?phone=${cleanPhoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          showAlert('Error', Platform.OS === 'web' ? 'Unable to open WhatsApp Web' : 'WhatsApp is not installed');
        }
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
        showAlert('Error', 'Failed to open WhatsApp');
      }
    } else {
      showAlert('No Phone Number', 'No phone number available for this contact');
    }
  };

  const handleEmail = async () => {
    if (!selectedRelationship) return;
    
    // Try to get email from stored contact data first, then device contacts
    let email = '';
    
    if (selectedRelationship.contactData?.emails && selectedRelationship.contactData.emails.length > 0) {
      email = selectedRelationship.contactData.emails[0].email;
    } else {
      // Fallback to device contacts
      const deviceContact = deviceContacts.find(contact => 
        contact.name === selectedRelationship.contactName
      );
      email = deviceContact?.emails?.[0]?.email || '';
    }
    
    if (email) {
      const url = `mailto:${email}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          showAlert('Error', 'Email app is not available');
        }
      } catch (error) {
        console.error('Error opening email:', error);
        showAlert('Error', 'Failed to open email');
      }
    } else {
      showAlert('No Email', 'No email address available for this contact');
    }
  };

  const handleFindOnX = async () => {
    if (!selectedRelationship) return;
    
    const searchQuery = encodeURIComponent(selectedRelationship.contactName);
    const url = `https://x.com/search?q=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
      setShowMoreActions(false);
    } catch (error) {
      console.error('Error opening X search:', error);
      showAlert('Error', 'Unable to open X. Please check if you have a browser installed.');
    }
  };

  const handleFindOnLinkedIn = async () => {
    if (!selectedRelationship) return;
    
    const searchQuery = encodeURIComponent(selectedRelationship.contactName);
    const url = `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`;
    
    try {
      // Try to open the URL directly
      await Linking.openURL(url);
      setShowMoreActions(false);
    } catch (error) {
      console.error('Error opening LinkedIn search:', error);
      // If direct opening fails, try with a simpler LinkedIn URL
      try {
        const fallbackUrl = `https://www.linkedin.com/search/results/all/?keywords=${searchQuery}`;
        await Linking.openURL(fallbackUrl);
        setShowMoreActions(false);
      } catch (fallbackError) {
        console.error('Error opening LinkedIn fallback:', fallbackError);
        showAlert('Error', 'Unable to open LinkedIn. Please check if you have a browser installed.');
      }
    }
  };

  const handleFindOnGoogle = async () => {
    if (!selectedRelationship) return;
    
    const searchQuery = encodeURIComponent(selectedRelationship.contactName);
    const url = `https://www.google.com/search?q=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
      setShowMoreActions(false);
    } catch (error) {
      console.error('Error opening Google search:', error);
      showAlert('Error', 'Unable to open Google. Please check if you have a browser installed.');
    }
  };

  const handleFindOnFacebook = async () => {
    if (!selectedRelationship) return;
    
    const searchQuery = encodeURIComponent(selectedRelationship.contactName);
    const url = `https://www.facebook.com/search/people/?q=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
      setShowMoreActions(false);
    } catch (error) {
      console.error('Error opening Facebook search:', error);
      showAlert('Error', 'Unable to open Facebook. Please check if you have a browser installed.');
    }
  };

  const handleEditRelationship = () => {
    setShowDetailActions(false);
    setShowRelationshipDetail(false);
    if (selectedRelationship) {
      setRelationshipToEdit(selectedRelationship);
      setShowEditModal(true);
    }
  };

  const handleShareRelationship = async () => {
    if (!selectedRelationship) return;
    
    const shareText = `Contact: ${selectedRelationship.contactName}\n` +
      `Last Contact: ${new Date(selectedRelationship.lastContactDate).toLocaleDateString()}\n` +
      `Last Contact Method: ${selectedRelationship.lastContactMethod}\n` +
      `Next Reminder: ${selectedRelationship.nextReminderDate ? new Date(selectedRelationship.nextReminderDate).toLocaleDateString() : 'No reminder set'}\n` +
      `Tags: ${selectedRelationship.tags.join(', ') || 'No tags'}\n` +
      `Notes: ${selectedRelationship.notes || 'No notes'}`;
    
    try {
      // For React Native, we'll use the Share API
      const { Share } = require('react-native');
      await Share.share({
        message: shareText,
        title: `Contact: ${selectedRelationship.contactName}`,
      });
      setShowDetailActions(false);
    } catch (error) {
      console.error('Error sharing relationship:', error);
      showAlert('Error', 'Failed to share contact information');
    }
  };


  const handleDeleteRelationship = async (relationshipId: string, contactName: string) => {
    if (!currentUser) {
      showAlert('Error', 'Please log in to delete relationships');
      return;
    }

    showAlert(
      'Delete Relationship',
      `Are you sure you want to delete the relationship with ${contactName}? This will also delete all associated reminders and activities.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              
              // Get all reminders for this relationship
              const relationshipReminders = activities
                .filter(activity => activity.type === 'reminder' && activity.contactName === contactName)
                .map(activity => (activity as any).reminderId)
                .filter(Boolean);


              // Get all activities for this relationship
              const relationshipActivities = activities
                .filter(activity => activity.contactName === contactName);


              // Delete all reminders
              const remindersService = RemindersService.getInstance();
              for (const reminderId of relationshipReminders) {
                try {
                  await remindersService.deleteReminder(currentUser.uid, reminderId);
                } catch (error) {
                  console.error('❌ Error deleting reminder:', reminderId, error);
                  // Continue with other deletions even if one fails
                }
              }

              // Delete all activities
              for (const activity of relationshipActivities) {
                try {
                  await deleteActivity(activity.id);
                } catch (error) {
                  console.error('❌ Error deleting activity:', activity.id, error);
                  // Continue with other deletions even if one fails
                }
              }

              // Finally, delete the relationship
              await deleteRelationship(relationshipId);

              // Close any open modals
              setShowDetailActions(false);
              setShowRelationshipDetail(false);
              setSelectedRelationship(null);

              showAlert('Success', `Relationship with ${contactName} and all associated data has been deleted successfully.`);
            } catch (error) {
              console.error('❌ Error deleting relationship:', error);
              showAlert('Error', 'Failed to delete relationship. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleAddReminder = () => {
    setShowDetailActions(false);
    setShowAddReminderModal(true);
    // Reset form with default values - set date to tomorrow and time to 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    setReminderNote('');
    setReminderDate(tomorrow);
    setReminderTime(tomorrow);
  };

  const handleCreateReminder = async () => {
    if (!selectedRelationship || !currentUser) return;
    
    
    // Validation: Check if note is not empty
    if (!reminderNote || reminderNote.trim() === '') {
      showAlert('Validation Error', 'Please enter a note for the reminder.');
      return;
    }
    
    // Validation: Check if reminder date/time is in the future
    const combinedDateTime = new Date(reminderDate);
    combinedDateTime.setHours(reminderTime.getHours());
    combinedDateTime.setMinutes(reminderTime.getMinutes());
    
    const now = new Date();
    if (combinedDateTime <= now) {
      showAlert('Validation Error', 'Please select a future date and time for the reminder.');
      return;
    }
    
    try {
      // Create a new reminder for this relationship
      const newReminder = await createReminder({
        contactName: selectedRelationship.contactName,
        contactId: selectedRelationship.contactId,
        relationshipId: selectedRelationship.id,
        type: 'follow_up',
        date: combinedDateTime.toISOString(),
        frequency: selectedRelationship.reminderFrequency,
        tags: selectedRelationship.tags,
        notes: reminderNote.trim(),
      });
      
      setShowAddReminderModal(false);
      showAlert('Success', 'Reminder added successfully!');
    } catch (error) {
      console.error('❌ Error adding reminder:', error);
      showAlert('Error', `Failed to add reminder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const selectContact = (contact: Contact) => {
    // Check if relationship already exists
    const existingRelationship = relationships.find(r => r.contactId === contact.id);
    if (existingRelationship) {
      const alertTitle = Platform.OS === 'web' 
        ? 'Relationship Already Exists' 
        : 'Relationship Exists';
      
      const alertMessage = Platform.OS === 'web'
        ? `You already have a relationship with "${contact.name}". Would you like to edit the existing relationship or create a new one?`
        : `You already have a relationship with ${contact.name}. Would you like to edit it?`;
      
      const alertButtons = Platform.OS === 'web'
        ? [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Edit Existing', onPress: () => editRelationship(existingRelationship) },
            { text: 'Create New', onPress: () => {
              // Allow creating a new relationship with a different name
              const newName = `${contact.name} (${new Date().getFullYear()})`;
              setSelectedContact({ ...contact, name: newName, id: `new_${Date.now()}` });
              setShowContactList(false);
              setShowAddModal(true);
            }},
          ]
        : [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Edit', onPress: () => editRelationship(existingRelationship) },
          ];
      
      showAlert(alertTitle, alertMessage, alertButtons);
      return;
    }

    setSelectedContact(contact);
    setShowContactList(false);
    setShowAddModal(true);
  };

  const editRelationship = (relationship: Relationship) => {
    
    // Check each tag individually
    relationship.tags?.forEach((tag, index) => {
      // Tag validation logic
    });
    
    // Filter tags first
    const filteredTags = relationship.tags?.filter(tag => predefinedTags.includes(tag)) || [];
    
    // Use stored contact data from relationship, fallback to device contact if not available
    const deviceContact = deviceContacts.find(contact => 
      contact.name === relationship.contactName
    );
    
    // Get contact data from relationship or fallback to device contact
    const contactData = relationship.contactData || {};
    
    // Set all form data including tags
    setSelectedContact({ 
      id: relationship.contactId, 
      name: relationship.contactName,
      phoneNumbers: contactData.phoneNumbers || deviceContact?.phoneNumbers?.map(p => ({ number: p.number || '', label: p.label })) || [],
      emails: contactData.emails || deviceContact?.emails?.map(e => ({ email: e.email || '', label: e.label })) || [],
      website: contactData.website || '',
      linkedin: contactData.linkedin || '',
      twitter: contactData.twitter || '',
      instagram: contactData.instagram || '',
      facebook: contactData.facebook || '',
      company: contactData.company || deviceContact?.company || '',
      jobTitle: contactData.jobTitle || deviceContact?.jobTitle || '',
      address: contactData.address || deviceContact?.addresses?.[0]?.street || '',
      birthday: contactData.birthday || (deviceContact?.birthday ? 
        `${deviceContact.birthday.month}/${deviceContact.birthday.day}/${deviceContact.birthday.year}` : ''),
      notes: contactData.notes || deviceContact?.note || '',
    });
    
    // Set contact edit fields from stored contact data or device contact
    setEditContactPhone(contactData.phoneNumbers?.[0]?.number || deviceContact?.phoneNumbers?.[0]?.number || '');
    setEditContactEmail(contactData.emails?.[0]?.email || deviceContact?.emails?.[0]?.email || '');
    setEditContactWebsite(contactData.website || '');
    setEditContactLinkedin(contactData.linkedin || '');
    setEditContactTwitter(contactData.twitter || '');
    setEditContactInstagram(contactData.instagram || '');
    setEditContactFacebook(contactData.facebook || '');
    setEditContactCompany(contactData.company || deviceContact?.company || '');
    setEditContactJobTitle(contactData.jobTitle || deviceContact?.jobTitle || '');
    setEditContactAddress(contactData.address || deviceContact?.addresses?.[0]?.street || '');
    setEditContactBirthday(contactData.birthday || (deviceContact?.birthday ? 
      `${deviceContact.birthday.month}/${deviceContact.birthday.day}/${deviceContact.birthday.year}` : ''));
    setEditContactNotes(contactData.notes || deviceContact?.note || '');
    
    const lastContactOption = getLastContactOptionFromDate(relationship.lastContactDate);
    setLastContactOption(lastContactOption);
    setContactMethod(relationship.lastContactMethod as ContactMethod);
    setReminderFrequency(relationship.reminderFrequency as ReminderFrequency);
    setNotes(relationship.notes);
    setFamilyInfo(relationship.familyInfo);
    setTagsForEditing(filteredTags); // Set tags using stable function
    
    // Set custom date if last contact option is custom
    if (lastContactOption === 'custom') {
      const lastContactDate = new Date(relationship.lastContactDate);
      setCustomDate(lastContactDate.toISOString().slice(0, 10));
    } else {
      setCustomDate('');
    }
    
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

  // saveRelationship function removed - now handled by CreateEditRelationshipModal

  const resetForm = () => {
    setSelectedContact(null);
    setLastContactOption('today');
    setContactMethod('call');
    setReminderFrequency('month');
    setSelectedTags([]);
    setNotes('');
    setFamilyInfo({ kids: '', siblings: '', spouse: '' });
    setCustomDate('');
    
    // Reset contact edit fields
    setEditContactPhone('');
    setEditContactEmail('');
    setEditContactWebsite('');
    setEditContactLinkedin('');
    setEditContactTwitter('');
    setEditContactInstagram('');
    setEditContactFacebook('');
    setEditContactCompany('');
    setEditContactJobTitle('');
    setEditContactAddress('');
    setEditContactBirthday('');
    setEditContactNotes('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };



  // Web-compatible contact creation using Web Contacts API
  const createWebContact = async (contactData: any) => {
    if (!('contacts' in navigator)) {
      throw new Error('Web Contacts API not supported in this browser');
    }

    try {
      // Create contact properties for Web Contacts API
      const contactProperties: any = {
        name: [contactData.name],
      };

      // Add phone numbers
      if (contactData.phoneNumbers && contactData.phoneNumbers.length > 0) {
        contactProperties.tel = contactData.phoneNumbers.map((phone: any) => phone.number);
      }

      // Add emails
      if (contactData.emails && contactData.emails.length > 0) {
        contactProperties.email = contactData.emails.map((email: any) => email.email);
      }

      // Add organization info
      if (contactData.company) {
        contactProperties.org = contactData.company;
      }

      // Add job title as note
      if (contactData.jobTitle) {
        contactProperties.note = contactData.jobTitle;
      }

      // Add address
      if (contactData.addresses && contactData.addresses.length > 0) {
        contactProperties.adr = contactData.addresses.map((addr: any) => [
          '', // P.O. Box
          '', // Extended Address
          addr.street || '', // Street Address
          '', // Locality
          addr.city || '', // Region
          addr.postalCode || '', // Postal Code
          addr.country || '' // Country Name
        ]);
      }

      // Add website
      if (contactData.website) {
        contactProperties.url = [contactData.website];
      }


      // Use Web Contacts API to create contact
      const contact = await (navigator as any).contacts.create(contactProperties);
      return contact;
    } catch (error) {
      console.error('❌ Error creating web contact:', error);
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('not supported')) {
          throw new Error('Web Contacts API not supported in this browser');
        } else if (error.message.includes('permission')) {
          throw new Error('Permission denied for Web Contacts API');
        } else if (error.message.includes('network')) {
          throw new Error('Network error while creating contact');
        } else {
          throw new Error(`Web contact creation failed: ${error.message}`);
        }
      } else {
        throw new Error('Unknown error occurred while creating web contact');
      }
    }
  };

  // Validation helper functions
  const validateContactEmail = (email: string): boolean => {
    if (!email) return true; // Empty email is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateContactPhone = (phone: string): boolean => {
    if (!phone) return true; // Empty phone is valid (optional field)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  };

  const validateContactURL = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid (optional field)
    
    // Clean the URL
    let cleanUrl = url.trim();
    
    // Add protocol if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    try {
      const urlObj = new URL(cleanUrl);
      
      // Check if it's a valid protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Check if hostname is valid (not empty and has at least one dot for domain)
      if (!urlObj.hostname || !urlObj.hostname.includes('.')) {
        return false;
      }
      
      // Check for valid domain structure
      const domainParts = urlObj.hostname.split('.');
      if (domainParts.length < 2) {
        return false;
      }
      
      // Check that each part of the domain is not empty
      for (const part of domainParts) {
        if (!part || part.length === 0) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  };

  const validateContactBirthday = (birthday: string): boolean => {
    if (!birthday) return true; // Empty birthday is valid (optional field)
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!dateRegex.test(birthday)) return false;
    
    const [month, day, year] = birthday.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day &&
           year >= 1900 && 
           year <= new Date().getFullYear();
  };

  const validateContactForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate required fields
    if (!newContactName.trim()) {
      errors.contactName = 'Contact name is required';
    } else if (newContactName.trim().length < 2) {
      errors.contactName = 'Contact name must be at least 2 characters long';
    }

    // Validate contact information fields
    if (newContactEmail && !validateContactEmail(newContactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }

    if (newContactPhone && !validateContactPhone(newContactPhone)) {
      errors.contactPhone = 'Please enter a valid phone number';
    }

    if (newContactWebsite && !validateContactURL(newContactWebsite)) {
      errors.contactWebsite = 'Please enter a valid website URL (e.g., https://example.com)';
    }

    if (newContactLinkedin && !validateContactURL(newContactLinkedin)) {
      errors.contactLinkedin = 'Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)';
    }

    if (newContactTwitter && newContactTwitter.trim()) {
      // Twitter can be either a handle (@username) or URL
      const isHandle = newContactTwitter.startsWith('@');
      const isURL = newContactTwitter.startsWith('http') || newContactTwitter.includes('.');
      
      if (!isHandle && !isURL) {
        errors.contactTwitter = 'Please enter a valid Twitter handle (@username) or URL';
      } else if (isURL && !validateContactURL(newContactTwitter)) {
        errors.contactTwitter = 'Please enter a valid Twitter URL (e.g., https://twitter.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9_]{1,15}$/;
        if (!handleRegex.test(newContactTwitter)) {
          errors.contactTwitter = 'Please enter a valid Twitter handle (@username, 1-15 characters, letters, numbers, and underscores only)';
        }
      }
    }

    if (newContactInstagram && newContactInstagram.trim()) {
      // Instagram can be either a handle (@username) or URL
      const isHandle = newContactInstagram.startsWith('@');
      const isURL = newContactInstagram.startsWith('http') || newContactInstagram.includes('.');
      
      if (!isHandle && !isURL) {
        errors.contactInstagram = 'Please enter a valid Instagram handle (@username) or URL';
      } else if (isURL && !validateContactURL(newContactInstagram)) {
        errors.contactInstagram = 'Please enter a valid Instagram URL (e.g., https://instagram.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9._]{1,30}$/;
        if (!handleRegex.test(newContactInstagram)) {
          errors.contactInstagram = 'Please enter a valid Instagram handle (@username, 1-30 characters, letters, numbers, dots, and underscores only)';
        }
      }
    }

    if (newContactFacebook && !validateContactURL(newContactFacebook)) {
      errors.contactFacebook = 'Please enter a valid Facebook URL (e.g., https://facebook.com/username)';
    }

    if (newContactBirthday && !validateContactBirthday(newContactBirthday)) {
      errors.contactBirthday = 'Please enter a valid birthday (MM/DD/YYYY)';
    }

    // Validate company and job title content
    if (newContactCompany && newContactCompany.trim()) {
      if (newContactCompany.length > 100) {
        errors.contactCompany = 'Company name must be 100 characters or less';
      } else if (newContactCompany.trim().length < 2) {
        errors.contactCompany = 'Company name must be at least 2 characters long';
      } else if (!/^[a-zA-Z0-9\s\-&.,'()]+$/.test(newContactCompany.trim())) {
        errors.contactCompany = 'Company name contains invalid characters';
      }
    }

    if (newContactJobTitle && newContactJobTitle.trim()) {
      if (newContactJobTitle.length > 100) {
        errors.contactJobTitle = 'Job title must be 100 characters or less';
      } else if (newContactJobTitle.trim().length < 2) {
        errors.contactJobTitle = 'Job title must be at least 2 characters long';
      } else if (!/^[a-zA-Z0-9\s\-&.,'()]+$/.test(newContactJobTitle.trim())) {
        errors.contactJobTitle = 'Job title contains invalid characters';
      }
    }

    // Validate character limits
    if (newContactAddress && newContactAddress.length > 200) {
      errors.contactAddress = 'Address must be 200 characters or less';
    }

    if (newContactNotes && newContactNotes.length > 500) {
      errors.contactNotes = 'Notes must be 500 characters or less';
    }

    setContactValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNoteForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editedNote && editedNote.length > 1000) {
      errors.note = 'Note must be 1000 characters or less';
    }

    setNoteValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateFamilyInfoForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editedFamilyInfo.spouse && editedFamilyInfo.spouse.length > 100) {
      errors.familySpouse = 'Spouse information must be 100 characters or less';
    }

    if (editedFamilyInfo.kids && editedFamilyInfo.kids.length > 200) {
      errors.familyKids = 'Kids information must be 200 characters or less';
    }

    if (editedFamilyInfo.siblings && editedFamilyInfo.siblings.length > 200) {
      errors.familySiblings = 'Siblings information must be 200 characters or less';
    }

    setFamilyInfoValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearContactFieldError = (fieldName: string) => {
    if (contactValidationErrors[fieldName]) {
      setContactValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const clearNoteFieldError = (fieldName: string) => {
    if (noteValidationErrors[fieldName]) {
      setNoteValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const clearFamilyInfoFieldError = (fieldName: string) => {
    if (familyInfoValidationErrors[fieldName]) {
      setFamilyInfoValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const resetNewContactForm = () => {
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactWebsite('');
    setNewContactLinkedin('');
    setNewContactTwitter('');
    setNewContactInstagram('');
    setNewContactFacebook('');
    setNewContactCompany('');
    setNewContactJobTitle('');
    setNewContactAddress('');
    setNewContactBirthday('');
    setNewContactNotes('');
    setContactValidationErrors({});
  };

  const createNewContactAndRelationship = async () => {
    if (!validateContactForm()) {
      return;
    }

    // Handle web platform differently
    if (Platform.OS === 'web') {
      // For web, we'll create the contact using Web Contacts API if available
      // but proceed with relationship creation regardless
      await proceedWithContactCreation();
      return;
    }

    // Check and request permission if needed for mobile platforms
    if (!hasPermission) {
      const { status } = await Contacts.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        showAlert(
          'Permission Required',
          'Contact access is needed to add contacts to your device. You can still create the relationship without device contact access.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue Anyway', onPress: () => proceedWithContactCreation() }
          ]
        );
        return;
      }
    }

    await proceedWithContactCreation();
  };

  const updateDeviceContact = async (contact: Contacts.Contact, contactData: any) => {
    if (!hasPermission) {
      return false;
    }

    try {
      
      // Create update object with proper Expo Contacts structure
      const updatedContact: any = {
        id: (contact as any).id,
        contactType: contact.contactType || 'person',
      };

      // Add name fields
      if (contactData[Contacts.Fields.Name]) {
        updatedContact.name = contactData[Contacts.Fields.Name];
      }
      if (contactData[Contacts.Fields.FirstName]) {
        updatedContact.firstName = contactData[Contacts.Fields.FirstName];
      }
      if (contactData[Contacts.Fields.LastName]) {
        updatedContact.lastName = contactData[Contacts.Fields.LastName];
      }

      // Add phone numbers with proper structure
      if (contactData[Contacts.Fields.PhoneNumbers] && contactData[Contacts.Fields.PhoneNumbers].length > 0) {
        updatedContact.phoneNumbers = contactData[Contacts.Fields.PhoneNumbers].map((phone: any) => ({
          number: phone.number,
          label: phone.label || 'mobile',
          isPrimary: false, // Don't set isPrimary to avoid conflicts
        }));
      }

      // Add emails with proper structure
      if (contactData[Contacts.Fields.Emails] && contactData[Contacts.Fields.Emails].length > 0) {
        updatedContact.emails = contactData[Contacts.Fields.Emails].map((email: any) => ({
          email: email.email,
          label: email.label || 'work',
          isPrimary: false, // Don't set isPrimary to avoid conflicts
        }));
      }

      // Add company and job title
      if (contactData[Contacts.Fields.Company]) {
        updatedContact.company = contactData[Contacts.Fields.Company];
      }
      if (contactData[Contacts.Fields.JobTitle]) {
        updatedContact.jobTitle = contactData[Contacts.Fields.JobTitle];
      }

      // Add addresses with proper structure
      if (contactData[Contacts.Fields.Addresses] && contactData[Contacts.Fields.Addresses].length > 0) {
        updatedContact.addresses = contactData[Contacts.Fields.Addresses].map((address: any) => ({
          street: address.street,
          city: address.city || '',
          state: address.state || '',
          postalCode: address.postalCode || '',
          country: address.country || '',
          label: address.label || 'home',
          isPrimary: false, // Don't set isPrimary to avoid conflicts
        }));
      }

      // Add note
      if (contactData[Contacts.Fields.Note]) {
        updatedContact.note = contactData[Contacts.Fields.Note];
      }
      
      await Contacts.updateContactAsync(updatedContact);
      return true;
    } catch (error) {
      console.error('❌ Error updating device contact:', error);
      console.error('❌ Contact data that failed:', contactData);
      return false;
    }
  };

  const proceedWithContactCreation = async () => {

    // Check if relationship already exists by name
    const existingRelationship = relationships.find(r => 
      r.contactName.toLowerCase() === newContactName.trim().toLowerCase()
    );
    
    if (existingRelationship) {
      const alertTitle = Platform.OS === 'web' 
        ? 'Relationship Already Exists' 
        : 'Relationship Exists';
      
      const alertMessage = Platform.OS === 'web'
        ? `You already have a relationship with "${newContactName.trim()}". Would you like to edit the existing relationship or create a new one?`
        : `You already have a relationship with ${newContactName.trim()}. Would you like to edit it?`;
      
      const alertButtons = Platform.OS === 'web'
        ? [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Edit Existing', onPress: () => editRelationship(existingRelationship) },
            { text: 'Create New', onPress: () => {
              // Allow creating a new relationship with a different name
              const newName = `${newContactName.trim()} (${new Date().getFullYear()})`;
              setNewContactName(newName);
              // Continue with the creation process
            }},
          ]
        : [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Edit', onPress: () => editRelationship(existingRelationship) },
          ];
      
      showAlert(alertTitle, alertMessage, alertButtons);
      return;
    }

    try {
      // Create contact in device contacts if permission is granted (mobile) or web
      if (hasPermission || Platform.OS === 'web') {
        // Parse the name into givenName and familyName
        const fullName = newContactName.trim();
        const nameParts = fullName.split(' ');
        const givenName = nameParts[0] || '';
        const familyName = nameParts.slice(1).join(' ') || '';

        const contactData: any = {
          [Contacts.Fields.FirstName]: givenName,
          [Contacts.Fields.LastName]: familyName,
          [Contacts.Fields.Name]: fullName,
        };

        // Add phone number if provided
        if (newContactPhone.trim()) {
          contactData[Contacts.Fields.PhoneNumbers] = [{ 
            number: newContactPhone.trim(), 
            label: 'mobile',
            isPrimary: true
          }];
        }

        // Add email if provided
        if (newContactEmail.trim()) {
          contactData[Contacts.Fields.Emails] = [{ 
            email: newContactEmail.trim(), 
            label: 'work',
            isPrimary: true
          }];
        }

        // Add company and job title as organization info
        if (newContactCompany.trim() || newContactJobTitle.trim()) {
          contactData[Contacts.Fields.Company] = newContactCompany.trim() || '';
          contactData[Contacts.Fields.JobTitle] = newContactJobTitle.trim() || '';
        }

        // Add address if provided
        if (newContactAddress.trim()) {
          contactData[Contacts.Fields.Addresses] = [{ 
            street: newContactAddress.trim(), 
            label: 'home',
            isPrimary: true
          }];
        }

        // Add birthday if provided
        if (newContactBirthday.trim()) {
          contactData[Contacts.Fields.Birthday] = { 
            day: 1, 
            month: 1, 
            year: new Date().getFullYear() // Default year, user can edit later
          };
        }

        // Add notes if provided
        if (newContactNotes.trim()) {
          contactData[Contacts.Fields.Note] = newContactNotes.trim();
        }

        try {
          if (Platform.OS === 'web') {
            // Use Web Contacts API for web platform
            const webContact = await createWebContact({
              name: fullName,
              phoneNumbers: contactData[Contacts.Fields.PhoneNumbers] || [],
              emails: contactData[Contacts.Fields.Emails] || [],
              company: contactData[Contacts.Fields.Company] || '',
              jobTitle: contactData[Contacts.Fields.JobTitle] || '',
              addresses: contactData[Contacts.Fields.Addresses] || [],
              website: newContactWebsite.trim() || undefined,
            });
          } else {
            // Use Expo Contacts for mobile platforms
            const contactId = await Contacts.addContactAsync(contactData);
          }
        } catch (contactError) {
          console.error('❌ Error adding contact to device:', contactError);
          console.error('❌ Contact data that failed:', contactData);
          
          // Show platform-specific error messages
          if (Platform.OS === 'web') {
            const errorMessage = contactError instanceof Error ? contactError.message : 'Unknown error';
            showAlert(
              'Web Contact Creation Failed',
              `Unable to create contact in your device contacts: ${errorMessage}. The relationship will still be created.`,
              [{ text: 'OK' }]
            );
          } else {
            showAlert(
              'Contact Creation Failed',
              'Unable to add contact to device contacts. The relationship will still be created.',
              [{ text: 'OK' }]
            );
          }
          // Continue with relationship creation even if device contact fails
        }
      } else {
        // No permission to add contact to device
      }

      // Create a contact object for the relationship
      const newContact = {
        id: `new_${Date.now()}`, // Generate a temporary ID
        name: newContactName.trim(),
        phoneNumbers: newContactPhone.trim() ? [{ number: newContactPhone.trim(), label: 'mobile' }] : [],
        emails: newContactEmail.trim() ? [{ email: newContactEmail.trim(), label: 'work' }] : [],
        website: newContactWebsite.trim() || undefined,
        linkedin: newContactLinkedin.trim() || undefined,
        twitter: newContactTwitter.trim() || undefined,
        instagram: newContactInstagram.trim() || undefined,
        facebook: newContactFacebook.trim() || undefined,
        company: newContactCompany.trim() || undefined,
        jobTitle: newContactJobTitle.trim() || undefined,
        address: newContactAddress.trim() || undefined,
        birthday: newContactBirthday.trim() || undefined,
        notes: newContactNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set the new contact as selected and open the relationship form
      setSelectedContact(newContact);
      
      // Populate form fields with the new contact data
      setEditContactPhone(newContactPhone.trim());
      setEditContactEmail(newContactEmail.trim());
      setEditContactWebsite(newContactWebsite.trim());
      setEditContactLinkedin(newContactLinkedin.trim());
      setEditContactTwitter(newContactTwitter.trim());
      setEditContactInstagram(newContactInstagram.trim());
      setEditContactFacebook(newContactFacebook.trim());
      setEditContactCompany(newContactCompany.trim());
      setEditContactJobTitle(newContactJobTitle.trim());
      setEditContactAddress(newContactAddress.trim());
      setEditContactBirthday(newContactBirthday.trim());
      setEditContactNotes(newContactNotes.trim());
      
      setShowNewContactModal(false);
      setShowAddModal(true);

      // Reset the new contact form
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setNewContactWebsite('');
      setNewContactLinkedin('');
      setNewContactTwitter('');
      setNewContactInstagram('');
      setNewContactFacebook('');
      setNewContactCompany('');
      setNewContactJobTitle('');
      setNewContactAddress('');
      setNewContactBirthday('');
      setNewContactNotes('');

      const successMessage = Platform.OS === 'web' 
        ? 'Contact created and ready for relationship setup!'
        : hasPermission 
          ? 'Contact created and added to device contacts!'
          : 'Contact created! (Device contact access not granted)';
      showAlert('Success', successMessage);
    } catch (error) {
      console.error('Error creating contact:', error);
      
      // Show platform-specific error messages
      if (Platform.OS === 'web') {
        showAlert(
          'Web Contact Creation Error',
          'Failed to create contact. This may be due to browser limitations or network issues. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Error', 'Failed to create contact. Please try again.');
      }
    }
  };

  // Get activities for the selected relationship
  const getContactActivities = () => {
    if (!selectedRelationship) return [];
    
    // Filter activities that are related to this contact
    const contactActivities = activities.filter(activity => {
      if (activity.type === 'interaction' || activity.type === 'reminder') {
        return (activity as any).contactName === selectedRelationship.contactName;
      }
      // For notes, check if they have the same contactId or contactName
      if (activity.type === 'note') {
        const noteActivity = activity as any;
        // Check if note has contact information and matches
        if (noteActivity.contactId || noteActivity.contactName) {
          return noteActivity.contactId === selectedRelationship.contactId || 
                 noteActivity.contactName === selectedRelationship.contactName;
        }
        // For notes without contact info, we'll show them for now (backward compatibility)
        // In the future, you might want to filter these out or handle them differently
        return false;
      }
      return false;
    });


    // Apply type filter
    if (activityFilter === 'all') {
      return contactActivities;
    }
    
    const filteredActivities = contactActivities.filter(activity => {
      return activity.type === activityFilter;
    });
    
    return filteredActivities;
  };

  // Handle editing functions
  const openEditNoteModal = () => {
    setEditedNote(selectedRelationship?.notes || '');
    setShowEditNoteModal(true);
  };

  const closeEditNoteModal = () => {
    setEditedNote('');
    setNoteValidationErrors({});
    setShowEditNoteModal(false);
  };

  const saveNote = async () => {
    if (!selectedRelationship || !currentUser) return;
    
    if (!validateNoteForm()) {
      return;
    }
    
    try {
      await updateRelationship(selectedRelationship.id, { notes: editedNote });
      
      // Update the selected relationship state to reflect the changes immediately
      setSelectedRelationship(prev => prev ? {
        ...prev,
        notes: editedNote,
      } : null);
      
      setShowEditNoteModal(false);
      setEditedNote('');
    } catch (error) {
      console.error('Error updating note:', error);
      showAlert('Error', 'Failed to update note. Please try again.');
    }
  };

  const openEditFamilyInfoModal = () => {
    setEditedFamilyInfo(selectedRelationship?.familyInfo || { kids: '', siblings: '', spouse: '' });
    setShowEditFamilyInfoModal(true);
  };

  const closeEditFamilyInfoModal = () => {
    setEditedFamilyInfo({ kids: '', siblings: '', spouse: '' });
    setFamilyInfoValidationErrors({});
    setShowEditFamilyInfoModal(false);
  };

  const saveFamilyInfo = async () => {
    if (!selectedRelationship || !currentUser) return;
    
    if (!validateFamilyInfoForm()) {
      return;
    }
    
    try {
      await updateRelationship(selectedRelationship.id, { familyInfo: editedFamilyInfo });
      
      // Update the selected relationship state to reflect the changes immediately
      setSelectedRelationship(prev => prev ? {
        ...prev,
        familyInfo: editedFamilyInfo,
      } : null);
      
      setShowEditFamilyInfoModal(false);
      setEditedFamilyInfo({ kids: '', siblings: '', spouse: '' });
    } catch (error) {
      console.error('Error updating family info:', error);
      showAlert('Error', 'Failed to update family info. Please try again.');
    }
  };

  // Activity creation functions
  const openAddActivityModal = () => {
    setShowAddActivityModal(true);
    setActiveActivityTab('note');
    resetActivityForm();
  };

  // Date picker openers (matching reminders.tsx approach)
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

  const closeAddActivityModal = () => {
    setShowAddActivityModal(false);
    resetActivityForm();
  };

  const openEditActivityModal = (activity: any) => {
    setSelectedActivity(activity);
    setShowEditActivityModal(true);
  };

  const closeEditActivityModal = () => {
    setShowEditActivityModal(false);
    setSelectedActivity(null);
  };


  const handleDeleteActivity = async (activity: any) => {
    showAlert(
      'Delete Activity',
      `Are you sure you want to delete this ${activity.type} activity?\n\nTap to edit, long press to delete.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteActivity(activity.id);
              if (success) {
                showAlert('Success', 'Activity deleted successfully!');
              } else {
                showAlert('Error', 'Failed to delete activity.');
              }
            } catch (error) {
              console.error('Error deleting activity:', error);
              showAlert('Error', 'Failed to delete activity.');
            }
          }
        },
      ]
    );
  };

  const resetActivityForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setInteractionType('call');
    setInteractionDate(new Date());
    setInteractionNotes('');
    setInteractionDuration('');
    setInteractionLocation('');
    setActivityReminderTitle('');
    setActivityReminderDate(new Date());
    setActivityReminderType('follow_up');
    setActivityReminderFrequency('month');
    setActivityReminderNotes('');
    setValidationErrors({});
    setShowInteractionDatePicker(false);
    setShowInteractionTimePicker(false);
    setShowReminderDatePicker(false);
    setShowReminderTimePicker(false);
  };

  // Date picker handlers (matching reminders.tsx approach)
  const onInteractionDateChange = (event: any, selectedDate?: Date) => {
    setShowInteractionDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInteractionDate(selectedDate);
    }
  };

  const onInteractionTimeChange = (event: any, selectedTime?: Date) => {
    setShowInteractionTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setInteractionDate(prev => {
        const newDate = new Date(prev);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        return newDate;
      });
    }
  };

  const onReminderDateChange = (event: any, selectedDate?: Date) => {
    setShowReminderDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setActivityReminderDate(selectedDate);
    }
  };

  const onReminderTimeChange = (event: any, selectedTime?: Date) => {
    setShowReminderTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setActivityReminderDate(prev => {
        const newDate = new Date(prev);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        return newDate;
      });
    }
  };

  const validateActivityForm = () => {
    const errors: Record<string, string> = {};

    if (activeActivityTab === 'note') {
      if (!noteTitle.trim()) {
        errors.noteTitle = 'Note title is required';
      }
      if (!noteContent.trim()) {
        errors.noteContent = 'Note content is required';
      }
    } else if (activeActivityTab === 'interaction') {
      if (!interactionNotes.trim()) {
        errors.interactionNotes = 'Interaction notes are required';
      }
      if (interactionDate > new Date()) {
        errors.interactionDate = 'Interaction date cannot be in the future';
      }
    } else if (activeActivityTab === 'reminder') {
      if (!activityReminderTitle.trim()) {
        errors.reminderTitle = 'Reminder title is required';
      }
      if (activityReminderDate <= new Date()) {
        errors.reminderDate = 'Reminder date must be in the future';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const createNoteActivity = async () => {
    if (!selectedRelationship || !currentUser) return;

    try {
      await createActivity({
        type: 'note',
        title: noteTitle,
        description: noteContent.substring(0, 100) + (noteContent.length > 100 ? '...' : ''),
        tags: noteTags,
        content: noteContent,
        category: 'general',
        contactId: selectedRelationship.contactId,
        contactName: selectedRelationship.contactName,
      });
      
      showAlert('Success', 'Note activity created successfully!');
      closeAddActivityModal();
    } catch (error) {
      console.error('Error creating note activity:', error);
      
      // Show platform-specific error messages
      if (Platform.OS === 'web') {
        showAlert(
          'Web Activity Creation Error',
          'Failed to create note activity. This may be due to browser limitations or network issues. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Error', 'Failed to create note activity. Please try again.');
      }
    }
  };

  const createInteractionActivity = async () => {
    if (!selectedRelationship || !currentUser) return;

    try {
      // Create the activity
      await createActivity({
        type: 'interaction',
        title: `${interactionType} with ${selectedRelationship.contactName}`,
        description: interactionNotes,
        tags: [],
        contactId: selectedRelationship.contactId,
        contactName: selectedRelationship.contactName,
        interactionType: interactionType,
        date: interactionDate.toISOString(),
        duration: interactionDuration ? parseInt(interactionDuration) : undefined,
        location: interactionLocation,
      });

      // Check if this interaction is more recent than the current lastContactDate
      const currentLastContactDate = new Date(selectedRelationship.lastContactDate);
      const newInteractionDate = new Date(interactionDate);
      
      if (newInteractionDate > currentLastContactDate) {
        // Update the relationship with the new last contact information
        await updateRelationship(selectedRelationship.id, {
          lastContactDate: newInteractionDate.toISOString(),
          lastContactMethod: interactionType,
        });
        
        // Update the selected relationship state to reflect the changes
        setSelectedRelationship(prev => prev ? {
          ...prev,
          lastContactDate: newInteractionDate.toISOString(),
          lastContactMethod: interactionType,
        } : null);
        
        showAlert('Success', 'Interaction activity created and last contact date updated!');
      } else {
        showAlert('Success', 'Interaction activity created! (Last contact date not updated - this interaction is older than the current last contact)');
      }
      closeAddActivityModal();
    } catch (error) {
      console.error('Error creating interaction activity:', error);
      
      // Show platform-specific error messages
      if (Platform.OS === 'web') {
        showAlert(
          'Web Activity Creation Error',
          'Failed to create interaction activity. This may be due to browser limitations or network issues. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Error', 'Failed to create interaction activity. Please try again.');
      }
    }
  };

  const createReminderActivity = async () => {
    if (!selectedRelationship || !currentUser) return;

    try {
      // Create activity
      await createActivity({
        type: 'reminder',
        // title: activityReminderTitle,
        description: activityReminderNotes,
        tags: [],
        contactId: selectedRelationship.contactId,
        contactName: selectedRelationship.contactName,
        reminderDate: activityReminderDate.toISOString(),
        reminderType: activityReminderType,
        frequency: activityReminderFrequency,
      });

      // Create reminder in reminders collection
      await createReminder({
        contactName: selectedRelationship.contactName,
        contactId: selectedRelationship.contactId,
        relationshipId: selectedRelationship.id,
        type: activityReminderType,
        date: activityReminderDate.toISOString(),
        frequency: activityReminderFrequency,
        tags: [],
        notes: activityReminderNotes,
      });
      
      showAlert('Success', 'Reminder activity created and scheduled successfully!');
      closeAddActivityModal();
    } catch (error) {
      console.error('Error creating reminder activity:', error);
      
      // Show platform-specific error messages
      if (Platform.OS === 'web') {
        showAlert(
          'Web Activity Creation Error',
          'Failed to create reminder activity. This may be due to browser limitations or network issues. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Error', 'Failed to create reminder activity. Please try again.');
      }
    }
  };

  const handleCreateActivity = async () => {
    if (!validateActivityForm()) {
      return;
    }

    if (activeActivityTab === 'note') {
      await createNoteActivity();
    } else if (activeActivityTab === 'interaction') {
      await createInteractionActivity();
    } else if (activeActivityTab === 'reminder') {
      await createReminderActivity();
    }
  };


  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render activity filter dropdown
  const renderActivityDropdown = () => {
    const selectedOption = activityFilterOptions.find(option => option.key === activityFilter);
    
    return (
      <View 
        style={styles.dropdownContainer}
        onTouchStart={(e) => {
          // Prevent event propagation when dropdown is open
          if (showActivityDropdown) {
            e.stopPropagation();
          }
        }}
      >
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            // Determine if dropdown should open above or below
            // If there are no activities, we're likely at the bottom, so open above
            const contactActivities = getContactActivities();
            const shouldOpenAbove = contactActivities.length === 0;
            setDropdownPosition(shouldOpenAbove ? 'above' : 'below');
            const newState = !showActivityDropdown;
            setShowActivityDropdown(newState);
          }}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedOption?.icon} {selectedOption?.label}
          </Text>
          <Text style={[styles.dropdownArrow, showActivityDropdown && styles.dropdownArrowOpen]}>
            ▼
          </Text>
        </TouchableOpacity>
        
        {showActivityDropdown && (
          <View 
            style={[
              styles.dropdownMenu,
              dropdownPosition === 'above' && styles.dropdownMenuAbove
            ]}
            onTouchStart={(e) => {
              // Prevent event propagation to avoid closing the dropdown
              e.stopPropagation();
            }}
          >
            <ScrollView 
              style={styles.dropdownScrollView}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {activityFilterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.dropdownItem,
                    activityFilter === option.key && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setActivityFilter(option.key as any);
                    setShowActivityDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.dropdownItemText,
                    activityFilter === option.key && styles.dropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Render activity card based on type
  const renderActivityCard = (activity: any) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'note':
          return '📝';
        case 'interaction':
          return '🤝';
        case 'reminder':
          return '⏰';
        default:
          return '📄';
      }
    };

    const getActivityTitle = () => {
      switch (activity.type) {
        case 'note':
          return 'Note';
        case 'interaction':
          return `${activity.interactionType}`;
        case 'reminder':
          return 'Reminder';
        default:
          return 'Activity';
      }
    };

    const getActivitySubtitle = () => {
      switch (activity.type) {
        case 'note':
          return activity.content?.substring(0, 50) + (activity.content?.length > 50 ? '...' : '');
        case 'interaction':
          return activity.description;
        case 'reminder':
          return activity.isCompleted ? 'Completed' : 'Pending';
        default:
          return activity.description;
      }
    };

    const getActivityTime = () => {
      // Safely handle different timestamp formats
      let date: Date;
      if (!activity.createdAt) {
        date = new Date();
      } else if (activity.createdAt instanceof Date) {
        date = activity.createdAt;
      } else if (activity.createdAt && typeof activity.createdAt === 'object' && 'seconds' in activity.createdAt) {
        // Firebase Timestamp object
        date = new Date(activity.createdAt.seconds * 1000);
      } else if (typeof activity.createdAt === 'string') {
        date = new Date(activity.createdAt);
      } else if (typeof activity.createdAt === 'number') {
        date = new Date(activity.createdAt);
      } else {
        date = new Date(); // Fallback
      }
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <TouchableOpacity 
        key={activity.id} 
        style={styles.activityCard}
        onPress={() => {
          if(activity.type !== "reminder"){
            openEditActivityModal(activity)
          }
        }}
        onLongPress={() => {
          Vibration.vibrate(100); // Haptic feedback
          handleDeleteActivity(activity);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.activityIcon}>
          <Text style={styles.activityIconText}>{getActivityIcon()}</Text>
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityCardHeader}>
            <Text style={styles.activityCardTitle}>{getActivityTitle()}</Text>
            
          </View>
          <Text style={styles.activityCardSubtitle}>{getActivitySubtitle()}</Text>
        </View>
        <View style={styles.activityActions}>
          <Text style={styles.activityTime}>{getActivityTime()}</Text>
          
        </View>
      </TouchableOpacity>
    );
  };

  const renderRelationship = ({ item }: { item: Relationship }) => (
    <TouchableOpacity 
      style={styles.relationshipCard}
      onPress={() => showRelationshipDetails(item)}
      onLongPress={() => handleDeleteRelationship(item.id, item.contactName)}
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

  const renderDeviceContact = ({ item }: { item: Contacts.Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => handleDeviceContactSelect(item)}
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
      <View style={styles.deviceContactAction}>
        <Text style={styles.deviceContactActionText}>Select</Text>
        <ChevronRight size={16} color="#10B981" />
      </View>
    </TouchableOpacity>
  );

  // Debug logging


  // Show loading if user authentication or relationships are loading
  if (isLoadingRelationships) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Relationships</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading relationships...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show message if user is not authenticated
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Relationships</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>Please log in to view relationships</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Relationships</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedTagFilter !== 'all' && styles.activeFilterButton]} 
            onPress={() => setShowTagFilters(true)}
          >
            <Filter size={20} color={selectedTagFilter !== 'all' ? '#ffffff' : '#6B7280'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddRelationship}>
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View> 
       
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isLoadingRelationships ? 'Loading...' : 
           !currentUser ? 'Not logged in' : 
           `Found ${filteredRelationships.length} relationships`}
        </Text>
      </View>

      {/* Active Filter Indicator */}
      {selectedTagFilter !== 'all' && (
        <View style={styles.activeFilter}>
          <Text style={styles.activeFilterText}>
            Filtered by: {tagFilterOptions.find(f => f.key === selectedTagFilter)?.label}
          </Text>
          <TouchableOpacity onPress={() => setSelectedTagFilter('all')}>
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {filteredRelationships.length > 0 ? (
          <FlatList
            data={filteredRelationships}
            renderItem={renderRelationship}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : isLoadingRelationships ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading relationships...</Text>
          </View>
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
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.createNewButton}
                onPress={() => setShowNewContactModal(true)}
              >
                <Plus size={20} color="#ffffff" />
                <Text style={styles.createNewButtonText}>New</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowContactList(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={contactSearchQuery}
              onChangeText={setContactSearchQuery}
              placeholder="Search device contacts..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {isLoadingDeviceContacts ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Loading device contacts...</Text>
            </View>
          ) : filteredDeviceContacts.length > 0 ? (
            <FlatList
              data={filteredDeviceContacts}
              renderItem={renderDeviceContact}
              keyExtractor={(item, index) => (item as any).id || `device_${index}`}
              style={styles.contactList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {contactSearchQuery ? 'No device contacts found' : 'No device contacts available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {contactSearchQuery 
                  ? `No device contacts match "${contactSearchQuery}"`
                  : 'Allow contact access to see your device contacts here'
                }
              </Text>
              {!hasPermission && (
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Create New Contact Modal */}
      <Modal visible={showNewContactModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Contact</Text>
            <TouchableOpacity onPress={() => {
              setShowNewContactModal(false);
              resetNewContactForm();
            }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactName && styles.inputError]}
                  value={newContactName}
                  onChangeText={(text) => {
                    setNewContactName(text);
                    clearContactFieldError('contactName');
                  }}
                  placeholder="Enter contact name"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactName && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactPhone && styles.inputError]}
                  value={newContactPhone}
                  onChangeText={(text) => {
                    setNewContactPhone(text);
                    clearContactFieldError('contactPhone');
                  }}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
                {contactValidationErrors.contactPhone && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactPhone}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactEmail && styles.inputError]}
                  value={newContactEmail}
                  onChangeText={(text) => {
                    setNewContactEmail(text);
                    clearContactFieldError('contactEmail');
                  }}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactEmail && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactEmail}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactCompany && styles.inputError]}
                  value={newContactCompany}
                  onChangeText={(text) => {
                    setNewContactCompany(text);
                    clearContactFieldError('contactCompany');
                  }}
                  placeholder="Enter company name"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactCompany && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactCompany}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Job Title</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactJobTitle && styles.inputError]}
                  value={newContactJobTitle}
                  onChangeText={(text) => {
                    setNewContactJobTitle(text);
                    clearContactFieldError('contactJobTitle');
                  }}
                  placeholder="Enter job title"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactJobTitle && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactJobTitle}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactWebsite && styles.inputError]}
                  value={newContactWebsite}
                  onChangeText={(text) => {
                    setNewContactWebsite(text);
                    clearContactFieldError('contactWebsite');
                  }}
                  placeholder="Enter website URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactWebsite && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactWebsite}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactLinkedin && styles.inputError]}
                  value={newContactLinkedin}
                  onChangeText={(text) => {
                    setNewContactLinkedin(text);
                    clearContactFieldError('contactLinkedin');
                  }}
                  placeholder="Enter LinkedIn profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactLinkedin && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactLinkedin}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>X (Twitter)</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactTwitter && styles.inputError]}
                  value={newContactTwitter}
                  onChangeText={(text) => {
                    setNewContactTwitter(text);
                    clearContactFieldError('contactTwitter');
                  }}
                  placeholder="Enter X/Twitter handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactTwitter && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactTwitter}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactInstagram && styles.inputError]}
                  value={newContactInstagram}
                  onChangeText={(text) => {
                    setNewContactInstagram(text);
                    clearContactFieldError('contactInstagram');
                  }}
                  placeholder="Enter Instagram handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactInstagram && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactInstagram}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactFacebook && styles.inputError]}
                  value={newContactFacebook}
                  onChangeText={(text) => {
                    setNewContactFacebook(text);
                    clearContactFieldError('contactFacebook');
                  }}
                  placeholder="Enter Facebook profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {contactValidationErrors.contactFacebook && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactFacebook}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactAddress && styles.inputError]}
                  value={newContactAddress}
                  onChangeText={(text) => {
                    setNewContactAddress(text);
                    clearContactFieldError('contactAddress');
                  }}
                  placeholder="Enter address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                />
                {contactValidationErrors.contactAddress && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactAddress}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birthday</Text>
                <TextInput
                  style={[styles.input, contactValidationErrors.contactBirthday && styles.inputError]}
                  value={newContactBirthday}
                  onChangeText={(text) => {
                    setNewContactBirthday(text);
                    clearContactFieldError('contactBirthday');
                  }}
                  placeholder="Enter birthday (MM/DD/YYYY)"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactBirthday && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactBirthday}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, contactValidationErrors.contactNotes && styles.inputError]}
                  value={newContactNotes}
                  onChangeText={(text) => {
                    setNewContactNotes(text);
                    clearContactFieldError('contactNotes');
                  }}
                  placeholder="Enter additional notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {contactValidationErrors.contactNotes && (
                  <Text style={styles.errorText}>{contactValidationErrors.contactNotes}</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, !newContactName.trim() && styles.saveButtonDisabled]}
                onPress={createNewContactAndRelationship}
                disabled={!newContactName.trim() || !newContactPhone}
              >
                <Text style={styles.saveButtonText}>Create Contact & Add Relationship</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create Relationship Modal */}
      <CreateEditRelationshipModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        relationship={null} // null means create mode
        initialContact={selectedContact} // Pass the selected contact
        onRelationshipSaved={(relationship) => {
          setShowAddModal(false);
          setSelectedContact(null);
          showAlert('Success', 'Relationship created successfully!');
        }}
      />

      {/* Edit Relationship Modal */}
      <CreateEditRelationshipModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setRelationshipToEdit(null);
        }}
        relationship={relationshipToEdit} // existing relationship means edit mode
        onRelationshipSaved={(updatedRelationship) => {
          setShowEditModal(false);
          setRelationshipToEdit(null);
          showAlert('Success', 'Relationship updated successfully!');
        }}
      />

      {/* Relationship Detail Modal */}
      <Modal visible={showRelationshipDetail} animationType="slide">
        <SafeAreaView 
          style={styles.detailModalContainer}
        >
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowRelationshipDetail(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDetailActions(true)}>
              <Text style={styles.detailHeaderText}>⋯</Text>
            </TouchableOpacity>
          </View>
          
          <View 
            style={styles.detailContent}
            onTouchStart={() => {
              // Close dropdown when tapping outside of it
              if (showActivityDropdown) {
                setShowActivityDropdown(false);
              }
            }}
          >
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <Text style={styles.profileInitials}>
                  {selectedRelationship?.contactName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'AA'}
                </Text>
              </View>
              <Text style={styles.profileName}>{selectedRelationship?.contactName}</Text>
              <Text style={styles.profileCompany}>
                {selectedRelationship?.contactData?.company || selectedRelationship?.contactData?.jobTitle 
                  ? `${selectedRelationship?.contactData?.company || ''} ${selectedRelationship?.contactData?.jobTitle || ''}`.trim()
                  : 'No company info'
                }
              </Text>
              
              
              
              
              
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.getInTouchButton}
                  onPress={() => setShowContactActions(true)}
                >
                  <Text style={styles.getInTouchText}>Get in touch</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => setShowMoreActions(true)}
                >
                  <Text style={styles.moreButtonText}>⋯</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Tabs */}
            {/* <View style={styles.tabBar}>
              <TouchableOpacity style={styles.activeTab}>
                <Text style={styles.activeTabText}>Notes</Text>
              </TouchableOpacity>
              
            </View> */}
            
            {/* Content */}
            <ScrollView 
              style={styles.detailScrollView}
              showsVerticalScrollIndicator={true}
              bounces={true}
              contentContainerStyle={styles.detailScrollContent}
              
            >
              {/* General Note Card */}
              <TouchableOpacity style={styles.noteCard} onPress={openEditNoteModal}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteIcon}>
                    <Text style={styles.noteIconText}>📝</Text>
                  </View>
                  <Text style={styles.noteTitle}>General Note</Text>
                </View>
                <Text style={styles.noteContent}>
                  {selectedRelationship?.notes || 'No notes added yet'}
                </Text>
              </TouchableOpacity>
              
              {/* Family Info Card */}
              <TouchableOpacity style={styles.noteCard} onPress={openEditFamilyInfoModal}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteIcon}>
                    <Text style={styles.noteIconText}>👨‍👩‍👧‍👦</Text>
                  </View>
                  <Text style={styles.noteTitle}>Family Info</Text>
                </View>
                <Text style={styles.noteContent}>
                  {selectedRelationship?.familyInfo ? 
                    `Kids: ${selectedRelationship.familyInfo.kids || 'Not specified'}\n` +
                    `Siblings: ${selectedRelationship.familyInfo.siblings || 'Not specified'}\n` +
                    `Spouse: ${selectedRelationship.familyInfo.spouse || 'Not specified'}` :
                    'Notes on kids, siblings, spouse...'
                  }
                </Text>
              </TouchableOpacity>
              
              {/* Activity Section */}
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Activity</Text>
                  {renderActivityDropdown()}
                </View>
                
                {/* Activity Cards */}
                {getContactActivities().length > 0 ? (
                  getContactActivities().map(activity => renderActivityCard(activity))
                ) : (
                  <View style={styles.noActivityCard}>
                    <Text style={styles.noActivityText}>
                      No {activityFilter === 'all' ? '' : activityFilter} activities found
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            {/* Bottom Input */}
            <View style={styles.bottomInput}>
              <TouchableOpacity style={styles.inputMenuButton}>
                <Text style={styles.inputMenuText}>☰</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputField}
                onPress={openAddActivityModal}
              >
                <Text style={styles.inputFieldPlaceholder}>Anything to note?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Frequency Selection Modal */}
      <Modal visible={showFrequencyModal} animationType="slide" transparent>
        <View style={styles.frequencyModalOverlay}>
          <View style={styles.frequencyModalContainer}>
            <View style={styles.frequencyModalHeader}>
              <Text style={styles.frequencyModalTitle}>Change Reminder Frequency</Text>
              <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.frequencyOptions}>
              {reminderFrequencies.map((frequency) => (
                <TouchableOpacity
                  key={frequency.key}
                  style={[
                    styles.frequencyOption,
                    selectedRelationship?.reminderFrequency === frequency.key && styles.frequencyOptionSelected
                  ]}
                  onPress={() => handleFrequencyChange(frequency.key as ReminderFrequency)}
                >
                  <Text style={[
                    styles.frequencyOptionText,
                    selectedRelationship?.reminderFrequency === frequency.key && styles.frequencyOptionTextSelected
                  ]}>
                    {frequency.label}
                  </Text>
                  {selectedRelationship?.reminderFrequency === frequency.key && (
                    <Text style={styles.frequencyCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Actions Modal */}
      <Modal visible={showContactActions} animationType="slide" transparent>
        <View style={styles.contactActionsOverlay}>
          <View style={styles.contactActionsContainer}>
            <View style={styles.contactActionsHeader}>
              <Text style={styles.contactActionsTitle}>Get in touch with {selectedRelationship?.contactName}</Text>
              <TouchableOpacity onPress={() => setShowContactActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contactActionsList}>
              <TouchableOpacity style={styles.contactActionItem} onPress={handleCall}>
                <View style={styles.contactActionIcon}>
                  <Phone size={24} color="#10B981" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Call</Text>
                  <Text style={styles.contactActionSubtitle}>Make a phone call</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleMessage}>
                <View style={styles.contactActionIcon}>
                  <MessageCircle size={24} color="#3B82F6" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Message</Text>
                  <Text style={styles.contactActionSubtitle}>Send SMS</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleWhatsApp}>
                <View style={styles.contactActionIcon}>
                  <Text style={styles.whatsappIcon}>📱</Text>
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>WhatsApp</Text>
                  <Text style={styles.contactActionSubtitle}>Send WhatsApp message</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleEmail}>
                <View style={styles.contactActionIcon}>
                  <Mail size={24} color="#EF4444" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Email</Text>
                  <Text style={styles.contactActionSubtitle}>Send email</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* More Actions Modal */}
      <Modal visible={showMoreActions} animationType="slide" transparent>
        <View style={styles.moreActionsOverlay}>
          <View style={styles.moreActionsContainer}>
            <View style={styles.moreActionsHeader}>
              <Text style={styles.moreActionsTitle}>Find {selectedRelationship?.contactName}</Text>
              <TouchableOpacity onPress={() => setShowMoreActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.moreActionsList}>
              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnLinkedIn}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.linkedinIcon}>💼</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Find on LinkedIn</Text>
                  <Text style={styles.moreActionSubtitle}>Search professional profile</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnX}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.xIcon}>𝕏</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Find on X</Text>
                  <Text style={styles.moreActionSubtitle}>Search on X (Twitter)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnFacebook}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.facebookIcon}>📘</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Find on Facebook</Text>
                  <Text style={styles.moreActionSubtitle}>Search Facebook profile</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnGoogle}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.googleIcon}>🔍</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Google Search</Text>
                  <Text style={styles.moreActionSubtitle}>Search on Google</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Actions Modal */}
      <Modal visible={showDetailActions} animationType="slide" transparent>
        <View style={styles.detailActionsOverlay}>
          <View style={styles.detailActionsContainer}>
            <View style={styles.detailActionsHeader}>
              <Text style={styles.detailActionsTitle}>Relationship Actions</Text>
              <TouchableOpacity onPress={() => setShowDetailActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailActionsList}>
              <TouchableOpacity style={styles.detailActionItem} onPress={handleEditRelationship}>
                <View style={styles.detailActionIcon}>
                  <Text style={styles.editIcon}>✏️</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Edit</Text>
                  <Text style={styles.detailActionSubtitle}>Edit relationship details</Text>
                </View>
              </TouchableOpacity>

              

              <TouchableOpacity style={styles.detailActionItem} onPress={handleShareRelationship}>
                <View style={styles.detailActionIcon}>
                  <Text style={styles.shareIcon}>📤</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Share</Text>
                  <Text style={styles.detailActionSubtitle}>Share contact information</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.detailActionItem} 
                onPress={() => handleDeleteRelationship(selectedRelationship?.id || '', selectedRelationship?.contactName || '')}
              >
                <View style={styles.detailActionIcon}>
                  <Text style={styles.removeIcon}>🗑️</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Delete</Text>
                  <Text style={styles.detailActionSubtitle}>Delete relationship and all data</Text>
                </View>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal visible={showAddReminderModal} animationType="slide" transparent>
        <View style={styles.addReminderOverlay}>
          <View style={styles.addReminderContainer}>
            <View style={styles.addReminderHeader}>
              <Text style={styles.addReminderTitle}>Add Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddReminderModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.addReminderContent}>
              <View style={styles.reminderForm}>
                <Text style={styles.reminderFormLabel}>Contact</Text>
                <Text style={styles.reminderContactName}>{selectedRelationship?.contactName}</Text>
                
                <Text style={styles.reminderFormLabel}>Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
                    <input
                      type="date"
                      value={reminderDate.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        selectedDate.setHours(reminderTime.getHours(), reminderTime.getMinutes());
                        setReminderDate(selectedDate);
                      }}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.reminderFormLabel}>Time</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
                    <input
                      type="time"
                      value={reminderTime.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newTime = new Date(reminderTime);
                        newTime.setHours(hours, minutes);
                        setReminderTime(newTime);
                      }}
                      style={{
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.reminderFormLabel}>Note *</Text>
                <TextInput
                  style={styles.reminderNoteInput}
                  value={reminderNote}
                  onChangeText={setReminderNote}
                  placeholder="Enter a note for this reminder (required)..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.addReminderActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddReminderModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createReminderButton}
                onPress={handleCreateReminder}
              >
                <Text style={styles.createReminderButtonText}>Create Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Note Modal */}
      <Modal visible={showEditNoteModal} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.editModalOverlay}
          activeOpacity={1}
          onPress={closeEditNoteModal}
        >
          <TouchableOpacity 
            style={styles.editModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={closeEditNoteModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Edit General Note</Text>
              <TouchableOpacity onPress={saveNote} style={styles.editModalSaveButton}>
                <Text style={styles.editModalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.editModalContent}>
              <Text style={styles.editNoteLabel}>Note for {selectedRelationship?.contactName}</Text>
              <TextInput
                style={[styles.editNoteInput, noteValidationErrors.note && styles.inputError]}
                value={editedNote}
                onChangeText={(text) => {
                  setEditedNote(text);
                  clearNoteFieldError('note');
                }}
                placeholder="Add your notes here..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
              {noteValidationErrors.note && (
                <Text style={styles.errorText}>{noteValidationErrors.note}</Text>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Family Info Modal */}
      <Modal visible={showEditFamilyInfoModal} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.editModalOverlay}
          activeOpacity={1}
          onPress={closeEditFamilyInfoModal}
        >
          <TouchableOpacity 
            style={styles.editModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={closeEditFamilyInfoModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Edit Family Info</Text>
              <TouchableOpacity onPress={saveFamilyInfo} style={styles.editModalSaveButton}>
                <Text style={styles.editModalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editModalContent} contentContainerStyle={{paddingBottom: 24}} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.editFamilyInfoLabel}>Family information for {selectedRelationship?.contactName}</Text>
              <Text style={styles.editFamilyInfoSubtitle}>Add details about their family members</Text>
              
              <View style={styles.familyInfoCard}>
                <View style={styles.familyInfoField}>
                  <Text style={styles.familyInfoFieldLabel}>👶 Kids</Text>
                  <TextInput
                    style={[styles.familyInfoFieldInput, familyInfoValidationErrors.familyKids && styles.inputError]}
                    value={editedFamilyInfo.kids}
                    onChangeText={(text) => {
                      setEditedFamilyInfo(prev => ({ ...prev, kids: text }));
                      clearFamilyInfoFieldError('familyKids');
                    }}
                    placeholder="e.g., 2 kids, ages 5 and 8"
                    placeholderTextColor="#9CA3AF"
                  />
                  {familyInfoValidationErrors.familyKids && (
                    <Text style={styles.errorText}>{familyInfoValidationErrors.familyKids}</Text>
                  )}
                </View>
                
                <View style={styles.familyInfoField}>
                  <Text style={styles.familyInfoFieldLabel}>👨‍👩‍👧‍👦 Siblings</Text>
                  <TextInput
                    style={[styles.familyInfoFieldInput, familyInfoValidationErrors.familySiblings && styles.inputError]}
                    value={editedFamilyInfo.siblings}
                    onChangeText={(text) => {
                      setEditedFamilyInfo(prev => ({ ...prev, siblings: text }));
                      clearFamilyInfoFieldError('familySiblings');
                    }}
                    placeholder="e.g., 1 brother, 2 sisters"
                    placeholderTextColor="#9CA3AF"
                  />
                  {familyInfoValidationErrors.familySiblings && (
                    <Text style={styles.errorText}>{familyInfoValidationErrors.familySiblings}</Text>
                  )}
                </View>
                
                <View style={styles.familyInfoField}>
                  <Text style={styles.familyInfoFieldLabel}>💍 Spouse</Text>
                  <TextInput
                    style={[styles.familyInfoFieldInput, familyInfoValidationErrors.familySpouse && styles.inputError]}
                    value={editedFamilyInfo.spouse}
                    onChangeText={(text) => {
                      setEditedFamilyInfo(prev => ({ ...prev, spouse: text }));
                      clearFamilyInfoFieldError('familySpouse');
                    }}
                    placeholder="e.g., Married to Sarah"
                    placeholderTextColor="#9CA3AF"
                  />
                  {familyInfoValidationErrors.familySpouse && (
                    <Text style={styles.errorText}>{familyInfoValidationErrors.familySpouse}</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Activity Modal */}
      <AddActivityModal
        visible={showAddActivityModal}
        onClose={closeAddActivityModal}
        contactId={selectedRelationship?.contactId}
        contactName={selectedRelationship?.contactName}
        onActivityCreated={() => {
          // Refresh activities or perform any additional logic
        }}
      />

      {/* Edit Activity Modal */}
      <EditActivityModal
        visible={showEditActivityModal}
        onClose={closeEditActivityModal}
        activity={selectedActivity}
        onActivityUpdated={() => {
          // Refresh activities or perform any additional logic
        }}
      />

      {/* Activity Date Pickers for Native Platforms */}
      {Platform.OS !== 'web' && showInteractionDatePicker && (
        <WebCompatibleDateTimePicker
          value={interactionDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onInteractionDateChange}
          maximumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showInteractionTimePicker && (
        <WebCompatibleDateTimePicker
          value={interactionDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onInteractionTimeChange}
        />
      )}

      {Platform.OS !== 'web' && showReminderDatePicker && (
        <WebCompatibleDateTimePicker
          value={activityReminderDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onReminderDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showReminderTimePicker && (
        <WebCompatibleDateTimePicker
          value={activityReminderDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onReminderTimeChange}
        />
      )}

      {/* Date Picker for Native Platforms */}
      {Platform.OS !== 'web' && showDatePicker && (
        <WebCompatibleDateTimePicker
          value={reminderDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker for Native Platforms */}
      {Platform.OS !== 'web' && showTimePicker && (
        <WebCompatibleDateTimePicker
          value={reminderTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      {/* Tag Filter Modal */}
      <Modal visible={showTagFilters} animationType="slide" transparent>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter by Tag</Text>
              <TouchableOpacity onPress={() => setShowTagFilters(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterModalContent}>
              {tagFilterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    selectedTagFilter === option.key && styles.selectedFilterOption
                  ]}
                  onPress={() => {
                    setSelectedTagFilter(option.key);
                    setShowTagFilters(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedTagFilter === option.key && styles.selectedFilterOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {selectedTagFilter === option.key && (
                    <CheckCircle size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  statusBar: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createNewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  familyInputs: {
    gap: 12,
  },
  familyFieldContainer: {
    marginBottom: 8,
  },
  familyFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  deviceContactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceContactActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Relationship Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  detailHeaderText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  detailContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  profileSection: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 16,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  addTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  profileInfo: {
    width: '100%',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  getInTouchButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
  },
  getInTouchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  activeTab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    marginRight: 24,
  },
  activeTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  inactiveTab: {
    paddingBottom: 12,
  },
  inactiveTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  detailScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
    paddingTop:16
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noteIconText: {
    fontSize: 16,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  noteContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  activityFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityFilterText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  activityFilterArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  contactNameBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  contactNameText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  activityIconText: {
    fontSize: 20,
  },
  activityActions: {
    alignItems: 'flex-end',
  },
  noActivityCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  noActivityText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
    alignSelf: 'flex-end',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 160,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    transform: [{ rotate: '0deg' }],
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 160,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  dropdownItemIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  dropdownScrollView: {
    maxHeight: 180,
  },
  dropdownMenuAbove: {
    top: 'auto',
    bottom: '100%',
    marginTop: 0,
    marginBottom: 4,
  },
  // Edit functionality styles
  editButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editSaveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editSaveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  editCancelButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editCancelButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  familyInfoInputs: {
    gap: 12,
  },
  familyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 60,
  },
  familyInfoInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
  },
  // Tap hint and edit modal styles
  tapHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  editNoteContainer: {
    padding: 20,
  },
  editNoteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  editNoteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editFamilyInfoContainer: {
    padding: 20,
  },
  editFamilyInfoLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  editFamilyInfoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Compact edit modal styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxWidth:500
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editModalSaveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editModalSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  editModalContent: {
    padding: 20,
  },
  editModalScrollView: {
    maxHeight: 400,
  },
  // Enhanced family info modal styles
  familyInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  familyInfoField: {
    marginBottom: 20,
  },
  familyInfoFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  familyInfoFieldInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Activity creation modal styles
  addActivityOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  addActivityContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxWidth:500
  },
  addActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addActivityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addActivitySaveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addActivitySaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityTypeTabs: {
    minHeight:70,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activityTypeTab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  animatedTabButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  activeActivityTypeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tabIconContainer: {
    marginBottom: 1,
    padding: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    transform: [{ scale: 1.05 }],
  },
  tabIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  activityTypeTabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 12,
  },
  activeActivityTypeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  addActivityContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activitySection: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  activitySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  activityInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 48,
  },
  activityTextArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  interactionTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  interactionTypeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activeInteractionTypeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  interactionTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeInteractionTypeButtonText: {
    color: '#ffffff',
  },
  reminderTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTypeButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeReminderTypeButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  reminderTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  activeReminderTypeButtonText: {
    color: '#ffffff',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFrequencyButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFrequencyButtonText: {
    color: '#ffffff',
  },
  inputFieldPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  bottomInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputMenuButton: {
    marginRight: 12,
  },
  inputMenuText: {
    fontSize: 18,
    color: '#6B7280',
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  editHint: {
    fontSize: 12,
    color: '#E5E7EB',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Frequency Modal Styles
  frequencyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  frequencyModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  frequencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  frequencyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  frequencyOptions: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  frequencyOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  frequencyOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  frequencyOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  frequencyCheckmark: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  // Contact Actions Modal Styles
  contactActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contactActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  contactActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  contactActionsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contactActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  contactActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappIcon: {
    fontSize: 24,
  },
  contactActionContent: {
    flex: 1,
  },
  contactActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // More Actions Modal Styles
  moreActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moreActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  moreActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  moreActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  moreActionsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  moreActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkedinIcon: {
    fontSize: 24,
  },
  xIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  facebookIcon: {
    fontSize: 24,
  },
  googleIcon: {
    fontSize: 24,
  },
  moreActionContent: {
    flex: 1,
  },
  moreActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  moreActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Detail Actions Modal Styles
  detailActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  detailActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  detailActionsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  detailActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editIcon: {
    fontSize: 24,
  },
  shareIcon: {
    fontSize: 24,
  },
  removeIcon: {
    fontSize: 24,
  },
  reminderIcon: {
    fontSize: 24,
  },
  detailActionContent: {
    flex: 1,
  },
  detailActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  detailActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Add Reminder Modal Styles
  addReminderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReminderContainer: {
    flex:1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  addReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addReminderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  addReminderContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reminderForm: {
    paddingVertical: 16,
  },
  reminderFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  reminderContactName: {
    fontSize: 16,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  webDateTimeInput: {
    // Container for web datetime inputs
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderNoteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 80,
    marginBottom: 16,
  },
  addReminderActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  createReminderButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createReminderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  editActivityButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  editActivityButtonText: {
    fontSize: 16,
  },
  // Filter styles
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  activeFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  activeFilterText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  selectedFilterOptionText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});