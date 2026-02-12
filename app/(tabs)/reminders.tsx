import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebCompatibleDateTimePicker from '../../components/WebCompatibleDateTimePicker';
import ContactSearchInput from '../../components/ContactSearchInput';
import { Calendar, Clock, Filter, Search, X, Plus, Bell, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, Users, Phone, MessageCircle, Mail, ArrowLeft } from 'lucide-react-native';
import { useRemindersInfinite } from '../../firebase/hooks/useRemindersInfinite';
import { useAuth } from '../../firebase/hooks/useAuth';
import { useRelationships } from '../../firebase/hooks/useRelationships';
import { useActivity } from '../../firebase/hooks/useActivity';
import { useContacts } from '../../firebase/hooks/useContacts';
import { Tags } from '../../constants/Tags';
import { ReminderTypes, getReminderTypeDisplayName } from '../../constants/ReminderTypes';
import type { Reminder, ReminderTab, FilterType, Relationship, ReminderFrequency } from '../../firebase/types';
import * as Contacts from 'expo-contacts';

export default function RemindersScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const { relationships, isLoading: relationshipsLoading, createRelationship } = useRelationships();
  const { createActivity } = useActivity();
  
  const [activeTab, setActiveTab] = useState<ReminderTab>('thisWeek');
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReminderDetail, setShowReminderDetail] = useState(false);
  
  // Infinite query for reminders
  const {
    reminders,
    totalCount,
    tabCounts,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    createReminder,
    updateReminder,
    deleteReminder,
    isCreating,
    isUpdating,
    isDeleting,
    isLoadingTabCounts,
  } = useRemindersInfinite(activeTab, searchQuery, selectedFilter);
  
  // Add Reminder Modal State
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
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
  const [reminderContactName, setReminderContactName] = useState('');
  const [reminderType, setReminderType] = useState(ReminderTypes.FollowUp);
  const [reminderFrequency, setReminderFrequency] = useState('once');
  const [reminderTags, setReminderTags] = useState<string[]>([]);
  
  // Contact Selection State
  const [selectedContact, setSelectedContact] = useState<Relationship | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchError, setContactSearchError] = useState('');
  
  // New Contact Creation State
  const [showNewContactModal, setShowNewContactModal] = useState(false);
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
  const [contactValidationErrors, setContactValidationErrors] = useState<Record<string, string>>({});

  // Contacts permission state
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    const checkContactsPermission = async () => {
      if (Platform.OS === 'web') {
        setHasPermission(false);
        return;
      }
      const { status } = await Contacts.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    checkContactsPermission();
  }, []);
  
  // Contact Actions State
  const [showContactActions, setShowContactActions] = useState(false);
  
  // Edit Reminder Modal State
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editReminderNote, setEditReminderNote] = useState('');
  const [editReminderDate, setEditReminderDate] = useState(new Date());
  const [editReminderTime, setEditReminderTime] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editReminderType, setEditReminderType] = useState(ReminderTypes.FollowUp);
  const [editReminderFrequency, setEditReminderFrequency] = useState('once');
  
  // Check if selected date/time is in the past
  const isDateTimeInPast = () => {
    const combinedDateTime = new Date(reminderDate);
    combinedDateTime.setHours(reminderTime.getHours());
    combinedDateTime.setMinutes(reminderTime.getMinutes());
    return combinedDateTime <= new Date();
  };

  // Handle contact selection from ContactSearchInput
  const handleContactSelect = async (contact: { id: string; name: string }) => {
    // Find the relationship that matches the selected contact
    let relationship = relationships.find(rel => 
      rel.contactId === contact.id || rel.contactName === contact.name
    );
    
    if (relationship) {
      // Use existing relationship
      setSelectedContact(relationship);
      setReminderContactName(contact.name);
      setContactSearchError('');
    } else {
      // If no relationship found, create a new one
      try {
        if (!currentUser) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        // Create a new relationship for this contact
        const newRelationship: Relationship = {
          id: `temp_${Date.now()}`,
          contactId: contact.id,
          contactName: contact.name,
          lastContactDate: new Date().toISOString(),
          lastContactMethod: 'other',
          reminderFrequency: 'month',
          nextReminderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tags: [],
          notes: '',
          familyInfo: { kids: '', siblings: '', spouse: '' },
          contactData: {
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
          },
        };

        // Create the relationship in the database
        const createdRelationship = await createRelationship(newRelationship);
        
        // Set the created relationship
        setSelectedContact(createdRelationship);
        setReminderContactName(contact.name);
        setContactSearchError('');
        
        Alert.alert('Success', `New relationship created for ${contact.name}`);
      } catch (error) {
        console.error('Error creating relationship:', error);
        Alert.alert('Error', 'Failed to create relationship for this contact');
      }
    }
  };

  // Handle contact search change
  const handleContactSearchChange = (query: string) => {
    setContactSearchQuery(query);
    if (contactSearchError) {
      setContactSearchError('');
    }
  };

  // Debug tab counts changes

  const filterOptions = useMemo(() => [
    { key: 'all', label: 'All Reminders' },
    ...Object.values(Tags).map(tag => ({ key: tag, label: tag }))
  ], []);

  const frequencyOptions = useMemo(() => [
    { key: 'once', label: 'Once' },
    { key: 'daily', label: 'Daily' },
    { key: 'week', label: 'Weekly' },
    { key: 'month', label: 'Monthly' },
    { key: '3months', label: 'Every 3 Months' },
    { key: '6months', label: 'Every 6 Months' },
    { key: 'yearly', label: 'Yearly' },
  ], []);


  const isOverdue = useCallback((dateString: string): boolean => {
    const reminderDate = new Date(dateString);
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    return reminderDate < now;
  }, []);

  const calculateNextReminderDate = useCallback((currentDate: string, frequency: string): string => {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'once':
        return currentDate; // No change for once - will be deleted
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
      case '3months':
        date.setMonth(date.getMonth() + 3);
        break;
      case '6months':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'never':
        return currentDate; // No change for never
      default:
        return currentDate; // Default to no change
    }
    
    return date.toISOString();
  }, []);

  const isThisWeek = useCallback((dateString: string): boolean => {
    const reminderDate = new Date(dateString);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return reminderDate >= startOfWeek && reminderDate <= endOfWeek;
  }, []);

  // Contact validation functions
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
      cleanUrl = 'https://' + cleanUrl;
    }
    
    try {
      new URL(cleanUrl);
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
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
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

  const clearContactFieldError = (fieldName: string) => {
    if (contactValidationErrors[fieldName]) {
      setContactValidationErrors(prev => {
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

  const createNewContactAndRelationship = async () => {
    if (!validateContactForm()) {
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Create contact data object
      const contactData = {
        name: newContactName.trim(),
        phoneNumbers: newContactPhone ? [{ number: newContactPhone }] : [],
        emails: newContactEmail ? [{ email: newContactEmail }] : [],
        website: newContactWebsite,
        linkedin: newContactLinkedin,
        twitter: newContactTwitter,
        instagram: newContactInstagram,
        facebook: newContactFacebook,
        company: newContactCompany,
        jobTitle: newContactJobTitle,
        address: newContactAddress,
        birthday: newContactBirthday,
        notes: newContactNotes,
      };

      // Try to create device contact first (if permission is available)
      let deviceContactId = null;
      if (hasPermission) {
        try {
          // Build contact data for device contacts
          const fullName = contactData.name.trim();
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const familyName = nameParts.slice(1).join(' ') || '';

          const deviceContactData: any = {
            [Contacts.Fields.FirstName]: firstName,
            [Contacts.Fields.LastName]: familyName,
            [Contacts.Fields.Name]: fullName,
          };

          // Add phone number if provided
          if (contactData.phoneNumbers.length > 0) {
            deviceContactData[Contacts.Fields.PhoneNumbers] = contactData.phoneNumbers.map(phone => ({ 
              number: phone.number, 
              label: 'mobile',
              isPrimary: true
            }));
          }

          // Add email if provided
          if (contactData.emails.length > 0) {
            deviceContactData[Contacts.Fields.Emails] = contactData.emails.map(email => ({ 
              email: email.email, 
              label: 'work',
              isPrimary: true
            }));
          }

          // Add company and job title as organization info
          if (contactData.company || contactData.jobTitle) {
            deviceContactData[Contacts.Fields.Company] = contactData.company || '';
            deviceContactData[Contacts.Fields.JobTitle] = contactData.jobTitle || '';
          }

          // Add address if provided
          if (contactData.address) {
            deviceContactData[Contacts.Fields.Addresses] = [{ 
              street: contactData.address, 
              label: 'home',
              isPrimary: true
            }];
          }

          // Add birthday if provided
          if (contactData.birthday) {
            deviceContactData[Contacts.Fields.Birthday] = { 
              day: 1, 
              month: 1, 
              year: new Date().getFullYear() // Default year, user can edit later
            };
          }

          // Add notes if provided
          if (contactData.notes) {
            deviceContactData[Contacts.Fields.Note] = contactData.notes;
          }

          if (Platform.OS === 'web') {
            // Use Web Contacts API for web platform
            const webContact = await createWebContact({
              name: fullName,
              phoneNumbers: deviceContactData[Contacts.Fields.PhoneNumbers] || [],
              emails: deviceContactData[Contacts.Fields.Emails] || [],
              company: deviceContactData[Contacts.Fields.Company] || '',
              jobTitle: deviceContactData[Contacts.Fields.JobTitle] || '',
              addresses: deviceContactData[Contacts.Fields.Addresses] || [],
              website: contactData.website || undefined,
            });
            deviceContactId = webContact?.id || `web_${Date.now()}`;
          } else {
            // Use Expo Contacts for mobile platforms
            deviceContactId = await Contacts.addContactAsync(deviceContactData);
          }
        } catch (contactError) {
          console.error('❌ Error adding contact to device:', contactError);
          console.error('❌ Contact data that failed:', contactData);
          
          // Show platform-specific error messages
          if (Platform.OS === 'web') {
            const errorMessage = contactError instanceof Error ? contactError.message : 'Unknown error';
            Alert.alert(
              'Web Contact Creation Failed',
              `Unable to create contact in your device contacts: ${errorMessage}. The relationship will still be created.`
            );
          } else {
            Alert.alert(
              'Contact Creation Failed',
              'Unable to add contact to device contacts. The relationship will still be created.'
            );
          }
          // Continue with relationship creation even if device contact fails
        }
      }

      // Create a new relationship for the contact
      const newRelationship: Relationship = {
        id: `temp_${Date.now()}`,
        contactId: deviceContactId || `temp_${Date.now()}`,
        contactName: contactData.name,
        lastContactDate: new Date().toISOString(),
        lastContactMethod: 'other',
        reminderFrequency: 'month',
        nextReminderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: [],
        notes: contactData.notes,
        familyInfo: { kids: '', siblings: '', spouse: '' },
        contactData: contactData,
      };

      // Create the relationship in the database
      const createdRelationship = await createRelationship(newRelationship);

      // Set the selected contact and close modal
      setSelectedContact(createdRelationship);
      setReminderContactName(contactData.name);
      setContactSearchError('');
      setShowNewContactModal(false);
      setShowAddReminderModal(true);
      resetNewContactForm();

      const successMessage = deviceContactId 
        ? 'New contact created in device and relationship created!'
        : 'New relationship created! (Device contact creation failed)';
      
      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('Error creating new contact and relationship:', error);
      Alert.alert('Error', 'Failed to create new contact and relationship');
    }
  };

  const handleCreateNewContact = (contactData: any) => {
    setShowAddReminderModal(false);
    setNewContactName(contactData.name || '');
    setShowNewContactModal(true);
  };


  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid Date';
    }
    
    const now = new Date();
    
    // Use UTC dates to avoid timezone issues
    const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const targetDateUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    
    // Calculate difference in days
    const diffInDays = Math.floor((todayUTC.getTime() - targetDateUTC.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Show time for today's reminders
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Today ${timeString}`;
    }
    if (diffInDays === -1) return 'Tomorrow';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays > 0 && diffInDays <= 7) return `${diffInDays} days ago`;
    if (diffInDays < 0 && diffInDays >= -7) return `In ${Math.abs(diffInDays)} days`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }, []);

  const handleReminderPress = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowReminderDetail(true);
  };

  const markAsDone = async (reminderId: string) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) {
        Alert.alert('Error', 'Reminder not found.');
        return;
      }

      // Create activity to record reminder completion
      try {
        await createActivity({
          type: 'reminder',
          title: `Reminder completed: ${reminder.contactName}`,
          description: `Completed reminder: ${reminder.type}${reminder.notes ? ` - ${reminder.notes}` : ''}`,
          tags: ['completed', 'reminder'],
          contactId: reminder.contactId || '',
          contactName: reminder.contactName,
          reminderDate: reminder.date,
          reminderType: reminder.type,
          frequency: reminder.frequency,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          // Don't set reminderId for completion activities since the original reminder is being processed
        });
      } catch (activityError) {
        console.error('Error creating completion activity:', activityError);
        // Continue with reminder processing even if activity creation fails
      }

      // If frequency is 'once', delete the reminder
      if (reminder.frequency === 'once') {
        await deleteReminder(reminderId);
        setShowReminderDetail(false);
        Alert.alert('Success', 'Reminder marked as completed!');
        return;
      }

      // For recurring reminders, calculate next date and update
      const nextDate = calculateNextReminderDate(reminder.date, reminder.frequency);
      
      await updateReminder({
        reminderId: reminderId,
        updates: {
          date: nextDate,
        }
      });

      // Create a new activity for the rescheduled reminder
      try {
        await createActivity({
          type: 'reminder',
          title: `Reminder rescheduled: ${reminder.contactName}`,
          description: `Rescheduled reminder: ${reminder.type}${reminder.notes ? ` - ${reminder.notes}` : ''} (Next: ${formatDate(nextDate)})`,
          tags: ['rescheduled', 'reminder'],
          contactId: reminder.contactId || '',
          contactName: reminder.contactName,
          reminderDate: nextDate,
          reminderType: reminder.type,
          frequency: reminder.frequency,
          reminderId: reminderId, // Link to the updated reminder document
        });
      } catch (activityError) {
        console.error('Error creating reschedule activity:', activityError);
      }
      
      setShowReminderDetail(false);
      Alert.alert('Success', `Reminder rescheduled for ${formatDate(nextDate)}!`);
    } catch (error) {
      console.error('Error marking reminder as done:', error);
      Alert.alert('Error', 'Failed to update reminder.');
    }
  };

  const snoozeReminder = async (reminderId: string, days: number) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;
      
      const newDate = new Date(reminder.date);
      newDate.setDate(newDate.getDate() + days);
      
      await updateReminder({
        reminderId,
        updates: {
        date: newDate.toISOString(),
        }
      });
      
      setShowReminderDetail(false);
      Alert.alert('Success', `Reminder snoozed for ${days} day${days > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder.');
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderNote(reminder.notes || '');
    setEditReminderDate(new Date(reminder.date));
    setEditReminderTime(new Date(reminder.date));
    setEditReminderType(reminder.type);
    setEditReminderFrequency(reminder.frequency);
    setShowReminderDetail(false);
    setShowEditReminderModal(true);
  };

  const handleUpdateReminder = async () => {
    if (!editingReminder) return;
    
    // Validation: Check if note is not empty
    if (!editReminderNote || editReminderNote.trim() === '') {
      Alert.alert('Validation Error', 'Please enter a note for the reminder.');
      return;
    }
    
    // Combine date and time
    const combinedDateTime = new Date(editReminderDate);
    combinedDateTime.setHours(editReminderTime.getHours());
    combinedDateTime.setMinutes(editReminderTime.getMinutes());
    
    // Validation: Check if reminder date/time is in the future
    const now = new Date();
    if (combinedDateTime <= now) {
      Alert.alert('Validation Error', 'Please select a future date and time for the reminder.');
      return;
    }
    
    try {
      await updateReminder({
        reminderId: editingReminder.id,
        updates: {
          notes: editReminderNote.trim(),
          date: combinedDateTime.toISOString(),
          type: editReminderType,
          frequency: editReminderFrequency,
        }
      });
      
      
      setShowEditReminderModal(false);
      setEditingReminder(null);
      Alert.alert('Success', 'Reminder updated successfully!');
    } catch (error) {
      console.error('❌ Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder.');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(reminderId);
              setShowReminderDetail(false);
              Alert.alert('Success', 'Reminder deleted successfully!');
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder.');
            }
          },
        },
      ]
    );
  };

  const handleAddReminder = () => {
    setShowAddReminderModal(true);
    // Reset form with default values
    setReminderNote('');
    setReminderDate(() => {
      const now = new Date();
      return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
    });
    setReminderTime(() => {
      const now = new Date();
      return new Date(now.getTime() + 30 * 60 * 1000); // Current time + 30 minutes
    });
    setReminderContactName('');
    setReminderType(ReminderTypes.FollowUp);
    setReminderFrequency('once');
    setReminderTags([]);
    setSelectedContact(null);
    setContactSearchQuery('');
    setContactSearchError('');
  };

  const handleCreateReminder = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validation: Check if contact is selected
    if (!selectedContact) {
      setContactSearchError('Please select a contact');
      Alert.alert('Validation Error', 'Please select a contact from the list or create a new one');
      return;
    }
    
    // Validation: Check if note is not empty
    if (!reminderNote || reminderNote.trim() === '') {
      Alert.alert('Validation Error', 'Please enter a note for the reminder.');
      return;
    }
    
      // Combine date and time
      const combinedDateTime = new Date(reminderDate);
      combinedDateTime.setHours(reminderTime.getHours());
      combinedDateTime.setMinutes(reminderTime.getMinutes());
      
    // Validation: Check if reminder date/time is in the future
    const now = new Date();
    if (combinedDateTime <= now) {
      Alert.alert('Validation Error', 'Please select a future date and time for the reminder.');
      return;
    }
    
    try {
      // Ensure we have a valid relationship
      if (!selectedContact) {
        Alert.alert('Error', 'Please select a contact before creating a reminder');
        return;
      }

      // Use relationship data for the reminder
      const contactName = selectedContact.contactName;
      const contactId = selectedContact.contactId;
      const relationshipId = selectedContact.id;
      const tags = selectedContact.tags || [];

      // Create a new reminder
      await createReminder({
        contactName: contactName,
        contactId: contactId,
        relationshipId: relationshipId,
        type: reminderType,
        date: combinedDateTime.toISOString(),
        frequency: reminderFrequency,
        tags: tags,
        notes: reminderNote.trim(),
      });
      
      
      // Close modal and show success
      setShowAddReminderModal(false);
      Alert.alert('Success', 'Reminder added successfully!');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder');
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

  const onEditDateChange = (event: any, selectedDate?: Date) => {
    setShowEditDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditReminderDate(selectedDate);
    }
  };

  const onEditTimeChange = (event: any, selectedTime?: Date) => {
    setShowEditTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEditReminderTime(selectedTime);
    }
  };

  const contactPerson = (reminder: Reminder) => {
    setShowReminderDetail(false);
    setSelectedReminder(reminder);
    setShowContactActions(true);
  };

  // Contact action functions
  const handleCall = async () => {
    if (!selectedReminder) return;
    
    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(rel => 
      rel.contactName === selectedReminder.contactName
    );
    
    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(rel => 
        rel.contactName.toLowerCase().trim() === selectedReminder.contactName.toLowerCase().trim()
      );
    }
    
    const relationshipPhone = relationship?.contactData?.phoneNumbers?.[0]?.number;
    
    const phoneNumber = relationshipPhone;
    
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          Alert.alert('Error', 'Phone app is not available');
        }
      } catch (error) {
        console.error('Error opening phone app:', error);
        Alert.alert('Error', 'Failed to open phone app');
      }
    } else {
      Alert.alert(
        'No Phone Number', 
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleMessage = async () => {
    if (!selectedReminder) return;
    
    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(rel => 
      rel.contactName === selectedReminder.contactName
    );
    
    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(rel => 
        rel.contactName.toLowerCase().trim() === selectedReminder.contactName.toLowerCase().trim()
      );
    }
    
    const relationshipPhone = relationship?.contactData?.phoneNumbers?.[0]?.number;
    
    const phoneNumber = relationshipPhone;
    
    if (phoneNumber) {
      const url = `sms:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          Alert.alert('Error', 'SMS app is not available');
        }
      } catch (error) {
        console.error('Error opening SMS app:', error);
        Alert.alert('Error', 'Failed to open SMS app');
      }
    } else {
      Alert.alert(
        'No Phone Number', 
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleWhatsApp = async () => {
    if (!selectedReminder) return;
    
    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(rel => 
      rel.contactName === selectedReminder.contactName
    );
    
    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(rel => 
        rel.contactName.toLowerCase().trim() === selectedReminder.contactName.toLowerCase().trim()
      );
    }
    
    const relationshipPhone = relationship?.contactData?.phoneNumbers?.[0]?.number;
    
    const phoneNumber = relationshipPhone;
    
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
          Alert.alert('Error', Platform.OS === 'web' ? 'Unable to open WhatsApp Web' : 'WhatsApp is not installed');
        }
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
        Alert.alert('Error', 'Failed to open WhatsApp');
      }
    } else {
      Alert.alert(
        'No Phone Number', 
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleEmail = async () => {
    if (!selectedReminder) return;
    
    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(rel => 
      rel.contactName === selectedReminder.contactName
    );
    
    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(rel => 
        rel.contactName.toLowerCase().trim() === selectedReminder.contactName.toLowerCase().trim()
      );
    }
    
    const relationshipEmail = relationship?.contactData?.emails?.[0]?.email;
    
    const email = relationshipEmail;
    
    if (email) {
      const url = `mailto:${email}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          Alert.alert('Error', 'Email app is not available');
        }
      } catch (error) {
        console.error('Error opening email app:', error);
        Alert.alert('Error', 'Failed to open email app');
      }
    } else {
      Alert.alert(
        'No Email Address', 
        `Email address not available for ${selectedReminder.contactName}. Please add contact information in your relationship.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const renderReminder = useCallback(({ item }: { item: Reminder }) => (
    <TouchableOpacity style={styles.reminderCard} onPress={() => handleReminderPress(item)}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Text style={styles.contactName}>{item.contactName}</Text>
          <Text style={styles.reminderType}>{getReminderTypeDisplayName(item.type)}</Text>
        </View>
        <View style={styles.reminderStatus}>
          {item.isOverdue ? (
            <AlertCircle size={20} color="#EF4444" />
          ) : (
            <Calendar size={16} color="#6B7280" />
          )}
          <Text style={[
            styles.dateText,
            item.isOverdue && styles.overdueText
          ]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>
      
      <View style={styles.reminderFooter}>
        <Text style={styles.frequency}>Every {item.frequency}</Text>
        <View style={styles.tags}>
          {item.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 2 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{item.tags.length - 2}</Text>
            </View>
          )}
        </View>
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
      )}
    </TouchableOpacity>
  ), []);

  const getTabCount = useCallback((tab: ReminderTab): number => {
    // Use tabCounts from the hook for accurate counts
    const count = tabCounts[tab] || 0;
    return count;
  }, [tabCounts]);

  const renderAllReminders = () => (
    <Modal 
      visible={showAllReminders} 
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingView}
          >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Reminders</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowFilters(true)}
            >
              <Filter size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAllReminders(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search reminders..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {selectedFilter !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              Filtered by: {filterOptions.find(f => f.key === selectedFilter)?.label}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFilter('all')}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={reminders}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (isFetchingNextPage) {
              return (
                <View style={styles.loadingFooter}>
                  <Text style={styles.loadingText}>Loading more reminders...</Text>
                </View>
              );
            }
            return null;
          }}
        />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFiltersModal = () => (
    <Modal 
      visible={showFilters} 
      animationType="slide" 
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.filtersModal} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Reminders</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersContent}>
          <Text style={styles.filterSectionTitle}>Filter by Tag</Text>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                selectedFilter === option.key && styles.selectedFilterOption
              ]}
              onPress={() => {
                setSelectedFilter(option.key as FilterType);
                setShowFilters(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === option.key && styles.selectedFilterOptionText
              ]}>
                {option.label}
              </Text>
              {selectedFilter === option.key && (
                <CheckCircle size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderReminderDetail = () => (
    <Modal 
      visible={showReminderDetail} 
      animationType="slide" 
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.detailModal} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedReminder?.contactName}</Text>
          <TouchableOpacity onPress={() => setShowReminderDetail(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedReminder && (
          <ScrollView style={styles.detailContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reminder Type</Text>
              <Text style={styles.detailValue}>{getReminderTypeDisplayName(selectedReminder.type)}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={[
                styles.detailValue,
                selectedReminder.isOverdue && styles.overdueText
              ]}>
                {formatDate(selectedReminder.date)}
                {selectedReminder.isOverdue && ' (Overdue)'}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>Every {selectedReminder.frequency}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Tags</Text>
              <View style={styles.detailTags}>
                {selectedReminder.tags.map((tag, index) => (
                  <View key={index} style={styles.detailTag}>
                    <Text style={styles.detailTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {selectedReminder.notes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{selectedReminder.notes}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => contactPerson(selectedReminder)}
              >
                <Text style={styles.primaryButtonText}>Contact Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => markAsDone(selectedReminder.id)}
              >
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.secondaryButtonText}>Mark as Done</Text>
              </TouchableOpacity>

              <View style={styles.editDeleteButtons}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEditReminder(selectedReminder)}
                >
                  <Text style={styles.editButtonText}>Edit Reminder</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteReminder(selectedReminder.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete Reminder</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.snoozeButtons}>
                <TouchableOpacity 
                  style={styles.snoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 1)}
                >
                  <Text style={styles.snoozeButtonText}>Snooze 1 day</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.snoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 7)}
                >
                  <Text style={styles.snoozeButtonText}>Snooze 1 week</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Add Reminder Modal
  const renderAddReminderModal = () => (
    <Modal visible={showAddReminderModal} animationType="slide" transparent>
      <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingView}
          >
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
              <Text style={styles.reminderFormLabel}>Contact *</Text>
              <ContactSearchInput
                onContactSelect={handleContactSelect}
                placeholder="Search for a contact..."
                value={selectedContact ? selectedContact.contactName : contactSearchQuery}
                onChangeText={handleContactSearchChange}
                error={contactSearchError}
                style={styles.contactSearchInput}
                onCreateNewContact={handleCreateNewContact}
              />
              
              {/* {selectedContact && (
                <View style={styles.selectedContactDisplay}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.selectedContactText}>
                    Selected: {selectedContact.contactName}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedContact(null);
                      setReminderContactName('');
                      setContactSearchQuery('');
                    }}
                    style={styles.clearSelectionButton}
                  >
                    <X size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )} */}
              
              <Text style={styles.reminderFormLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {Object.values(ReminderTypes).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      reminderType === type && styles.typeOptionSelected
                    ]}
                    onPress={() => setReminderType(type)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      reminderType === type && styles.typeOptionTextSelected
                    ]}>
                      {getReminderTypeDisplayName(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.reminderFormLabel}>Frequency</Text>
              <View style={styles.frequencySelector}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.frequencyOption,
                      reminderFrequency === option.key && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setReminderFrequency(option.key as ReminderFrequency)}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      reminderFrequency === option.key && styles.frequencyOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.reminderFormLabel}>Date & Time *</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.webDateTimeRow}>
                  <View style={[styles.webDateTimeInput, { flex: 1, marginRight: 8 }]}>
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
                  <View style={[styles.webDateTimeInput, { flex: 1, marginLeft: 8 }]}>
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
                </View>
              ) : Platform.OS === 'ios' ? (
                <View style={styles.iosDateTimeRow}>
                  <View style={styles.iosDateTimeGroup}>
                    <Text style={styles.iosDateTimeLabel}>Date</Text>
                    <View style={[styles.iosDateTimeContainer, { flex: 1 }]}>
                      <WebCompatibleDateTimePicker
                        value={reminderDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const newDate = new Date(selectedDate);
                            newDate.setHours(reminderTime.getHours(), reminderTime.getMinutes());
                            setReminderDate(newDate);
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    </View>
                  </View>
                  <View style={styles.iosDateTimeGroup}>
                    <Text style={styles.iosDateTimeLabel}>Time</Text>
                    <View style={[styles.iosDateTimeContainer, { flex: 1 }]}>
                      <WebCompatibleDateTimePicker
                        value={reminderTime}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          if (selectedTime) {
                            const newTime = new Date(selectedTime);
                            newTime.setDate(reminderDate.getDate());
                            newTime.setMonth(reminderDate.getMonth());
                            newTime.setFullYear(reminderDate.getFullYear());
                            setReminderTime(newTime);
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.androidDateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { flex: 1, marginLeft: 8 }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Clock size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <Text style={styles.helperText}>
                Please select a future date and time for your reminder
              </Text>
              
              {isDateTimeInPast() && (
                <View style={styles.warningContainer}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.warningText}>
                    Selected date and time is in the past. Please choose a future date and time.
                  </Text>
                </View>
              )}
              
              <Text style={styles.reminderFormLabel}>Note *</Text>
              <TextInput
                style={styles.reminderNoteInput}
                value={reminderNote}
                onChangeText={setReminderNote}
                placeholder="Add a note for this reminder..."
                placeholderTextColor="#9CA3AF"
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
              style={[
                styles.createReminderButton,
                (!selectedContact || !reminderNote.trim() || isDateTimeInPast()) && styles.createReminderButtonDisabled
              ]}
              onPress={handleCreateReminder}
              disabled={!selectedContact || !reminderNote.trim() || isDateTimeInPast()}
            >
              <Text style={[
                styles.createReminderButtonText,
                (!selectedContact || !reminderNote.trim() || isDateTimeInPast()) && styles.createReminderButtonTextDisabled
              ]}>
                Create Reminder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Contact Actions Modal
  const renderContactActionsModal = () => {
    if (!selectedReminder) return null;

    // Find the relationship data - try exact match first, then case-insensitive
    let relationship = relationships.find(rel => 
      rel.contactName === selectedReminder.contactName
    );
    
    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(rel => 
        rel.contactName.toLowerCase().trim() === selectedReminder.contactName.toLowerCase().trim()
      );
    }

    // Get contact data from relationship document
    const relationshipPhone = relationship?.contactData?.phoneNumbers?.[0]?.number;
    const relationshipEmail = relationship?.contactData?.emails?.[0]?.email;
    
    const hasPhone = !!relationshipPhone;
    const hasEmail = !!relationshipEmail;
    const phoneNumber = relationshipPhone || '';
    const email = relationshipEmail || '';

    return (
      <Modal visible={showContactActions} animationType="slide" transparent>
        <View style={styles.contactActionsOverlay}>
          <View style={styles.contactActionsContainer}>
            <View style={styles.contactActionsHeader}>
              <Text style={styles.contactActionsTitle}>Get in touch with {selectedReminder.contactName}</Text>
              <TouchableOpacity onPress={() => setShowContactActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {/* Contact Information Display */}
            <View style={styles.contactInfoDisplay}>
              {hasPhone && (
                <View style={styles.contactInfoItem}>
                  <Phone size={16} color="#6B7280" />
                  <Text style={styles.contactInfoText}>{phoneNumber}</Text>
                </View>
              )}
              {hasEmail && (
                <View style={styles.contactInfoItem}>
                  <Mail size={16} color="#6B7280" />
                  <Text style={styles.contactInfoText}>{email}</Text>
                </View>
              )}
              {!hasPhone && !hasEmail && (
                <View style={styles.noContactInfo}>
                  <Text style={styles.noContactInfoText}>No contact information available</Text>
                  <Text style={styles.noContactInfoSubtext}>
                    {relationship ? 
                      'Add contact details in your relationship' : 
                      'Add contact details in your relationship'
                    }
                  </Text>
                  {/* Debug information - remove this after testing */}
                  <Text style={[styles.noContactInfoSubtext, { marginTop: 10, fontSize: 12 }]}>
                    Debug: Relationship {relationship ? 'found' : 'not found'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.contactActionsList}>
              <TouchableOpacity 
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled
                ]} 
                onPress={handleCall}
                disabled={!hasPhone}
              >
                <View style={[
                  styles.contactActionIcon,
                  !hasPhone && styles.contactActionIconDisabled
                ]}>
                  <Phone size={24} color={hasPhone ? "#10B981" : "#9CA3AF"} />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={[
                    styles.contactActionTitle,
                    !hasPhone && styles.contactActionTitleDisabled
                  ]}>Call</Text>
                  <Text style={[
                    styles.contactActionSubtitle,
                    !hasPhone && styles.contactActionSubtitleDisabled
                  ]}>
                    {hasPhone ? phoneNumber : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled
                ]} 
                onPress={handleMessage}
                disabled={!hasPhone}
              >
                <View style={[
                  styles.contactActionIcon,
                  !hasPhone && styles.contactActionIconDisabled
                ]}>
                  <MessageCircle size={24} color={hasPhone ? "#3B82F6" : "#9CA3AF"} />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={[
                    styles.contactActionTitle,
                    !hasPhone && styles.contactActionTitleDisabled
                  ]}>Message</Text>
                  <Text style={[
                    styles.contactActionSubtitle,
                    !hasPhone && styles.contactActionSubtitleDisabled
                  ]}>
                    {hasPhone ? 'Send SMS' : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled
                ]} 
                onPress={handleWhatsApp}
                disabled={!hasPhone}
              >
                <View style={[
                  styles.contactActionIcon,
                  !hasPhone && styles.contactActionIconDisabled
                ]}>
                  <Text style={styles.whatsappIcon}>📱</Text>
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={[
                    styles.contactActionTitle,
                    !hasPhone && styles.contactActionTitleDisabled
                  ]}>WhatsApp</Text>
                  <Text style={[
                    styles.contactActionSubtitle,
                    !hasPhone && styles.contactActionSubtitleDisabled
                  ]}>
                    {hasPhone ? 'Send WhatsApp message' : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.contactActionItem,
                  !hasEmail && styles.contactActionItemDisabled
                ]} 
                onPress={handleEmail}
                disabled={!hasEmail}
              >
                <View style={[
                  styles.contactActionIcon,
                  !hasEmail && styles.contactActionIconDisabled
                ]}>
                  <Mail size={24} color={hasEmail ? "#EF4444" : "#9CA3AF"} />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={[
                    styles.contactActionTitle,
                    !hasEmail && styles.contactActionTitleDisabled
                  ]}>Email</Text>
                  <Text style={[
                    styles.contactActionSubtitle,
                    !hasEmail && styles.contactActionSubtitleDisabled
                  ]}>
                    {hasEmail ? email : 'Email address not available'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // New Contact Modal
  const renderNewContactModal = () => (
    <Modal 
      visible={showNewContactModal} 
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingView}
          >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create New Contact</Text>
          <TouchableOpacity onPress={() => {
            setShowNewContactModal(false);
            setShowAddReminderModal(true);
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
              disabled={!newContactName.trim()}
            >
              <Text style={styles.saveButtonText}>Create Contact & Add to Reminder</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit Reminder Modal
  const renderEditReminderModal = () => (
    <Modal visible={showEditReminderModal} animationType="slide" transparent>
      <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingView}
          >
      <View style={styles.addReminderOverlay}>
        <View style={styles.addReminderContainer}>
          <View style={styles.addReminderHeader}>
            <Text style={styles.addReminderTitle}>Edit Reminder</Text>
            <TouchableOpacity onPress={() => setShowEditReminderModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.addReminderContent}>
            <View style={styles.reminderForm}>
              <Text style={styles.reminderFormLabel}>Contact</Text>
              <View style={styles.contactDisplay}>
                <Users size={20} color="#6B7280" />
                <Text style={styles.contactDisplayText}>
                  {editingReminder?.contactName}
                </Text>
              </View>
              
              <Text style={styles.reminderFormLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {Object.values(ReminderTypes).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      editReminderType === type && styles.typeOptionSelected
                    ]}
                    onPress={() => setEditReminderType(type)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      editReminderType === type && styles.typeOptionTextSelected
                    ]}>
                      {getReminderTypeDisplayName(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.reminderFormLabel}>Frequency</Text>
              <View style={styles.frequencySelector}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.frequencyOption,
                      editReminderFrequency === option.key && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setEditReminderFrequency(option.key as ReminderFrequency)}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      editReminderFrequency === option.key && styles.frequencyOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.reminderFormLabel}>Date & Time *</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.webDateTimeRow}>
                  <View style={[styles.webDateTimeInput, { flex: 1, marginRight: 8 }]}>
                    <input
                      type="date"
                      value={editReminderDate.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        selectedDate.setHours(editReminderTime.getHours(), editReminderTime.getMinutes());
                        setEditReminderDate(selectedDate);
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
                  <View style={[styles.webDateTimeInput, { flex: 1, marginLeft: 8 }]}>
                    <input
                      type="time"
                      value={editReminderTime.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newTime = new Date(editReminderTime);
                        newTime.setHours(hours, minutes);
                        setEditReminderTime(newTime);
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
                </View>
              ) : Platform.OS === 'ios' ? (
                <View style={styles.iosDateTimeRow}>
                  <View style={styles.iosDateTimeGroup}>
                    <Text style={styles.iosDateTimeLabel}>Date</Text>
                    <View style={[styles.iosDateTimeContainer, { flex: 1 }]}>
                      <WebCompatibleDateTimePicker
                        value={editReminderDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const newDate = new Date(selectedDate);
                            newDate.setHours(editReminderTime.getHours(), editReminderTime.getMinutes());
                            setEditReminderDate(newDate);
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    </View>
                  </View>
                  <View style={styles.iosDateTimeGroup}>
                    <Text style={styles.iosDateTimeLabel}>Time</Text>
                    <View style={[styles.iosDateTimeContainer, { flex: 1 }]}>
                      <WebCompatibleDateTimePicker
                        value={editReminderTime}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          if (selectedTime) {
                            const newTime = new Date(selectedTime);
                            newTime.setDate(editReminderDate.getDate());
                            newTime.setMonth(editReminderDate.getMonth());
                            newTime.setFullYear(editReminderDate.getFullYear());
                            setEditReminderTime(newTime);
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.androidDateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {editReminderDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { flex: 1, marginLeft: 8 }]}
                    onPress={() => setShowEditTimePicker(true)}
                  >
                    <Clock size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {editReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <Text style={styles.helperText}>
                Please select a future date and time for your reminder
              </Text>
              
              <Text style={styles.reminderFormLabel}>Note *</Text>
              <TextInput
                style={styles.reminderNoteInput}
                value={editReminderNote}
                onChangeText={setEditReminderNote}
                placeholder="Add a note for this reminder..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
          <View style={styles.addReminderActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowEditReminderModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.createReminderButton,
                (!editReminderNote.trim()) && styles.createReminderButtonDisabled
              ]}
              onPress={handleUpdateReminder}
              disabled={!editReminderNote.trim()}
            >
              <Text style={[
                styles.createReminderButtonText,
                (!editReminderNote.trim()) && styles.createReminderButtonTextDisabled
              ]}>
                Update Reminder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Reminders</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleAddReminder}
          >
            <Plus size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
          
        </View>
      </View>


      <View >

      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 8}}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap:8, paddingHorizontal:10, paddingVertical:10 }}>
          {(['all', 'thisWeek', 'upcoming', 'missed'] as ReminderTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
                { flex: 1, minWidth: 0 }
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                    { flexShrink: 1 }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {tab === 'all'
                    ? 'All'
                    : tab === 'missed'
                    ? 'Missed'
                    : tab === 'thisWeek'
                    ? 'This Week'
                    : 'Upcoming'}
                </Text>
                <View style={[styles.badge, activeTab === tab && styles.activeBadge, { marginLeft: 6 }]}>
                  <Text style={[styles.badgeText, activeTab === tab && styles.activeBadgeText]}>
                    {getTabCount(tab)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      </View>
      <View style={styles.content}>
        {reminders.length > 0 ? (
          <FlatList
            data={reminders}
            renderItem={renderReminder}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => {
              if (isFetchingNextPage) {
                return (
                  <View style={styles.loadingFooter}>
                    <Text style={styles.loadingText}>Loading more reminders...</Text>
                  </View>
                );
              }
              return null;
            }}
            refreshing={isFetching && !isFetchingNextPage}
            onRefresh={refetch}
            // Performance optimizations for Android
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 120, // Approximate height of reminder card
              offset: 120 * index,
              index,
            })}
            // Optimize re-renders
            extraData={`${activeTab}-${searchQuery}-${selectedFilter}`}
          />
        ) : (
          <View style={styles.emptyState}>
            <Clock size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No reminders</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? "No reminders found."
                : activeTab === 'missed' 
                ? "Great! You're all caught up."
                : activeTab === 'thisWeek'
                ? "No reminders for this week."
                : "No upcoming reminders."}
            </Text>
          </View>
        )}
      </View>

      

      {showAllReminders && renderAllReminders()}
      {showFilters && renderFiltersModal()}
      {showReminderDetail && renderReminderDetail()}
      {showAddReminderModal && renderAddReminderModal()}
      {showEditReminderModal && renderEditReminderModal()}
      {showContactActions && renderContactActionsModal()}
      {showNewContactModal && renderNewContactModal()}

      {/* Date Pickers for Native Platforms */}
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

      {/* Edit Date Picker for Native Platforms */}
      {Platform.OS !== 'web' && showEditDatePicker && (
        <WebCompatibleDateTimePicker
          value={editReminderDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEditDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Edit Time Picker for Native Platforms */}
      {Platform.OS !== 'web' && showEditTimePicker && (
        <WebCompatibleDateTimePicker
          value={editReminderTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEditTimeChange}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    // Reduce shadows on Android for better performance
    ...(Platform.OS === 'android' ? {
      elevation: 1,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    marginHorizontal:8,
    gap:8
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    gap: 6,
    // Reduce shadows on Android for better performance
    ...(Platform.OS === 'android' ? {
      elevation: 1,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }),
  },
  activeTab: {
    backgroundColor: '#ffffff',
    // Reduce shadows on Android for better performance
    ...(Platform.OS === 'android' ? {
      elevation: 2,
    } : {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  badge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: '#3B82F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    // Reduce shadows on Android for better performance
    ...(Platform.OS === 'android' ? {
      elevation: 2,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    }),
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reminderType: {
    fontSize: 14,
    color: '#6B7280',
  },
  reminderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frequency: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#3B82F6',
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
  },
  viewAllButton: {
    margin: 24,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
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
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeFilterText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  filtersModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filtersContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
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
  detailModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  detailContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailTagText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 32,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  snoozeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  snoozeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  // Edit/Delete Button Styles
  editDeleteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Contact Display Styles
  contactDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  contactDisplayText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
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
    maxWidth:500
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
  reminderInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeOptionTextSelected: {
    color: '#ffffff',
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  frequencyOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  frequencyOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  frequencyOptionTextSelected: {
    color: '#ffffff',
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
  webDateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iosDateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iosDateTimeGroup: {
    flex: 1,
  },
  iosDateTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  iosDateTimeContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  androidDateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -4,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
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
  createReminderButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  createReminderButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // Contact Search Input Styles
  contactSearchInput: {
    marginBottom: 16,
  },
  // Contact Picker Styles
  contactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  contactSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactSelectorText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  contactSelectorPlaceholder: {
    color: '#9CA3AF',
  },
  contactPickerModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contactPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  contactPickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  contactSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedContactItem: {
    backgroundColor: '#EBF4FF',
  },
  contactItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  contactInfo: {
    flex: 1,
  },
  contactType: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyContactsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
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
    paddingVertical: 16,
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactActionContent: {
    flex: 1,
  },
  contactActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Contact Information Display Styles
  contactInfoDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  noContactInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noContactInfoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  noContactInfoSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  whatsappIcon: {
    fontSize: 24,
  },
  // Disabled States
  contactActionItemDisabled: {
    opacity: 0.5,
  },
  contactActionIconDisabled: {
    backgroundColor: '#F3F4F6',
  },
  contactActionTitleDisabled: {
    color: '#9CA3AF',
  },
  contactActionSubtitleDisabled: {
    color: '#9CA3AF',
  },
  // New Contact Modal Styles
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Selected Contact Display Styles
  selectedContactDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  selectedContactText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  clearSelectionButton: {
    padding: 4,
    marginLeft: 8,
  },
});