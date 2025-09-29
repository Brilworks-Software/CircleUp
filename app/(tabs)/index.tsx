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
  Pressable,
  Animated,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { Plus, Users, Bell, Clock, MessageSquare, StickyNote, FileText, Phone, Calendar, CheckCircle, X, Save, Trash2, Mail, MessageCircle, User, AlertCircle, Search, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../firebase/hooks/useAuth';
import { useUser } from '../../firebase/hooks/useUser';
import { useStats } from '../../firebase/hooks/useStats';
import { useActivity } from '../../firebase/hooks/useActivity';
import { useRemindersInfinite } from '../../firebase/hooks/useRemindersInfinite';
import { useRelationships } from '../../firebase/hooks/useRelationships';
import AddActivityModal from '../../components/AddActivityModal';
import EditActivityModal from '../../components/EditActivityModal';
import CreateEditRelationshipModal from '../../components/CreateEditRelationshipModal';
import RelationshipInfoModal from '../../components/RelationshipInfoModal';
import WebCompatibleDateTimePicker from '../../components/WebCompatibleDateTimePicker';
import type { Reminder, ReminderFrequency, Contact, Relationship, LastContactOption, ContactMethod, ReminderFrequency as RelationshipReminderFrequency } from '../../firebase/types';

export default function HomeScreen() {
  const { currentUser, signOut } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(currentUser?.uid || '');
  const { stats, isLoading: isLoadingStats, getRemindersStats, getRelationshipsStats } = useStats();
  const { activities, isLoading: isLoadingActivities, getRecentActivities, updateActivity, deleteActivity, createActivity } = useActivity();
  const { relationships, isLoading: isLoadingRelationships, createRelationship, updateRelationship, deleteRelationship } = useRelationships();
  
  // Reminders data for different categories
  const { 
    reminders: missedReminders, 
    tabCounts: reminderCounts, 
    isLoading: isLoadingReminders,
    updateReminder,
    deleteReminder
  } = useRemindersInfinite('missed', '', 'all');
  
  const { reminders: thisWeekReminders } = useRemindersInfinite('thisWeek', '', 'all');
  const { reminders: upcomingReminders } = useRemindersInfinite('upcoming', '', 'all');
  
  // Active reminder tab state
  const [activeReminderTab, setActiveReminderTab] = useState<'missed' | 'thisWeek' | 'upcoming'>('missed');
  
  // Reminder modal states
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReminderDetail, setShowReminderDetail] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  
  // Edit reminder form states
  const [editReminderNote, setEditReminderNote] = useState('');
  const [editReminderDate, setEditReminderDate] = useState(new Date());
  const [editReminderTime, setEditReminderTime] = useState(new Date());
  const [editReminderType, setEditReminderType] = useState('follow_up');
  const [editReminderFrequency, setEditReminderFrequency] = useState<ReminderFrequency>('once');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    totalReminders: 0,
    totalRelationships: 0,
    overdueReminders: 0,
  });
  const [isLoadingRealTimeStats, setIsLoadingRealTimeStats] = useState(false);
  const [hasLoadedInitialStats, setHasLoadedInitialStats] = useState(false);

  // Modal states
  const [editActivityModalVisible, setEditActivityModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  
  // Relationships modal states
  const [showAddRelationshipModal, setShowAddRelationshipModal] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showRelationshipInfoModal, setShowRelationshipInfoModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  const [selectedRelationshipForInfo, setSelectedRelationshipForInfo] = useState<Relationship | null>(null);
  const [showEditRelationshipModal, setShowEditRelationshipModal] = useState(false);
  
  // Device contacts state
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [filteredDeviceContacts, setFilteredDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Device contacts state
  const [hasMoreDeviceContacts, setHasMoreDeviceContacts] = useState(false);
  
  // New contact form states
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

  // Initialize app and handle all loading states
  useEffect(() => {
    const initializeAppSequence = async () => {
      try {
        // First, initialize basic app setup
        await requestContactsPermission();
        setIsInitializing(false);
        
        // Wait for user to be available before proceeding
        if (currentUser?.uid) {
          // Load initial stats with loading indicator
          await loadRealTimeStats(true);
          setIsAppReady(true);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsInitializing(false);
        setIsAppReady(true); // Still show UI even if there's an error
      }
    };

    initializeAppSequence();
  }, [currentUser?.uid]);

  // Set up periodic refresh for real-time stats (only after app is ready)
  useEffect(() => {
    if (!isAppReady || !currentUser?.uid) return;

    // Refresh stats every minute to catch overdue reminders (without loading indicator)
    const interval = setInterval(() => {
      loadRealTimeStats(false);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAppReady, currentUser?.uid]);

  // Refresh stats when screen comes into focus (with debounce, no loading indicator)
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.uid && !isLoadingRealTimeStats && hasLoadedInitialStats) {
        // Add a small delay to prevent rapid successive calls
        const timeoutId = setTimeout(() => {
          loadRealTimeStats(false);
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }, [currentUser?.uid, isLoadingRealTimeStats, hasLoadedInitialStats])
  );

  // Load device contacts on mobile when component mounts
  useEffect(() => {
    if (Platform.OS !== 'web' && isAppReady) {
      loadDeviceContacts();
    }
  }, [isAppReady]);

  const loadRealTimeStats = async (isInitialLoad = false) => {
    if (!currentUser?.uid || isLoadingRealTimeStats) return;
    
    try {
      // Only show loading state for initial load or if we haven't loaded stats yet
      if (isInitialLoad || !hasLoadedInitialStats) {
        setIsLoadingRealTimeStats(true);
      }
      
      const [remindersStats, relationshipsStats] = await Promise.all([
        getRemindersStats(),
        getRelationshipsStats(),
      ]);
      
      // Always update stats, but only show loading indicator for initial load
      setRealTimeStats({
        totalReminders: remindersStats.total,
        totalRelationships: relationshipsStats.total,
        overdueReminders: remindersStats.overdue,
      });
      
      if (isInitialLoad) {
        setHasLoadedInitialStats(true);
      }
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    } finally {
      setIsLoadingRealTimeStats(false);
    }
  };


 

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setHasContactPermission(true);
        await loadDeviceContacts();
      } else {
        Alert.alert(
          'Permission Required',
          'This app needs access to your contacts to provide full functionality.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {} },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  };

  const loadDeviceContacts = async (reset = true) => {
    try {
      setIsLoadingDeviceContacts(true);
      console.log('📱 Loading all device contacts...');
      
      // Load all contacts at once without pagination
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        // Remove pageSize and pageOffset to get all contacts
      });
      
      console.log(`📱 Loaded ${data.length} total device contacts`);
      
      // Filter and sort contacts
      const processedContacts = data
        .filter(contact => contact.name && contact.name.trim()) // Only contacts with names
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      console.log(`📱 Processed ${processedContacts.length} contacts after filtering`);
      
      setDeviceContacts(processedContacts);
      setFilteredDeviceContacts(processedContacts);
      setHasMoreDeviceContacts(false); // No more contacts to load
      
      console.log(`📱 Total contacts displayed: ${processedContacts.length}`);
    } catch (error) {
      console.error('Error loading device contacts:', error);
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  };


  // Handle device contact selection with relationship check
  const handleDeviceContactPress = (contact: Contacts.Contact, index: number) => {
    const contactName = contact.name || 'Unknown';
    
    // Check if relationship already exists
    const existingRelationship = relationships.find(rel => 
      rel.contactName.toLowerCase() === contactName.toLowerCase()
    );
    
    if (existingRelationship) {
      // Show options: Edit relationship or View relationship
      Alert.alert(
        'Relationship Exists',
        `A relationship already exists for ${contactName}. What would you like to do?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Edit Relationship',
            onPress: () => {
              // Open edit modal with existing relationship
              setEditingRelationship(existingRelationship);
              setSelectedContact({
                id: existingRelationship.contactId,
                name: existingRelationship.contactName
              });
              setShowAddRelationshipModal(true);
            }
          },
          {
            text: 'View Relationship',
            onPress: () => {
              // Navigate to relationships page
              router.push('/(tabs)/relationships');
            }
          }
        ]
      );
    } else {
      // Create new relationship
      setSelectedContact({
        id: (contact as any).id || `device_${index}`,
        name: contactName
      });
      setShowAddRelationshipModal(true);
    }
  };

  const filterDeviceContacts = (query: string) => {
    setContactSearchQuery(query);
    if (!query.trim()) {
      setFilteredDeviceContacts(deviceContacts);
      return;
    }
    
    const filtered = deviceContacts.filter(contact => 
      contact.name?.toLowerCase().includes(query.toLowerCase()) ||
      contact.phoneNumbers?.[0]?.number?.includes(query) ||
      contact.emails?.[0]?.email?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDeviceContacts(filtered);
  };

  // Contact list modal functions
  const openContactList = () => {
    if (Platform.OS === "web") {
      setShowNewContactModal(true);
      return;
    }
    if (!hasContactPermission) {
      requestContactsPermission();
      return;
    }
    setShowContactList(true);
  };

  // Load contacts when modal opens
  const handleContactListOpen = () => {
    if (Platform.OS === "web") {
      setShowNewContactModal(true);
      return;
    }
    if (!hasContactPermission) {
      requestContactsPermission();
      return;
    }
    // Load contacts if not already loaded
    if (deviceContacts.length === 0) {
      console.log('Loading device contacts...');
      loadDeviceContacts();
    } else {
      console.log('Device contacts already loaded:', deviceContacts.length);
    }
    setShowContactList(true);
  };

  const handleDeviceContactSelect = (contact: Contacts.Contact) => {
    const contactName = contact.name || 'Unknown';
    
    // Check if relationship already exists
    const existingRelationship = relationships.find(rel => 
      rel.contactName.toLowerCase() === contactName.toLowerCase()
    );
    
    if (existingRelationship) {
      // Show options: Edit relationship or View relationship
      Alert.alert(
        'Relationship Exists',
        `A relationship already exists for ${contactName}. What would you like to do?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Edit Relationship',
            onPress: () => {
              // Open edit modal with existing relationship
              setEditingRelationship(existingRelationship);
              setSelectedContact({
                id: existingRelationship.contactId,
                name: existingRelationship.contactName
              });
              setShowContactList(false);
              setShowAddRelationshipModal(true);
            }
          },
          {
            text: 'View Relationship',
            onPress: () => {
              // Navigate to relationships page
              setShowContactList(false);
              router.push('/(tabs)/relationships');
            }
          }
        ]
      );
    } else {
      // Create new relationship
      setSelectedContact({
        id: (contact as any).id || `device_${Date.now()}`,
        name: contactName
      });
      setShowContactList(false);
      setShowAddRelationshipModal(true);
    }
  };


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

  // Activity handlers
  const handleEditActivity = (activity: any) => {
    setSelectedActivity(activity);
    setEditActivityModalVisible(true);
  };

  const handleDeleteActivity = (activity: any) => {
    setSelectedActivity(activity);
    setDeleteModalVisible(true);
  };

  const handleCloseEditActivityModal = () => {
    setEditActivityModalVisible(false);
    setSelectedActivity(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedActivity) return;

    try {
      const success = await deleteActivity(selectedActivity.id);
      
      if (success) {
        setDeleteModalVisible(false);
        setSelectedActivity(null);
        Alert.alert('Success', 'Activity deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      Alert.alert('Error', 'Failed to delete activity');
    }
  };

  const handleActivityUpdated = () => {
    // Activity was updated successfully, modal will close automatically
    // You can add any additional logic here if needed
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedActivity(null);
  };

  // Activity handlers
  const handleAddActivity = () => {
    setAddActivityModalVisible(true);
  };

  const handleCloseActivityModal = () => {
    setAddActivityModalVisible(false);
  };

  const handleActivityCreated = () => {
    // Activity was created successfully, modal will close automatically
    // You can add any additional logic here if needed
  };

  // Relationships handlers
  const handleDeleteRelationship = async (relationshipId: string, contactName: string) => {
    Alert.alert(
      'Delete Relationship',
      `Are you sure you want to delete your relationship with ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRelationship(relationshipId);
              Alert.alert('Success', 'Relationship deleted successfully');
            } catch (error) {
              console.error('Error deleting relationship:', error);
              Alert.alert('Error', 'Failed to delete relationship');
            }
          },
        },
      ]
    );
  };

  const handleEditRelationshipFromInfo = (relationship: Relationship) => {
    setEditingRelationship(relationship);
    setShowEditRelationshipModal(true);
  };

  const handleDataChanged = () => {
    // Force refresh of relationships and reminders data
    // The useRelationships and useRemindersInfinite hooks should automatically update
    // due to their real-time listeners, but we can trigger a manual refresh if needed
    console.log('Data changed, refreshing...');
  };

  const handleAddRelationship = () => {
    setShowAddRelationshipModal(true);
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
          { text: 'Edit', onPress: () => {
            setSelectedContact(contact);
            setShowContactList(false);
            setShowAddRelationshipModal(true);
          }},
        ]
      );
      return;
    }

    setSelectedContact(contact);
    setShowContactList(false);
    setShowAddRelationshipModal(true);
  };

  const handleCreateNewContact = () => {
    setShowNewContactModal(true);
  };

  const handleSaveNewContact = async () => {
    if (!newContactName.trim()) {
      Alert.alert('Error', 'Please enter a contact name');
      return;
    }

    try {
      setIsSaving(true);
      
      // Create a new contact object
      const newContact: Contact = {
        id: `new_${Date.now()}`,
        name: newContactName.trim(),
        phoneNumbers: newContactPhone ? [{ number: newContactPhone, label: 'mobile' }] : undefined,
        emails: newContactEmail ? [{ email: newContactEmail, label: 'work' }] : undefined,
        website: newContactWebsite || "",
        linkedin: newContactLinkedin || "",
        twitter: newContactTwitter || "",
        instagram: newContactInstagram || "",
        facebook: newContactFacebook || "",
        company: newContactCompany || "",
        jobTitle: newContactJobTitle || "",
        address: newContactAddress || "",
        birthday: newContactBirthday || "",
        notes: newContactNotes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSelectedContact(newContact);
      setShowNewContactModal(false);
      setShowAddRelationshipModal(true);
    } catch (error) {
      console.error('Error creating new contact:', error);
      Alert.alert('Error', 'Failed to create new contact');
    } finally {
      setIsSaving(false);
    }
  };


  // Reminder handlers
  const handleReminderPress = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowReminderDetail(true);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const targetDateUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    
    const diffInDays = Math.floor((todayUTC.getTime() - targetDateUTC.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
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
  };

  const calculateNextReminderDate = (currentDate: string, frequency: string): string => {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'once':
        return currentDate;
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
        return currentDate;
      default:
        return currentDate;
    }
    
    return date.toISOString();
  };

  const markAsDone = async (reminderId: string) => {
    try {
      const reminder = [...missedReminders, ...thisWeekReminders, ...upcomingReminders].find(r => r.id === reminderId);
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
      }

      // Use the update and delete functions from the hook (already available at component level)

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
      const reminder = [...missedReminders, ...thisWeekReminders, ...upcomingReminders].find(r => r.id === reminderId);
      if (!reminder) return;
      
      // Use the updateReminder function from the hook (already available at component level)
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

  const connectNow = async (reminder: Reminder) => {
    try {
      // Find the relationship document for this contact
      const relationship = relationships.find(rel => 
        rel.contactName === reminder.contactName || rel.contactId === reminder.contactId
      );

      if (!relationship) {
        Alert.alert('Error', 'No relationship found for this contact. Please add the contact to relationships first.');
        return;
      }

      // Create an activity to record the connection using relationship data
      await createActivity({
        type: 'interaction',
        title: `Connected with ${relationship.contactName}`,
        description: `Connected with ${relationship.contactName} for reminder: ${reminder.type}${reminder.notes ? ` - ${reminder.notes}` : ''}. Relationship info: ${relationship.notes || 'No additional notes'}`,
        tags: ['connection', 'reminder', 'interaction', ...relationship.tags],
        contactId: relationship.contactId,
        contactName: relationship.contactName,
        interactionType: 'inPerson', // Default to in-person connection
        date: new Date().toISOString(),
        duration: 0,
        location: relationship.contactData?.address || '',
      });

      // Update the relationship with new last contact information
      await updateRelationship(relationship.id, {
        lastContactDate: new Date().toISOString(),
        lastContactMethod: 'inPerson',
        notes: relationship.notes + `\n\n[${new Date().toLocaleDateString()}] Connected via reminder: ${reminder.type}`,
      });

      setShowReminderDetail(false);
      Alert.alert('Success', `Connection recorded with ${relationship.contactName}! Relationship updated.`);
    } catch (error) {
      console.error('Error recording connection:', error);
      Alert.alert('Error', 'Failed to record connection. Please try again.');
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderNote(reminder.notes || '');
    setEditReminderDate(new Date(reminder.date));
    setEditReminderTime(new Date(reminder.date));
    setEditReminderType(reminder.type);
    setEditReminderFrequency(reminder.frequency as ReminderFrequency);
    setShowReminderDetail(false);
    setShowEditReminderModal(true);
  };

  const handleUpdateReminder = async () => {
    if (!editingReminder) return;
    
    if (!editReminderNote || editReminderNote.trim() === '') {
      Alert.alert('Validation Error', 'Please enter a note for the reminder.');
      return;
    }
    
    const combinedDateTime = new Date(editReminderDate);
    combinedDateTime.setHours(editReminderTime.getHours());
    combinedDateTime.setMinutes(editReminderTime.getMinutes());
    
    const now = new Date();
    if (combinedDateTime <= now) {
      Alert.alert('Validation Error', 'Please select a future date and time for the reminder.');
      return;
    }
    
    try {
      // Use the updateReminder function from the hook (already available at component level)
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
      console.error('Error updating reminder:', error);
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
              // Use the deleteReminder function from the hook (already available at component level)
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


  // Reminder Detail Modal
  const renderReminderDetailModal = () => (
    <Modal visible={showReminderDetail} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.reminderDetailModal}>
        <View style={styles.reminderModalHeader}>
          <Text style={styles.reminderModalTitle}>{selectedReminder?.contactName}</Text>
          <TouchableOpacity onPress={() => setShowReminderDetail(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedReminder && (
          <ScrollView style={styles.reminderDetailContent}>
            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Reminder Type</Text>
              <Text style={styles.reminderDetailValue}>{selectedReminder.type}</Text>
            </View>

            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Due Date</Text>
              <Text style={[
                styles.reminderDetailValue,
                selectedReminder.isOverdue && styles.overdueText
              ]}>
                {formatDate(selectedReminder.date)}
                {selectedReminder.isOverdue && ' (Overdue)'}
              </Text>
            </View>

            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Frequency</Text>
              <Text style={styles.reminderDetailValue}>Every {selectedReminder.frequency}</Text>
            </View>

            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Tags</Text>
              <View style={styles.reminderDetailTags}>
                {selectedReminder.tags.map((tag, index) => (
                  <View key={index} style={styles.reminderDetailTag}>
                    <Text style={styles.reminderDetailTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {selectedReminder.notes && (
              <View style={styles.reminderDetailSection}>
                <Text style={styles.reminderDetailLabel}>Notes</Text>
                <Text style={styles.reminderDetailValue}>{selectedReminder.notes}</Text>
              </View>
            )}

            <View style={styles.reminderActionButtons}>
              <TouchableOpacity 
                style={styles.reminderConnectButton}
                onPress={() => connectNow(selectedReminder)}
              >
                <Text style={styles.reminderConnectButtonText}>Connect Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.reminderPrimaryButton}
                onPress={() => markAsDone(selectedReminder.id)}
              >
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.reminderPrimaryButtonText}>Mark as Done</Text>
              </TouchableOpacity>

              <View style={styles.reminderEditDeleteButtons}>
                <TouchableOpacity 
                  style={styles.reminderEditButton}
                  onPress={() => handleEditReminder(selectedReminder)}
                >
                  <Text style={styles.reminderEditButtonText}>Edit Reminder</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.reminderDeleteButton}
                  onPress={() => handleDeleteReminder(selectedReminder.id)}
                >
                  <Text style={styles.reminderDeleteButtonText}>Delete Reminder</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reminderSnoozeButtons}>
                <TouchableOpacity 
                  style={styles.reminderSnoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 1)}
                >
                  <Text style={styles.reminderSnoozeButtonText}>Snooze 1 day</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.reminderSnoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 7)}
                >
                  <Text style={styles.reminderSnoozeButtonText}>Snooze 1 week</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Edit Reminder Modal
  const renderEditReminderModal = () => {
    const frequencyOptions = [
      { key: 'once', label: 'Once' },
      { key: 'daily', label: 'Daily' },
      { key: 'week', label: 'Weekly' },
      { key: 'month', label: 'Monthly' },
      { key: '3months', label: 'Every 3 Months' },
      { key: '6months', label: 'Every 6 Months' },
      { key: 'yearly', label: 'Yearly' },
    ];

    return (
      <Modal visible={showEditReminderModal} animationType="slide" transparent>
        <View style={styles.editReminderOverlay}>
          <View style={styles.editReminderContainer}>
            <View style={styles.editReminderHeader}>
              <Text style={styles.editReminderTitle}>Edit Reminder</Text>
              <TouchableOpacity onPress={() => setShowEditReminderModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editReminderContent}>
              <View style={styles.editReminderForm}>
                <Text style={styles.editReminderFormLabel}>Contact</Text>
                <View style={styles.editReminderContactDisplay}>
                  <Users size={20} color="#6B7280" />
                  <Text style={styles.editReminderContactDisplayText}>
                    {editingReminder?.contactName}
                  </Text>
                </View>
                
                <Text style={styles.editReminderFormLabel}>Type</Text>
                <View style={styles.editReminderTypeSelector}>
                  {['follow_up', 'meeting', 'call', 'birthday', 'other'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.editReminderTypeOption,
                        editReminderType === type && styles.editReminderTypeOptionSelected
                      ]}
                      onPress={() => setEditReminderType(type)}
                    >
                      <Text style={[
                        styles.editReminderTypeOptionText,
                        editReminderType === type && styles.editReminderTypeOptionTextSelected
                      ]}>
                        {type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.editReminderFormLabel}>Frequency</Text>
                <View style={styles.editReminderFrequencySelector}>
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.editReminderFrequencyOption,
                        editReminderFrequency === option.key && styles.editReminderFrequencyOptionSelected
                      ]}
                      onPress={() => setEditReminderFrequency(option.key as ReminderFrequency)}
                    >
                      <Text style={[
                        styles.editReminderFrequencyOptionText,
                        editReminderFrequency === option.key && styles.editReminderFrequencyOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.editReminderFormLabel}>Date *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
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
                ) : (
                  <TouchableOpacity 
                    style={styles.editReminderDateTimeButton}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.editReminderDateTimeButtonText}>
                      {editReminderDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.editReminderFormLabel}>Time *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
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
                ) : (
                  <TouchableOpacity 
                    style={styles.editReminderDateTimeButton}
                    onPress={() => setShowEditTimePicker(true)}
                  >
                    <Clock size={20} color="#6B7280" />
                    <Text style={styles.editReminderDateTimeButtonText}>
                      {editReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.editReminderHelperText}>
                  Please select a future date and time for your reminder
                </Text>
                
                <Text style={styles.editReminderFormLabel}>Note *</Text>
                <TextInput
                  style={styles.editReminderNoteInput}
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
            
            <View style={styles.editReminderActions}>
              <TouchableOpacity 
                style={styles.editReminderCancelButton}
                onPress={() => setShowEditReminderModal(false)}
              >
                <Text style={styles.editReminderCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.editReminderUpdateButton,
                  (!editReminderNote.trim()) && styles.editReminderUpdateButtonDisabled
                ]}
                onPress={handleUpdateReminder}
                disabled={!editReminderNote.trim()}
              >
                <Text style={[
                  styles.editReminderUpdateButtonText,
                  (!editReminderNote.trim()) && styles.editReminderUpdateButtonTextDisabled
                ]}>
                  Update Reminder
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Only show loading screen during initial app setup
  if (isInitializing || !isAppReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title} >
                Welcome Back{userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : ''}
              </Text>
              <Text style={styles.subtitle}>Manage your connections</Text>
            </View>
           
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, isLoadingRealTimeStats && !hasLoadedInitialStats && styles.statCardLoading]} 
            onPress={() => router.push('/(tabs)/reminders')}
            disabled={isLoadingRealTimeStats && !hasLoadedInitialStats}
          >
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>
              {isLoadingRealTimeStats && !hasLoadedInitialStats ? '...' : realTimeStats.totalReminders}
            </Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, isLoadingRealTimeStats && !hasLoadedInitialStats && styles.statCardLoading]}
            onPress={() => router.push('/(tabs)/relationships')}
            disabled={isLoadingRealTimeStats && !hasLoadedInitialStats}
          >
            <Users size={24} color="#10B981" />
            <Text style={styles.statNumber}>
              {isLoadingRealTimeStats && !hasLoadedInitialStats ? '...' : realTimeStats.totalRelationships}
            </Text>
            <Text style={styles.statLabel}>Relationships</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/reminders')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {/* Reminder Tabs */}
          <View style={styles.reminderTabsContainer}>
            <View style={styles.reminderTabs}>
              {[
                { key: 'missed', label: 'Missed', count: reminderCounts.missed || 0 },
                { key: 'thisWeek', label: 'This week', count: reminderCounts.thisWeek || 0 },
                { key: 'upcoming', label: 'Upcoming', count: reminderCounts.upcoming || 0 },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.reminderTab}
                  onPress={() => setActiveReminderTab(tab.key as 'missed' | 'thisWeek' | 'upcoming')}
                >
                  <View style={styles.reminderTabContent}>
                    <Text style={[
                      styles.reminderTabText,
                      activeReminderTab === tab.key && styles.activeReminderTabText
                    ]}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View style={[
                        styles.reminderTabCount,
                        activeReminderTab === tab.key && styles.activeReminderTabCount
                      ]}>
                        <Text style={[
                          styles.reminderTabCountText,
                          activeReminderTab === tab.key && styles.activeReminderTabCountText
                        ]}>
                          {isLoadingReminders ? '...' : tab.count}
                        </Text>
                      </View>
                    )}
                  </View>
                  {activeReminderTab === tab.key && <View style={styles.reminderTabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reminderTabsDivider} />
          </View>

          {/* Reminder Content */}
          <View style={styles.reminderContent}>
            {isLoadingReminders ? (
              <View style={styles.reminderLoadingContainer}>
                <Text style={styles.loadingText}>Loading reminders...</Text>
              </View>
            ) : (() => {
              const getCurrentReminders = () => {
                switch (activeReminderTab) {
                  case 'missed':
                    return missedReminders;
                  case 'thisWeek':
                    return thisWeekReminders;
                  case 'upcoming':
                    return upcomingReminders;
                  default:
                    return [];
                }
              };

              const currentReminders = getCurrentReminders();
              const displayReminders = currentReminders.slice(0, 6);

              if (displayReminders.length === 0) {
                return (
                  <View style={styles.emptyReminderContainer}>
                    <Text style={styles.emptyReminderText}>
                      {activeReminderTab === 'missed' 
                        ? 'All caught up!' 
                        : activeReminderTab === 'thisWeek'
                        ? 'No reminders this week'
                        : 'No upcoming reminders'
                      }
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.reminderList}>
                  {displayReminders.map((reminder) => (
                    <TouchableOpacity 
                      key={reminder.id} 
                      style={styles.reminderCard}
                      onPress={() => handleReminderPress(reminder)}
                    >
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderInfo}>
                          <Text style={styles.contactName}>{reminder.contactName}</Text>
                          <Text style={styles.reminderType}>{reminder.type}</Text>
                        </View>
                        <View style={styles.reminderStatus}>
                          {reminder.isOverdue ? (
                            <AlertCircle size={20} color="#EF4444" />
                          ) : (
                            <Calendar size={16} color="#6B7280" />
                          )}
                          <Text style={[
                            styles.dateText,
                            reminder.isOverdue && styles.overdueText
                          ]}>
                            {formatDate(reminder.date)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.reminderFooter}>
                        <Text style={styles.frequency}>Every {reminder.frequency}</Text>
                        <View style={styles.tags}>
                          {reminder.tags.slice(0, 2).map((tag: string, index: number) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                          {reminder.tags.length > 2 && (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>+{reminder.tags.length - 2}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {reminder.notes && (
                        <Text style={styles.notes} numberOfLines={1}>{reminder.notes}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Relationships Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Add Relationships
            </Text>
            <View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/relationships')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.relationshipsContainer}>
            {(() => {
              // Platform-specific data and loading states
              const isWeb = Platform.OS === 'web';
              const isLoading = isWeb ? isLoadingRelationships : isLoadingDeviceContacts;
              const data = isWeb ? relationships : deviceContacts;
              const emptyText = isWeb ? 'No relationships yet' : 'No device contacts found';
              const emptySubtext = isWeb ? 'Start by adding your first contact' : 'Grant permission to access contacts';
              
              if (isLoading) {
                return (
                  <View style={styles.relationshipsLoadingContainer}>
                    <Text style={styles.loadingText}>
                      {isWeb ? 'Loading relationships...' : 'Loading device contacts...'}
                    </Text>
                  </View>
                );
              }
              
              if (data.length === 0) {
                return (
                  <View style={styles.emptyRelationshipsContainer}>
                    <Text style={styles.emptyRelationshipsText}>{emptyText}</Text>
                    <Text style={styles.emptyRelationshipsSubtext}>{emptySubtext}</Text>
                    <TouchableOpacity 
                      style={styles.addRelationshipButton}
                      onPress={() => {
                        if (isWeb) {
                          handleCreateNewContact();
                        } else {
                          setShowAddRelationshipModal(true);
                        }
                      }}
                    >
                      <Plus size={20} color="#ffffff" />
                      <Text style={styles.addRelationshipButtonText}>Add Contact</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              
              return (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.relationshipsScrollView}
                >
                  <View style={styles.relationshipsList}>
                    <TouchableOpacity 
                      style={styles.addRelationshipFirstCard}
                      onPress={() => {
                        if (isWeb) {
                          handleCreateNewContact();
                        } else {
                          handleContactListOpen();
                        }
                      }}
                    >
                      <View style={styles.addRelationshipFirstIcon}>
                        <Plus size={32} color="#ffffff" />
                      </View>
                      <Text style={styles.addRelationshipFirstText}>
                        {isWeb ? 'Add relationship' : 'Add contact'}
                      </Text>
                      <Text style={styles.addRelationshipFirstSubtext}>
                        {isWeb ? 'Start building connections' : 'Create new relationship'}
                      </Text>
                    </TouchableOpacity>
                    
                    {data.map((item, index) => {
                      if (isWeb) {
                        // Web: Show relationships
                        const relationship = item as Relationship;
                        return (
                          <TouchableOpacity 
                            key={relationship.id} 
                            style={styles.relationshipCard}
                            onPress={() => {
                              setSelectedRelationshipForInfo(relationship);
                              setShowRelationshipInfoModal(true);
                            }}
                          >
                            <View style={styles.relationshipCardHeader}>
                              <TouchableOpacity 
                                style={styles.relationshipCardClose}
                                onPress={() => handleDeleteRelationship(relationship.id, relationship.contactName)}
                              >
                                <X size={16} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                            
                            <View style={styles.relationshipAvatar}>
                              <Text style={styles.relationshipAvatarText}>
                                {relationship.contactName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            
                            <Text style={styles.relationshipName}>{relationship.contactName}</Text>
                            <Text style={styles.relationshipCompany}>
                              {relationship.contactData?.company || 'No company info'}
                            </Text>
                          </TouchableOpacity>
                        );
                      } else {
                        // Mobile: Show device contacts
                        const contact = item as Contacts.Contact;
                        const contactName = contact.name || 'Unknown';
                        const existingRelationship = relationships.find(rel => 
                          rel.contactName.toLowerCase() === contactName.toLowerCase()
                        );
                        
                        return (
                          <TouchableOpacity 
                            key={(contact as any).id || `device_${index}`} 
                            style={[
                              styles.relationshipCard,
                              existingRelationship && styles.relationshipCardExisting
                            ]}
                            onPress={() => handleDeviceContactPress(contact, index)}
                          >
                            <View style={styles.relationshipCardHeader}>
                              {existingRelationship && (
                                <View style={styles.relationshipExistsIndicator}>
                                  <CheckCircle size={16} color="#10B981" />
                                </View>
                              )}
                            </View>
                            
                            <View style={styles.relationshipAvatar}>
                              <Text style={styles.relationshipAvatarText}>
                                {contactName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            
                            <Text style={styles.relationshipName}>{contactName}</Text>
                            <Text style={styles.relationshipCompany}>
                              {existingRelationship 
                                ? 'Relationship exists' 
                                : contact.phoneNumbers?.[0]?.number || 'No phone info'
                              }
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    })}
                    
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          
          <View style={styles.activityList}>
            {getRecentActivities().slice(0, 6).map((activity) => {
              const getActivityIcon = () => {
                switch (activity.type) {
                  case 'note':
                    return <FileText size={20} color="#3B82F6" />;
                  case 'interaction':
                    // Check the specific interaction type for more accurate icons
                    switch (activity.interactionType) {
                      case 'call':
                        return <Phone size={20} color="#10B981" />;
                      case 'email':
                        return <Mail size={20} color="#10B981" />;
                      case 'text':
                        return <MessageCircle size={20} color="#10B981" />;
                      case 'inPerson':
                        return <User size={20} color="#10B981" />;
                      default:
                        return <Phone size={20} color="#10B981" />; // fallback to phone
                    }
                  case 'reminder':
                    return activity.isCompleted ? 
                      <CheckCircle size={20} color="#059669" /> : 
                      <Calendar size={20} color="#F59E0B" />;
                  default:
                    return <StickyNote size={20} color="#6B7280" />;
                }
              };

              const getActivityIconBg = () => {
                switch (activity.type) {
                  case 'note':
                    return '#EBF8FF';
                  case 'interaction':
                    return '#ECFDF5';
                  case 'reminder':
                    return activity.isCompleted ? '#ECFDF5' : '#FFFBEB';
                  default:
                    return '#F3F4F6';
                }
              };

              return (
                <TouchableOpacity 
                  key={activity.id} 
                  style={styles.activityItem}
                  onPress={() => {
                    if(activity.type !== "reminder"){
                      handleEditActivity(activity)
                    }
                  }}
                  onLongPress={() => handleDeleteActivity(activity)}
                  delayLongPress={500}
                >
                  <View style={[styles.activityIcon, { backgroundColor: getActivityIconBg() }]}>
                    {getActivityIcon()}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.type === 'note' ? `Note about ${(activity as any).contactName || 'Contact'}` : 
                       activity.type === 'interaction' ? `${activity.interactionType} with ${activity.contactName}` :
                       activity.type === 'reminder' ? `Reminder for ${activity.contactName}` : `Activity with ${(activity as any).contactName || 'Contact'}`}
                    </Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityDate}>
                      {(() => {
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
                        return date.toLocaleDateString();
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {getRecentActivities().length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent activity</Text>
                <Text style={styles.emptyStateSubtext}>Start by adding relationships or setting reminders</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.bottomInput}>
              <TouchableOpacity style={styles.inputMenuButton}>
                <Text style={styles.inputMenuText}>☰</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputField}
                onPress={handleAddActivity}
              >
                <Text style={styles.inputFieldPlaceholder}>Anything to note?</Text>
              </TouchableOpacity>
            </View>

      {/* Edit Activity Modal */}
      <EditActivityModal
        visible={editActivityModalVisible}
        onClose={handleCloseEditActivityModal}
        activity={selectedActivity}
        onActivityUpdated={handleActivityUpdated}
      />

      {/* Delete Activity Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Trash2 size={48} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Delete Activity</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete "{selectedActivity?.title}"? This action cannot be undone.
              </Text>
            </View>
            
            <View style={styles.deleteModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDelete}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleConfirmDelete}>
                <Trash2 size={20} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Activity Modal */}
      <AddActivityModal
        visible={addActivityModalVisible}
        onClose={handleCloseActivityModal}
        onActivityCreated={handleActivityCreated}
      />

      {/* Reminder Detail Modal */}
      {renderReminderDetailModal()}

      {/* Edit Reminder Modal */}
      {renderEditReminderModal()}

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
              onChangeText={filterDeviceContacts}
              placeholder="Search device contacts..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {!isLoadingDeviceContacts && deviceContacts.length > 0 && (
            <View style={styles.contactCountHeader}>
              <Text style={styles.contactCountText}>
                {filteredDeviceContacts.length} of {deviceContacts.length} contacts
              </Text>
            </View>
          )}
          
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
              <Text style={styles.emptySubtitle}>
                Debug: deviceContacts={deviceContacts.length}, filtered={filteredDeviceContacts.length}, hasPermission={hasContactPermission.toString()}, isLoading={isLoadingDeviceContacts.toString()}
              </Text>
              {!hasContactPermission && (
                <TouchableOpacity style={styles.permissionButton} onPress={requestContactsPermission}>
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>


      {/* New Contact Modal */}
      <Modal
        visible={showNewContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewContactModal(false)}
      >
        <SafeAreaView style={styles.newContactModal}>
          <View style={styles.newContactModalHeader}>
            <Text style={styles.newContactModalTitle}>Create New Contact</Text>
            <TouchableOpacity onPress={() => setShowNewContactModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.newContactModalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newContactName}
                  onChangeText={setNewContactName}
                  placeholder="Enter contact name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={newContactPhone}
                  onChangeText={setNewContactPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={newContactEmail}
                  onChangeText={setNewContactEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={newContactCompany}
                  onChangeText={setNewContactCompany}
                  placeholder="Enter company name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Job Title</Text>
                <TextInput
                  style={styles.input}
                  value={newContactJobTitle}
                  onChangeText={setNewContactJobTitle}
                  placeholder="Enter job title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={newContactWebsite}
                  onChangeText={setNewContactWebsite}
                  placeholder="Enter website URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={styles.input}
                  value={newContactLinkedin}
                  onChangeText={setNewContactLinkedin}
                  placeholder="Enter LinkedIn profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>X (Twitter)</Text>
                <TextInput
                  style={styles.input}
                  value={newContactTwitter}
                  onChangeText={setNewContactTwitter}
                  placeholder="Enter X/Twitter handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  value={newContactInstagram}
                  onChangeText={setNewContactInstagram}
                  placeholder="Enter Instagram handle or URL"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={styles.input}
                  value={newContactFacebook}
                  onChangeText={setNewContactFacebook}
                  placeholder="Enter Facebook profile URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={newContactAddress}
                  onChangeText={setNewContactAddress}
                  placeholder="Enter address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birthday</Text>
                <TextInput
                  style={styles.input}
                  value={newContactBirthday}
                  onChangeText={setNewContactBirthday}
                  placeholder="Enter birthday (MM/DD/YYYY)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newContactNotes}
                  onChangeText={setNewContactNotes}
                  placeholder="Enter additional notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, !newContactName.trim() && styles.saveButtonDisabled]}
                onPress={handleSaveNewContact}
                disabled={!newContactName.trim() || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Creating...' : 'Create Contact & Add Relationship'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CreateEditRelationshipModal */}
      <CreateEditRelationshipModal
        visible={showAddRelationshipModal}
        onClose={() => {
          setShowAddRelationshipModal(false);
          setSelectedContact(null);
          setEditingRelationship(null);
        }}
        relationship={editingRelationship}
        initialContact={selectedContact}
        onRelationshipSaved={(relationship) => {
          setShowAddRelationshipModal(false);
          setSelectedContact(null);
          setEditingRelationship(null);
          Alert.alert('Success', editingRelationship ? 'Relationship updated successfully' : 'Relationship created successfully');
        }}
      />

      {/* RelationshipInfoModal */}
      <RelationshipInfoModal
        visible={showRelationshipInfoModal}
        onClose={() => {
          setShowRelationshipInfoModal(false);
          setSelectedRelationshipForInfo(null);
        }}
        relationship={selectedRelationshipForInfo}
        onEdit={handleEditRelationshipFromInfo}
        onDataChanged={handleDataChanged}
      />

      {/* Edit Relationship Modal */}
      <CreateEditRelationshipModal
        visible={showEditRelationshipModal}
        onClose={() => {
          setShowEditRelationshipModal(false);
          setEditingRelationship(null);
        }}
        relationship={editingRelationship}
        onRelationshipSaved={(relationship) => {
          setShowEditRelationshipModal(false);
          setEditingRelationship(null);
          Alert.alert('Success', 'Relationship updated successfully');
        }}
      />

      {/* Date Pickers for Native Platforms */}
      {Platform.OS !== 'web' && showEditDatePicker && (
        <WebCompatibleDateTimePicker
          value={editReminderDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, selectedDate?: Date) => {
            setShowEditDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEditReminderDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker for Native Platforms */}
      {Platform.OS !== 'web' && showEditTimePicker && (
        <WebCompatibleDateTimePicker
          value={editReminderTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, selectedTime?: Date) => {
            setShowEditTimePicker(Platform.OS === 'ios');
            if (selectedTime) {
              setEditReminderTime(selectedTime);
            }
          }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardLoading: {
    opacity: 0.7,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    // paddingHorizontal: 24,
    marginBottom: 16,
  },
  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activityList: {
    paddingHorizontal: 24,
  },
  activityItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  // Delete modal styles
  deleteModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
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
  inputFieldPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  // Reminders Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex:1,
    paddingLeft: 16
  },
  viewAllButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 16
  },
  viewAllText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Reminder Tabs Styles
  reminderTabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  reminderTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  reminderTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  activeReminderTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  reminderTabCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  activeReminderTabCount: {
    backgroundColor: '#3B82F6',
  },
  reminderTabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeReminderTabCountText: {
    color: '#ffffff',
  },
  reminderTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
  },
  reminderTabsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  // Reminder Content Styles
  reminderContent: {
    paddingHorizontal: 24,
  },
  reminderLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  reminderList: {
    gap: 8,
  },
  reminderCard: {
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
  reminderNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyReminderContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyReminderText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Reminder Detail Modal Styles
  reminderDetailModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  reminderModalHeader: {
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
  reminderModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  reminderDetailContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  reminderDetailSection: {
    marginBottom: 24,
  },
  reminderDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  reminderDetailValue: {
    fontSize: 16,
    color: '#111827',
  },
  reminderDetailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderDetailTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reminderDetailTagText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  reminderActionButtons: {
    marginTop: 32,
    marginBottom: 32,
  },
  reminderPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  reminderPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderConnectButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderConnectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderEditDeleteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  reminderEditButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderEditButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  reminderDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderDeleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  reminderSnoozeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderSnoozeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderSnoozeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  // Edit Reminder Modal Styles
  editReminderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editReminderContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 500,
  },
  editReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editReminderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  editReminderContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  editReminderForm: {
    paddingVertical: 16,
  },
  editReminderFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  editReminderContactDisplay: {
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
  editReminderContactDisplayText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  editReminderTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  editReminderTypeOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  editReminderTypeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  editReminderTypeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  editReminderTypeOptionTextSelected: {
    color: '#ffffff',
  },
  editReminderFrequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  editReminderFrequencyOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  editReminderFrequencyOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  editReminderFrequencyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  editReminderFrequencyOptionTextSelected: {
    color: '#ffffff',
  },
  editReminderDateTimeButton: {
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
  editReminderDateTimeButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  webDateTimeInput: {
    // Container for web datetime inputs
  },
  editReminderHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -4,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  editReminderNoteInput: {
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
  editReminderActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  editReminderCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editReminderCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  editReminderUpdateButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editReminderUpdateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  editReminderUpdateButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  editReminderUpdateButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // Relationships Section Styles
  relationshipsContainer: {
    paddingHorizontal: 16,
  },
  relationshipsLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  relationshipsScrollView: {
    paddingLeft: 0,
  },
  relationshipsList: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical:8
  },
  relationshipCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  relationshipCardHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  relationshipCardClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationshipAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  relationshipAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 4,
  },
  relationshipCompany: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  addRelationshipFirstCard: {
    backgroundColor: '#3B82F6',
    padding: 20,
    borderRadius: 12,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addRelationshipFirstIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addRelationshipFirstText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  addRelationshipFirstSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  addMoreCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginTop: 8,
  },
  emptyRelationshipsContainer: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyRelationshipsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyRelationshipsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  addRelationshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addRelationshipButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Add Relationship Modal Styles
  addRelationshipModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  addRelationshipModalHeader: {
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
  addRelationshipModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addRelationshipModalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  addRelationshipModalText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  addRelationshipModalFeatures: {
    gap: 16,
    marginBottom: 32,
  },
  addRelationshipModalFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addRelationshipModalFeatureText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  goToRelationshipsButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  goToRelationshipsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Contact Selection Modal Styles
  contactSelectionModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contactSelectionModalHeader: {
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
  contactSelectionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  contactSelectionModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createNewContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createNewContactButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  contactLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  contactLoadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  contactList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactItemContent: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 6,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  contactInfo: {
    flex: 1,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Contact List Modal Styles (matching relationships.tsx pattern)
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
    alignItems: 'center',
    gap: 12,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceContactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceContactActionText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
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
  contactCountHeader: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  contactCountText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContactsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyContactsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // New Contact Modal Styles
  newContactModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  newContactModalHeader: {
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
  newContactModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  newContactModalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  newContactFormSection: {
    marginBottom: 20,
  },
  newContactFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  newContactFormInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  newContactFormTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Form styles from relationships.tsx
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Modal Trigger Button
  modalTriggerButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Load More Button Styles
  loadMoreCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    marginRight: 12,
  },
  loadMoreIcon: {
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  // Existing Relationship Styles
  relationshipCardExisting: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  relationshipExistsIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});