# Reminder Activity Implementation

This document explains how the reminder activity system works, including creating reminder documents, scheduling notifications, and enabling direct editing.

## Overview

The reminder activity system creates a seamless integration between activities and reminders by:

1. **Creating a reminder document** in Firestore when a reminder activity is created
2. **Scheduling notifications** for the reminder (15 min, 30 min, 1 hour before due date)
3. **Storing the reminder document ID** in the activity for direct editing
4. **Enabling direct editing** of reminders through the activity system

## Architecture

### Components

- **AddActivityModal.tsx**: UI component for creating/editing reminder activities
- **ActivityService.ts**: Service for managing activities in Firestore
- **RemindersService.ts**: Service for managing reminder documents
- **ReminderNotificationService.ts**: Service for scheduling notifications
- **useActivity.ts**: React hook for activity operations

### Data Flow

```
User creates reminder activity
    ↓
AddActivityModal calls createReminderActivity()
    ↓
ReminderNotificationService.createReminderWithNotifications()
    ↓
Creates reminder document in Firestore
    ↓
Schedules notifications (15min, 30min, 1hour before)
    ↓
Returns reminder document ID
    ↓
ActivityService.createActivity() with reminderId
    ↓
Activity stored with reference to reminder document
```

## Key Features

### 1. Reminder Document Creation

When creating a reminder activity, the system:

```typescript
// Create reminder document with notifications
const reminderData = {
  contactName: 'John Doe',
  type: 'follow_up',
  date: activityReminderDate.toISOString(),
  frequency: activityReminderFrequency,
  tags: [],
  notes: activityReminderNotes.trim(),
  contactId: currentContactId,
  isOverdue: false,
  isThisWeek: false,
};

const reminderWithNotifications = await reminderNotificationService.createReminderWithNotifications(
  currentUser.uid,
  reminderData,
  [15, 30, 60] // Notification intervals in minutes
);

const reminderId = reminderWithNotifications.id;
```

### 2. Activity with Reminder Reference

The activity stores the reminder document ID:

```typescript
const activityData = {
  type: 'reminder' as const,
  description: activityReminderNotes.trim(),
  contactId: currentContactId,
  contactName: currentContactName,
  reminderDate: activityReminderDate.toISOString(),
  reminderType: activityReminderType,
  frequency: activityReminderFrequency,
  reminderId: reminderId, // Reference to reminder document
  tags: [],
};
```

### 3. Direct Editing

You can edit reminders directly using the stored reminder ID:

```typescript
// Get activity by reminder ID
const activity = await getActivityByReminderId(reminderId);

// Update both activity and reminder document
const activityUpdates = {
  description: 'Updated reminder notes',
  reminderDate: newDate.toISOString(),
  reminderType: 'meeting',
  frequency: 'week',
  reminderId: activity.reminderId, // Preserve the reminder ID
};

await updateActivity(activityId, activityUpdates);

// Update the reminder document and reschedule notifications
await reminderNotificationService.updateReminderWithNotifications(
  userId,
  activity.reminderId,
  reminderData,
  [15, 30, 60]
);
```

## Database Schema

### Activities Collection

```typescript
interface ReminderActivity {
  id: string;
  userId: string;
  type: 'reminder';
  description: string;
  contactId: string;
  contactName: string;
  reminderDate: string;
  reminderType: string;
  frequency: string;
  reminderId: string; // Reference to reminder document
  isCompleted: boolean;
  completedAt?: string;
  tags: string[];
  createdAt: any;
  updatedAt: any;
  isArchived: boolean;
}
```

### Reminders Collection

```typescript
interface Reminder {
  id: string;
  contactName: string;
  contactId?: string;
  type: string;
  date: string;
  frequency: string;
  tags: string[];
  isOverdue: boolean;
  isThisWeek: boolean;
  notes?: string;
  title?: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}
```

## Usage Examples

### Creating a Reminder Activity

```typescript
import { useActivity } from '../firebase/hooks/useActivity';
import ReminderNotificationService from '../services/ReminderNotificationService';

const { createActivity } = useActivity();

const createReminderActivity = async () => {
  // Create reminder document with notifications
  const reminderData = {
    contactName: 'John Doe',
    type: 'follow_up',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'month',
    tags: ['client'],
    notes: 'Follow up on project proposal',
    contactId: 'contact_123',
  };

  const reminderNotificationService = ReminderNotificationService.getInstance();
  const reminderWithNotifications = await reminderNotificationService.createReminderWithNotifications(
    userId,
    reminderData,
    [15, 30, 60]
  );

  // Create activity with reminder reference
  const activity = await createActivity({
    type: 'reminder',
    description: 'Follow up on project proposal',
    contactId: 'contact_123',
    contactName: 'John Doe',
    reminderDate: reminderData.date,
    reminderType: 'follow_up',
    frequency: 'month',
    reminderId: reminderWithNotifications.id,
    tags: ['client'],
  });
};
```

### Editing a Reminder Activity

```typescript
const { updateActivity, getActivityByReminderId } = useActivity();

const editReminderActivity = async (reminderId: string) => {
  // Get activity by reminder ID
  const activity = await getActivityByReminderId(reminderId);
  
  if (activity) {
    // Update activity
    await updateActivity(activity.id, {
      description: 'Updated reminder notes',
      reminderDate: newDate.toISOString(),
      reminderType: 'meeting',
      frequency: 'week',
      reminderId: activity.reminderId,
    });

    // Update reminder document and reschedule notifications
    const reminderData = {
      contactName: activity.contactName,
      type: 'meeting',
      date: newDate.toISOString(),
      frequency: 'week',
      tags: activity.tags,
      notes: 'Updated reminder notes',
      contactId: activity.contactId,
    };

    await reminderNotificationService.updateReminderWithNotifications(
      userId,
      activity.reminderId,
      reminderData,
      [15, 30, 60]
    );
  }
};
```

## Notification Scheduling

The system automatically schedules notifications at:

- **15 minutes** before the reminder due date
- **30 minutes** before the reminder due date  
- **1 hour** before the reminder due date

Notifications are automatically rescheduled when the reminder is updated.

## Benefits

1. **Unified Management**: Activities and reminders are managed together
2. **Direct Editing**: Edit reminders directly through the activity system
3. **Automatic Notifications**: Notifications are scheduled and rescheduled automatically
4. **Data Consistency**: Changes to activities automatically update reminder documents
5. **Flexible Integration**: Easy to extend with additional reminder features

## Error Handling

The system includes comprehensive error handling:

- Graceful fallback if notification scheduling fails
- Validation of reminder dates and data
- Proper cleanup of notifications when reminders are deleted
- User-friendly error messages for common issues

## Future Enhancements

Potential improvements to the system:

1. **Custom Notification Intervals**: Allow users to set custom notification times
2. **Recurring Reminders**: Support for recurring reminder patterns
3. **Reminder Templates**: Pre-defined reminder templates for common use cases
4. **Bulk Operations**: Edit multiple reminders at once
5. **Advanced Filtering**: Filter reminders by various criteria
