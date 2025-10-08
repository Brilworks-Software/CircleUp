import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Linking,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Phone, Mail, MessageCircle, Calendar, Clock, User, ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { useActivity } from '../firebase/hooks/useActivity';
import { useRemindersInfinite } from '../firebase/hooks/useRemindersInfinite';
import AddActivityModal from './AddActivityModal';
import type { Relationship, ReminderFrequency } from '../firebase/types';

interface RelationshipInfoModalProps {
  visible: boolean;
  onClose: () => void;
  relationship: Relationship | null;
  onEdit?: (relationship: Relationship) => void; // Callback for edit action
  onDataChanged?: () => void; // Callback for when data changes (for real-time updates)
}

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    
    if (buttons.length === 2 && buttons[0].text === 'Cancel' && buttons[1].text === 'OK') {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons[1].onPress) {
        buttons[1].onPress();
      }
      return;
    }
    
    const result = window.confirm(`${title}\n\n${message}\n\nClick OK to continue or Cancel to abort.`);
    if (result) {
      const actionButton = buttons.find(btn => btn.text !== 'Cancel');
      if (actionButton && actionButton.onPress) {
        actionButton.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function RelationshipInfoModal({
  visible,
  onClose,
  relationship,
  onEdit,
  onDataChanged,
}: RelationshipInfoModalProps) {
  const { updateRelationship, deleteRelationship } = useRelationships();
  const { activities, getActivitiesByTags } = useActivity();
  const { createReminder } = useRemindersInfinite('missed', '', 'all');
  
  // State for editing
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showEditFamilyInfoModal, setShowEditFamilyInfoModal] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [editedFamilyInfo, setEditedFamilyInfo] = useState({ kids: '', siblings: '', spouse: '' });
  
  // Activity filter state
  const [activityFilter, setActivityFilter] = useState<'all' | 'note' | 'interaction' | 'reminder'>('all');
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  
  // Modal states
  const [showDetailActions, setShowDetailActions] = useState(false);
  const [showContactActions, setShowContactActions] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  
  // Reminder form states
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (relationship) {
      setEditedNote(relationship.notes || '');
      setEditedFamilyInfo(relationship.familyInfo || { kids: '', siblings: '', spouse: '' });
    }
  }, [relationship]);

  const getContactActivities = () => {
    if (!relationship) return [];
    
    const contactActivities = activities.filter(activity => 
      activity.contactName === relationship.contactName
    );
    
    if (activityFilter === 'all') return contactActivities;
    return contactActivities.filter(activity => activity.type === activityFilter);
  };

  const renderActivityDropdown = () => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowActivityDropdown(!showActivityDropdown)}
      >
        <Text style={styles.dropdownButtonText}>
          {activityFilter === 'all' ? 'All Activities' : 
           activityFilter === 'note' ? 'Notes' :
           activityFilter === 'interaction' ? 'Interactions' : 'Reminders'}
        </Text>
        {showActivityDropdown ? (
          <ChevronUp size={16} color="#6B7280" />
        ) : (
          <ChevronDown size={16} color="#6B7280" />
        )}
      </TouchableOpacity>
      
      {showActivityDropdown && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setActivityFilter('all');
              setShowActivityDropdown(false);
            }}
          >
            <Text style={styles.dropdownItemText}>All Activities</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setActivityFilter('note');
              setShowActivityDropdown(false);
            }}
          >
            <Text style={styles.dropdownItemText}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setActivityFilter('interaction');
              setShowActivityDropdown(false);
            }}
          >
            <Text style={styles.dropdownItemText}>Interactions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setActivityFilter('reminder');
              setShowActivityDropdown(false);
            }}
          >
            <Text style={styles.dropdownItemText}>Reminders</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderActivityCard = (activity: any) => (
    <View key={activity.id} style={styles.activityCard}>
      <View style={styles.activityCardHeader}>
        <View style={styles.activityIcon}>
          <Text style={styles.activityIconText}>
            {activity.type === 'note' ? '📝' : 
             activity.type === 'interaction' ? '🤝' : '⏰'}
          </Text>
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityCardTitle}>
            {activity.type === 'note' ? 'Note' : 
             activity.type === 'interaction' ? 'Interaction' : 'Reminder'}
          </Text>
          <Text style={styles.activityDate}>
            {new Date(activity.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.activityDescription}>{activity.description}</Text>
    </View>
  );

  // Handle editing functions
  const openEditNoteModal = () => {
    setEditedNote(relationship?.notes || '');
    setShowEditNoteModal(true);
  };

  const closeEditNoteModal = () => {
    setEditedNote('');
    setShowEditNoteModal(false);
  };

  const saveNote = async () => {
    if (!relationship) return;
    
    try {
      await updateRelationship(relationship.id, {
        notes: editedNote,
      });
      
      setShowEditNoteModal(false);
      setEditedNote('');
      onDataChanged?.(); // Trigger data refresh
    } catch (error) {
      console.error('Error updating note:', error);
      showAlert('Error', 'Failed to update note');
    }
  };

  const openEditFamilyInfoModal = () => {
    setEditedFamilyInfo(relationship?.familyInfo || { kids: '', siblings: '', spouse: '' });
    setShowEditFamilyInfoModal(true);
  };

  const closeEditFamilyInfoModal = () => {
    setEditedFamilyInfo({ kids: '', siblings: '', spouse: '' });
    setShowEditFamilyInfoModal(false);
  };

  const saveFamilyInfo = async () => {
    if (!relationship) return;
    
    try {
      await updateRelationship(relationship.id, {
        familyInfo: editedFamilyInfo,
      });
      
      setShowEditFamilyInfoModal(false);
      setEditedFamilyInfo({ kids: '', siblings: '', spouse: '' });
      onDataChanged?.(); // Trigger data refresh
    } catch (error) {
      console.error('Error updating family info:', error);
      showAlert('Error', 'Failed to update family info');
    }
  };

  // Contact actions
  const handleCall = () => {
    const phoneNumber = relationship?.contactData?.phoneNumbers?.[0]?.number;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      showAlert('No Phone Number', 'Phone number not available for this contact');
    }
  };

  const handleMessage = () => {
    const phoneNumber = relationship?.contactData?.phoneNumbers?.[0]?.number;
    if (phoneNumber) {
      Linking.openURL(`sms:${phoneNumber}`);
    } else {
      showAlert('No Phone Number', 'Phone number not available for this contact');
    }
  };

  const handleEmail = () => {
    const email = relationship?.contactData?.emails?.[0]?.email;
    if (email) {
      Linking.openURL(`mailto:${email}`);
    } else {
      showAlert('No Email', 'Email address not available for this contact');
    }
  };

  const handleFindOnLinkedIn = async () => {
    const searchQuery = encodeURIComponent(relationship?.contactName || '');
    const url = `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening LinkedIn:', error);
    }
  };

  const handleFindOnX = async () => {
    const searchQuery = encodeURIComponent(relationship?.contactName || '');
    const url = `https://x.com/search?q=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening X:', error);
    }
  };

  const handleFindOnGoogle = async () => {
    const searchQuery = encodeURIComponent(relationship?.contactName || '');
    const url = `https://www.google.com/search?q=${searchQuery}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening Google:', error);
    }
  };

  const handleWhatsApp = () => {
    const phoneNumber = relationship?.contactData?.phoneNumbers?.[0]?.number;
    if (phoneNumber) {
      // Remove any non-numeric characters
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // Use different URL schemes for web vs mobile
      const url = Platform.OS === 'web' 
        ? `https://wa.me/${cleanNumber}`
        : `whatsapp://send?phone=${cleanNumber}`;
      
      Linking.openURL(url);
    } else {
      showAlert('No Phone Number', 'Phone number not available for this contact');
    }
  };

  const handleShareRelationship = async () => {
    if (!relationship) return;

    const shareText = `Name: ${relationship.contactName}\n` + `Phone: ${relationship.contactData?.phoneNumbers?.[0]?.number || 'N/A'}\n` + `Email: ${relationship.contactData?.emails?.[0]?.email || 'N/A'}\n`;

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareText);
        showAlert('Copied', 'Contact information copied to clipboard');
      } else {
      await Share.share({
        message: shareText,
        title: `Contact: ${relationship.contactName}`,
      });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDeleteRelationship = async () => {
    if (!relationship) return;
    
    showAlert(
      'Delete Relationship',
      `Are you sure you want to delete your relationship with ${relationship.contactName}? This action cannot be undone and will remove all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRelationship(relationship.id);
              showAlert('Success', 'Relationship deleted successfully');
              setShowDetailActions(false);
              onClose();
            } catch (error) {
              console.error('Error deleting relationship:', error);
              showAlert('Error', 'Failed to delete relationship. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditRelationship = () => {
    if (!relationship) return;
    
    setShowDetailActions(false);
    onClose();
    
    // Call the parent's onEdit callback if provided
    if (onEdit) {
      onEdit(relationship);
    }
  };

  const handleAddReminder = () => {
    setShowDetailActions(false);
    setShowAddReminderModal(true);
    // Reset form with default values - set date to tomorrow and time to 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setReminderDate(tomorrow);
    setReminderTime(tomorrow);
    setReminderNote('');
  };

  const handleCreateReminder = async () => {
    if (!relationship || !reminderNote.trim()) {
      showAlert('Missing Information', 'Please enter a note for the reminder');
      return;
    }

    try {
      const reminderDateTime = new Date(reminderDate);
      reminderDateTime.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);

      await createReminder({
        contactId: relationship.contactId,
        contactName: relationship.contactName,
        relationshipId: relationship.id,
        date: reminderDateTime.toISOString(),
        notes: reminderNote.trim(),
        type: 'follow_up',
        frequency: 'once' as ReminderFrequency,
        tags: ['follow_up', 'manual'],
      });
      
      setShowAddReminderModal(false);
      showAlert('Success', 'Reminder created successfully!');
      onDataChanged?.(); // Trigger data refresh
    } catch (error) {
      console.error('Error creating reminder:', error);
      showAlert('Error', 'Failed to create reminder');
    }
  };

  const openAddActivityModal = () => {
    setShowAddActivityModal(true);
  };

  const closeAddActivityModal = () => {
    setShowAddActivityModal(false);
  };

  if (!relationship) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.detailModalContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDetailActions(true)}>
              <Text style={styles.detailHeaderText}>⋯</Text>
            </TouchableOpacity>
          </View>
          
          <View 
            style={styles.detailContent}
            onTouchStart={() => {
              if (showActivityDropdown) {
                setShowActivityDropdown(false);
              }
            }}
          >
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <Text style={styles.profileInitials}>
                  {relationship.contactName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'AA'}
                </Text>
              </View>
              <Text style={styles.profileName}>{relationship.contactName}</Text>
              <Text style={styles.profileCompany}>
                {relationship.contactData?.company || relationship.contactData?.jobTitle 
                  ? `${relationship.contactData?.company || ''} ${relationship.contactData?.jobTitle || ''}`.trim()
                  : 'No company info'
                }
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.getInTouchButton}
                  onPress={() => setShowContactActions(true)}
                >
                  <Text style={styles.getInTouchText}>Get in touch</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => setShowMoreActions(true)}
                >
                  <Text style={styles.moreButtonText}>⋯</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Content */}
            <ScrollView 
              style={styles.detailScrollView}
              showsVerticalScrollIndicator={true}
              bounces={true}
              contentContainerStyle={styles.detailScrollContent}
            >
              {/* General Note Card */}
              <TouchableOpacity style={styles.noteCard} onPress={openEditNoteModal}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteIcon}>
                    <Text style={styles.noteIconText}>📝</Text>
                  </View>
                  <Text style={styles.noteTitle}>General Note</Text>
                </View>
                <Text style={styles.noteContent}>
                  {relationship.notes || 'No notes added yet'}
                </Text>
              </TouchableOpacity>
              
              {/* Family Info Card */}
              <TouchableOpacity style={styles.noteCard} onPress={openEditFamilyInfoModal}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteIcon}>
                    <Text style={styles.noteIconText}>👨‍👩‍👧‍👦</Text>
                  </View>
                  <Text style={styles.noteTitle}>Family Info</Text>
                </View>
                <Text style={styles.noteContent}>
                  {relationship.familyInfo ? 
                    `Kids: ${relationship.familyInfo.kids || 'Not specified'}\n` +
                    `Siblings: ${relationship.familyInfo.siblings || 'Not specified'}\n` +
                    `Spouse: ${relationship.familyInfo.spouse || 'Not specified'}` :
                    'Notes on kids, siblings, spouse...'
                  }
                </Text>
              </TouchableOpacity>
              
              {/* Activity Section */}
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Activity</Text>
                  {renderActivityDropdown()}
                </View>
                
                {/* Activity Cards */}
                {getContactActivities().length > 0 ? (
                  getContactActivities().map(activity => renderActivityCard(activity))
                ) : (
                  <View style={styles.noActivityCard}>
                    <Text style={styles.noActivityText}>
                      No {activityFilter === 'all' ? '' : activityFilter} activities found
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            {/* Bottom Input */}
            <View style={styles.bottomInput}>
              <TouchableOpacity style={styles.inputMenuButton} onPress={openAddActivityModal}>
                <Text style={styles.inputMenuText}>☰</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputField}
                onPress={openAddActivityModal}
              >
                <Text style={styles.inputFieldPlaceholder}>Anything to note?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Note Modal */}
      <Modal visible={showEditNoteModal} animationType="slide" transparent>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Note</Text>
              <TouchableOpacity onPress={closeEditNoteModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.editModalContent}>
              <TextInput
                style={styles.editTextInput}
                value={editedNote}
                onChangeText={setEditedNote}
                placeholder="Enter your note..."
                multiline
                numberOfLines={4}
              />
              <View style={styles.editModalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeEditNoteModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Family Info Modal */}
      <Modal visible={showEditFamilyInfoModal} animationType="slide" transparent>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Family Info</Text>
              <TouchableOpacity onPress={closeEditFamilyInfoModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.editModalContent}>
              <View style={styles.familyInfoInputGroup}>
                <Text style={styles.familyInfoLabel}>Kids</Text>
                <TextInput
                  style={styles.familyInfoInput}
                  value={editedFamilyInfo.kids}
                  onChangeText={(text: string) => setEditedFamilyInfo(prev => ({ ...prev, kids: text }))}
                  placeholder="Enter kids info..."
                />
              </View>
              <View style={styles.familyInfoInputGroup}>
                <Text style={styles.familyInfoLabel}>Siblings</Text>
                <TextInput
                  style={styles.familyInfoInput}
                  value={editedFamilyInfo.siblings}
                  onChangeText={(text: string) => setEditedFamilyInfo(prev => ({ ...prev, siblings: text }))}
                  placeholder="Enter siblings info..."
                />
              </View>
              <View style={styles.familyInfoInputGroup}>
                <Text style={styles.familyInfoLabel}>Spouse</Text>
                <TextInput
                  style={styles.familyInfoInput}
                  value={editedFamilyInfo.spouse}
                  onChangeText={(text: string) => setEditedFamilyInfo(prev => ({ ...prev, spouse: text }))}
                  placeholder="Enter spouse info..."
                />
              </View>
              <View style={styles.editModalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeEditFamilyInfoModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveFamilyInfo}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Actions Modal */}
      <Modal visible={showDetailActions} animationType="slide" transparent>
        <View style={styles.detailActionsOverlay}>
          <View style={styles.detailActionsContainer}>
            <View style={styles.detailActionsHeader}>
              <Text style={styles.detailActionsTitle}>Relationship Actions</Text>
              <TouchableOpacity onPress={() => setShowDetailActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailActionsList}>
              <TouchableOpacity style={styles.detailActionItem} onPress={handleEditRelationship}>
                <View style={styles.detailActionIcon}>
                  <Text style={styles.editIcon}>✏️</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Edit</Text>
                  <Text style={styles.detailActionSubtitle}>Edit relationship details</Text>
                </View>
              </TouchableOpacity>

             

              <TouchableOpacity style={styles.detailActionItem} onPress={handleShareRelationship}>
                <View style={styles.detailActionIcon}>
                  <Text style={styles.shareIcon}>📤</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Share</Text>
                  <Text style={styles.detailActionSubtitle}>Share contact information</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.detailActionItem} 
                onPress={handleDeleteRelationship}
              >
                <View style={styles.detailActionIcon}>
                  <Text style={styles.removeIcon}>🗑️</Text>
                </View>
                <View style={styles.detailActionContent}>
                  <Text style={styles.detailActionTitle}>Delete</Text>
                  <Text style={styles.detailActionSubtitle}>Delete relationship and all data</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Actions Modal */}
      <Modal visible={showContactActions} animationType="slide" transparent>
        <View style={styles.contactActionsOverlay}>
          <View style={styles.contactActionsContainer}>
            <View style={styles.contactActionsHeader}>
              <Text style={styles.contactActionsTitle}>Get in touch with {relationship?.contactName}</Text>
              <TouchableOpacity onPress={() => setShowContactActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contactActionsList}>
              <TouchableOpacity style={styles.contactActionItem} onPress={handleCall}>
                <View style={styles.contactActionIcon}>
                  <Phone size={24} color="#10B981" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Call</Text>
                  <Text style={styles.contactActionSubtitle}>Make a phone call</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleMessage}>
                <View style={styles.contactActionIcon}>
                  <MessageCircle size={24} color="#3B82F6" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Message</Text>
                  <Text style={styles.contactActionSubtitle}>Send SMS</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleWhatsApp}>
                <View style={styles.contactActionIcon}>
                  <Text style={styles.whatsappIcon}>📱</Text>
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>WhatsApp</Text>
                  <Text style={styles.contactActionSubtitle}>Send WhatsApp message</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactActionItem} onPress={handleEmail}>
                <View style={styles.contactActionIcon}>
                  <Mail size={24} color="#EF4444" />
                </View>
                <View style={styles.contactActionContent}>
                  <Text style={styles.contactActionTitle}>Email</Text>
                  <Text style={styles.contactActionSubtitle}>Send email</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* More Actions Modal */}
      <Modal visible={showMoreActions} animationType="slide" transparent>
        <View style={styles.moreActionsOverlay}>
          <View style={styles.moreActionsContainer}>
            <View style={styles.moreActionsHeader}>
              <Text style={styles.moreActionsTitle}>Find {relationship?.contactName}</Text>
              <TouchableOpacity onPress={() => setShowMoreActions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.moreActionsList}>
              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnLinkedIn}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.linkedinIcon}>💼</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Find on LinkedIn</Text>
                  <Text style={styles.moreActionSubtitle}>Search professional profile</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnX}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.xIcon}>𝕏</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Find on X</Text>
                  <Text style={styles.moreActionSubtitle}>Search on X (Twitter)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreActionItem} onPress={handleFindOnGoogle}>
                <View style={styles.moreActionIcon}>
                  <Text style={styles.googleIcon}>🔍</Text>
                </View>
                <View style={styles.moreActionContent}>
                  <Text style={styles.moreActionTitle}>Google Search</Text>
                  <Text style={styles.moreActionSubtitle}>Search on Google</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal visible={showAddReminderModal} animationType="slide" transparent>
        <View style={styles.addReminderOverlay}>
          <View style={styles.addReminderContainer}>
            <View style={styles.addReminderHeader}>
              <Text style={styles.addReminderTitle}>Add Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddReminderModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.addReminderContent}>
              <View style={styles.reminderForm}>
                <Text style={styles.reminderFormLabel}>Contact</Text>
                <Text style={styles.reminderContactName}>{relationship?.contactName}</Text>
                
                <Text style={styles.reminderFormLabel}>Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
                    <input
                      type="date"
                      value={reminderDate.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        selectedDate.setHours(reminderTime.getHours(), reminderTime.getMinutes());
                        setReminderDate(selectedDate);
                      }}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.reminderFormLabel}>Time</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateTimeInput}>
                    <input
                      type="time"
                      value={reminderTime.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newTime = new Date(reminderTime);
                        newTime.setHours(hours, minutes);
                        setReminderTime(newTime);
                      }}
                      style={{
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Clock size={20} color="#6B7280" />
                    <Text style={styles.dateTimeButtonText}>
                      {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.reminderFormLabel}>Note *</Text>
                <TextInput
                  style={styles.reminderNoteInput}
                  value={reminderNote}
                  onChangeText={setReminderNote}
                  placeholder="Enter a note for this reminder (required)..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.addReminderActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddReminderModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createReminderButton}
                onPress={handleCreateReminder}
              >
                <Text style={styles.createReminderButtonText}>Create Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Activity Modal */}
      <AddActivityModal
        visible={showAddActivityModal}
        onClose={closeAddActivityModal}
        contactId={relationship?.contactId}
        contactName={relationship?.contactName}
        onActivityCreated={() => {
          closeAddActivityModal();
          showAlert('Success', 'Activity created successfully!');
          onDataChanged?.(); // Trigger data refresh
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  detailHeaderText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  detailContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  profileSection: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  getInTouchButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
  },
  getInTouchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  detailScrollView: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 20,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIcon: {
    marginRight: 8,
  },
  noteIconText: {
    fontSize: 16,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  noteContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  activitySection: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 120,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  activityCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityIcon: {
    marginRight: 8,
  },
  activityIconText: {
    fontSize: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityDescription: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  noActivityCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noActivityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editModalContent: {
    padding: 20,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  familyInfoInputGroup: {
    marginBottom: 16,
  },
  familyInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  familyInfoInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Bottom input styles
  bottomInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputMenuButton: {
    padding: 8,
    marginRight: 8,
  },
  inputMenuText: {
    fontSize: 18,
    color: '#6B7280',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputFieldPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  // More button styles
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Detail Actions Modal styles
  detailActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  detailActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  detailActionsList: {
    paddingTop: 8,
  },
  detailActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailActionIcon: {
    marginRight: 16,
  },
  editIcon: {
    fontSize: 20,
  },
  reminderIcon: {
    fontSize: 20,
  },
  shareIcon: {
    fontSize: 20,
  },
  removeIcon: {
    fontSize: 20,
  },
  detailActionContent: {
    flex: 1,
  },
  detailActionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  detailActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Contact Actions Modal styles
  contactActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contactActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  contactActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  contactActionsList: {
    paddingTop: 8,
  },
  contactActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contactActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactActionContent: {
    flex: 1,
  },
  contactActionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  contactActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  whatsappIcon: {
    fontSize: 20,
  },
  // More Actions Modal styles
  moreActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moreActionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  moreActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  moreActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  moreActionsList: {
    paddingTop: 8,
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  moreActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moreActionContent: {
    flex: 1,
  },
  moreActionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  moreActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkedinIcon: {
    fontSize: 20,
  },
  xIcon: {
    fontSize: 20,
  },
  googleIcon: {
    fontSize: 20,
  },
  // Add Reminder Modal styles
  addReminderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReminderContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  addReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addReminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addReminderContent: {
    maxHeight: 400,
  },
  reminderForm: {
    padding: 20,
  },
  reminderFormLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  reminderContactName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  webDateTimeInput: {
    marginBottom: 16,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dateTimeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  reminderNoteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  addReminderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createReminderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  createReminderButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});
