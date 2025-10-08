import React, { useState, useEffect, useRef } from 'react';
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
import WebCompatibleDateTimePicker from './WebCompatibleDateTimePicker';
import { X, Calendar, Clock, Phone, Mail, MessageCircle, User } from 'lucide-react-native';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { useAuth } from '../firebase/hooks/useAuth';
import { Tags } from '../constants/Tags';
import type { Contact, Relationship, LastContactOption, ContactMethod, ReminderFrequency } from '../firebase/types';

interface CreateEditRelationshipModalProps {
  visible: boolean;
  onClose: () => void;
  relationship?: Relationship | null; // If provided, we're editing; if null, we're creating
  initialContact?: Contact | null; // If provided, pre-select this contact for creation
  onRelationshipSaved?: (relationship: Relationship) => void; // Callback when relationship is saved
}

const lastContactOptions = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: '3months', label: '3 months ago' },
  { key: '6months', label: '6 months ago' },
  { key: 'year', label: '1 year ago' },
  { key: 'custom', label: 'Custom date' },
];

const contactMethods = [
  { key: 'call', label: 'Call', icon: Phone },
  { key: 'text', label: 'Text', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'inPerson', label: 'In person', icon: User },
];

const reminderFrequencies = [
  { key: 'once', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: '3months', label: 'Every 3 months' },
  { key: '6months', label: 'Every 6 months' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'never', label: 'Never' },
];

