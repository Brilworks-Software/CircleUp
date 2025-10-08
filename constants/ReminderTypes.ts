export const ReminderTypes = {
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

// Type definition for reminder types
export type ReminderType = typeof ReminderTypes[keyof typeof ReminderTypes];

// Array of all reminder types for easy iteration
export const ReminderTypesList = Object.values(ReminderTypes);

// Helper function to get display name for reminder type
export const getReminderTypeDisplayName = (type: string): string => {
    switch (type) {
        case ReminderTypes.FollowUp:
            return 'Follow Up';
        case ReminderTypes.Meeting:
            return 'Meeting';
        case ReminderTypes.Call:
            return 'Call';
        case ReminderTypes.Birthday:
            return 'Birthday';
        case ReminderTypes.Anniversary:
            return 'Anniversary';
        case ReminderTypes.CheckIn:
            return 'Check In';
        case ReminderTypes.TaskReminder:
            return 'Task Reminder';
        case ReminderTypes.Appointment:
            return 'Appointment';
        case ReminderTypes.DeadlineReminder:
            return 'Deadline Reminder';
        case ReminderTypes.PersonalEvent:
            return 'Personal Event';
        case ReminderTypes.WorkEvent:
            return 'Work Event';
        case ReminderTypes.Other:
            return 'Other';
        default:
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};

// Helper function to validate reminder type
export const isValidReminderType = (type: string): type is ReminderType => {
    return ReminderTypesList.includes(type as ReminderType);
};
