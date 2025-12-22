import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Animated,
  FlatList,
  TextInput,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, RefreshCw, Search } from 'lucide-react-native';
import ContactSearchInput from './ContactSearchInput';
import * as Contacts from 'expo-contacts';
import { useRelationships } from '../firebase/hooks/useRelationships';
import type { Contact } from '../firebase/types';

interface ContactSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onContactSelect: (contact: Contact) => void;
  title?: string;
  placeholder?: string;
  showNewButton?: boolean;
  onNewContactPress?: () => void;
  showSyncButton?: boolean;
  onSyncPress?: () => void;
  isSyncing?: boolean;
  syncButtonRotation?: Animated.Value;
}

export default function ContactSelectorModal({
  visible,
  onClose,
  onContactSelect,
  title = 'Select Contact',
  placeholder = 'Search contacts...',
  showNewButton = false,
  onNewContactPress,
  showSyncButton = false,
  onSyncPress,
  isSyncing = false,
  syncButtonRotation,
}: ContactSelectorModalProps) {
  const { relationships } = useRelationships();
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [hasContactPermission, setHasContactPermission] = useState(false);

  const loadDeviceContacts = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      setIsLoadingDeviceContacts(true);
      const { status } = await Contacts.getPermissionsAsync();
      setHasContactPermission(status === 'granted');
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails
          ],
        });
        // Filter out contacts without names
        const validContacts = data.filter(contact => contact.name && contact.name.trim() !== '');
        setDeviceContacts(validContacts);
      }
    } catch (error) {
      console.error('Error loading device contacts:', error);
      setHasContactPermission(false);
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  }, []);

  // Load device contacts when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      loadDeviceContacts();
    }
  }, [visible, loadDeviceContacts]);

  // Re-fetch contacts when app comes to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && visible && hasContactPermission) {
        loadDeviceContacts();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible, hasContactPermission, loadDeviceContacts]);

  // Convert device contacts to Contact format
  const allContacts = useMemo(() => {
    const contacts: Contact[] = [];

    // Add device contacts
    if (Platform.OS !== 'web' && deviceContacts.length > 0) {
      deviceContacts.forEach((contact, index) => {
        contacts.push({
          id: (contact as any).id || `device_${Date.now()}_${index}`,
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers?.map(phone => ({
            number: phone.number || '',
            label: phone.label || 'mobile'
          })) || [],
          emails: contact.emails?.map(email => ({
            email: email.email || '',
            label: email.label || 'work'
          })) || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }

    // Add relationships
    relationships.forEach(rel => {
      contacts.push({
        id: rel.contactId,
        name: rel.contactName,
        phoneNumbers: rel.contactData?.phoneNumbers || [],
        emails: rel.contactData?.emails || [],
        website: rel.contactData?.website,
        linkedin: rel.contactData?.linkedin,
        twitter: rel.contactData?.twitter,
        instagram: rel.contactData?.instagram,
        facebook: rel.contactData?.facebook,
        company: rel.contactData?.company,
        jobTitle: rel.contactData?.jobTitle,
        address: rel.contactData?.address,
        birthday: rel.contactData?.birthday,
        notes: rel.contactData?.notes,
      });
    });

    // Remove duplicates based on name (case-insensitive)
    const uniqueContacts = contacts.filter((contact, index, self) =>
      index === self.findIndex(c => c.name.toLowerCase() === contact.name.toLowerCase())
    );

    return uniqueContacts;
  }, [deviceContacts, relationships]);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return allContacts;
    }

    const query = searchQuery.toLowerCase();
    return allContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumbers?.some(phone => phone.number?.includes(query)) ||
      contact.emails?.some(email => email.email?.toLowerCase().includes(query))
    );
  }, [allContacts, searchQuery]);

  const handleContactSelect = useCallback((contact: Contact) => {
    onContactSelect(contact);
    onClose();
  }, [onContactSelect, onClose]);

  const renderContactItem = useCallback(({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contactItemContent}>
        <Text style={styles.contactItemName}>{item.name}</Text>
        {item.phoneNumbers?.[0] && (
          <Text style={styles.contactItemPhone}>{item.phoneNumbers[0].number}</Text>
        )}
        {item.emails?.[0] && (
          <Text style={styles.contactItemEmail}>{item.emails[0].email}</Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleContactSelect]);

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.headerActions}>
            {showNewButton && (
              <TouchableOpacity
                style={styles.createNewButton}
                onPress={onNewContactPress}
              >
                <Plus size={20} color="#ffffff" />
                <Text style={styles.createNewButtonText}>New</Text>
              </TouchableOpacity>
            )}
            {showSyncButton && onSyncPress && (
              <TouchableOpacity
                style={[styles.syncButton, (isSyncing || isLoadingDeviceContacts) && styles.syncButtonDisabled]}
                onPress={() => {
                  loadDeviceContacts();
                  onSyncPress?.();
                }}
                disabled={isSyncing || isLoadingDeviceContacts}
              >
                {syncButtonRotation ? (
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: syncButtonRotation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <RefreshCw 
                      size={20} 
                      color={(isSyncing || isLoadingDeviceContacts) ? "#9CA3AF" : "#3B82F6"} 
                    />
                  </Animated.View>
                ) : (
                  <RefreshCw 
                    size={20} 
                    color={(isSyncing || isLoadingDeviceContacts) ? "#9CA3AF" : "#3B82F6"} 
                  />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.content}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Contacts List */}
          {isLoadingDeviceContacts ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Loading contacts...</Text>
            </View>
          ) : filteredContacts.length > 0 ? (
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={keyExtractor}
              style={styles.contactList}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={21}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No contacts found' : 'No contacts available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No contacts match "${searchQuery}"`
                  : Platform.OS === 'web'
                    ? 'No relationships found. Create a new contact to get started.'
                    : !hasContactPermission
                      ? 'Grant contact permission to see your device contacts'
                      : 'No contacts found. Use the sync button to refresh or create a new contact.'
                }
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createNewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
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
  clearButton: {
    padding: 4,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  contactItemPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactItemEmail: {
    fontSize: 14,
    color: '#6B7280',
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
});

