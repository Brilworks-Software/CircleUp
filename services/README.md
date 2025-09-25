# Async Storage Services and Hooks

This directory contains services and hooks for managing data stored in AsyncStorage across all screens in the app.

## Services

### BusinessCardService
**File:** `BusinessCardService.ts`
**Purpose:** Manages business card data storage and retrieval
**Key Methods:**
- `getBusinessCard()` - Get saved business card
- `saveBusinessCard(card)` - Save business card
- `updateBusinessCard(updates)` - Update specific fields
- `initializeWithUserProfile(profile)` - Initialize with user data
- `clearBusinessCard()` - Clear stored data

### ContactsService
**File:** `ContactsService.ts`
**Purpose:** Manages imported contacts and contact interactions
**Key Methods:**
- `requestContactsPermission()` - Request device contacts permission
- `importContacts()` - Import contacts from device
- `getContacts()` - Get stored contacts
- `searchContacts(query)` - Search contacts
- `recordInteraction(contactId, type, notes)` - Record contact interaction
- `getContactInteractions()` - Get all interactions
- `getLastInteraction(contactId)` - Get last interaction for contact

### RelationshipsService
**File:** `RelationshipsService.ts`
**Purpose:** Manages relationship data and follow-up tracking
**Key Methods:**
- `getRelationships()` - Get all relationships
- `createRelationship(data)` - Create new relationship
- `updateRelationship(id, updates)` - Update relationship
- `deleteRelationship(id)` - Delete relationship
- `getRelationshipByContactId(contactId)` - Get relationship for contact
- `getRelationshipsNeedingFollowUp()` - Get relationships needing follow-up
- `updateLastContact(id, date, method)` - Update last contact info

### RemindersService
**File:** `RemindersService.ts`
**Purpose:** Manages reminder data and scheduling
**Key Methods:**
- `getReminders()` - Get all reminders
- `createReminder(data)` - Create new reminder
- `updateReminder(id, updates)` - Update reminder
- `deleteReminder(id)` - Delete reminder
- `getRemindersByTab(tab)` - Get reminders by tab (missed/thisWeek/upcoming)
- `snoozeReminder(id, days)` - Snooze reminder
- `completeReminder(id)` - Mark reminder as completed
- `getOverdueReminders()` - Get overdue reminders

### StatsService
**File:** `StatsService.ts`
**Purpose:** Manages app statistics and analytics
**Key Methods:**
- `getStats()` - Get current app statistics
- `getCachedStats()` - Get cached statistics
- `updateStats()` - Update statistics
- `getContactsStats()` - Get contacts statistics
- `getRelationshipsStats()` - Get relationships statistics
- `getRemindersStats()` - Get reminders statistics
- `getInteractionsStats()` - Get interactions statistics
- `getDashboardStats()` - Get dashboard summary stats

## Hooks

### useBusinessCard
**File:** `../hooks/useBusinessCard.ts`
**Purpose:** React hook for business card management
**Returns:**
- `businessCard` - Current business card data
- `isLoading` - Loading state
- `error` - Error state
- `saveBusinessCard(card)` - Save business card
- `updateBusinessCard(updates)` - Update business card
- `initializeWithUserProfile(profile)` - Initialize with user data

### useContacts
**File:** `../hooks/useContacts.ts`
**Purpose:** React hook for contacts and interactions management
**Returns:**
- `contacts` - All contacts
- `filteredContacts` - Filtered contacts
- `interactions` - All interactions
- `isLoading` - Loading state
- `error` - Error state
- `requestPermission()` - Request contacts permission
- `importContacts()` - Import contacts
- `searchContacts(query)` - Search contacts
- `recordInteraction(contactId, type, notes)` - Record interaction
- `getLastInteraction(contactId)` - Get last interaction

### useRelationships
**File:** `../hooks/useRelationships.ts`
**Purpose:** React hook for relationships management
**Returns:**
- `relationships` - All relationships
- `isLoading` - Loading state
- `error` - Error state
- `createRelationship(data)` - Create relationship
- `updateRelationship(id, updates)` - Update relationship
- `deleteRelationship(id)` - Delete relationship
- `getRelationshipByContactId(contactId)` - Get relationship for contact
- `getRelationshipsNeedingFollowUp()` - Get relationships needing follow-up

