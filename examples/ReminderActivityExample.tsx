import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useActivity } from '../firebase/hooks/useActivity';
import { useAuth } from '../firebase/hooks/useAuth';
import ReminderNotificationService from '../services/ReminderNotificationService';

/**
 * Example component demonstrating how to create reminder activities
 * with notification scheduling and direct editing capability
 */
export default function ReminderActivityExample() {
  const { createActivity, getActivityByReminderId } = useActivity();
  const { currentUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createReminderActivity = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      // First create the reminder document and schedule notifications
      const reminderData = {
        contactName: 'John Doe',
        type: 'follow_up',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        frequency: 'month',
        tags: ['client', 'important'],
        notes: 'Follow up on the project proposal',
        contactId: 'contact_123',
        isOverdue: false,
        isThisWeek: false,
      };

      const reminderNotificationService = ReminderNotificationService.getInstance();
      const reminderWithNotifications = await reminderNotificationService.createReminderWithNotifications(
        currentUser.uid,
        reminderData,
        [15, 30, 60] // 15 min, 30 min, 1 hour before due date
      );

      // Get the reminder document ID
      const reminderId = reminderWithNotifications.id;

      // Now create the activity with reference to the reminder document
      const activityData = {
        type: 'reminder' as const,
        description: 'Follow up on the project proposal',
        contactId: 'contact_123',
        contactName: 'John Doe',
        reminderDate: reminderData.date,
        reminderType: 'follow_up',
        frequency: 'month',
        reminderId: reminderId, // Reference to the reminder document
        tags: ['client', 'important'],
      };

      const activity = await createActivity(activityData);

      Alert.alert(
        'Success',
        `Reminder activity created successfully!\n\nActivity ID: ${activity.id}\nReminder ID: ${reminderId}\n\nNotifications scheduled for 15 min, 30 min, and 1 hour before due date.`
      );

      // Demonstrate how to get the activity by reminder ID for direct editing
      const retrievedActivity = await getActivityByReminderId(reminderId);
      if (retrievedActivity) {
        console.log('Activity retrieved by reminder ID:', retrievedActivity);
        Alert.alert(
          'Direct Editing',
          `You can now edit this reminder directly using the reminder ID: ${reminderId}\n\nThis allows you to update both the activity and the reminder document simultaneously.`
        );
      }
    } catch (error) {
      console.error('Error creating reminder activity:', error);
      Alert.alert('Error', 'Failed to create reminder activity. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminder Activity Example</Text>
      <Text style={styles.description}>
        This example demonstrates how to create a reminder activity that:
        {'\n'}• Creates a reminder document in Firestore
        {'\n'}• Schedules notifications (15 min, 30 min, 1 hour before due)
        {'\n'}• Stores the reminder document ID in the activity
        {'\n'}• Allows direct editing of the reminder through the activity
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isCreating && styles.buttonDisabled]}
        onPress={createReminderActivity}
        disabled={isCreating}
      >
        <Text style={styles.buttonText}>
          {isCreating ? 'Creating...' : 'Create Reminder Activity'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: This will create a reminder for tomorrow and schedule notifications.
        Check your device's notification settings to ensure notifications are enabled.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    color: '#666',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
