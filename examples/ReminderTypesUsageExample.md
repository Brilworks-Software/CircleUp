# ReminderTypes Usage Example

This document shows how to use the new `ReminderTypes` constants throughout the application.

## Import and Basic Usage

```typescript
import { ReminderTypes, getReminderTypeDisplayName, isValidReminderType } from '../constants/ReminderTypes';

// Using constants instead of hardcoded strings
const reminderType = ReminderTypes.FollowUp; // 'follow_up'
const meetingType = ReminderTypes.Meeting;   // 'meeting'
const callType = ReminderTypes.Call;         // 'call'
```

## Available Reminder Types

```typescript
const allTypes = {
    FollowUp: 'follow_up',
    Meeting: 'meeting',
    Call: 'call',
    Birthday: 'birthday',
    Anniversary: 'anniversary',
    CheckIn: 'check_in',
    TaskReminder: 'task_reminder',
    Appointment: 'appointment',
    DeadlineReminder: 'deadline_reminder',
    PersonalEvent: 'personal_event',
    WorkEvent: 'work_event',
    Other: 'other',
}
```

## Helper Functions

```typescript
// Get display name for UI
const displayName = getReminderTypeDisplayName(ReminderTypes.FollowUp);
// Returns: "Follow Up"

// Validate reminder type
const isValid = isValidReminderType('follow_up'); // true
const isInvalid = isValidReminderType('invalid'); // false
```

## UI Component Usage

```typescript
// In your component
const reminderTypes = [
    ReminderTypes.FollowUp,
    ReminderTypes.Meeting,
    ReminderTypes.Call,
    ReminderTypes.Birthday,
    ReminderTypes.Anniversary,
    ReminderTypes.CheckIn,
    ReminderTypes.Other,
];

// Render UI
{reminderTypes.map((type) => (
    <TouchableOpacity key={type} onPress={() => setSelectedType(type)}>
        <Text>{getReminderTypeDisplayName(type)}</Text>
    </TouchableOpacity>
))}
```

## TypeScript Integration

The `ReminderType` type is automatically exported and used in:
- `firebase/types.ts` - All reminder-related interfaces
- Component props and state
- Service method parameters

This ensures type safety throughout the application.