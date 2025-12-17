import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import {
  Plus,
  Users,
  Bell,
  Clock,
  MessageSquare,
  StickyNote,
  FileText,
  Phone,
  Calendar,
  CheckCircle,
  X,
  Save,
  Trash2,
  Mail,
  MessageCircle,
  User,
  AlertCircle,
  Search,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
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

import type {
  Reminder,
  ReminderFrequency,
  Contact,
  Relationship,
  LastContactOption,
  ContactMethod,
  ReminderFrequency as RelationshipReminderFrequency,
} from '../../firebase/types';
import { ReminderTypes, getReminderTypeDisplayName } from '../../constants/ReminderTypes';
import { get } from 'firebase/database';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    if (
      buttons.length === 2 &&
      buttons[0].text === 'Cancel' &&
      buttons[1].text === 'Sign Out'
    ) {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons[1].onPress) {
        buttons[1].onPress();
      }
      return;
    }

    const result = window.confirm(
      `${title}\n\n${message}\n\nClick OK to continue or Cancel to abort.`
    );
    if (result) {
      const actionButton = buttons.find((btn) => btn.text !== 'Cancel');
      if (actionButton && actionButton.onPress) {
        actionButton.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function HomeScreen() {
  const { currentUser, signOut, deleteAccount, isDeletingAccount, reauthenticate } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(
    currentUser?.uid || ''
  );
  const {
    stats,
    isLoading: isLoadingStats,
    getRemindersStats,
    getRelationshipsStats,
  } = useStats();
  const {
    activities,
    isLoading: isLoadingActivities,
    getRecentActivities,
    updateActivity,
    deleteActivity,
    createActivity,
  } = useActivity();
  const {
    relationships,
    isLoading: isLoadingRelationships,
    createRelationship,
    updateRelationship,
    deleteRelationship,
  } = useRelationships();

  // Reminders data for different categories
  const {
    reminders: missedReminders,
    tabCounts: reminderCounts,
    isLoading: isLoadingReminders,
    updateReminder,
    deleteReminder,
  } = useRemindersInfinite('missed', '', 'all');

  const { reminders: thisWeekReminders } = useRemindersInfinite(
    'thisWeek',
    '',
    'all'
  );
  const { reminders: upcomingReminders } = useRemindersInfinite(
    'upcoming',
    '',
    'all'
  );

  // Active reminder tab state
  const [activeReminderTab, setActiveReminderTab] = useState<
    'missed' | 'thisWeek' | 'upcoming'
  >('missed');

  // Reminder modal states
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(
    null
  );
  const [showReminderDetail, setShowReminderDetail] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Edit reminder form states
  const [editReminderNote, setEditReminderNote] = useState('');
  const [editReminderDate, setEditReminderDate] = useState(new Date());
  const [editReminderTime, setEditReminderTime] = useState(new Date());
  const [editReminderType, setEditReminderType] = useState(ReminderTypes.FollowUp);
  const [editReminderFrequency, setEditReminderFrequency] =
    useState<ReminderFrequency>('once');
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

  // Navigation state to prevent multiple taps
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal states
  const [editActivityModalVisible, setEditActivityModalVisible] =
    useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Relationships modal states
  const [showAddRelationshipModal, setShowAddRelationshipModal] =
    useState(false);

  // Delete account modal states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isReauthLoading, setIsReauthLoading] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showRelationshipInfoModal, setShowRelationshipInfoModal] =
    useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [editingRelationship, setEditingRelationship] =
    useState<Relationship | null>(null);
  const [selectedRelationshipForInfo, setSelectedRelationshipForInfo] =
    useState<Relationship | null>(null);
  const [showEditRelationshipModal, setShowEditRelationshipModal] =
    useState(false);

  // Device contacts state
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [filteredDeviceContacts, setFilteredDeviceContacts] = useState<
    Contacts.Contact[]
  >([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Device contacts pagination state
  const [hasMoreDeviceContacts, setHasMoreDeviceContacts] = useState(false);
  const [contactsPage, setContactsPage] = useState(0);
  const [isLoadingMoreContacts, setIsLoadingMoreContacts] = useState(false);
  const CONTACTS_PAGE_SIZE = 50;

  // Contact Actions State
  const [showContactActions, setShowContactActions] = useState(false);

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
  const [contactValidationErrors, setContactValidationErrors] = useState<
    Record<string, string>
  >({});

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

  const loadRealTimeStats = useCallback(
    async (isInitialLoad = false) => {
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
    },
    [
      currentUser?.uid,
      isLoadingRealTimeStats,
      hasLoadedInitialStats,
      getRemindersStats,
      getRelationshipsStats,
    ]
  );

  // Debounced version to prevent excessive API calls
  const debouncedLoadStats = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (isInitialLoad = false) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          loadRealTimeStats(isInitialLoad);
        }, 300); // 300ms debounce
      };
    })(),
    [loadRealTimeStats]
  );

  // Set up periodic refresh for real-time stats (only after app is ready)
  useEffect(() => {
    if (!isAppReady || !currentUser?.uid) return;

    // Refresh stats every minute to catch overdue reminders (without loading indicator)
    const interval = setInterval(() => {
      debouncedLoadStats(false);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAppReady, currentUser?.uid, debouncedLoadStats]);

  // Refresh stats when screen comes into focus (with debounce, no loading indicator)
  useFocusEffect(
    React.useCallback(() => {
      if (
        currentUser?.uid &&
        !isLoadingRealTimeStats &&
        hasLoadedInitialStats
      ) {
        // Use debounced version to prevent rapid successive calls
        debouncedLoadStats(false);
      }
    }, [
      currentUser?.uid,
      isLoadingRealTimeStats,
      hasLoadedInitialStats,
      debouncedLoadStats,
    ])
  );

  // Load device contacts on mobile when component mounts
  useEffect(() => {
    if (Platform.OS !== 'web' && isAppReady) {
      loadDeviceContacts();
    }
  }, [isAppReady]);

  // Debounced navigation function to prevent multiple taps
  const handleDebouncedNavigation = useCallback(
    (route: string) => {
      if (isNavigating) return;

      setIsNavigating(true);

      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // Navigate immediately
      router.push(route as any);

      // Reset navigation state after a delay
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 1000); // 1 second cooldown
    },
    [isNavigating]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Error signing out:', error);
            showAlert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, relationships, and reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Show second confirmation
            showAlert(
              'Final Confirmation',
              'This will permanently delete your account and all data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand, Delete',
                  style: 'destructive',
                  onPress: () => {
                    // Always require re-authentication for security
                    setShowReauthModal(true);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleReauthAndDelete = async () => {
    if (!password.trim()) {
      showAlert('Error', 'Please enter your password.');
      return;
    }

    try {
      setIsReauthLoading(true);
      await reauthenticate(password);
      await deleteAccount();

      // Small delay to ensure account deletion completes, then navigate to auth screen
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 500);
    } catch (error: any) {
      console.error('Error during re-authentication and deletion:', error);

      // Handle specific error cases
      if (error.message?.includes('wrong-password') || error.code === 'auth/wrong-password') {
        showAlert('Error', 'Incorrect password. Please try again.');
      } else if (error.message?.includes('invalid-credential') || error.code === 'auth/invalid-credential') {
        showAlert('Error', 'Invalid password. Please check your password and try again.');
      } else {
        showAlert('Error', 'Failed to delete account. Please check your password and try again.');
      }
    } finally {
      setIsReauthLoading(false);
      setShowReauthModal(false);
      setPassword('');
    }
  };

  const handleCancelReauth = () => {
    setShowReauthModal(false);
    setPassword('');
  };

  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, skip permission request and set permission to false
        setHasContactPermission(false);
        return;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setHasContactPermission(true);
        await loadDeviceContacts();
      } else {
        // Permission denied - don't show any dialog asking user to reconsider
        // The app will work without contact access
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  };

  const loadDeviceContacts = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setIsLoadingDeviceContacts(true);
          setContactsPage(0);
          setDeviceContacts([]);
          setFilteredDeviceContacts([]);
        } else {
          setIsLoadingMoreContacts(true);
        }

        const pageToLoad = reset ? 0 : contactsPage + 1;

        // Load contacts with pagination
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails,
          ],
          pageSize: CONTACTS_PAGE_SIZE,
          pageOffset: pageToLoad * CONTACTS_PAGE_SIZE,
        });

        // Filter and sort contacts
        const processedContacts = data
          .filter((contact) => contact.name && contact.name.trim()) // Only contacts with names
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (reset) {
          setDeviceContacts(processedContacts);
          setFilteredDeviceContacts(processedContacts);
        } else {
          setDeviceContacts((prev) => [...prev, ...processedContacts]);
          setFilteredDeviceContacts((prev) => [...prev, ...processedContacts]);
        }

        // Check if there are more contacts to load
        setHasMoreDeviceContacts(data.length === CONTACTS_PAGE_SIZE);
        setContactsPage(pageToLoad);
      } catch (error) {
        console.error('Error loading device contacts:', error);
      } finally {
        setIsLoadingDeviceContacts(false);
        setIsLoadingMoreContacts(false);
      }
    },
    [contactsPage, CONTACTS_PAGE_SIZE]
  );

  // Load more contacts when reaching end of list
  const loadMoreContacts = useCallback(() => {
    if (!isLoadingMoreContacts && hasMoreDeviceContacts) {
      loadDeviceContacts(false);
    }
  }, [isLoadingMoreContacts, hasMoreDeviceContacts, loadDeviceContacts]);

  // Handle device contact selection with relationship check
  const handleDeviceContactPress = (
    contact: Contacts.Contact,
    index: number
  ) => {
    const contactName = contact.name || 'Unknown';

    console.log(contact);

    // Check if relationship already exists
    const existingRelationship = relationships.find(
      (rel) => rel.contactName.toLowerCase() === contactName.toLowerCase()
    );

    if (existingRelationship) {
      setSelectedRelationshipForInfo(existingRelationship);
      setShowRelationshipInfoModal(true);
    } else {
      // Create new relationship
      setSelectedContact({
        id: (contact as any).id || `device_${index}`,
        name: contactName,
        phoneNumbers:
          contact.phoneNumbers?.map((p) => ({
            number: p.number || '',
            label: p.label,
          })) || [],
        emails:
          contact.emails?.map((e) => ({
            email: e.email || '',
            label: e.label,
          })) || [],
      });
      setShowAddRelationshipModal(true);
    }
  };

  const filterDeviceContacts = useCallback(
    (query: string) => {
      setContactSearchQuery(query);
      if (!query.trim()) {
        setFilteredDeviceContacts(deviceContacts);
        return;
      }

      const filtered = deviceContacts.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(query.toLowerCase()) ||
          contact.phoneNumbers?.[0]?.number?.includes(query) ||
          contact.emails?.[0]?.email
            ?.toLowerCase()
            .includes(query.toLowerCase())
      );
      setFilteredDeviceContacts(filtered);
    },
    [deviceContacts]
  );

  // Contact list modal functions
  const openContactList = () => {
    if (Platform.OS === 'web') {
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
    if (Platform.OS === 'web') {
      setShowNewContactModal(true);
      return;
    }
    if (!hasContactPermission) {
      requestContactsPermission();
      return;
    }
    // Load contacts if not already loaded
    if (deviceContacts.length === 0) {
      loadDeviceContacts();
    }
    setShowContactList(true);
  };

  const handleDeviceContactSelect = (contact: Contacts.Contact) => {
    const contactName = contact.name || 'Unknown';

    // Check if relationship already exists
    const existingRelationship = relationships.find(
      (rel) => rel.contactName.toLowerCase() === contactName.toLowerCase()
    );

    if (existingRelationship) {
      // Show options: Edit relationship or View relationship
      Alert.alert(
        'Relationship Exists',
        `A relationship already exists for ${contactName}. What would you like to do?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Edit Relationship',
            onPress: () => {
              // Open edit modal with existing relationship
              setEditingRelationship(existingRelationship);
              setSelectedContact({
                id: existingRelationship.contactId,
                name: existingRelationship.contactName,
              });
              setShowContactList(false);
              setShowAddRelationshipModal(true);
            },
          },
          {
            text: 'View Relationship',
            onPress: () => {
              // Navigate to relationships page
              setShowContactList(false);
              router.push('/(tabs)/relationships');
            },
          },
        ]
      );
    } else {
      // Create new relationship
      setSelectedContact({
        id: (contact as any).id || `device_${Date.now()}`,
        name: contactName,
      });
      setShowContactList(false);
      setShowAddRelationshipModal(true);
    }
  };

  const renderDeviceContact = useCallback(
    ({ item }: { item: Contacts.Contact }) => (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleDeviceContactSelect(item)}
      >
        <View style={styles.contactItemContent}>
          <Text style={styles.contactItemName}>{item.name}</Text>
          {item.phoneNumbers && item.phoneNumbers[0] && (
            <Text style={styles.contactItemPhone}>
              {item.phoneNumbers[0].number}
            </Text>
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
    ),
    []
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
    // analyticsService.logAddActivityClick();
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
  const handleDeleteRelationship = async (
    relationshipId: string,
    contactName: string
  ) => {
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
  };

  const handleAddRelationship = () => {
    setShowAddRelationshipModal(true);
  };

  const selectContact = (contact: Contact) => {
    // Check if relationship already exists
    const existingRelationship = relationships.find(
      (r) => r.contactId === contact.id
    );
    if (existingRelationship) {
      Alert.alert(
        'Relationship Exists',
        `You already have a relationship with ${contact.name}. Would you like to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => {
              setSelectedContact(contact);
              setShowContactList(false);
              setShowAddRelationshipModal(true);
            },
          },
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

  // Validation helper functions for new contact
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
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      year >= 1900 &&
      year <= new Date().getFullYear()
    );
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
      errors.contactWebsite =
        'Please enter a valid website URL (e.g., https://example.com)';
    }

    if (newContactLinkedin && !validateContactURL(newContactLinkedin)) {
      errors.contactLinkedin =
        'Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)';
    }

    if (newContactTwitter && newContactTwitter.trim()) {
      // Twitter can be either a handle (@username) or URL
      const isHandle = newContactTwitter.startsWith('@');
      const isURL =
        newContactTwitter.startsWith('http') || newContactTwitter.includes('.');

      if (!isHandle && !isURL) {
        errors.contactTwitter =
          'Please enter a valid Twitter handle (@username) or URL';
      } else if (isURL && !validateContactURL(newContactTwitter)) {
        errors.contactTwitter =
          'Please enter a valid Twitter URL (e.g., https://twitter.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9_]{1,15}$/;
        if (!handleRegex.test(newContactTwitter)) {
          errors.contactTwitter =
            'Please enter a valid Twitter handle (@username, 1-15 characters, letters, numbers, and underscores only)';
        }
      }
    }

    if (newContactInstagram && newContactInstagram.trim()) {
      // Instagram can be either a handle (@username) or URL
      const isHandle = newContactInstagram.startsWith('@');
      const isURL =
        newContactInstagram.startsWith('http') ||
        newContactInstagram.includes('.');

      if (!isHandle && !isURL) {
        errors.contactInstagram =
          'Please enter a valid Instagram handle (@username) or URL';
      } else if (isURL && !validateContactURL(newContactInstagram)) {
        errors.contactInstagram =
          'Please enter a valid Instagram URL (e.g., https://instagram.com/username)';
      } else if (isHandle) {
        // Validate handle format
        const handleRegex = /^@[a-zA-Z0-9._]{1,30}$/;
        if (!handleRegex.test(newContactInstagram)) {
          errors.contactInstagram =
            'Please enter a valid Instagram handle (@username, 1-30 characters, letters, numbers, dots, and underscores only)';
        }
      }
    }

    if (newContactFacebook && !validateContactURL(newContactFacebook)) {
      errors.contactFacebook =
        'Please enter a valid Facebook URL (e.g., https://facebook.com/username)';
    }

    if (newContactBirthday && !validateContactBirthday(newContactBirthday)) {
      errors.contactBirthday = 'Please enter a valid birthday (MM/DD/YYYY)';
    }

    // Validate company and job title content
    if (newContactCompany && newContactCompany.trim()) {
      if (newContactCompany.length > 100) {
        errors.contactCompany = 'Company name must be 100 characters or less';
      } else if (newContactCompany.trim().length < 2) {
        errors.contactCompany =
          'Company name must be at least 2 characters long';
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
      setContactValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const saveContactToDevice = async (
    contactData: Contact
  ): Promise<string | null> => {
    try {
      // Check permission first
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied - contact will be saved to app database only
        return null;
      }

      // Prepare contact data for device
      const nameParts = contactData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const deviceContact = {
        [Contacts.Fields.FirstName]: firstName,
        [Contacts.Fields.LastName]: lastName,
        [Contacts.Fields.PhoneNumbers]:
          contactData.phoneNumbers?.map((phone) => ({
            number: phone.number,
            isPrimary: true,
            label: phone.label || 'mobile',
          })) || [],
        [Contacts.Fields.Emails]:
          contactData.emails?.map((email) => ({
            email: email.email,
            isPrimary: true,
            label: email.label || 'work',
          })) || [],
        [Contacts.Fields.Company]: contactData.company || '',
        [Contacts.Fields.JobTitle]: contactData.jobTitle || '',
        [Contacts.Fields.Addresses]: contactData.address
          ? [
            {
              street: contactData.address,
              label: 'work',
            },
          ]
          : [],
      };

      const contactId = await Contacts.addContactAsync(deviceContact);
      return contactId;
    } catch (error) {
      console.error('Error saving contact to device:', error);
      throw error;
    }
  };

  const handleSaveNewContact = async () => {
    if (!validateContactForm()) {
      return;
    }

    try {
      setIsSaving(true);

      // Create a new contact object
      const newContact: Contact = {
        id: `new_${Date.now()}`,
        name: newContactName.trim(),
        phoneNumbers: newContactPhone
          ? [{ number: newContactPhone, label: 'mobile' }]
          : undefined,
        emails: newContactEmail
          ? [{ email: newContactEmail, label: 'work' }]
          : undefined,
        website: newContactWebsite || '',
        linkedin: newContactLinkedin || '',
        twitter: newContactTwitter || '',
        instagram: newContactInstagram || '',
        facebook: newContactFacebook || '',
        company: newContactCompany || '',
        jobTitle: newContactJobTitle || '',
        address: newContactAddress || '',
        birthday: newContactBirthday || '',
        notes: newContactNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // For mobile platforms with permission, ask user if they want to save to device
      if (Platform.OS !== 'web' && hasContactPermission) {
        showAlert(
          'Save Contact',
          `Would you like to save ${newContactName.trim()} to your device contacts as well?`,
          [
            {
              text: 'App Only',
              onPress: () => {
                proceedWithRelationship(newContact);
              },
            },
            {
              text: 'Save to Device',
              onPress: async () => {
                try {
                  await saveContactToDevice(newContact);
                  showAlert('Success', 'Contact saved to device successfully!');
                  proceedWithRelationship(newContact);
                } catch (error) {
                  console.error('Error saving contact to device:', error);
                  showAlert(
                    'Error',
                    'Failed to save contact to device, but you can still create the relationship.',
                    [
                      {
                        text: 'Continue',
                        onPress: () => proceedWithRelationship(newContact),
                      },
                    ]
                  );
                }
              },
            },
          ]
        );
      } else {
        // For web platform or mobile without contact permission, proceed directly to create relationship only
        proceedWithRelationship(newContact);
      }
    } catch (error) {
      console.error('Error creating new contact:', error);
      showAlert('Error', 'Failed to create new contact');
    } finally {
      setIsSaving(false);
    }
  };

  const proceedWithRelationship = (contact: Contact) => {
    setSelectedContact(contact);
    setShowNewContactModal(false);
    resetNewContactForm();
    setShowAddRelationshipModal(true);
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
    const todayUTC = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
    const targetDateUTC = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );

    const diffInDays = Math.floor(
      (todayUTC.getTime() - targetDateUTC.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      const timeString = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Today ${timeString}`;
    }
    if (diffInDays === -1) return 'Tomorrow';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays > 0 && diffInDays <= 7) return `${diffInDays} days ago`;
    if (diffInDays < 0 && diffInDays >= -7)
      return `In ${Math.abs(diffInDays)} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const calculateNextReminderDate = (
    currentDate: string,
    frequency: string
  ): string => {
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
      const reminder = [
        ...missedReminders,
        ...thisWeekReminders,
        ...upcomingReminders,
      ].find((r) => r.id === reminderId);
      if (!reminder) {
        Alert.alert('Error', 'Reminder not found.');
        return;
      }

      // Create activity to record reminder completion
      try {
        await createActivity({
          type: 'reminder',
          title: `Reminder completed: ${reminder.contactName}`,
          description: `Completed reminder: ${reminder.type}${reminder.notes ? ` - ${reminder.notes}` : ''
            }`,
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
      const nextDate = calculateNextReminderDate(
        reminder.date,
        reminder.frequency
      );

      await updateReminder({
        reminderId: reminderId,
        updates: {
          date: nextDate,
        },
      });

      // Create a new activity for the rescheduled reminder
      try {
        await createActivity({
          type: 'reminder',
          title: `Reminder rescheduled: ${reminder.contactName}`,
          description: `Rescheduled reminder: ${reminder.type}${reminder.notes ? ` - ${reminder.notes}` : ''
            } (Next: ${formatDate(nextDate)})`,
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
      Alert.alert(
        'Success',
        `Reminder rescheduled for ${formatDate(nextDate)}!`
      );
    } catch (error) {
      console.error('Error marking reminder as done:', error);
      Alert.alert('Error', 'Failed to update reminder.');
    }
  };

  const snoozeReminder = async (reminderId: string, days: number) => {
    try {
      const reminder = [
        ...missedReminders,
        ...thisWeekReminders,
        ...upcomingReminders,
      ].find((r) => r.id === reminderId);
      if (!reminder) return;

      // Use the updateReminder function from the hook (already available at component level)
      const newDate = new Date(reminder.date);
      newDate.setDate(newDate.getDate() + days);

      await updateReminder({
        reminderId,
        updates: {
          date: newDate.toISOString(),
        },
      });

      setShowReminderDetail(false);
      Alert.alert(
        'Success',
        `Reminder snoozed for ${days} day${days > 1 ? 's' : ''}!`
      );
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder.');
    }
  };

  const connectNow = async (reminder: Reminder) => {
    setShowReminderDetail(false);
    setSelectedReminder(reminder);
    setShowContactActions(true);
  };

  // Contact action functions
  const handleCall = async () => {
    if (!selectedReminder) return;

    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(
      (rel) => rel.contactName === selectedReminder.contactName
    );

    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(
        (rel) =>
          rel.contactName.toLowerCase().trim() ===
          selectedReminder.contactName.toLowerCase().trim()
      );
    }

    const relationshipPhone =
      relationship?.contactData?.phoneNumbers?.[0]?.number;
    const deviceContact = deviceContacts.find(
      (contact) => contact.name === selectedReminder.contactName
    );

    const phoneNumber =
      relationshipPhone || deviceContact?.phoneNumbers?.[0]?.number;

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
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship or device contacts.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleMessage = async () => {
    if (!selectedReminder) return;

    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(
      (rel) => rel.contactName === selectedReminder.contactName
    );

    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(
        (rel) =>
          rel.contactName.toLowerCase().trim() ===
          selectedReminder.contactName.toLowerCase().trim()
      );
    }

    const relationshipPhone =
      relationship?.contactData?.phoneNumbers?.[0]?.number;
    const deviceContact = deviceContacts.find(
      (contact) => contact.name === selectedReminder.contactName
    );

    const phoneNumber =
      relationshipPhone || deviceContact?.phoneNumbers?.[0]?.number;

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
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship or device contacts.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleWhatsApp = async () => {
    if (!selectedReminder) return;

    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(
      (rel) => rel.contactName === selectedReminder.contactName
    );

    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(
        (rel) =>
          rel.contactName.toLowerCase().trim() ===
          selectedReminder.contactName.toLowerCase().trim()
      );
    }

    const relationshipPhone =
      relationship?.contactData?.phoneNumbers?.[0]?.number;
    const deviceContact = deviceContacts.find(
      (contact) => contact.name === selectedReminder.contactName
    );

    const phoneNumber =
      relationshipPhone || deviceContact?.phoneNumbers?.[0]?.number;

    if (phoneNumber) {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits

      // Use different URL schemes for web vs mobile
      const url =
        Platform.OS === 'web'
          ? `https://wa.me/${cleanPhoneNumber}`
          : `whatsapp://send?phone=${cleanPhoneNumber}`;

      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowContactActions(false);
        } else {
          Alert.alert(
            'Error',
            Platform.OS === 'web'
              ? 'Unable to open WhatsApp Web'
              : 'WhatsApp is not installed'
          );
        }
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
        Alert.alert('Error', 'Failed to open WhatsApp');
      }
    } else {
      Alert.alert(
        'No Phone Number',
        `Phone number not available for ${selectedReminder.contactName}. Please add contact information in your relationship or device contacts.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
    }
  };

  const handleEmail = async () => {
    if (!selectedReminder) return;

    // Find the relationship data first, then fallback to device contacts
    let relationship = relationships.find(
      (rel) => rel.contactName === selectedReminder.contactName
    );

    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(
        (rel) =>
          rel.contactName.toLowerCase().trim() ===
          selectedReminder.contactName.toLowerCase().trim()
      );
    }

    const relationshipEmail = relationship?.contactData?.emails?.[0]?.email;
    const deviceContact = deviceContacts.find(
      (contact) => contact.name === selectedReminder.contactName
    );

    const email = relationshipEmail || deviceContact?.emails?.[0]?.email;

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
        `Email address not available for ${selectedReminder.contactName}. Please add contact information in your relationship or device contacts.`,
        [{ text: 'OK', onPress: () => setShowContactActions(false) }]
      );
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
      Alert.alert(
        'Validation Error',
        'Please select a future date and time for the reminder.'
      );
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
        },
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
    <Modal
      visible={showReminderDetail}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.reminderDetailModal}>
        <View style={styles.reminderModalHeader}>
          <Text style={styles.reminderModalTitle}>
            {selectedReminder?.contactName}
          </Text>
          <TouchableOpacity onPress={() => setShowReminderDetail(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedReminder && (
          <ScrollView style={styles.reminderDetailContent}>
            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Reminder Type</Text>
              <Text style={styles.reminderDetailValue}>
                {selectedReminder.type}
              </Text>
            </View>

            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Due Date</Text>
              <Text
                style={[
                  styles.reminderDetailValue,
                  selectedReminder.isOverdue && styles.overdueText,
                ]}
              >
                {formatDate(selectedReminder.date)}
                {selectedReminder.isOverdue && ' (Overdue)'}
              </Text>
            </View>

            <View style={styles.reminderDetailSection}>
              <Text style={styles.reminderDetailLabel}>Frequency</Text>
              <Text style={styles.reminderDetailValue}>
                Every {selectedReminder.frequency}
              </Text>
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
                <Text style={styles.reminderDetailValue}>
                  {selectedReminder.notes}
                </Text>
              </View>
            )}

            <View style={styles.reminderActionButtons}>
              <TouchableOpacity
                style={styles.reminderConnectButton}
                onPress={() => connectNow(selectedReminder)}
              >
                <Text style={styles.reminderConnectButtonText}>
                  Connect Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reminderPrimaryButton}
                onPress={() => markAsDone(selectedReminder.id)}
              >
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.reminderPrimaryButtonText}>
                  Mark as Done
                </Text>
              </TouchableOpacity>

              <View style={styles.reminderEditDeleteButtons}>
                <TouchableOpacity
                  style={styles.reminderEditButton}
                  onPress={() => handleEditReminder(selectedReminder)}
                >
                  <Text style={styles.reminderEditButtonText}>
                    Edit Reminder
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reminderDeleteButton}
                  onPress={() => handleDeleteReminder(selectedReminder.id)}
                >
                  <Text style={styles.reminderDeleteButtonText}>
                    Delete Reminder
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reminderSnoozeButtons}>
                <TouchableOpacity
                  style={styles.reminderSnoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 1)}
                >
                  <Text style={styles.reminderSnoozeButtonText}>
                    Snooze 1 day
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reminderSnoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 7)}
                >
                  <Text style={styles.reminderSnoozeButtonText}>
                    Snooze 1 week
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Contact Actions Modal
  const renderContactActionsModal = () => {
    if (!selectedReminder) return null;

    // Find the relationship data - try exact match first, then case-insensitive
    let relationship = relationships.find(
      (rel) => rel.contactName === selectedReminder.contactName
    );

    // If not found, try case-insensitive match
    if (!relationship) {
      relationship = relationships.find(
        (rel) =>
          rel.contactName.toLowerCase().trim() ===
          selectedReminder.contactName.toLowerCase().trim()
      );
    }

    // Get contact data from relationship document, fallback to device contacts
    const relationshipPhone =
      relationship?.contactData?.phoneNumbers?.[0]?.number;
    const relationshipEmail = relationship?.contactData?.emails?.[0]?.email;

    const deviceContact = deviceContacts.find(
      (contact) => contact.name === selectedReminder.contactName
    );

    const hasPhone =
      relationshipPhone ||
      (deviceContact?.phoneNumbers && deviceContact.phoneNumbers.length > 0);
    const hasEmail =
      relationshipEmail ||
      (deviceContact?.emails && deviceContact.emails.length > 0);
    const phoneNumber =
      relationshipPhone || deviceContact?.phoneNumbers?.[0]?.number || '';
    const email = relationshipEmail || deviceContact?.emails?.[0]?.email || '';

    return (
      <Modal visible={showContactActions} animationType="slide" transparent>
        <View style={styles.contactActionsOverlay}>
          <View style={styles.contactActionsContainer}>
            <View style={styles.contactActionsHeader}>
              <Text style={styles.contactActionsTitle}>
                Get in touch with {selectedReminder.contactName}
              </Text>
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
                  <Text style={styles.noContactInfoText}>
                    No contact information available
                  </Text>
                  <Text style={styles.noContactInfoSubtext}>
                    {relationship
                      ? 'Add contact details in your relationship or device contacts'
                      : 'Add contact details in your device contacts'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.contactActionsList}>
              <TouchableOpacity
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled,
                ]}
                onPress={handleCall}
                disabled={!hasPhone}
              >
                <View
                  style={[
                    styles.contactActionIcon,
                    !hasPhone && styles.contactActionIconDisabled,
                  ]}
                >
                  <Phone size={24} color={hasPhone ? '#10B981' : '#9CA3AF'} />
                </View>
                <View style={styles.contactActionContent}>
                  <Text
                    style={[
                      styles.contactActionTitle,
                      !hasPhone && styles.contactActionTitleDisabled,
                    ]}
                  >
                    Call
                  </Text>
                  <Text
                    style={[
                      styles.contactActionSubtitle,
                      !hasPhone && styles.contactActionSubtitleDisabled,
                    ]}
                  >
                    {hasPhone ? phoneNumber : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled,
                ]}
                onPress={handleMessage}
                disabled={!hasPhone}
              >
                <View
                  style={[
                    styles.contactActionIcon,
                    !hasPhone && styles.contactActionIconDisabled,
                  ]}
                >
                  <MessageCircle
                    size={24}
                    color={hasPhone ? '#3B82F6' : '#9CA3AF'}
                  />
                </View>
                <View style={styles.contactActionContent}>
                  <Text
                    style={[
                      styles.contactActionTitle,
                      !hasPhone && styles.contactActionTitleDisabled,
                    ]}
                  >
                    Message
                  </Text>
                  <Text
                    style={[
                      styles.contactActionSubtitle,
                      !hasPhone && styles.contactActionSubtitleDisabled,
                    ]}
                  >
                    {hasPhone ? 'Send SMS' : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactActionItem,
                  !hasPhone && styles.contactActionItemDisabled,
                ]}
                onPress={handleWhatsApp}
                disabled={!hasPhone}
              >
                <View
                  style={[
                    styles.contactActionIcon,
                    !hasPhone && styles.contactActionIconDisabled,
                  ]}
                >
                  <Text style={styles.whatsappIcon}>📱</Text>
                </View>
                <View style={styles.contactActionContent}>
                  <Text
                    style={[
                      styles.contactActionTitle,
                      !hasPhone && styles.contactActionTitleDisabled,
                    ]}
                  >
                    WhatsApp
                  </Text>
                  <Text
                    style={[
                      styles.contactActionSubtitle,
                      !hasPhone && styles.contactActionSubtitleDisabled,
                    ]}
                  >
                    {hasPhone
                      ? 'Send WhatsApp message'
                      : 'Phone number not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactActionItem,
                  !hasEmail && styles.contactActionItemDisabled,
                ]}
                onPress={handleEmail}
                disabled={!hasEmail}
              >
                <View
                  style={[
                    styles.contactActionIcon,
                    !hasEmail && styles.contactActionIconDisabled,
                  ]}
                >
                  <Mail size={24} color={hasEmail ? '#EF4444' : '#9CA3AF'} />
                </View>
                <View style={styles.contactActionContent}>
                  <Text
                    style={[
                      styles.contactActionTitle,
                      !hasEmail && styles.contactActionTitleDisabled,
                    ]}
                  >
                    Email
                  </Text>
                  <Text
                    style={[
                      styles.contactActionSubtitle,
                      !hasEmail && styles.contactActionSubtitleDisabled,
                    ]}
                  >
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
                  {Object.values(ReminderTypes).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.editReminderTypeOption,
                        editReminderType === type &&
                        styles.editReminderTypeOptionSelected,
                      ]}
                      onPress={() => setEditReminderType(type)}
                    >
                      <Text
                        style={[
                          styles.editReminderTypeOptionText,
                          editReminderType === type &&
                          styles.editReminderTypeOptionTextSelected,
                        ]}
                      >
                        {getReminderTypeDisplayName(type)}
                      </Text>
                    </TouchableOpacity>
                  )
                  )}
                </View>

                <Text style={styles.editReminderFormLabel}>Frequency</Text>
                <View style={styles.editReminderFrequencySelector}>
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.editReminderFrequencyOption,
                        editReminderFrequency === option.key &&
                        styles.editReminderFrequencyOptionSelected,
                      ]}
                      onPress={() =>
                        setEditReminderFrequency(
                          option.key as ReminderFrequency
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.editReminderFrequencyOptionText,
                          editReminderFrequency === option.key &&
                          styles.editReminderFrequencyOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.editReminderFormLabel}>Date & Time *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeRow}>
                    <View style={[styles.webDateTimeInput, { flex: 1, marginRight: 8 }]}>
                      <input
                        type="date"
                        value={editReminderDate.toISOString().slice(0, 10)}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          selectedDate.setHours(
                            editReminderTime.getHours(),
                            editReminderTime.getMinutes()
                          );
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
                          const [hours, minutes] = e.target.value
                            .split(':')
                            .map(Number);
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
                              newDate.setHours(
                                editReminderTime.getHours(),
                                editReminderTime.getMinutes()
                              );
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
                      style={[styles.editReminderDateTimeButton, { flex: 1, marginRight: 8 }]}
                      onPress={() => setShowEditDatePicker(true)}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.editReminderDateTimeButtonText}>
                        {editReminderDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editReminderDateTimeButton, { flex: 1, marginLeft: 8 }]}
                      onPress={() => setShowEditTimePicker(true)}
                    >
                      <Clock size={20} color="#6B7280" />
                      <Text style={styles.editReminderDateTimeButtonText}>
                        {editReminderTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                  !editReminderNote.trim() &&
                  styles.editReminderUpdateButtonDisabled,
                ]}
                onPress={handleUpdateReminder}
                disabled={!editReminderNote.trim()}
              >
                <Text
                  style={[
                    styles.editReminderUpdateButtonText,
                    !editReminderNote.trim() &&
                    styles.editReminderUpdateButtonTextDisabled,
                  ]}
                >
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>
                Welcome Back
                {userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : ''}
              </Text>
              <Text style={styles.subtitle}>Manage your connections</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDeleteAccount}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSignOut}
              >
                <LogOut size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[
              styles.statCard,
              isLoadingRealTimeStats &&
              !hasLoadedInitialStats &&
              styles.statCardLoading,
            ]}
            onPress={() => {
              if (
                !isNavigating &&
                (!isLoadingRealTimeStats || hasLoadedInitialStats)
              ) {
                handleDebouncedNavigation('/(tabs)/reminders');
              }
            }}
            disabled={
              (isLoadingRealTimeStats && !hasLoadedInitialStats) || isNavigating
            }
            activeOpacity={0.7}
          >
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>
              {isLoadingRealTimeStats && !hasLoadedInitialStats
                ? '...'
                : realTimeStats.totalReminders}
            </Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              isLoadingRealTimeStats &&
              !hasLoadedInitialStats &&
              styles.statCardLoading,
            ]}
            onPress={() => {
              if (
                !isNavigating &&
                (!isLoadingRealTimeStats || hasLoadedInitialStats)
              ) {
                handleDebouncedNavigation('/(tabs)/relationships');
              }
            }}
            disabled={
              (isLoadingRealTimeStats && !hasLoadedInitialStats) || isNavigating
            }
            activeOpacity={0.7}
          >
            <Users size={24} color="#10B981" />
            <Text style={styles.statNumber}>
              {isLoadingRealTimeStats && !hasLoadedInitialStats
                ? '...'
                : realTimeStats.totalRelationships}
            </Text>
            <Text style={styles.statLabel}>Relationships</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            <TouchableOpacity
              style={[styles.viewAllButton]}
              onPress={() => {
                if (!isNavigating) {
                  handleDebouncedNavigation('/(tabs)/reminders');
                }
              }}
              disabled={isNavigating}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Reminder Tabs */}
          <View style={styles.reminderTabsContainer}>
            <View style={styles.reminderTabs}>
              {[
                {
                  key: 'missed',
                  label: 'Missed',
                  count: reminderCounts.missed || 0,
                },
                {
                  key: 'thisWeek',
                  label: 'This week',
                  count: reminderCounts.thisWeek || 0,
                },
                {
                  key: 'upcoming',
                  label: 'Upcoming',
                  count: reminderCounts.upcoming || 0,
                },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.reminderTab}
                  onPress={() =>
                    setActiveReminderTab(
                      tab.key as 'missed' | 'thisWeek' | 'upcoming'
                    )
                  }
                >
                  <View style={styles.reminderTabContent}>
                    <Text
                      style={[
                        styles.reminderTabText,
                        activeReminderTab === tab.key &&
                        styles.activeReminderTabText,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View
                        style={[
                          styles.reminderTabCount,
                          activeReminderTab === tab.key &&
                          styles.activeReminderTabCount,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reminderTabCountText,
                            activeReminderTab === tab.key &&
                            styles.activeReminderTabCountText,
                          ]}
                        >
                          {isLoadingReminders ? '...' : tab.count}
                        </Text>
                      </View>
                    )}
                  </View>
                  {activeReminderTab === tab.key && (
                    <View style={styles.reminderTabUnderline} />
                  )}
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
            ) : (
              (() => {
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
                            : 'No upcoming reminders'}
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
                            <Text style={styles.contactName}>
                              {reminder.contactName}
                            </Text>
                            <Text style={styles.reminderType}>
                              {reminder.type}
                            </Text>
                          </View>
                          <View style={styles.reminderStatus}>
                            {reminder.isOverdue ? (
                              <AlertCircle size={20} color="#EF4444" />
                            ) : (
                              <Calendar size={16} color="#6B7280" />
                            )}
                            <Text
                              style={[
                                styles.dateText,
                                reminder.isOverdue && styles.overdueText,
                              ]}
                            >
                              {formatDate(reminder.date)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.reminderFooter}>
                          <Text style={styles.frequency}>
                            Every {reminder.frequency}
                          </Text>
                          <View style={styles.tags}>
                            {reminder.tags
                              .slice(0, 2)
                              .map((tag: string, index: number) => (
                                <View key={index} style={styles.tag}>
                                  <Text style={styles.tagText}>{tag}</Text>
                                </View>
                              ))}
                            {reminder.tags.length > 2 && (
                              <View style={styles.tag}>
                                <Text style={styles.tagText}>
                                  +{reminder.tags.length - 2}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {reminder.notes && (
                          <Text style={styles.notes} numberOfLines={1}>
                            {reminder.notes}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()
            )}
          </View>
        </View>

        {/* Relationships Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add Relationships</Text>
            <View>
              <TouchableOpacity
                onPress={() => {
                  if (!isNavigating) {
                    handleDebouncedNavigation('/(tabs)/relationships');
                  }
                }}
                style={[styles.viewAllButton]}
                disabled={isNavigating}
              >
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.relationshipsContainer}>
            {(() => {
              // Platform-specific data and loading states
              const isWeb = Platform.OS === 'web';
              const isLoading = isWeb
                ? isLoadingRelationships
                : isLoadingDeviceContacts;
              const data = isWeb ? relationships : deviceContacts;
              const emptyText = isWeb
                ? 'No relationships yet'
                : 'No device contacts found';
              const emptySubtext = isWeb
                ? 'Start by adding your first contact'
                : 'We use your contacts to sync your friends between our mobile and web apps. Your contacts will be securely uploaded to our server only with your consent.';

              if (isLoading) {
                return (
                  <View style={styles.relationshipsLoadingContainer}>
                    <Text style={styles.loadingText}>
                      {isWeb
                        ? 'Loading relationships...'
                        : 'Loading device contacts...'}
                    </Text>
                  </View>
                );
              }

              if (data.length === 0) {
                return (
                  <View style={styles.emptyRelationshipsContainer}>
                    <Text style={styles.emptyRelationshipsText}>
                      {emptyText}
                    </Text>
                    <Text style={styles.emptyRelationshipsSubtext}>
                      {emptySubtext}
                    </Text>
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
                      <Text style={styles.addRelationshipButtonText}>
                        Add Contact
                      </Text>
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
                        {isWeb
                          ? 'Start building connections'
                          : 'Create new relationship'}
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
                            {/* <View style={styles.relationshipCardHeader}>
                              <TouchableOpacity 
                                style={styles.relationshipCardClose}
                                onPress={() => handleDeleteRelationship(relationship.id, relationship.contactName)}
                              >
                                <X size={16} color="#6B7280" />
                              </TouchableOpacity>
                            </View> */}

                            <View style={styles.relationshipAvatar}>
                              <Text style={styles.relationshipAvatarText}>
                                {relationship.contactName
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>

                            <Text style={styles.relationshipName}>
                              {relationship.contactName}
                            </Text>
                            <Text style={styles.relationshipCompany}>
                              {relationship.contactData?.company ||
                                'No company info'}
                            </Text>
                          </TouchableOpacity>
                        );
                      } else {
                        // Mobile: Show device contacts that are NOT in relationships
                        const contact = item as Contacts.Contact;
                        const contactName = contact.name || 'Unknown';
                        const existingRelationship = relationships.find(
                          (rel) =>
                            rel.contactName.toLowerCase() ===
                            contactName.toLowerCase()
                        );

                        // Only show contacts that don't have existing relationships
                        if (existingRelationship) {
                          return null;
                        }

                        return (
                          <TouchableOpacity
                            key={(contact as any).id || `device_${index}`}
                            style={styles.relationshipCard}
                            onPress={() =>
                              handleDeviceContactPress(contact, index)
                            }
                          >
                            <View style={styles.relationshipAvatar}>
                              <Text style={styles.relationshipAvatarText}>
                                {contactName.charAt(0).toUpperCase()}
                              </Text>
                            </View>

                            <Text style={styles.relationshipName}>
                              {contactName}
                            </Text>
                            <Text style={styles.relationshipCompany}>
                              {contact.phoneNumbers?.[0]?.number ||
                                'No phone info'}
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
            {getRecentActivities()
              .slice(0, 6)
              .map((activity) => {
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
                      return activity.isCompleted ? (
                        <CheckCircle size={20} color="#059669" />
                      ) : (
                        <Calendar size={20} color="#F59E0B" />
                      );
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
                      if (activity.type !== 'reminder') {
                        handleEditActivity(activity);
                      }
                    }}
                    onLongPress={() => handleDeleteActivity(activity)}
                    delayLongPress={500}
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: getActivityIconBg() },
                      ]}
                    >
                      {getActivityIcon()}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        {activity.type === 'note'
                          ? `Note about ${(activity as any).contactName || 'Contact'
                          }`
                          : activity.type === 'interaction'
                            ? `${activity.interactionType} with ${activity.contactName}`
                            : activity.type === 'reminder'
                              ? `Reminder for ${activity.contactName}`
                              : `Activity with ${(activity as any).contactName || 'Contact'
                              }`}
                      </Text>
                      <Text style={styles.activityDescription}>
                        {activity.description}
                      </Text>
                      <Text style={styles.activityDate}>
                        {(() => {
                          // Safely handle different timestamp formats
                          let date: Date;
                          if (!activity.createdAt) {
                            date = new Date();
                          } else if (activity.createdAt instanceof Date) {
                            date = activity.createdAt;
                          } else if (
                            activity.createdAt &&
                            typeof activity.createdAt === 'object' &&
                            'seconds' in activity.createdAt
                          ) {
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
                <Text style={styles.emptyStateSubtext}>
                  Start by adding relationships or setting reminders
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.bottomInput}>
        <TouchableOpacity style={styles.inputMenuButton} onPress={handleAddActivity}>
          <Text style={styles.inputMenuText}>☰</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inputField} onPress={handleAddActivity}>
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
                Are you sure you want to delete "{selectedActivity?.title}"?
                This action cannot be undone.
              </Text>
            </View>

            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleConfirmDelete}
              >
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
      <Modal
        visible={showContactList}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createNewButton}
                onPress={() => {
                  setShowContactList(false);
                  setShowNewContactModal(true);
                }}
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
                {filteredDeviceContacts.length} of {deviceContacts.length}{' '}
                contacts
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
              keyExtractor={(item, index) =>
                (item as any).id || `device_${index}`
              }
              style={styles.contactList}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              getItemLayout={(data, index) => ({
                length: 80, // Fixed item height - adjust based on your actual item height
                offset: 80 * index,
                index,
              })}
              updateCellsBatchingPeriod={50}
              onEndReached={loadMoreContacts}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMoreContacts ? (
                  <View style={styles.loadingFooter}>
                    <Text style={styles.loadingFooterText}>
                      Loading more contacts...
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {contactSearchQuery
                  ? 'No device contacts found'
                  : 'No device contacts available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {contactSearchQuery
                  ? `No device contacts match "${contactSearchQuery}"`
                  : 'We use your contacts to sync your friends between our mobile and web apps. Your contacts will be securely uploaded to our server only with your consent.'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Debug: deviceContacts={deviceContacts.length}, filtered=
                {filteredDeviceContacts.length}, hasPermission=
                {hasContactPermission.toString()}, isLoading=
                {isLoadingDeviceContacts.toString()}
              </Text>
              {!hasContactPermission && (
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={requestContactsPermission}
                >
                  <Text style={styles.permissionButtonText}>
                    Access Contacts
                  </Text>
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
        onRequestClose={() => {
          setShowNewContactModal(false);
          resetNewContactForm();
        }}
      >
        <SafeAreaView style={styles.newContactModal}>
          <View style={styles.newContactModalHeader}>
            <Text style={styles.newContactModalTitle}>Create New Contact</Text>
            <TouchableOpacity
              onPress={() => {
                setShowNewContactModal(false);
                resetNewContactForm();
              }}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.newContactModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactName && styles.inputError,
                  ]}
                  value={newContactName}
                  onChangeText={(text) => {
                    setNewContactName(text);
                    clearContactFieldError('contactName');
                  }}
                  placeholder="Enter contact name"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactName && (
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactName}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactPhone && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactPhone}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactEmail && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactEmail}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactCompany && styles.inputError,
                  ]}
                  value={newContactCompany}
                  onChangeText={(text) => {
                    setNewContactCompany(text);
                    clearContactFieldError('contactCompany');
                  }}
                  placeholder="Enter company name"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactCompany && (
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactCompany}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Job Title</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactJobTitle &&
                    styles.inputError,
                  ]}
                  value={newContactJobTitle}
                  onChangeText={(text) => {
                    setNewContactJobTitle(text);
                    clearContactFieldError('contactJobTitle');
                  }}
                  placeholder="Enter job title"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactJobTitle && (
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactJobTitle}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactWebsite && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactWebsite}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactLinkedin &&
                    styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactLinkedin}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>X (Twitter)</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactTwitter && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactTwitter}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactInstagram &&
                    styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactInstagram}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactFacebook &&
                    styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactFacebook}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactAddress && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactAddress}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birthday</Text>
                <TextInput
                  style={[
                    styles.input,
                    contactValidationErrors.contactBirthday &&
                    styles.inputError,
                  ]}
                  value={newContactBirthday}
                  onChangeText={(text) => {
                    setNewContactBirthday(text);
                    clearContactFieldError('contactBirthday');
                  }}
                  placeholder="Enter birthday (MM/DD/YYYY)"
                  placeholderTextColor="#9CA3AF"
                />
                {contactValidationErrors.contactBirthday && (
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactBirthday}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    contactValidationErrors.contactNotes && styles.inputError,
                  ]}
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
                  <Text style={styles.errorText}>
                    {contactValidationErrors.contactNotes}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newContactName.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveNewContact}
                disabled={!newContactName.trim() || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving
                    ? 'Creating...'
                    : 'Create Contact & Add Relationship'}
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
          Alert.alert(
            'Success',
            editingRelationship
              ? 'Relationship updated successfully'
              : 'Relationship created successfully'
          );
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

      {/* Contact Actions Modal */}
      {renderContactActionsModal()}

      {/* Re-authentication Modal */}
      <Modal
        visible={showReauthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelReauth}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reauthModalContent}>
            <Text style={styles.reauthModalTitle}>Security Verification Required</Text>
            <Text style={styles.reauthModalMessage}>
              For your security, please enter your current password to confirm account deletion. This ensures only you can delete your account.
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoFocus={true}
              editable={!isReauthLoading}
            />

            <View style={styles.reauthModalButtons}>
              <TouchableOpacity
                style={[styles.reauthModalButton, styles.reauthCancelButton]}
                onPress={handleCancelReauth}
                disabled={isReauthLoading}
              >
                <Text style={styles.reauthCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reauthModalButton, styles.reauthDeleteButton]}
                onPress={handleReauthAndDelete}
                disabled={isReauthLoading || !password.trim()}
              >
                <Text style={styles.reauthDeleteButtonText}>
                  {isReauthLoading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
  statCardDisabled: {
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
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
    flex: 1,
    paddingLeft: 16,
  },
  viewAllButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 16,
  },
  viewAllButtonDisabled: {
    opacity: 0.5,
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
    marginRight: 10,
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
    paddingVertical: 8,
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
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
  // Loading Footer Styles
  loadingFooter: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Re-auth modal specific styles
  reauthModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  reauthModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  reauthModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  reauthModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reauthModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reauthCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  reauthDeleteButton: {
    backgroundColor: '#EF4444',
  },
  reauthCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  reauthDeleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
