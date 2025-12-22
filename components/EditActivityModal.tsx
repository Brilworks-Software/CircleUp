import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import WebCompatibleDateTimePicker from './WebCompatibleDateTimePicker';
import { X, ChevronDown, Search, Calendar, Clock } from 'lucide-react-native';
import { useActivity } from '../firebase/hooks/useActivity';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { useAuth } from '../firebase/hooks/useAuth';
import { ReminderTypes, getReminderTypeDisplayName } from '../constants/ReminderTypes';
import RemindersService from '../firebase/services/RemindersService';

interface EditActivityModalProps {
  visible: boolean;
  onClose: () => void;
  activity: any; // Activity being edited
  onActivityUpdated?: () => void; // Callback when activity is updated
}

export default function EditActivityModal({
  visible,
  onClose,
  activity,
  onActivityUpdated,
}: EditActivityModalProps) {
  const { updateActivity } = useActivity();
  const { relationships } = useRelationships();
  const { currentUser } = useAuth();
  const remindersService = RemindersService.getInstance();
  
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

  // Interaction activity states
  const [interactionType, setInteractionType] = useState<
    'call' | 'text' | 'email' | 'inPerson'
  >('call');
  const [interactionDate, setInteractionDate] = useState(new Date());
  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionDuration, setInteractionDuration] = useState('');
  const [interactionLocation, setInteractionLocation] = useState('');

  // Reminder activity states
  const [activityReminderTitle, setActivityReminderTitle] = useState('');
  const [activityReminderDate, setActivityReminderDate] = useState(new Date());
  const [activityReminderType, setActivityReminderType] = useState(ReminderTypes.FollowUp);
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

  // Activity update loading state
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);

  // Date picker states
  const [showInteractionDatePicker, setShowInteractionDatePicker] =
    useState(false);
  const [showInteractionTimePicker, setShowInteractionTimePicker] =
    useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  // Populate form when editing an activity
  useEffect(() => {
    if (activity && visible) {
      // Set the activity type tab based on the activity being edited
      setActiveActivityTab(activity.type);

      // Set contact information if available
      if (activity.contactId && activity.contactName) {
        setSelectedContact({
          id: activity.contactId,
          name: activity.contactName,
        });
      }

      if (activity.type === 'note') {
        // setNoteTitle(activity.title || '');
        setNoteContent(
          activity.content || activity.description || ''
        );
        setNoteTags(activity.tags || []);
      } else if (activity.type === 'interaction') {
        setInteractionType(activity.interactionType || 'call');
        setInteractionDate(
          activity.date ? new Date(activity.date) : new Date()
        );
        setInteractionNotes(activity.description || '');
        setInteractionDuration(activity.duration?.toString() || '');
        setInteractionLocation(activity.location || '');
      } else if (activity.type === 'reminder') {
        // setActivityReminderTitle(activity.title || '');
        setActivityReminderDate(
          activity.reminderDate
            ? new Date(activity.reminderDate)
            : new Date()
        );
        setActivityReminderType(activity.reminderType || ReminderTypes.FollowUp);
        setActivityReminderFrequency(activity.frequency || 'month');
        setActivityReminderNotes(activity.description || '');
      }
    }
  }, [activity, visible]);

  const resetActivityForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setSelectedContact(null);
    setContactSearchQuery('');
    setShowContactPicker(false);
    setInteractionType('call');
    setInteractionDate(new Date());
    setInteractionNotes('');
    setInteractionDuration('');
    setInteractionLocation('');
    setActivityReminderTitle('');
    setActivityReminderDate(new Date());
    setActivityReminderType(ReminderTypes.FollowUp);
    setActivityReminderFrequency('month');
    setActivityReminderNotes('');
    setValidationErrors({});
    setActiveActivityTab('note');
  };

  const handleTabSwitch = (tab: 'note' | 'interaction' | 'reminder') => {
    // Prevent changing activity type during editing
    if (activity && activity.type !== tab) {
      Alert.alert(
        'Cannot Change Activity Type',
        'You cannot change the activity type while editing. Please create a new activity if you need a different type.',
        [{ text: 'OK' }]
      );
      return;
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
      // if (!noteTitle.trim()) {
      //   errors.noteTitle = 'Note title is required';
      // } else if (noteTitle.trim().length < 3) {
      //   errors.noteTitle = 'Note title must be at least 3 characters';
      // }
      if (!noteContent.trim()) {
        errors.noteContent = 'Note content is required';
      }
    } else if (activeActivityTab === 'interaction') {
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
      // Validate duration if provided
      if (interactionDuration && isNaN(parseInt(interactionDuration))) {
        errors.interactionDuration = 'Duration must be a valid number';
      } else if (interactionDuration && parseInt(interactionDuration) < 0) {
        errors.interactionDuration = 'Duration cannot be negative';
      }
    } else if (activeActivityTab === 'reminder') {
      // if (!activityReminderTitle.trim()) {
      //   errors.reminderTitle = 'Reminder title is required';
      // } else if (activityReminderTitle.trim().length < 3) {
      //   errors.reminderTitle = 'Reminder title must be at least 3 characters';
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
        // Check if reminder date is not too far in the future (e.g., 10 years)
        const tenYearsFromNow = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
        if (reminderDateTime > tenYearsFromNow) {
          errors.reminderDate = 'Reminder date cannot be more than 10 years in the future';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateNoteActivity = async () => {
    try {
      const activityData = {
        // title: noteTitle.trim(),
        description: noteContent.trim(),
        content: noteContent.trim(),
        tags: noteTags,
        // Preserve contact information if available
        ...(activity.contactId && { contactId: activity.contactId }),
        ...(activity.contactName && { contactName: activity.contactName }),
      };

      const result = await updateActivity(activity.id, activityData);

      Alert.alert('Success', 'Note activity updated successfully!');
      onClose();
      resetActivityForm();
      onActivityUpdated?.();
    } catch (error) {
      console.error('Error updating note activity:', error);
      Alert.alert('Error', 'Failed to update note activity. Please try again.');
    }
  };

  const updateInteractionActivity = async () => {
    try {
      const activityData = {
        // title: `${interactionType} with ${activity.contactName || selectedContact?.name || 'Contact'}`,
        description: interactionNotes.trim(),
        interactionType: interactionType,
        date: interactionDate.toISOString(),
        duration: interactionDuration ? parseInt(interactionDuration) : 0,
        location: interactionLocation.trim(),
        // Preserve contact information
        contactId: activity.contactId || selectedContact?.id,
        contactName: activity.contactName || selectedContact?.name,
      };

      const result = await updateActivity(activity.id, activityData);

      Alert.alert('Success', 'Interaction activity updated successfully!');
      onClose();
      resetActivityForm();
      onActivityUpdated?.();
    } catch (error) {
      console.error('Error updating interaction activity:', error);
      Alert.alert(
        'Error',
        'Failed to update interaction activity. Please try again.'
      );
    }
  };

  const updateReminderActivity = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Update the activity
      const activityUpdates = {
        // title: activityReminderTitle.trim(),
        description: activityReminderNotes.trim(),
        reminderDate: activityReminderDate.toISOString(),
        reminderType: activityReminderType,
        frequency: activityReminderFrequency,
        // Preserve contact information
        contactId: activity.contactId || selectedContact?.id,
        contactName: activity.contactName || selectedContact?.name,
      };

      await updateActivity(activity.id, activityUpdates);

      // Update the reminder document and reschedule notifications using the stored reminderId
      const reminderData = {
        contactName: activity.contactName || selectedContact?.name,
        type: activityReminderType,
        date: activityReminderDate.toISOString(),
        frequency: activityReminderFrequency,
        tags: [],
        notes: activityReminderNotes.trim(),
        contactId: activity.contactId || selectedContact?.id,
        isOverdue: false,
        isThisWeek: false,
      };

      // Use the reminderId from the activity document to update the correct reminder
      const reminderId = activity.reminderId;

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

  const handleUpdateActivity = async () => {
    if (!validateActivityForm()) {
      return;
    }

    setIsUpdatingActivity(true);

    try {
      if (activeActivityTab === 'note') {
        await updateNoteActivity();
      } else if (activeActivityTab === 'interaction') {
        await updateInteractionActivity();
      } else if (activeActivityTab === 'reminder') {
        await updateReminderActivity();
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      Alert.alert(
        'Error',
        'Failed to update activity. Please try again.'
      );
    } finally {
      setIsUpdatingActivity(false);
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

  const handleClose = () => {
    onClose();
    resetActivityForm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingView}
              >
          <View style={styles.addActivityOverlay}>
        <View style={styles.addActivityContainer}>
          <View style={styles.addActivityHeader}>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.addActivityTitle}>Edit Activity</Text>
            
          </View>

          {/* Activity Content */}
          <ScrollView
            style={styles.addActivityContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            

            <View style={styles.activitySection}>
              <View style={styles.activitySectionHeader}>
                <Text style={styles.activitySectionTitle}>
                  {activeActivityTab === 'note'
                    ? 'Edit Note'
                    : activeActivityTab === 'interaction'
                    ? 'Edit Interaction'
                    : 'Edit Reminder'}
                </Text>
                {activity && (
                  <View style={styles.activityTypeIndicator}>
                    <Text style={styles.activityTypeIndicatorText}>
                      {activity.type === 'note' ? '📝' : activity.type === 'interaction' ? '🤝' : '⏰'} {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              {activeActivityTab === 'note' && (
                <View>
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
                          <Calendar size={16} color="#6B7280" />
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
                          <Clock size={16} color="#6B7280" />
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
                      style={[
                        styles.activityInput,
                        validationErrors.interactionDuration && styles.inputError,
                      ]}
                      value={interactionDuration}
                      onChangeText={(text) => {
                        setInteractionDuration(text);
                        // Clear validation error when user types
                        if (validationErrors.interactionDuration) {
                          setValidationErrors((prev) => ({ ...prev, interactionDuration: '' }));
                        }
                      }}
                      placeholder="e.g., 30"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    {validationErrors.interactionDuration && (
                      <Text style={styles.errorText}>
                        {validationErrors.interactionDuration}
                      </Text>
                    )}
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
                          <Calendar size={16} color="#6B7280" />
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
                          <Clock size={16} color="#6B7280" />
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

          <View style={{justifyContent: "space-between", flexDirection: "row"}}>
            {/* Activity Type Tabs */}
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
                    activity && activity.type !== 'note' && styles.disabledTab,
                  ]}
                  onPress={() => handleTabSwitch('note')}
                  activeOpacity={activity && activity.type !== 'note' ? 1 : 0.7}
                  disabled={activity && activity.type !== 'note'}
                >
                  <View
                    style={[
                      styles.tabIconContainer,
                      activeActivityTab === 'note' &&
                        styles.activeTabIconContainer,
                      activity && activity.type !== 'note' && styles.disabledTabIcon,
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
                    activity && activity.type !== 'interaction' && styles.disabledTab,
                  ]}
                  onPress={() => handleTabSwitch('interaction')}
                  activeOpacity={activity && activity.type !== 'interaction' ? 1 : 0.7}
                  disabled={activity && activity.type !== 'interaction'}
                >
                  <View
                    style={[
                      styles.tabIconContainer,
                      activeActivityTab === 'interaction' &&
                        styles.activeTabIconContainer,
                      activity && activity.type !== 'interaction' && styles.disabledTabIcon,
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
                    activity && activity.type !== 'reminder' && styles.disabledTab,
                  ]}
                  onPress={() => handleTabSwitch('reminder')}
                  activeOpacity={activity && activity.type !== 'reminder' ? 1 : 0.7}
                  disabled={activity && activity.type !== 'reminder'}
                >
                  <View
                    style={[
                      styles.tabIconContainer,
                      activeActivityTab === 'reminder' &&
                        styles.activeTabIconContainer,
                      activity && activity.type !== 'reminder' && styles.disabledTabIcon,
                    ]}
                  >
                    <Text style={styles.tabIcon}>⏰</Text>
                  </View>
                  
                </TouchableOpacity>
              </Animated.View>
            </View>
            <TouchableOpacity
              onPress={handleUpdateActivity}
              style={[
                styles.addActivitySaveButton,
                isUpdatingActivity && styles.addActivitySaveButtonDisabled
              ]}
              disabled={isUpdatingActivity}
            >
              {isUpdatingActivity ? (
                <View style={styles.saveButtonLoadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.addActivitySaveButtonText, { marginLeft: 8 }]}>
                    Updating...
                  </Text>
                </View>
              ) : (
                <Text style={styles.addActivitySaveButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>

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
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
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
  },
  addActivityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft:16
  },
  addActivitySaveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "center",
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
  activityTypeTab: {
    flex: 1,
  },
  animatedTabButton: {
    alignItems: 'center',
    borderRadius: 12,
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
  disabledTab: {
    opacity: 0.4,
  },
  disabledTabIcon: {
    opacity: 0.4,
  },
  disabledTabText: {
    opacity: 0.4,
  },
  // Activity Content
  addActivityContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activitySection: {
    paddingBottom: 20,
  },
  activitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop:16
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  activityTypeIndicator: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  activityTypeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});
