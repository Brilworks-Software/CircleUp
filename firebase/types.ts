// src/types/dbTypes.ts

export interface User {
  id?: string; // Firestore document ID
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  createdAt: any;
  updatedAt?: any;
  settings?: UserSettings;
}

export interface UserSettings {
  theme?: 'light' | 'dark';
  notifications?: boolean;
}

// ---------------- Contacts ----------------
export interface Contact {
  id?: string; // Firestore document ID
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  birthday?: string; // YYYY-MM-DD
  tags?: string[]; // tag IDs or names
  lastInteraction?: any;
  nextFollowUp?: any;
  notes?: string;
  profilePhotoUrl?: string;
  createdAt: any;
  updatedAt?: any;
}

// ---------------- Interactions ----------------
export interface Interaction {
  id?: string; // Firestore document ID
  type: 'Call' | 'Meeting' | 'Email' | 'Text' | 'Other';
  date: any;
  content: string;
  attachments?: FileAttachment[];
  createdAt: any;
  updatedAt?: any;
}

export interface FileAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
}

// ---------------- Reminders ----------------
export interface Reminder {
  id?: string; // Firestore document ID
  contactId: string;
  title: string;
  dueDate: any;
  isCompleted: boolean;
  createdAt: any;
  updatedAt?: any;
}

// ---------------- Tags ----------------
export interface Tag {
  id?: string; // Firestore document ID
  name: string;
  color?: string; // Hex code
  createdAt: any;
}
