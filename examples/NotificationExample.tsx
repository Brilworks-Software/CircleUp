import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationData } from '../services/NotificationService';

export const NotificationExample: React.FC = () => {
  const {
    isInitialized,
    hasPermission,
    scheduledNotifications,
    scheduleNotification,
    scheduleMultipleNotifications,
    scheduleNotificationForDateTime,
    scheduleNotificationsForDateTimes,
    cancelNotification,
    cancelAllNotifications,
  } = useNotifications();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [minutesFromNow, setMinutesFromNow] = useState('5');
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [specificDate, setSpecificDate] = useState('');
  const [specificTime, setSpecificTime] = useState('');

  const handleScheduleSingle = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter title and body');
      return;
    }

    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + parseInt(minutesFromNow));

    const notificationData: NotificationData = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      scheduledTime,
      type: 'custom',
    };

    const notificationId = await scheduleNotification(notificationData);
    if (notificationId) {
      Alert.alert('Success', 'Notification scheduled successfully!');
      setTitle('');
      setBody('');
    } else {
      Alert.alert('Error', 'Failed to schedule notification');
    }
  };

  const handleScheduleMultiple = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter title and body');
      return;
    }

    const notifications: NotificationData[] = [];
    const intervals = [5, 10, 15, 30]; // minutes from now

    intervals.forEach((minutes, index) => {
      const scheduledTime = new Date();
      scheduledTime.setMinutes(scheduledTime.getMinutes() + minutes);

      notifications.push({
        id: `multiple_${Date.now()}_${index}`,
        title: `${title} (${minutes}min)`,
        body: body.trim(),
        scheduledTime,
        type: 'custom',
      });
    });

    const notificationIds = await scheduleMultipleNotifications(notifications);
    if (notificationIds.length > 0) {
      Alert.alert('Success', `Scheduled ${notificationIds.length} notifications!`);
      setTitle('');
      setBody('');
    } else {
      Alert.alert('Error', 'Failed to schedule notifications');
    }
  };

  const handleScheduleForSpecificDateTime = async () => {
    if (!title.trim() || !body.trim() || !specificDate.trim() || !specificTime.trim()) {
      Alert.alert('Error', 'Please enter title, body, date, and time');
      return;
    }

    try {
      // Parse date and time
      const [year, month, day] = specificDate.split('-').map(Number);
      const [hours, minutes] = specificTime.split(':').map(Number);
      
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      
      // Check if the date is in the future
      if (scheduledDate <= new Date()) {
        Alert.alert('Error', 'Please select a future date and time');
        return;
      }

      const notificationId = await scheduleNotificationForDateTime(
        `specific_${Date.now()}`,
        title.trim(),
        body.trim(),
        scheduledDate
      );

      if (notificationId) {
        Alert.alert('Success', `Notification scheduled for ${scheduledDate.toLocaleString()}!`);
        setTitle('');
        setBody('');
        setSpecificDate('');
        setSpecificTime('');
      } else {
        Alert.alert('Error', 'Failed to schedule notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid date or time format. Use YYYY-MM-DD and HH:MM');
    }
  };

  const handleScheduleMultipleForSpecificDateTimes = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter title and body');
      return;
    }

    try {
      // Create multiple notifications for different specific times
      const notifications = [
        {
          id: `specific_1_${Date.now()}`,
          title: `${title} - Morning`,
          body: body.trim(),
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        },
        {
          id: `specific_2_${Date.now()}`,
          title: `${title} - Afternoon`,
          body: body.trim(),
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        },
        {
          id: `specific_3_${Date.now()}`,
          title: `${title} - Evening`,
          body: body.trim(),
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        },
      ];

      const notificationIds = await scheduleNotificationsForDateTimes(notifications);
      if (notificationIds.length > 0) {
        Alert.alert('Success', `Scheduled ${notificationIds.length} notifications for specific dates!`);
        setTitle('');
        setBody('');
      } else {
        Alert.alert('Error', 'Failed to schedule notifications');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule notifications');
    }
  };

  const handleCancelAll = async () => {
    Alert.alert(
      'Cancel All Notifications',
      'Are you sure you want to cancel all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelAllNotifications();
            if (success) {
              Alert.alert('Success', 'All notifications cancelled');
            } else {
              Alert.alert('Error', 'Failed to cancel notifications');
            }
          },
        },
      ]
    );
  };

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Initializing notifications...</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Notification permissions not granted</Text>
        <Text style={styles.subText}>Please enable notifications in your device settings</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <Text style={styles.title}>Notification Scheduler</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Single Notification</Text>
        <TextInput
          style={styles.input}
          placeholder="Notification Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notification Body"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={3}
        />
        <TextInput
          style={styles.input}
          placeholder="Minutes from now"
          value={minutesFromNow}
          onChangeText={setMinutesFromNow}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={handleScheduleSingle}>
          <Text style={styles.buttonText}>Schedule Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Multiple Notifications</Text>
        <Text style={styles.subText}>
          This will schedule notifications at 5, 10, 15, and 30 minutes from now
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleScheduleMultiple}>
          <Text style={styles.buttonText}>Schedule Multiple</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule for Specific Date & Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          value={specificDate}
          onChangeText={setSpecificDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Time (HH:MM)"
          value={specificTime}
          onChangeText={setSpecificTime}
        />
        <TouchableOpacity style={styles.button} onPress={handleScheduleForSpecificDateTime}>
          <Text style={styles.buttonText}>Schedule for Specific DateTime</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Multiple for Specific Dates</Text>
        <Text style={styles.subText}>
          This will schedule notifications for tomorrow, day after tomorrow, and 3 days from now
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleScheduleMultipleForSpecificDateTimes}>
          <Text style={styles.buttonText}>Schedule Multiple for Specific Dates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Notifications ({scheduledNotifications.length})</Text>
        {scheduledNotifications.length === 0 ? (
          <Text style={styles.subText}>No notifications scheduled</Text>
        ) : (
          scheduledNotifications.map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationBody}>{notification.body}</Text>
              <Text style={styles.notificationTime}>
                {notification.scheduledTime.toLocaleString()}
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelNotification(notification.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {scheduledNotifications.length > 0 && (
        <TouchableOpacity style={styles.dangerButton} onPress={handleCancelAll}>
          <Text style={styles.buttonText}>Cancel All Notifications</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#FF3B30',
    marginTop: 50,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  notificationItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