const predefinedTags = Object.values(Tags);

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    
    if (buttons.length === 2 && buttons[0].text === 'Cancel' && buttons[1].text === 'OK') {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons[1].onPress) {
        buttons[1].onPress();
      }
      return;
    }
    
    const result = window.confirm(`${title}\n\n${message}\n\nClick OK to continue or Cancel to abort.`);
    if (result) {
      const actionButton = buttons.find(btn => btn.text !== 'Cancel');
      if (actionButton && actionButton.onPress) {
        actionButton.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function CreateEditRelationshipModal({
  visible,
  onClose,
  relationship,
  initialContact,
  onRelationshipSaved,
}: CreateEditRelationshipModalProps) {
  const { createRelationship, updateRelationship } = useRelationships();
  const { currentUser } = useAuth();

  // Contact selection states (removed - contact is passed via props)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form states
  const [lastContactOption, setLastContactOption] = useState<LastContactOption>('today');
  const [customDate, setCustomDate] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('call');
  // const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('month'); // COMMENTED OUT
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [familyInfo, setFamilyInfo] = useState({
    kids: '',
    siblings: '',
    spouse: '',
  });
  useEffect(()=>{
    console.log(initialContact);
    
  },[])

  // Contact data states
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactJobTitle, setContactJobTitle] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactTwitter, setContactTwitter] = useState('');
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactFacebook, setContactFacebook] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactBirthday, setContactBirthday] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Date picker states
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Initialize form when relationship or initialContact changes
  useEffect(() => {
    if (relationship) {
      // Editing existing relationship
      setSelectedContact({
        id: relationship.contactId,
        name: relationship.contactName,
        phoneNumbers: relationship.contactData?.phoneNumbers || [],
        emails: relationship.contactData?.emails || [],
        website: relationship.contactData?.website || '',
        linkedin: relationship.contactData?.linkedin || '',
        twitter: relationship.contactData?.twitter || '',
        instagram: relationship.contactData?.instagram || '',
        facebook: relationship.contactData?.facebook || '',
        company: relationship.contactData?.company || '',
        jobTitle: relationship.contactData?.jobTitle || '',
        address: relationship.contactData?.address || '',
        birthday: relationship.contactData?.birthday || '',
        notes: relationship.contactData?.notes || '',
      });
      
      // Set last contact option based on date
      const lastContactDate = new Date(relationship.lastContactDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastContactDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) setLastContactOption('today');
      else if (diffDays === 1) setLastContactOption('yesterday');
      else if (diffDays <= 7) setLastContactOption('week');
      else if (diffDays <= 30) setLastContactOption('month');
      else if (diffDays <= 90) setLastContactOption('3months');
      else if (diffDays <= 180) setLastContactOption('6months');
      else if (diffDays <= 365) setLastContactOption('year');
      else {
        setLastContactOption('custom');
        setCustomDate(lastContactDate.toISOString().split('T')[0]);
      }
      
      setContactMethod(relationship.lastContactMethod as ContactMethod);
      // setReminderFrequency(relationship.reminderFrequency as ReminderFrequency); // COMMENTED OUT
      setSelectedTags(relationship.tags || []);
      setNotes(relationship.notes || '');
      setFamilyInfo(relationship.familyInfo || { kids: '', siblings: '', spouse: '' });
      
      // Set contact data
      if (relationship.contactData) {
        setContactPhone(relationship.contactData.phoneNumbers?.[0]?.number || '');
        setContactEmail(relationship.contactData.emails?.[0]?.email || '');
        setContactCompany(relationship.contactData.company || '');
        setContactJobTitle(relationship.contactData.jobTitle || '');
        setContactWebsite(relationship.contactData.website || '');
        setContactLinkedin(relationship.contactData.linkedin || '');
        setContactTwitter(relationship.contactData.twitter || '');
        setContactInstagram(relationship.contactData.instagram || '');
        setContactFacebook(relationship.contactData.facebook || '');
        setContactAddress(relationship.contactData.address || '');
        setContactBirthday(relationship.contactData.birthday || '');
        setContactNotes(relationship.contactData.notes || '');
      }
    } else if (initialContact) {
      // Creating new relationship with pre-selected contact
      setSelectedContact(initialContact);
      
      // Pre-populate contact data from initial contact - prioritize existing data over individual fields
      setContactPhone(initialContact.phoneNumbers?.[0]?.number || '');
      setContactEmail(initialContact.emails?.[0]?.email || '');
      setContactCompany(initialContact.company || '');
      setContactJobTitle(initialContact.jobTitle || '');
      setContactWebsite(initialContact.website || '');
      setContactLinkedin(initialContact.linkedin || '');
      setContactTwitter(initialContact.twitter || '');
      setContactInstagram(initialContact.instagram || '');
      setContactFacebook(initialContact.facebook || '');
      setContactAddress(initialContact.address || '');
      setContactBirthday(initialContact.birthday || '');
      setContactNotes(initialContact.notes || '');
      
      // Reset other form fields to defaults
      setLastContactOption('today');
      setCustomDate('');
      setContactMethod('call');
      // setReminderFrequency('month'); // COMMENTED OUT
      setSelectedTags([]);
      setNotes('');
      setFamilyInfo({ kids: '', siblings: '', spouse: '' });
    } else {
      // Creating new relationship - reset form
      resetForm();
    }
  }, [relationship, initialContact]);

  const resetForm = () => {
    setSelectedContact(null);
    setLastContactOption('today');
    setCustomDate('');
    setContactMethod('call');
    // setReminderFrequency('month'); // COMMENTED OUT
    setSelectedTags([]);
    setNotes('');
    setFamilyInfo({ kids: '', siblings: '', spouse: '' });
    setContactPhone('');
    setContactEmail('');
    setContactCompany('');
    setContactJobTitle('');
    setContactWebsite('');
    setContactLinkedin('');
    setContactTwitter('');
    setContactInstagram('');
    setContactFacebook('');
    setContactAddress('');
    setContactBirthday('');
    setContactNotes('');
    setValidationErrors({});
  };

  const getLastContactDate = (option: LastContactOption, customDate?: string): Date => {
    const now = new Date();
    
    switch (option) {
      case 'today':
        return now;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      case '3months':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return threeMonthsAgo;
      case '6months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return sixMonthsAgo;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return yearAgo;
      case 'custom':
        return customDate ? new Date(customDate) : now;
      default:
        return now;
    }
  };

  const calculateNextReminderDate = (lastContactDate: Date, frequency: ReminderFrequency): string => {
    if (frequency === 'never') return '';

    const nextDate = new Date(lastContactDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
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
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate.toISOString();
  };

  // Validation helper functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Empty email is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Empty phone is valid (optional field)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  };

  const validateURL = (url: string): boolean => {
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

  const validateBirthday = (birthday: string): boolean => {
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedContact) {
      errors.contact = 'No contact selected';
    }

    // Only validate last contact fields when creating new relationship
    if (!relationship) {
      if (lastContactOption === 'custom' && !customDate) {
        errors.customDate = 'Please enter a custom date';
      }

      if (lastContactOption === 'custom' && customDate) {
        const customDateObj = new Date(customDate);
        if (isNaN(customDateObj.getTime())) {
          errors.customDate = 'Please enter a valid date';
        }
      }
    }

    // Validate contact information fields
    if (contactEmail && !validateEmail(contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }

    if (contactPhone && !validatePhone(contactPhone)) {
      errors.contactPhone = 'Please enter a valid phone number';
    }

    if (contactWebsite && !validateURL(contactWebsite)) {
      errors.contactWebsite = 'Please enter a valid website URL (e.g., https://example.com)';
    }

    if (contactLinkedin && !validateURL(contactLinkedin)) {
      errors.contactLinkedin = 'Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)';
    }

    if (contactTwitter && contactTwitter.trim()) {
      // Twitter can be either a handle (@username) or URL
      const isHandle = contactTwitter.startsWith('@');
      const isURL = contactTwitter.startsWith('http') || contactTwitter.includes('.');
      
      if (!isHandle && !isURL) {
        errors.contactTwitter = 'Please enter a valid Twitter handle (@username) or URL';
      } else if (isURL && !validateURL(contactTwitter)) {
        errors.contactTwitter = 'Please enter a valid Twitter URL (e.g., https://twitter.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9_]{1,15}$/;
        if (!handleRegex.test(contactTwitter)) {
          errors.contactTwitter = 'Please enter a valid Twitter handle (@username, 1-15 characters, letters, numbers, and underscores only)';
        }
      }
    }

    if (contactInstagram && contactInstagram.trim()) {
      // Instagram can be either a handle (@username) or URL
      const isHandle = contactInstagram.startsWith('@');
      const isURL = contactInstagram.startsWith('http') || contactInstagram.includes('.');
      
      if (!isHandle && !isURL) {
        errors.contactInstagram = 'Please enter a valid Instagram handle (@username) or URL';
      } else if (isURL && !validateURL(contactInstagram)) {
        errors.contactInstagram = 'Please enter a valid Instagram URL (e.g., https://instagram.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9._]{1,30}$/;
        if (!handleRegex.test(contactInstagram)) {
          errors.contactInstagram = 'Please enter a valid Instagram handle (@username, 1-30 characters, letters, numbers, dots, and underscores only)';
        }
      }
    }

    if (contactFacebook && !validateURL(contactFacebook)) {
      errors.contactFacebook = 'Please enter a valid Facebook URL (e.g., https://facebook.com/username)';
    }

    if (contactBirthday && !validateBirthday(contactBirthday)) {
      errors.contactBirthday = 'Please enter a valid birthday (MM/DD/YYYY)';
    }

    // Validate company and job title content
    if (contactCompany && contactCompany.trim()) {
      if (contactCompany.length > 100) {
        errors.contactCompany = 'Company name must be 100 characters or less';
      } else if (contactCompany.trim().length < 2) {
        errors.contactCompany = 'Company name must be at least 2 characters long';
      } else if (!/^[a-zA-Z0-9\s\-&.,'()]+$/.test(contactCompany.trim())) {
        errors.contactCompany = 'Company name contains invalid characters';
      }
    }

    if (contactJobTitle && contactJobTitle.trim()) {
      if (contactJobTitle.length > 100) {
        errors.contactJobTitle = 'Job title must be 100 characters or less';
      } else if (contactJobTitle.trim().length < 2) {
        errors.contactJobTitle = 'Job title must be at least 2 characters long';
      } else if (!/^[a-zA-Z0-9\s\-&.,'()]+$/.test(contactJobTitle.trim())) {
        errors.contactJobTitle = 'Job title contains invalid characters';
      }
    }

    if (contactAddress && contactAddress.length > 200) {
      errors.contactAddress = 'Address must be 200 characters or less';
    }

    if (contactNotes && contactNotes.length > 500) {
      errors.contactNotes = 'Notes must be 500 characters or less';
    }

    if (notes && notes.length > 1000) {
      errors.notes = 'Notes must be 1000 characters or less';
    }

    if (familyInfo.spouse && familyInfo.spouse.length > 100) {
      errors.familySpouse = 'Spouse information must be 100 characters or less';
    }

    if (familyInfo.kids && familyInfo.kids.length > 200) {
      errors.familyKids = 'Kids information must be 200 characters or less';
    }

    if (familyInfo.siblings && familyInfo.siblings.length > 200) {
      errors.familySiblings = 'Siblings information must be 200 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedContact || !currentUser) return;

    setIsSaving(true);
    try {
      let lastContactDate: Date;
      let lastContactMethod: ContactMethod;

      if (relationship) {
        // When editing, preserve existing last contact data
        lastContactDate = new Date(relationship.lastContactDate);
        lastContactMethod = relationship.lastContactMethod as ContactMethod;
      } else {
        // When creating, use form data
        lastContactDate = getLastContactDate(lastContactOption, customDate);
        lastContactMethod = contactMethod;
      }

      // const nextReminderDate = calculateNextReminderDate(lastContactDate, reminderFrequency); // COMMENTED OUT

      const relationshipData = {
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        lastContactDate: lastContactDate.toISOString(),
        lastContactMethod: lastContactMethod,
        reminderFrequency: relationship?.reminderFrequency || 'month' as ReminderFrequency, // Preserve existing or use default
        nextReminderDate: relationship?.nextReminderDate || lastContactDate.toISOString(), // Preserve existing or use last contact date
        tags: selectedTags,
        notes,
        familyInfo,
        contactData: {
          // Store all phone numbers and emails from the selected contact, fallback to manual input
          phoneNumbers: selectedContact?.phoneNumbers || (contactPhone ? [{ number: contactPhone, label: 'mobile' }] : []),
          emails: selectedContact?.emails || (contactEmail ? [{ email: contactEmail, label: 'work' }] : []),
          website: contactWebsite,
          linkedin: contactLinkedin,
          twitter: contactTwitter,
          instagram: contactInstagram,
          facebook: contactFacebook,
          company: contactCompany,
          jobTitle: contactJobTitle,
          address: contactAddress,
          birthday: contactBirthday,
          notes: contactNotes,
        },
      };

      let savedRelationship: Relationship;

      if (relationship) {
        // Update existing relationship
        const success = await updateRelationship(relationship.id, relationshipData);
        if (!success) {
          throw new Error('Failed to update relationship');
        }
        savedRelationship = { ...relationship, ...relationshipData };
      } else {
        // Create new relationship
        savedRelationship = await createRelationship(relationshipData);
      }

      onRelationshipSaved?.(savedRelationship);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving relationship:', error);
      showAlert('Error', 'Failed to save relationship. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Contact picker removed - contact is passed via props

  return (
    <>
      <Modal visible={visible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {relationship ? 'Edit Relationship' : 'Create Relationship'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Contact Display */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.contactDisplay}>
                <Text style={styles.contactDisplayText}>
                  {selectedContact ? selectedContact.name : 'No contact selected'}
                </Text>
              </View>
            </View>

            {/* Last Contact Section - Only show when creating new relationship */}
            {!relationship && (
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
                  <View>
                    <TextInput
                      style={[styles.input, validationErrors.customDate && styles.inputError]}
                      value={customDate}
                      onChangeText={setCustomDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                    {validationErrors.customDate && (
                      <Text style={styles.errorText}>{validationErrors.customDate}</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Contact Method Section - Only show when creating new relationship */}
            {!relationship && (
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
            )}

            {/* Reminder Frequency Section - COMMENTED OUT */}
            {/* <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Frequency</Text>
              <View style={styles.frequencyGrid}>
                {reminderFrequencies.map((frequency) => (
                  <TouchableOpacity
                    key={frequency.key}
                    style={[
                      styles.frequencyButton,
                      reminderFrequency === frequency.key && styles.selectedFrequency
                    ]}
                    onPress={() => setReminderFrequency(frequency.key as ReminderFrequency)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      reminderFrequency === frequency.key && styles.selectedFrequencyText
                    ]}>
                      {frequency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View> */}

            {/* Contact Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactPhone && styles.inputError]}
                  value={contactPhone}
                  onChangeText={(text) => {
                    setContactPhone(text);
                    clearFieldError('contactPhone');
                  }}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
                {validationErrors.contactPhone && (
                  <Text style={styles.errorText}>{validationErrors.contactPhone}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactEmail && styles.inputError]}
                  value={contactEmail}
                  onChangeText={(text) => {
                    setContactEmail(text);
                    clearFieldError('contactEmail');
                  }}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {validationErrors.contactEmail && (
                  <Text style={styles.errorText}>{validationErrors.contactEmail}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactCompany && styles.inputError]}
                  value={contactCompany}
                  onChangeText={(text) => {
                    setContactCompany(text);
                    clearFieldError('contactCompany');
                  }}
                  placeholder="Enter company name"
                  placeholderTextColor="#9CA3AF"
                />
                {validationErrors.contactCompany && (
                  <Text style={styles.errorText}>{validationErrors.contactCompany}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Job Title</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactJobTitle && styles.inputError]}
                  value={contactJobTitle}
                  onChangeText={(text) => {
                    setContactJobTitle(text);
                    clearFieldError('contactJobTitle');
                  }}
                  placeholder="Enter job title"
                  placeholderTextColor="#9CA3AF"
                />
                {validationErrors.contactJobTitle && (
                  <Text style={styles.errorText}>{validationErrors.contactJobTitle}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactWebsite && styles.inputError]}
                  value={contactWebsite}
                  onChangeText={(text) => {
                    setContactWebsite(text);
                    clearFieldError('contactWebsite');
                  }}
                  placeholder="Enter website URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {validationErrors.contactWebsite && (
                  <Text style={styles.errorText}>{validationErrors.contactWebsite}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactLinkedin && styles.inputError]}
                  value={contactLinkedin}
                  onChangeText={(text) => {
                    setContactLinkedin(text);
                    clearFieldError('contactLinkedin');
                  }}
                  placeholder="Enter LinkedIn profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {validationErrors.contactLinkedin && (
                  <Text style={styles.errorText}>{validationErrors.contactLinkedin}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>X (Twitter)</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactTwitter && styles.inputError]}
                  value={contactTwitter}
                  onChangeText={(text) => {
                    setContactTwitter(text);
                    clearFieldError('contactTwitter');
                  }}
                  placeholder="Enter X/Twitter handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
                {validationErrors.contactTwitter && (
                  <Text style={styles.errorText}>{validationErrors.contactTwitter}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactInstagram && styles.inputError]}
                  value={contactInstagram}
                  onChangeText={(text) => {
                    setContactInstagram(text);
                    clearFieldError('contactInstagram');
                  }}
                  placeholder="Enter Instagram handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
                {validationErrors.contactInstagram && (
                  <Text style={styles.errorText}>{validationErrors.contactInstagram}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactFacebook && styles.inputError]}
                  value={contactFacebook}
                  onChangeText={(text) => {
                    setContactFacebook(text);
                    clearFieldError('contactFacebook');
                  }}
                  placeholder="Enter Facebook profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {validationErrors.contactFacebook && (
                  <Text style={styles.errorText}>{validationErrors.contactFacebook}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactAddress && styles.inputError]}
                  value={contactAddress}
                  onChangeText={(text) => {
                    setContactAddress(text);
                    clearFieldError('contactAddress');
                  }}
                  placeholder="Enter address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                />
                {validationErrors.contactAddress && (
                  <Text style={styles.errorText}>{validationErrors.contactAddress}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birthday</Text>
                <TextInput
                  style={[styles.input, validationErrors.contactBirthday && styles.inputError]}
                  value={contactBirthday}
                  onChangeText={(text) => {
                    setContactBirthday(text);
                    clearFieldError('contactBirthday');
                  }}
                  placeholder="Enter birthday (MM/DD/YYYY)"
                  placeholderTextColor="#9CA3AF"
                />
                {validationErrors.contactBirthday && (
                  <Text style={styles.errorText}>{validationErrors.contactBirthday}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, validationErrors.contactNotes && styles.inputError]}
                  value={contactNotes}
                  onChangeText={(text) => {
                    setContactNotes(text);
                    clearFieldError('contactNotes');
                  }}
                  placeholder="Enter additional notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {validationErrors.contactNotes && (
                  <Text style={styles.errorText}>{validationErrors.contactNotes}</Text>
                )}
              </View>
            </View>

            {/* Tags Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsGrid}>
                {predefinedTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagButton,
                        isSelected && styles.selectedTag
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[
                        styles.tagButtonText,
                        isSelected && styles.selectedTagText
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Family Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Family Information</Text>
              <View style={styles.familyInputs}>
                <View style={styles.familyFieldContainer}>
                  <Text style={styles.familyFieldLabel}>💍 Spouse</Text>
                  <TextInput
                    style={[styles.input, validationErrors.familySpouse && styles.inputError]}
                    value={familyInfo.spouse}
                    onChangeText={(text) => {
                      setFamilyInfo(prev => ({ ...prev, spouse: text }));
                      clearFieldError('familySpouse');
                    }}
                    placeholder="e.g., Married to Sarah"
                    placeholderTextColor="#9CA3AF"
                  />
                  {validationErrors.familySpouse && (
                    <Text style={styles.errorText}>{validationErrors.familySpouse}</Text>
                  )}
                </View>
                <View style={styles.familyFieldContainer}>
                  <Text style={styles.familyFieldLabel}>👶 Kids</Text>
                  <TextInput
                    style={[styles.input, validationErrors.familyKids && styles.inputError]}
                    value={familyInfo.kids}
                    onChangeText={(text) => {
                      setFamilyInfo(prev => ({ ...prev, kids: text }));
                      clearFieldError('familyKids');
                    }}
                    placeholder="e.g., 2 kids, ages 5 and 8"
                    placeholderTextColor="#9CA3AF"
                  />
                  {validationErrors.familyKids && (
                    <Text style={styles.errorText}>{validationErrors.familyKids}</Text>
                  )}
                </View>
                <View style={styles.familyFieldContainer}>
                  <Text style={styles.familyFieldLabel}>👨‍👩‍👧‍👦 Siblings</Text>
                  <TextInput
                    style={[styles.input, validationErrors.familySiblings && styles.inputError]}
                    value={familyInfo.siblings}
                    onChangeText={(text) => {
                      setFamilyInfo(prev => ({ ...prev, siblings: text }));
                      clearFieldError('familySiblings');
                    }}
                    placeholder="e.g., 1 brother, 2 sisters"
                    placeholderTextColor="#9CA3AF"
                  />
                  {validationErrors.familySiblings && (
                    <Text style={styles.errorText}>{validationErrors.familySiblings}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput, validationErrors.notes && styles.inputError]}
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  clearFieldError('notes');
                }}
                placeholder="Add any additional notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
              {validationErrors.notes && (
                <Text style={styles.errorText}>{validationErrors.notes}</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : (relationship ? 'Update Relationship' : 'Create Relationship')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contactDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  contactDisplayText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
  },
  selectedOption: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  optionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  selectedMethod: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  methodText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedMethodText: {
    color: '#ffffff',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
  },
  selectedFrequency: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedFrequencyText: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
  },
  selectedTag: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tagButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTagText: {
    color: '#ffffff',
  },
  familyInputs: {
    gap: 16,
  },
  familyFieldContainer: {
    gap: 6,
  },
  familyFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
