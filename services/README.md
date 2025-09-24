# Notification Service Documentation

A comprehensive notification service for scheduling local notifications with expo-notifications, integrated with your existing reminder system.

## 🚀 Features

- ✅ **Schedule Single Notifications**: Schedule individual notifications at specific times
- ✅ **Schedule Multiple Notifications**: Schedule multiple notifications at different times
- ✅ **Reminder Integration**: Automatically schedule notifications for reminders with multiple intervals
- ✅ **Recurring Notifications**: Schedule daily, weekly, or monthly recurring notifications
- ✅ **Notification Management**: Cancel, update, and manage scheduled notifications
- ✅ **Persistent Storage**: Notifications persist across app restarts
- ✅ **React Hooks**: Easy-to-use React hooks for integration
- ✅ **Permission Handling**: Automatic permission requests and status checking

## 📁 File Structure

```
services/
├── NotificationService.ts           # Core notification service
├── ReminderNotificationService.ts   # Enhanced reminder service with notifications
└── README.md                       # This documentation

hooks/
├── useNotifications.ts             # Basic notification hook
└── useReminderNotifications.ts     # Enhanced reminder hook with notifications

examples/
└── NotificationExample.tsx         # Complete usage example

app/(tabs)/
└── notifications.tsx               # Demo screen in your app
```

## 🛠 Setup

### 1. Dependencies

The service uses `expo-notifications` which is already configured in your `app.json`:

```json
{
  "plugins": [
    "expo-notifications"
  ]
}
```

### 2. Initialization

The notification service is automatically initialized in your app layout (`app/_layout.tsx`):

```typescript
useEffect(() => {
  const initializeNotifications = async () => {
    const notificationService = NotificationService.getInstance();
    await notificationService.initialize();
  };
  initializeNotifications();
}, []);
```

## 📖 Usage Examples

### Basic Notification Scheduling

```typescript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const { scheduleNotification, scheduledNotifications } = useNotifications();

  const handleScheduleNotification = async () => {
    const notificationData = {
      id: 'unique_id',
      title: 'My Notification',
      body: 'This is a test notification',
      scheduledTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      type: 'custom' as const,
    };

    await scheduleNotification(notificationData);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleScheduleNotification}>
        <Text>Schedule Notification</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Schedule Multiple Notifications

```typescript
const notifications = [
  {
    id: 'notif_1',
    title: 'First Reminder',
    body: 'Don\'t forget!',
    scheduledTime: new Date(Date.now() + 5 * 60 * 1000),
    type: 'reminder' as const,
  },
  {
    id: 'notif_2',
    title: 'Second Reminder',
    body: 'Still important!',
    scheduledTime: new Date(Date.now() + 10 * 60 * 1000),
    type: 'reminder' as const,
  },
];

await scheduleMultipleNotifications(notifications);
```

### Schedule for Specific Date and Time

```typescript
// Schedule a notification for a specific date and time
const specificDate = new Date('2024-12-25T10:00:00'); // Christmas morning at 10 AM

await scheduleNotificationForDateTime(
  'christmas_reminder',
  'Merry Christmas!',
  'Don\'t forget to open presents!',
  specificDate
);
```

### Schedule Multiple Notifications for Specific Dates

```typescript
const notifications = [
  {
    id: 'meeting_1',
    title: 'Team Meeting',
    body: 'Weekly team standup',
    date: new Date('2024-01-15T09:00:00'),
  },
  {
    id: 'meeting_2',
    title: 'Project Review',
    body: 'Monthly project review meeting',
    date: new Date('2024-01-20T14:00:00'),
  },
  {
    id: 'meeting_3',
    title: 'Client Call',
    body: 'Important client presentation',
    date: new Date('2024-01-25T11:00:00'),
  },
];

await scheduleNotificationsForDateTimes(notifications);
```

### Reminder with Notifications

```typescript
import { useReminderNotifications } from '../hooks/useReminderNotifications';