### useReminders
**File:** `../hooks/useReminders.ts`
**Purpose:** React hook for reminders management
**Returns:**
- `reminders` - All reminders
- `filteredReminders` - Filtered reminders
- `isLoading` - Loading state
- `error` - Error state
- `createReminder(data)` - Create reminder
- `updateReminder(id, updates)` - Update reminder
- `deleteReminder(id)` - Delete reminder
- `getRemindersByTab(tab)` - Get reminders by tab
- `snoozeReminder(id, days)` - Snooze reminder
- `completeReminder(id)` - Complete reminder

### useStats
**File:** `../hooks/useStats.ts`
**Purpose:** React hook for statistics management
**Returns:**
- `stats` - Current app statistics
- `isLoading` - Loading state
- `error` - Error state
- `updateStats()` - Update statistics
- `getContactsStats()` - Get contacts statistics
- `getRelationshipsStats()` - Get relationships statistics
- `getRemindersStats()` - Get reminders statistics
- `getDashboardStats()` - Get dashboard statistics

## Types

All types are defined in `../firebase/types.ts`:

- `BusinessCard` - Business card data structure
- `Contact` - Contact data structure
- `ContactInteraction` - Contact interaction data structure
- `Relationship` - Relationship data structure
- `Reminder` - Reminder data structure
- `AppStats` - App statistics data structure
- `LastContactOption` - Last contact date options
- `ContactMethod` - Contact method types
- `ReminderFrequency` - Reminder frequency types
- `ReminderTab` - Reminder tab types
- `FilterType` - Filter type options

## Usage Examples

### Business Card
```typescript
import { useBusinessCard } from '../hooks/useBusinessCard';

const { businessCard, saveBusinessCard, updateBusinessCard } = useBusinessCard();

// Save business card
await saveBusinessCard({
  fullName: 'John Doe',
  email: 'john@example.com',
  // ... other fields
});

// Update specific fields
await updateBusinessCard({ company: 'New Company' });
```

### Contacts
```typescript
import { useContacts } from '../hooks/useContacts';

const { contacts, importContacts, recordInteraction } = useContacts();

// Import contacts from device
await importContacts();

// Record interaction
await recordInteraction('contactId', 'call', 'Had a great conversation');
```

### Relationships
```typescript
import { useRelationships } from '../hooks/useRelationships';

const { createRelationship, getRelationshipsNeedingFollowUp } = useRelationships();

// Create relationship
await createRelationship({
  contactId: 'contactId',
  contactName: 'John Doe',
  lastContactDate: new Date().toISOString(),
  lastContactMethod: 'call',
  reminderFrequency: 'month',
  nextReminderDate: nextDate.toISOString(),
  tags: ['client'],
  notes: 'Important client',
  familyInfo: { kids: '', siblings: '', spouse: '' }
});
```

### Reminders
```typescript
import { useReminders } from '../hooks/useReminders';

const { createReminder, getRemindersByTab } = useReminders();

// Create reminder
await createReminder({
  contactName: 'John Doe',
  type: 'Follow-up',
  date: new Date().toISOString(),
  frequency: 'month',
  tags: ['client'],
  notes: 'Follow up on project'
});
```

### Statistics
```typescript
import { useStats } from '../hooks/useStats';

const { stats, getDashboardStats } = useStats();

// Get dashboard statistics
const dashboardStats = await getDashboardStats();
console.log(`Total contacts: ${dashboardStats.totalContacts}`);
```

## Storage Keys

All services use consistent storage keys:
- `business_card` - Business card data
- `imported_contacts` - Imported contacts
- `contact_interactions` - Contact interactions
- `relationships` - Relationships data
- `reminders` - Reminders data
- `app_stats` - Cached app statistics

## Error Handling

All services and hooks include comprehensive error handling:
- Try-catch blocks around all async operations
- Error state management in hooks
- Fallback to cached data when possible
- Console error logging for debugging

## Performance Considerations

- Services use singleton pattern to avoid multiple instances
- Hooks provide both async and local helper functions
- Caching mechanisms for frequently accessed data
- Batch operations where possible
- Optimistic updates for better UX