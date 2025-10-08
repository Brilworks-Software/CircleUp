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
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import WebCompatibleDateTimePicker from './WebCompatibleDateTimePicker';
import ContactSearchInput from './ContactSearchInput';
import { X, ChevronDown, Search, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useActivity } from '../firebase/hooks/useActivity';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { useContacts } from '../firebase/hooks/useContacts';
import { useAuth } from '../firebase/hooks/useAuth';
import { Contact } from '../firebase/types';
import { ReminderTypes, getReminderTypeDisplayName } from '../constants/ReminderTypes';
import RemindersService from '../firebase/services/RemindersService';

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
  const { createContact } = useContacts();
  const { currentUser } = useAuth();
  

  // Load device contacts on mobile when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      loadDeviceContacts();
    }
  }, [visible]);

  // Check contact permission on mount
  useEffect(() => {
    checkContactPermission();
  }, []);

  const checkContactPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, assume permission is available (Web Contacts API handles this)
        setHasContactPermission(true);
      } else {
        // For mobile, check Expo Contacts permission
        const { status } = await Contacts.requestPermissionsAsync();
        setHasContactPermission(status === 'granted');
      }
    } catch (error) {
      console.error('Error checking contact permission:', error);
      setHasContactPermission(false);
    }
  };

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
      
      // Create new relationship with comprehensive contact data
      const contactData = deviceContact ? {
        phoneNumbers: deviceContact.phoneNumbers?.map(phone => ({
          number: phone.number || '',
          label: phone.label || ''
        })) || [],
        emails: deviceContact.emails?.map(email => ({
          email: email.email || '',
          label: email.label || ''
        })) || [],
        // Extract website from URL addresses
        website: deviceContact.urlAddresses?.find(url => 
          url.url && !url.url.includes('linkedin') && !url.url.includes('twitter') && !url.url.includes('facebook') && !url.url.includes('instagram')
        )?.url || '',
        // Extract social profiles
        linkedin: deviceContact.urlAddresses?.find(url => url.url?.includes('linkedin'))?.url || 
                 deviceContact.socialProfiles?.find(profile => profile.service?.toLowerCase() === 'linkedin')?.url || '',
        twitter: deviceContact.urlAddresses?.find(url => url.url?.includes('twitter'))?.url ||
                deviceContact.socialProfiles?.find(profile => profile.service?.toLowerCase() === 'twitter')?.url || '',
        instagram: deviceContact.urlAddresses?.find(url => url.url?.includes('instagram'))?.url ||
                  deviceContact.socialProfiles?.find(profile => profile.service?.toLowerCase() === 'instagram')?.url || '',
        facebook: deviceContact.urlAddresses?.find(url => url.url?.includes('facebook'))?.url ||
                 deviceContact.socialProfiles?.find(profile => profile.service?.toLowerCase() === 'facebook')?.url || '',
        company: deviceContact.company || '',
        jobTitle: deviceContact.jobTitle || '',
        address: deviceContact.addresses?.[0] ? 
          `${deviceContact.addresses[0].street || ''} ${deviceContact.addresses[0].city || ''} ${deviceContact.addresses[0].region || ''} ${deviceContact.addresses[0].postalCode || ''}`.trim() : '',
        birthday: deviceContact.birthday ? 
          `${(deviceContact.birthday.month || 1).toString().padStart(2, '0')}/${(deviceContact.birthday.day || 1).toString().padStart(2, '0')}/${deviceContact.birthday.year || new Date().getFullYear()}` : '',
        notes: deviceContact.note || '',
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
  
  const remindersService = RemindersService.getInstance();
  const [activeActivityTab, setActiveActivityTab] = useState<
    'note' | 'interaction' | 'reminder'
  >('note');

  // Contact picker states
  const [showContactPicker, setShowContactPicker] = useState(false);
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

  // Activity creation loading state
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

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
  const [activityReminderType, setActivityReminderType] = useState(ReminderTypes.FollowUp);
  const [activityReminderFrequency, setActivityReminderFrequency] = useState<
    | 'once'
    | 'daily'
    | 'week'
    | 'month'
    | '3months'
    | '6months'
    | 'yearly'
  >('month');
  const [activityReminderNotes, setActivityReminderNotes] = useState('');

  // Validation states
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // New contact modal states
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactJobTitle, setNewContactJobTitle] = useState('');
  const [newContactWebsite, setNewContactWebsite] = useState('');
  const [newContactLinkedin, setNewContactLinkedin] = useState('');
  const [newContactTwitter, setNewContactTwitter] = useState('');
  const [newContactInstagram, setNewContactInstagram] = useState('');
  const [newContactFacebook, setNewContactFacebook] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactBirthday, setNewContactBirthday] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');

  // Contact validation errors
  const [contactValidationErrors, setContactValidationErrors] = useState<
    Record<string, string>
  >({});

  // Contact search states
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchError, setContactSearchError] = useState('');

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
        setActivityReminderType(editingActivity.reminderType || ReminderTypes.FollowUp);
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
    setActivityReminderType(ReminderTypes.FollowUp);
    setActivityReminderFrequency('month');
    setActivityReminderNotes('');
    setValidationErrors({});
    setActiveActivityTab('note');
    setContactSearchError('');
  };

  const resetNewContactForm = () => {
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCompany('');
    setNewContactJobTitle('');
    setNewContactWebsite('');
    setNewContactLinkedin('');
    setNewContactTwitter('');
    setNewContactInstagram('');
    setNewContactFacebook('');
    setNewContactAddress('');
    setNewContactBirthday('');
    setNewContactNotes('');
    setContactValidationErrors({});
  };

  const handleContactSelect = async (contact: Contact) => {
    // Find the relationship that matches the selected contact
    
    
    let relationship = relationships.find(rel => 
      rel.contactId === contact.id || rel.contactName === contact.name
    );
    
    if (relationship) {
      // Use existing relationship
      setSelectedContact({ id: relationship.contactId, name: relationship.contactName });
      setLocalContactName(relationship.contactName);
      setContactSearchQuery(relationship.contactName);
      setContactSearchError('');
    } else {
      // If no relationship found, create a new one
      try {
        if (!currentUser) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        // Create a new relationship for this contact with all available data
        const newRelationship = {
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
            phoneNumbers: contact.phoneNumbers || [],
            emails: contact.emails || [],
            website: contact.website || '',
            linkedin: contact.linkedin || '',
            twitter: contact.twitter || '',
            instagram: contact.instagram || '',
            facebook: contact.facebook || '',
            company: contact.company || '',
            jobTitle: contact.jobTitle || '',
            address: contact.address || '',
            birthday: contact.birthday || '',
            notes: contact.notes || '',
          },
        };

        
        

        // Create the relationship in the database
        const createdRelationship = await createRelationship(newRelationship);
        
        // Set the created relationship
        setSelectedContact({ id: createdRelationship.contactId, name: createdRelationship.contactName });
        setLocalContactName(createdRelationship.contactName);
        setContactSearchQuery(createdRelationship.contactName);
        setContactSearchError('');
        
        Alert.alert('Success', 'Contact added to your relationships!');
      } catch (error) {
        console.error('Error creating relationship:', error);
        Alert.alert('Error', 'Failed to add contact. Please try again.');
      }
    }
  };

  const handleContactSearchChange = (query: string) => {
    setContactSearchQuery(query);
    if (contactSearchError) {
      setContactSearchError('');
    }
  };

  const handleCreateNewContact = (contactData: any) => {
    setNewContactName(contactData.name || '');
    setShowNewContactModal(true);
  };

  const validateContactForm = () => {
    const errors: Record<string, string> = {};

    if (!newContactName.trim()) {
      errors.contactName = 'Contact name is required';
    }

    if (newContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }

    if (newContactPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(newContactPhone.replace(/[\s\-\(\)]/g, ''))) {
      errors.contactPhone = 'Please enter a valid phone number';
    }

    if (newContactWebsite && !/^https?:\/\/.+/.test(newContactWebsite)) {
      errors.contactWebsite = 'Please enter a valid website URL (include http:// or https://)';
    }

    if (newContactLinkedin && !/^https?:\/\/.+/.test(newContactLinkedin)) {
      errors.contactLinkedin = 'Please enter a valid LinkedIn URL (include http:// or https://)';
    }

    if (newContactFacebook && !/^https?:\/\/.+/.test(newContactFacebook)) {
      errors.contactFacebook = 'Please enter a valid Facebook URL (include http:// or https://)';
    }

    if (newContactBirthday && !/^\d{2}\/\d{2}\/\d{4}$/.test(newContactBirthday)) {
      errors.contactBirthday = 'Please enter birthday in MM/DD/YYYY format';
    }

    setContactValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearContactFieldError = (field: string) => {
    setContactValidationErrors(prev => ({
      ...prev,
      [field]: ''
    }));
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
      if (hasContactPermission) {
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
      const newRelationship = {
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
      setSelectedContact({ id: createdRelationship.contactId, name: createdRelationship.contactName });
      setLocalContactName(createdRelationship.contactName);
      setContactSearchQuery(createdRelationship.contactName);
      setContactSearchError('');
      setShowNewContactModal(false);
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

  const handleTabSwitch = (tab: 'note' | 'interaction' | 'reminder') => {
    // Sync notes across all tabs before switching
    const currentNotes = 
      activeActivityTab === 'note' ? noteContent :
      activeActivityTab === 'interaction' ? interactionNotes :
      activityReminderNotes;
    
    // Apply the current notes to all tabs
    if (currentNotes) {
      if (tab === 'note') {
        setNoteContent(currentNotes);
      } else if (tab === 'interaction') {
        setInteractionNotes(currentNotes);
      } else if (tab === 'reminder') {
        setActivityReminderNotes(currentNotes);
      }
    }
    
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

      const reminder = await remindersService.createReminder(
        currentUser.uid,
        reminderData
      );

      // Get the reminder document ID
      const reminderId = reminder.id;

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
        'Reminder activity created successfully!'
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
          await remindersService.updateReminder(
            currentUser.uid,
            reminderId, // Use the actual reminder document ID
            reminderData
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
        'Reminder activity updated successfully!'
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

    setIsCreatingActivity(true);

    try {
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
    } catch (error) {
      console.error('Error creating/updating activity:', error);
      Alert.alert(
        'Error',
        'Failed to save activity. Please try again.'
      );
    } finally {
      setIsCreatingActivity(false);
    }
  };

  // Contact picker functions
  const filteredRelationships = relationships.filter((rel) =>
    rel.contactName.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );


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
          .slice(0, 5); // Limit to 5 results
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
          .slice(0, 5); // Limit to 5 results
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
                <View style={{ marginBottom: isContactProvided ? 0 : 76 }}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <ContactSearchInput
                        onContactSelect={handleContactSelect}
                        placeholder="Search for a contact..."
                        value={selectedContact ? selectedContact.name : contactSearchQuery}
                        onChangeText={handleContactSearchChange}
                        error={contactSearchError}
                        style={styles.contactSearchInput}
                        onCreateNewContact={handleCreateNewContact}
                      />
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
                    <Text style={styles.inputLabel}>Notes *</Text>
                    <TextInput
                      style={[
                        styles.activityTextArea,
                        validationErrors.noteContent && styles.inputError,
                      ]}
                      value={noteContent}
                      onChangeText={setNoteContent}
                      placeholder="Enter notes..."
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
                    <Text style={styles.inputLabel}>Contact *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <ContactSearchInput
                        onContactSelect={handleContactSelect}
                        placeholder="Search for a contact..."
                        value={selectedContact ? selectedContact.name : contactSearchQuery}
                        onChangeText={handleContactSearchChange}
                        error={contactSearchError}
                        style={styles.contactSearchInput}
                        onCreateNewContact={handleCreateNewContact}
                      />
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
                      placeholder="Enter notes..."
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
                    <Text style={styles.inputLabel}>Contact *</Text>
                    {isContactProvided ? (
                      <TextInput
                        style={[styles.activityInput, styles.readOnlyInput]}
                        value={currentContactName}
                        editable={false}
                        placeholder="Contact name"
                        placeholderTextColor="#9CA3AF"
                      />
                    ) : (
                      <ContactSearchInput
                        onContactSelect={handleContactSelect}
                        placeholder="Search for a contact..."
                        value={selectedContact ? selectedContact.name : contactSearchQuery}
                        onChangeText={handleContactSearchChange}
                        error={contactSearchError}
                        style={styles.contactSearchInput}
                        onCreateNewContact={handleCreateNewContact}
                      />
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
                      {Object.values(ReminderTypes).map((type) => (
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
                            {getReminderTypeDisplayName(type)}
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
                      placeholder="Enter notes..."
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
              style={[
                styles.addActivitySaveButton,
                isCreatingActivity && styles.addActivitySaveButtonDisabled
              ]}
              disabled={isCreatingActivity}
            >
              {isCreatingActivity ? (
                <View style={styles.saveButtonLoadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.addActivitySaveButtonText, { marginLeft: 8 }]}>
                    {editingActivity ? 'Updating...' : 'Creating...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.addActivitySaveButtonText}>
                  {editingActivity ? 'Update' : 'Create'}
                </Text>
              )}
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
                  style={[styles.activityTextArea, contactValidationErrors.contactNotes && styles.inputError]}
                  value={newContactNotes}
                  onChangeText={(text) => {
                    setNewContactNotes(text);
                    clearContactFieldError('contactNotes');
                  }}
                  placeholder="Enter notes..."
                  placeholderTextColor="#9CA3AF"
                  multiline
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
                <Text style={styles.saveButtonText}>Create Contact & Add to Activity</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
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
  addActivitySaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'flex-start',
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
    // marginLeft: 12,
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
  // New Contact Modal Styles
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
