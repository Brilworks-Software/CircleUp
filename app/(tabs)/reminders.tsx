import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, Clock, Filter, Search, X, Plus, Bell, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';

interface Reminder {
  id: string;
  contactName: string;
  type: string;
  date: string;
  frequency: string;
  tags: string[];
  isOverdue: boolean;
  isThisWeek: boolean;
  notes?: string;
}

type ReminderTab = 'missed' | 'thisWeek' | 'upcoming';
type FilterType = 'all' | 'client' | 'family' | 'friends' | 'prospect';

export default function RemindersScreen() {
  const [activeTab, setActiveTab] = useState<ReminderTab>('thisWeek');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReminderDetail, setShowReminderDetail] = useState(false);

  const filterOptions = [
    { key: 'all', label: 'All Reminders' },
    { key: 'client', label: 'Client' },
    { key: 'family', label: 'Family' },
    { key: 'friends', label: 'Friends' },
    { key: 'prospect', label: 'Prospect' },
  ];

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    filterReminders();
  }, [activeTab, reminders, searchQuery, selectedFilter]);

  const loadReminders = async () => {
    try {
      const savedReminders = await AsyncStorage.getItem('reminders');
      if (savedReminders) {
        const parsedReminders = JSON.parse(savedReminders);
        const processedReminders = parsedReminders.map((reminder: any) => ({
          ...reminder,
          isOverdue: isOverdue(reminder.date),
          isThisWeek: isThisWeek(reminder.date),
        }));
        setReminders(processedReminders);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const isOverdue = (dateString: string): boolean => {
    const reminderDate = new Date(dateString);
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    return reminderDate < now;
  };

  const isThisWeek = (dateString: string): boolean => {
    const reminderDate = new Date(dateString);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return reminderDate >= startOfWeek && reminderDate <= endOfWeek;
  };

  const filterReminders = () => {
    let filtered: Reminder[] = [];
    
    // First filter by tab
    switch (activeTab) {
      case 'missed':
        filtered = reminders.filter(r => r.isOverdue);
        break;
      case 'thisWeek':
        filtered = reminders.filter(r => r.isThisWeek && !r.isOverdue);
        break;
      case 'upcoming':
        filtered = reminders.filter(r => !r.isThisWeek && !r.isOverdue);
        break;
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        r.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Then filter by selected filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(r => 
        r.tags.some(tag => tag.toLowerCase() === selectedFilter.toLowerCase())
      );
    }
    
    setFilteredReminders(filtered);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === -1) return 'Tomorrow';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays > 0 && diffInDays <= 7) return `${diffInDays} days ago`;
    if (diffInDays < 0 && diffInDays >= -7) return `In ${Math.abs(diffInDays)} days`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleReminderPress = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowReminderDetail(true);
  };

  const markAsDone = async (reminderId: string) => {
    try {
      const updatedReminders = reminders.filter(r => r.id !== reminderId);
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      setShowReminderDetail(false);
      Alert.alert('Success', 'Reminder marked as completed!');
    } catch (error) {
      console.error('Error marking reminder as done:', error);
      Alert.alert('Error', 'Failed to update reminder.');
    }
  };

  const snoozeReminder = async (reminderId: string, days: number) => {
    try {
      const updatedReminders = reminders.map(r => {
        if (r.id === reminderId) {
          const newDate = new Date(r.date);
          newDate.setDate(newDate.getDate() + days);
          return {
            ...r,
            date: newDate.toISOString(),
            isOverdue: false,
            isThisWeek: isThisWeek(newDate.toISOString()),
          };
        }
        return r;
      });
      
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      setShowReminderDetail(false);
      Alert.alert('Success', `Reminder snoozed for ${days} day${days > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder.');
    }
  };

  const contactPerson = (reminder: Reminder) => {
    setShowReminderDetail(false);
    Alert.alert(
      'Contact Options',
      `How would you like to contact ${reminder.contactName}?`,
      [
        { text: 'Call', onPress: () => console.log('Call') },
        { text: 'Message', onPress: () => console.log('Message') },
        { text: 'Email', onPress: () => console.log('Email') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <TouchableOpacity style={styles.reminderCard} onPress={() => handleReminderPress(item)}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Text style={styles.contactName}>{item.contactName}</Text>
          <Text style={styles.reminderType}>{item.type}</Text>
        </View>
        <View style={styles.reminderStatus}>
          {item.isOverdue ? (
            <AlertCircle size={20} color="#EF4444" />
          ) : (
            <Calendar size={16} color="#6B7280" />
          )}
          <Text style={[
            styles.dateText,
            item.isOverdue && styles.overdueText
          ]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>
      
      <View style={styles.reminderFooter}>
        <Text style={styles.frequency}>Every {item.frequency}</Text>
        <View style={styles.tags}>
          {item.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 2 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{item.tags.length - 2}</Text>
            </View>
          )}
        </View>
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const getTabCount = (tab: ReminderTab): number => {
    switch (tab) {
      case 'missed': return reminders.filter(r => r.isOverdue).length;
      case 'thisWeek': return reminders.filter(r => r.isThisWeek && !r.isOverdue).length;
      case 'upcoming': return reminders.filter(r => !r.isThisWeek && !r.isOverdue).length;
      default: return 0;
    }
  };

  const renderAllReminders = () => (
    <Modal visible={showAllReminders} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Reminders</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowFilters(true)}
            >
              <Filter size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAllReminders(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search reminders..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {selectedFilter !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              Filtered by: {filterOptions.find(f => f.key === selectedFilter)?.label}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFilter('all')}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredReminders}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderFiltersModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.filtersModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Reminders</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersContent}>
          <Text style={styles.filterSectionTitle}>Filter by Tag</Text>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                selectedFilter === option.key && styles.selectedFilterOption
              ]}
              onPress={() => {
                setSelectedFilter(option.key as FilterType);
                setShowFilters(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === option.key && styles.selectedFilterOptionText
              ]}>
                {option.label}
              </Text>
              {selectedFilter === option.key && (
                <CheckCircle size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderReminderDetail = () => (
    <Modal visible={showReminderDetail} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.detailModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedReminder?.contactName}</Text>
          <TouchableOpacity onPress={() => setShowReminderDetail(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedReminder && (
          <ScrollView style={styles.detailContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reminder Type</Text>
              <Text style={styles.detailValue}>{selectedReminder.type}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={[
                styles.detailValue,
                selectedReminder.isOverdue && styles.overdueText
              ]}>
                {formatDate(selectedReminder.date)}
                {selectedReminder.isOverdue && ' (Overdue)'}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>Every {selectedReminder.frequency}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Tags</Text>
              <View style={styles.detailTags}>
                {selectedReminder.tags.map((tag, index) => (
                  <View key={index} style={styles.detailTag}>
                    <Text style={styles.detailTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {selectedReminder.notes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{selectedReminder.notes}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => contactPerson(selectedReminder)}
              >
                <Text style={styles.primaryButtonText}>Contact Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => markAsDone(selectedReminder.id)}
              >
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.secondaryButtonText}>Mark as Done</Text>
              </TouchableOpacity>

              <View style={styles.snoozeButtons}>
                <TouchableOpacity 
                  style={styles.snoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 1)}
                >
                  <Text style={styles.snoozeButtonText}>Snooze 1 day</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.snoozeButton}
                  onPress={() => snoozeReminder(selectedReminder.id, 7)}
                >
                  <Text style={styles.snoozeButtonText}>Snooze 1 week</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setSearchQuery('')}
          >
            <Search size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(['missed', 'thisWeek', 'upcoming'] as ReminderTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'missed' ? 'Missed' : tab === 'thisWeek' ? 'This Week' : 'Upcoming'}
            </Text>
            <View style={[styles.badge, activeTab === tab && styles.activeBadge]}>
              <Text style={[styles.badgeText, activeTab === tab && styles.activeBadgeText]}>
                {getTabCount(tab)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {filteredReminders.length > 0 ? (
          <FlatList
            data={filteredReminders}
            renderItem={renderReminder}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Clock size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No reminders</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'missed' 
                ? "Great! You're all caught up."
                : activeTab === 'thisWeek'
                ? "No reminders for this week."
                : "No upcoming reminders."}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.viewAllButton}
        onPress={() => setShowAllReminders(true)}
      >
        <Text style={styles.viewAllText}>View All Reminders</Text>
      </TouchableOpacity>

      {renderAllReminders()}
      {renderFiltersModal()}
      {renderReminderDetail()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reminderType: {
    fontSize: 14,
    color: '#6B7280',
  },
  reminderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frequency: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  viewAllButton: {
    margin: 24,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeFilterText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  filtersModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filtersContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  selectedFilterOptionText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  detailModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  detailContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailTagText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 32,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  snoozeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  snoozeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});