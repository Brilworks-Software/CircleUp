# CreateEditRelationshipModal Component

A comprehensive modal component for creating and editing relationships in the app.

## Features

- **Create new relationships** or **edit existing ones**
- **Contact selection** with search functionality
- **Last contact date** selection with predefined options and custom date input
- **Contact method** selection (call, text, email, in-person)
- **Reminder frequency** configuration
- **Comprehensive contact information** fields (phone, email, company, social media, etc.)
- **Tag management** with predefined tags
- **Family information** tracking (spouse, kids, siblings)
- **Notes** section for additional information
- **Form validation** with error handling
- **Responsive design** that works on both mobile and web

## Usage

### Basic Usage

```tsx
import CreateEditRelationshipModal from '../components/CreateEditRelationshipModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  return (
    <>
      <CreateEditRelationshipModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        relationship={selectedRelationship} // null for create, existing relationship for edit
        onRelationshipSaved={(relationship) => {
          console.log('Relationship saved:', relationship);
          setShowModal(false);
        }}
      />
    </>
  );
}
```

### Creating a New Relationship

```tsx
const [showCreateModal, setShowCreateModal] = useState(false);

<CreateEditRelationshipModal
  visible={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  relationship={null} // null means create mode
  onRelationshipSaved={(relationship) => {
    // Handle the newly created relationship
    console.log('New relationship created:', relationship);
    setShowCreateModal(false);
  }}
/>
```

### Editing an Existing Relationship

```tsx
const [showEditModal, setShowEditModal] = useState(false);
const [relationshipToEdit, setRelationshipToEdit] = useState<Relationship | null>(null);

const handleEdit = (relationship: Relationship) => {
  setRelationshipToEdit(relationship);
  setShowEditModal(true);
};

<CreateEditRelationshipModal
  visible={showEditModal}
  onClose={() => {
    setShowEditModal(false);
    setRelationshipToEdit(null);
  }}
  relationship={relationshipToEdit} // existing relationship means edit mode
  onRelationshipSaved={(updatedRelationship) => {
    // Handle the updated relationship
    console.log('Relationship updated:', updatedRelationship);
    setShowEditModal(false);
    setRelationshipToEdit(null);
  }}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Callback when modal is closed |
| `relationship` | `Relationship \| null` | No | Existing relationship to edit (null for create mode) |
| `onRelationshipSaved` | `(relationship: Relationship) => void` | No | Callback when relationship is saved |

## Form Fields

### Contact Selection
- Searchable contact picker
- Displays contact name and phone number

### Last Contact Information
- Predefined options: Today, Yesterday, This week, This month, 3 months ago, 6 months ago, 1 year ago
- Custom date input option
- Contact method selection: Call, Text, Email, In person

### Reminder Settings
- Frequency options: Once, Daily, Weekly, Monthly, Every 3 months, Every 6 months, Yearly, Never
- Automatically calculates next reminder date

### Contact Information
- Phone number
- Email address
- Company name
- Job title
- Website URL
- Social media profiles (LinkedIn, X/Twitter, Instagram, Facebook)
- Address
- Birthday
- Additional notes

### Tags
- Predefined tags: client, family, friend, colleague, prospect, vendor, mentor, mentee
- Multi-select functionality

### Family Information
- Spouse information
- Kids information
- Siblings information

### Notes
- General notes about the relationship

## Validation

The component includes form validation for:
- Contact selection (required)
- Custom date format validation
- Error messages are displayed below relevant fields

## Dependencies

- `react-native` components
- `lucide-react-native` for icons
- `expo-contacts` for contact access
- Firebase hooks: `useRelationships`, `useAuth`, `useContacts`
- Custom `WebCompatibleDateTimePicker` component

## Styling

The component uses a consistent design system with:
- Clean, modern UI
- Proper spacing and typography
- Responsive layout
- Error state styling
- Loading states for save operations

## Example

See `examples/CreateEditRelationshipExample.tsx` for a complete working example.
