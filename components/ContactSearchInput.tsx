import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useContacts } from '../firebase/hooks/useContacts';
import { useRelationships } from '../firebase/hooks/useRelationships';
import { Contact } from '../firebase/types';
import * as Contacts from 'expo-contacts';

interface ContactSearchInputProps {
  onContactSelect: (contact: Contact) => void;
  placeholder?: string;
  style?: any;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  showSearchIcon?: boolean;
  maxResults?: number;
  onCreateNewContact?: (contactData: any) => void;
}

export default function ContactSearchInput({
  onContactSelect,
  placeholder = "Search contacts...",
  style,
  error,
  value = '',
  onChangeText,
  disabled = false,
  showSearchIcon = true,
  maxResults = 5,
  onCreateNewContact,
}: ContactSearchInputProps) {
  const { searchContacts, filterContacts } = useContacts();
  const { relationships } = useRelationships();
  const searchContainerRef = useRef<any>(null);
  
  // Local state for search functionality
  const [searchQuery, setSearchQuery] = useState(value);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Device contacts state (for mobile)
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [hasContactPermission, setHasContactPermission] = useState(false);

  // Load device contacts on mount (mobile only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadDeviceContacts();
    }
  }, []);

  // Update local search query when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const loadDeviceContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        setHasContactPermission(true);
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name, 
            Contacts.Fields.PhoneNumbers, 
            Contacts.Fields.Emails,
          ],
        });
        setDeviceContacts(data);
      } else {
        setHasContactPermission(false);
      }
    } catch (error) {
      console.error('Error loading device contacts:', error);
      setHasContactPermission(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    onChangeText?.(query);
    
    if (query.trim()) {
      setIsSearching(true);
      let filtered: Contact[] = [];
      
      try {
        if (Platform.OS === 'web') {
          // Web: Use relationship data
          filtered = relationships
            .filter(rel => 
              rel.contactName.toLowerCase().includes(query.toLowerCase())
            )
            .map(rel => ({
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
            }))
            .slice(0, maxResults);
        } else {
          // Mobile: Search device contacts with comprehensive data mapping
          const deviceContactResults = deviceContacts
            .filter(contact => 
              contact.name?.toLowerCase().includes(query.toLowerCase()) ||
              contact.phoneNumbers?.[0]?.number?.includes(query) ||
              contact.emails?.[0]?.email?.toLowerCase().includes(query.toLowerCase())
            )
            .map((contact, index): Contact => {
              // Extract social profiles
              const socialProfiles = contact.socialProfiles || [];
              const linkedin = socialProfiles.find(p => p.service?.toLowerCase() === 'linkedin')?.url;
              const twitter = socialProfiles.find(p => p.service?.toLowerCase() === 'twitter')?.url;
              const facebook = socialProfiles.find(p => p.service?.toLowerCase() === 'facebook')?.url;
              const instagram = socialProfiles.find(p => p.service?.toLowerCase() === 'instagram')?.url;

              // Extract website from URLs
              const websites = contact.urlAddresses || [];
              const website = websites.find(url => url.url)?.url;

              // Extract and format address
              const addresses = contact.addresses || [];
              const primaryAddress = addresses[0];
              const formattedAddress = primaryAddress ? 
                [
                  primaryAddress.street,
                  primaryAddress.city,
                  primaryAddress.region,
                  primaryAddress.postalCode,
                  primaryAddress.country
                ].filter(Boolean).join(', ') : undefined;

              // Format birthday
              const birthday = contact.birthday ? 
                new Date(contact.birthday.year || 2000, 
                        (contact.birthday.month || 1) - 1, 
                        contact.birthday.day || 1).toISOString().split('T')[0] : undefined;

              return {
                id: (contact as any).id || `device_${Date.now()}_${index}`,
                name: contact.name || 'Unknown',
                phoneNumbers: (contact.phoneNumbers || []).map(pn => ({
                  number: pn.number || '',
                  label: pn.label || 'mobile'
                })),
                emails: (contact.emails || []).map(em => ({
                  email: em.email || '',
                  label: em.label || 'work'
                })),
                company: contact.company,
                jobTitle: contact.jobTitle,
                website,
                linkedin,
                twitter,
                instagram,
                facebook,
                address: formattedAddress,
                birthday,
                notes: contact.note,
              };
            });

          // Also include existing relationships for completeness
          const relationshipResults = relationships
            .filter(rel => 
              rel.contactName.toLowerCase().includes(query.toLowerCase())
            )
            .map(rel => ({
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
            }));

          // Combine results, remove duplicates based on name, and prioritize device contacts
          const combinedResults = [...deviceContactResults, ...relationshipResults];
          filtered = combinedResults
            .filter((item, index, arr) => 
              arr.findIndex(other => other.name.toLowerCase() === item.name.toLowerCase()) === index
            )
            .slice(0, maxResults);
        }
        
        setFilteredContacts(filtered);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setFilteredContacts([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setShowSearchResults(false);
      setFilteredContacts([]);
    }
  }, [relationships, deviceContacts, maxResults, onChangeText]);

  const handleContactSelect = useCallback((contact: Contact) => {
    console.log('Selected contact:', contact);   
    onContactSelect(contact);
    setSearchQuery(contact.name);
    onChangeText?.(contact.name);
    setShowSearchResults(false);
    setFilteredContacts([]);
  }, [onContactSelect, onChangeText]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    onChangeText?.('');
    setShowSearchResults(false);
    setFilteredContacts([]);
  }, [onChangeText]);

  // Click outside handler for web
  const handleClickOutside = useCallback((event: any) => {
    if (Platform.OS === 'web' && searchContainerRef.current) {
      const target = event.target;
      const container = searchContainerRef.current;
      
      if (showSearchResults && !container.contains(target)) {
        setShowSearchResults(false);
        setFilteredContacts([]);
      }
    }
  }, [showSearchResults]);

  // Add click outside listener for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [handleClickOutside]);

  return (
    <View ref={searchContainerRef} style={[styles.container, style]}>
      <View style={[styles.searchContainer, error && styles.errorContainer]}>
        {showSearchIcon && (
          <Search size={20} color="#6B7280" style={styles.searchIcon} />
        )}
        <TextInput
          style={[styles.searchInput, disabled && styles.disabledInput]}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="none"
          focusable={false}
          keyboardType="default"
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {searchQuery.length > 0 && !disabled && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {showSearchResults && (
        <View style={[styles.searchResults, {position: (Platform.OS !== 'web') ? "absolute" : "sticky"}]}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : filteredContacts.length > 0 ? (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleContactSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.searchResultText}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : searchQuery.trim() && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {Platform.OS === 'web' 
                  ? `No contacts found (Total relationships: ${relationships.length})`
                  : `No contacts found (Device contacts: ${deviceContacts.length}, Relationships: ${relationships.length})`
                }
              </Text>
              {onCreateNewContact && (
                <TouchableOpacity
                  style={styles.createNewContactButton}
                  onPress={() => onCreateNewContact({ name: searchQuery })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createNewContactText}>+ Create "{searchQuery}"</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  errorContainer: {
    borderColor: '#EF4444',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
    borderColor: "transparent"
  },
  disabledInput: {
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResults: {
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: Platform.OS === 'ios' ? 2 : 4,
    maxHeight: 230,
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 10 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0,
    shadowRadius: Platform.OS === 'ios' ? 8 : 0,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultText: {
    fontSize: 16,
    color: '#111827',
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noResultsContainer: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  createNewContactButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  createNewContactText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
