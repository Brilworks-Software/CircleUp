import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Example component demonstrating how to schedule notifications for specific dates and times
 */
export const DateTimeSchedulingExample: React.FC = () => {
  const { scheduleNotificationForDateTime, scheduleNotificationsForDateTimes } = useNotifications();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleScheduleForSpecificDateTime = async () => {
    if (!title.trim() || !body.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Parse date and time
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
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
        setDate('');
        setTime('');
      } else {
        Alert.alert('Error', 'Failed to schedule notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid date or time format. Use YYYY-MM-DD and HH:MM');
    }
  };

  const handleScheduleMultipleForSpecificDates = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter title and body');
      return;
    }

    try {
      // Create multiple notifications for different specific times
      const notifications = [
        {
          id: `meeting_1_${Date.now()}`,
          title: `${title} - Morning Meeting`,
          body: body.trim(),
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        },
        {
          id: `meeting_2_${Date.now()}`,
          title: `${title} - Afternoon Meeting`,
          body: body.trim(),
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        },
        {
          id: `meeting_3_${Date.now()}`,
          title: `${title} - Evening Meeting`,
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

  const handleScheduleForChristmas = async () => {
    const christmasDate = new Date('2024-12-25T09:00:00'); // Christmas morning at 9 AM
    
    const notificationId = await scheduleNotificationForDateTime(
      'christmas_reminder',
      'Merry Christmas! 🎄',
      'Don\'t forget to open presents and enjoy the day!',
      christmasDate
    );

    if (notificationId) {
      Alert.alert('Success', 'Christmas notification scheduled!');
    } else {
      Alert.alert('Error', 'Failed to schedule Christmas notification');
    }
  };

  const handleScheduleForNewYear = async () => {
    const newYearDate = new Date('2025-01-01T00:00:00'); // New Year at midnight
    
    const notificationId = await scheduleNotificationForDateTime(
      'new_year_reminder',
      'Happy New Year! 🎉',
      'Welcome to 2025! Time for new beginnings!',
      newYearDate
    );

    if (notificationId) {
      Alert.alert('Success', 'New Year notification scheduled!');
    } else {
      Alert.alert('Error', 'Failed to schedule New Year notification');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Date & Time Scheduling</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule for Specific Date & Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Body"
          value={body}
          onChangeText={setBody}
        />
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Time (HH:MM)"
          value={time}
          onChangeText={setTime}
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
        <TouchableOpacity style={styles.button} onPress={handleScheduleMultipleForSpecificDates}>
          <Text style={styles.buttonText}>Schedule Multiple for Specific Dates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Examples</Text>
        <TouchableOpacity style={styles.button} onPress={handleScheduleForChristmas}>
          <Text style={styles.buttonText}>Schedule Christmas Notification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleScheduleForNewYear}>
          <Text style={styles.buttonText}>Schedule New Year Notification</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  button: {
    backgroundColor: '#007AFF',
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
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
});