function ReminderComponent() {
  const { createReminder, reminders } = useReminderNotifications();

  const handleCreateReminder = async () => {
    await createReminder({
      reminderData: {
        contactId: 'contact_123',
        title: 'Call John',
        dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        isCompleted: false,
      },
      notificationIntervals: [15, 30, 60], // minutes before due date
    });
  };

  return (
    <View>
      <TouchableOpacity onPress={handleCreateReminder}>
        <Text>Create Reminder with Notifications</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Recurring Notifications

```typescript
const notificationService = NotificationService.getInstance();

await notificationService.scheduleRecurringNotification(
  {
    title: 'Daily Reminder',
    body: 'Check your tasks',
    scheduledTime: new Date(),
    type: 'custom',
  },
  'daily', // recurrence type
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // end date (30 days)
);
```

## 🔧 API Reference

### NotificationService

#### Core Methods

- `initialize()`: Initialize the service and request permissions
- `scheduleNotification(data)`: Schedule a single notification
- `scheduleMultipleNotifications(notifications)`: Schedule multiple notifications
- `scheduleNotificationForDateTime(id, title, body, date, data?)`: Schedule notification for specific date/time
- `scheduleNotificationsForDateTimes(notifications)`: Schedule multiple notifications for specific dates
- `scheduleReminderNotifications(reminder, intervals)`: Schedule reminder notifications
- `cancelNotification(id)`: Cancel a specific notification
- `cancelReminderNotifications(reminderId)`: Cancel all notifications for a reminder
- `cancelAllNotifications()`: Cancel all scheduled notifications
- `updateNotificationTime(id, newTime)`: Update notification time
- `scheduleRecurringNotification(data, recurrence, endDate)`: Schedule recurring notifications

#### Utility Methods

- `getScheduledNotifications()`: Get all scheduled notifications
- `getReminderNotifications(reminderId)`: Get notifications for a specific reminder
- `areNotificationsEnabled()`: Check if notifications are enabled
- `getPermissionsStatus()`: Get permission status

### useNotifications Hook

#### Returns

- `isInitialized`: Whether the service is initialized
- `hasPermission`: Whether notification permissions are granted
- `scheduledNotifications`: Array of scheduled notifications
- `scheduleNotification`: Function to schedule a single notification
- `scheduleMultipleNotifications`: Function to schedule multiple notifications
- `scheduleNotificationForDateTime`: Function to schedule notification for specific date/time
- `scheduleNotificationsForDateTimes`: Function to schedule multiple notifications for specific dates
- `cancelNotification`: Function to cancel a notification
- `cancelAllNotifications`: Function to cancel all notifications
- `refreshNotifications`: Function to refresh the notifications list

### useReminderNotifications Hook

#### Returns

- `reminders`: All reminders with notification status
- `upcomingReminders`: Reminders due within 24 hours
- `overdueReminders`: Overdue reminders
- `createReminder`: Function to create a reminder with notifications
- `updateReminder`: Function to update a reminder and reschedule notifications
- `deleteReminder`: Function to delete a reminder and cancel notifications
- `completeReminder`: Function to mark reminder as completed and cancel notifications

## 📱 Demo Screen

A complete demo screen is available at `app/(tabs)/notifications.tsx` that demonstrates:

- Scheduling single notifications
- Scheduling multiple notifications
- Creating reminders with notifications
- Viewing scheduled notifications
- Canceling notifications
- Statistics display

## 🔔 Notification Types

### Custom Notifications
```typescript
{
  id: 'custom_id',
  title: 'Custom Title',
  body: 'Custom message',
  scheduledTime: new Date(),
  type: 'custom'
}
```

### Reminder Notifications
```typescript
{
  id: 'reminder_id',
  title: 'Reminder',
  body: 'Your reminder is due soon',
  scheduledTime: new Date(),
  reminderId: 'reminder_123',
  contactId: 'contact_456',
  type: 'reminder'
}
```

### Follow-up Notifications
```typescript
{
  id: 'followup_id',
  title: 'Follow-up',
  body: 'Time to follow up',
  scheduledTime: new Date(),
  contactId: 'contact_456',
  type: 'follow_up'
}
```

## ⚙️ Configuration

### Notification Intervals

Default reminder notification intervals:
- 15 minutes before due date
- 30 minutes before due date
- 60 minutes before due date
- At exact due time

You can customize these intervals:

```typescript
await createReminder({
  reminderData: reminderData,
  notificationIntervals: [5, 10, 30, 60] // Custom intervals
});
```

### Recurrence Types

- `'daily'`: Every day
- `'weekly'`: Every week
- `'monthly'`: Every month

## 🛡️ Error Handling

The service includes comprehensive error handling:

```typescript
try {
  await scheduleNotification(notificationData);
} catch (error) {
  console.error('Failed to schedule notification:', error);
  // Handle error appropriately
}
```

## 🔍 Troubleshooting

### Notifications not showing
- ✅ Check if permissions are granted
- ✅ Verify the scheduled time is in the future
- ✅ Test on a real device (not simulator)
- ✅ Check device notification settings

### Permission denied
- ✅ Request permissions explicitly
- ✅ Check device notification settings
- ✅ Handle permission denial gracefully

### Notifications not persisting
- ✅ The service automatically saves to AsyncStorage
- ✅ Check if storage permissions are available

## 🎯 Best Practices

1. **Always check permissions** before scheduling notifications
2. **Use unique IDs** for notifications to avoid conflicts
3. **Handle errors gracefully** when scheduling notifications
4. **Clean up notifications** when they're no longer needed
5. **Test on real devices** as notifications don't work in simulators
6. **Consider battery life** when scheduling many notifications
7. **Use appropriate intervals** for reminder notifications
8. **Cancel notifications** when reminders are completed or deleted

## 📊 Performance Considerations

- Notifications are limited to 100 per recurring schedule
- Scheduled notifications are stored in AsyncStorage
- The service uses a singleton pattern for efficiency
- Notifications are automatically cleaned up when canceled

## 🔄 Integration with Existing Code

The notification service integrates seamlessly with your existing:

- ✅ Firebase authentication system
- ✅ Reminder management system
- ✅ React Query for state management
- ✅ Existing UI components

## 📝 Example Integration

See the complete example in `app/(tabs)/notifications.tsx` for a full implementation showing:

- Permission handling
- Multiple notification scheduling
- Reminder creation with notifications
- Notification management
- Error handling
- User interface components

The notification service is now fully integrated and ready to use in your app! 🎉
