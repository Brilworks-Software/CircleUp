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
import * as Contacts from 'expo-contacts';

interface ContactSearchInputProps {
  onContactSelect: (contact: { id: string; name: string }) => void;
  placeholder?: string;
  style?: any;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  showSearchIcon?: boolean;
  maxResults?: number;
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
}: ContactSearchInputProps) {
  const { searchContacts, filterContacts } = useContacts();
  const { relationships } = useRelationships();
  const searchContainerRef = useRef<any>(null);
  
  // Local state for search functionality
  const [searchQuery, setSearchQuery] = useState(value);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Array<{id: string; name: string}>>([]);
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
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
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
      let filtered: Array<{id: string; name: string}> = [];
      
      try {
        if (Platform.OS === 'web') {
          // Web: Use relationship data
          filtered = relationships
            .filter(rel => 
              rel.contactName.toLowerCase().includes(query.toLowerCase())
            )
            .map(rel => ({
              id: rel.contactId,
              name: rel.contactName
            }))
            .slice(0, maxResults);
        } else {
          // Mobile: Use device contacts
          filtered = deviceContacts
            .filter(contact => 
              contact.name?.toLowerCase().includes(query.toLowerCase()) ||
              contact.phoneNumbers?.[0]?.number?.includes(query) ||
              contact.emails?.[0]?.email?.toLowerCase().includes(query.toLowerCase())
            )
            .map((contact, index) => ({
              id: (contact as any).id || `device_${Date.now()}_${index}`,
              name: contact.name || 'Unknown'
            }))
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

  const handleContactSelect = useCallback((contact: { id: string; name: string }) => {
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
          
        />
        {searchQuery.length > 0 && !disabled && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {showSearchResults && (
        <View style={[styles.searchResults, {position: (Platform.OS === 'android') ? "absolute" : "sticky"}]}>
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
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {Platform.OS === 'web' 
                  ? `No contacts found (Total relationships: ${relationships.length})`
                  : `No contacts found (Device contacts: ${deviceContacts.length})`
                }
              </Text>
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
    marginTop: 4,
    maxHeight: 230,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
});
