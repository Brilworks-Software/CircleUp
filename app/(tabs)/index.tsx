import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { Plus, Users, Bell, Clock, MessageSquare, StickyNote, FileText, Phone, Calendar, CheckCircle, X, Save, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../firebase/hooks/useAuth';
import { useUser } from '../../firebase/hooks/useUser';
import { useStats } from '../../firebase/hooks/useStats';
import { useActivity } from '../../firebase/hooks/useActivity';
import AddActivityModal from '../../components/AddActivityModal';

export default function HomeScreen() {
  const { currentUser, signOut } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(currentUser?.uid || '');
  const { stats, isLoading: isLoadingStats, getRemindersStats, getRelationshipsStats } = useStats();
  const { activities, isLoading: isLoadingActivities, getRecentActivities, updateActivity, deleteActivity } = useActivity();
  
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeStats, setRealTimeStats] = useState({
    totalReminders: 0,
    totalRelationships: 0,
    overdueReminders: 0,
  });

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    initializeApp();
  }, []);

  // Load real-time stats when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      loadRealTimeStats();
    }
  }, [currentUser?.uid]);

  // Set up periodic refresh for real-time stats
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Refresh stats every minute to catch overdue reminders
    const interval = setInterval(() => {
      loadRealTimeStats();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.uid) {
        loadRealTimeStats();
      }
    }, [currentUser?.uid])
  );

  const initializeApp = async () => {
    try {
      await requestContactsPermission();
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const loadRealTimeStats = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const [remindersStats, relationshipsStats] = await Promise.all([
        getRemindersStats(),
        getRelationshipsStats(),
      ]);
      
      setRealTimeStats({
        totalReminders: remindersStats.total,
        totalRelationships: relationshipsStats.total,
        overdueReminders: remindersStats.overdue,
      });
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };


 

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setHasContactPermission(true);
      } else {
        Alert.alert(
          'Permission Required',
          'This app needs access to your contacts to provide full functionality.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {} },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  };

  // Activity handlers
  const handleEditActivity = (activity: any) => {
    setSelectedActivity(activity);
    setEditForm({
      title: activity.title,
      description: activity.description,
    });
    setEditModalVisible(true);
  };

  const handleDeleteActivity = (activity: any) => {
    setSelectedActivity(activity);
    setDeleteModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity || !editForm.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      const success = await updateActivity(selectedActivity.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
      });

      if (success) {
        setEditModalVisible(false);
        setSelectedActivity(null);
        setEditForm({ title: '', description: '' });
        Alert.alert('Success', 'Activity updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      Alert.alert('Error', 'Failed to update activity');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedActivity) return;

    try {
      const success = await deleteActivity(selectedActivity.id);
      
      if (success) {
        setDeleteModalVisible(false);
        setSelectedActivity(null);
        Alert.alert('Success', 'Activity deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      Alert.alert('Error', 'Failed to delete activity');
    }
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setSelectedActivity(null);
    setEditForm({ title: '', description: '' });
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedActivity(null);
  };

  // Activity handlers
  const handleAddActivity = () => {
    setAddActivityModalVisible(true);
  };

  const handleCloseActivityModal = () => {
    setAddActivityModalVisible(false);
  };

  const handleActivityCreated = () => {
    // Activity was created successfully, modal will close automatically
    // You can add any additional logic here if needed
  };


  if (isLoading || isLoadingProfile || isLoadingStats || isLoadingActivities) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>
                Welcome Back{userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : ''}
              </Text>
              <Text style={styles.subtitle}>Manage your connections</Text>
            </View>
            
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => router.push('/(tabs)/reminders')}
          >
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{realTimeStats.totalReminders}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/relationships')}
          >
            <Users size={24} color="#10B981" />
            <Text style={styles.statNumber}>{realTimeStats.totalRelationships}</Text>
            <Text style={styles.statLabel}>Relationships</Text>
          </TouchableOpacity>
        </View>


        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activityList}>
            {getRecentActivities().slice(0, 6).map((activity) => {
              const getActivityIcon = () => {
                switch (activity.type) {
                  case 'note':
                    return <FileText size={20} color="#3B82F6" />;
                  case 'interaction':
                    return <Phone size={20} color="#10B981" />;
                  case 'reminder':
                    return activity.isCompleted ? 
                      <CheckCircle size={20} color="#059669" /> : 
                      <Calendar size={20} color="#F59E0B" />;
                  default:
                    return <StickyNote size={20} color="#6B7280" />;
                }
              };

              const getActivityIconBg = () => {
                switch (activity.type) {
                  case 'note':
                    return '#EBF8FF';
                  case 'interaction':
                    return '#ECFDF5';
                  case 'reminder':
                    return activity.isCompleted ? '#ECFDF5' : '#FFFBEB';
                  default:
                    return '#F3F4F6';
                }
              };

              return (
                <TouchableOpacity 
                  key={activity.id} 
                  style={styles.activityItem}
                  onPress={() => handleEditActivity(activity)}
                  onLongPress={() => handleDeleteActivity(activity)}
                  delayLongPress={500}
                >
                  <View style={[styles.activityIcon, { backgroundColor: getActivityIconBg() }]}>
                    {getActivityIcon()}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityDate}>
                      {(() => {
                        // Safely handle different timestamp formats
                        let date: Date;
                        if (!activity.createdAt) {
                          date = new Date();
                        } else if (activity.createdAt instanceof Date) {
                          date = activity.createdAt;
                        } else if (activity.createdAt && typeof activity.createdAt === 'object' && 'seconds' in activity.createdAt) {
                          // Firebase Timestamp object
                          date = new Date(activity.createdAt.seconds * 1000);
                        } else if (typeof activity.createdAt === 'string') {
                          date = new Date(activity.createdAt);
                        } else if (typeof activity.createdAt === 'number') {
                          date = new Date(activity.createdAt);
                        } else {
                          date = new Date(); // Fallback
                        }
                        return date.toLocaleDateString();
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {getRecentActivities().length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent activity</Text>
                <Text style={styles.emptyStateSubtext}>Start by adding relationships or setting reminders</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingActionButton}
        onPress={handleAddActivity}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Edit Activity Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Activity</Text>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.closeButton}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.title}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                placeholder="Enter activity title"
                multiline={false}
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="Enter activity description"
                multiline={true}
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Save size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Activity Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Trash2 size={48} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Delete Activity</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete "{selectedActivity?.title}"? This action cannot be undone.
              </Text>
            </View>
            
            <View style={styles.deleteModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDelete}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleConfirmDelete}>
                <Trash2 size={20} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Activity Modal */}
      <AddActivityModal
        visible={addActivityModalVisible}
        onClose={handleCloseActivityModal}
        onActivityCreated={handleActivityCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activityList: {
    paddingHorizontal: 24,
  },
  activityItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  // Delete modal styles
  deleteModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});