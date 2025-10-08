// src/types/dbTypes.ts

import type { ReminderType } from '../constants/ReminderTypes';

export interface User {
  id?: string; // Firestore document ID
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  fcmToken?: string[]; // Array of FCM tokens for push notifications
  createdAt: any;
  updatedAt?: any;
  settings?: UserSettings;
}



export interface UserSettings {
  theme?: 'light' | 'dark';
  notifications?: boolean;
}

// Async Storage Types
export interface BusinessCard {
  fullName: string;
  about: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string; label?: string }[];
  emails?: { email: string; label?: string }[];
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactInteraction {
  id: string;
  contactId: string;
  date: string;
  type: string;
  notes?: string;
}

export interface Relationship {
  id: string;
  contactId: string;
  contactName: string;
  lastContactDate: string;
  lastContactMethod: string;
  reminderFrequency: string;
  nextReminderDate: string;
  tags: string[];
  notes: string;
  familyInfo: {
    kids: string;
    siblings: string;
    spouse: string;
  };
  // Contact data fields
  contactData?: {
    phoneNumbers?: { number: string; label?: string }[];
    emails?: { email: string; label?: string }[];
    website?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    birthday?: string;
    notes?: string;
  };
}

export interface Reminder {
  id: string;
  contactName: string;
  contactId?: string;
  relationshipId?: string;
  type: string;
  date: string;
  frequency: string;
  tags: string[];
  isOverdue: boolean;
  isThisWeek: boolean;
  notes?: string;
  title?: string;
}

export interface AppStats {
  totalReminders: number;
  totalRelationships: number;
  totalContacts: number;
  totalInteractions: number;
}

export type LastContactOption = 'today' | 'yesterday' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
export type ContactMethod = 'call' | 'text' | 'email' | 'inPerson';
export type ReminderFrequency = 'once' | 'daily' | 'week' | 'month' | '3months' | '6months' | 'yearly' | 'never';
export type ReminderTab = 'all' | 'missed' | 'thisWeek' | 'upcoming';
export type FilterType = 'all' | 'client' | 'family' | 'friends' | 'prospect';

// Activity Types
export type ActivityType = 'note' | 'interaction' | 'reminder';

export interface BaseActivity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  createdAt: any;
  updatedAt: any;
  tags: string[];
  isArchived: boolean;
}

export interface NoteActivity extends BaseActivity {
  type: 'note';
  content: string;
  category?: string;
  contactId?: string;
  contactName?: string;
}

export interface InteractionActivity extends BaseActivity {
  type: 'interaction';
  contactId: string;
  contactName: string;
  interactionType: ContactMethod;
  date: string;
  duration?: number; // in minutes
  location?: string;
}

export interface ReminderActivity extends BaseActivity {
  type: 'reminder';
  contactId: string;
  contactName: string;
  reminderDate: string;
  reminderType: ReminderType;
  frequency: ReminderFrequency;
  isCompleted: boolean;
  completedAt?: string;
  reminderId?: string; // Reference to the reminder document
}

export type Activity = NoteActivity | InteractionActivity | ReminderActivity;

export interface CreateActivityData {
  type: ActivityType;
  title?: string; // Made optional since we're commenting out title usage
  description: string;
  tags: string[];
  // Note specific
  content?: string;
  category?: string;
  // Interaction specific
  contactId?: string;
  contactName?: string;
  interactionType?: ContactMethod;
  date?: string;
  duration?: number;
  location?: string;
  isCompleted?: boolean;
  // Reminder specific
  reminderDate?: string;
  reminderType?: ReminderType;
  frequency?: ReminderFrequency;
  reminderId?: string; // Reference to the reminder document
  completedAt?: string; // When the reminder was completed
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  // Note specific
  content?: string;
  category?: string;
  // Interaction specific
  interactionType?: ContactMethod;
  date?: string;
  duration?: number;
  location?: string;
  // Reminder specific
  reminderDate?: string;
  reminderType?: ReminderType;
  frequency?: ReminderFrequency;
  isCompleted?: boolean;
  completedAt?: string;
  reminderId?: string; // Reference to the reminder document
}

export interface ActivityStats {
  totalActivities: number;
  notesCount: number;
  interactionsCount: number;
  remindersCount: number;
  completedReminders: number;
  pendingReminders: number;
  recentActivities: number;
}


