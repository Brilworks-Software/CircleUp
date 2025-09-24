import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Phone, MessageCircle, Mail, User, Calendar, ExternalLink, X, Clock, CircleCheck as CheckCircle, MessageSquare, Linkedin, Twitter } from 'lucide-react-native';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string }[];
  emails?: { email: string }[];
}

interface ContactInteraction {
  id: string;
  contactId: string;
  date: string;
  type: string;
  notes?: string;
}

interface Relationship {
  id: string;
  contactId: string;
  contactName: string;
  lastContactDate: string;
  lastContactMethod: string;
  tags: string[];
  notes: string;
  familyInfo: {
    kids: string;
    siblings: string;
    spouse: string;
  };
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  const loadData = async () => {
    try {
      const [savedContacts, savedInteractions, savedRelationships] = await Promise.all([
        AsyncStorage.getItem('imported_contacts'),
        AsyncStorage.getItem('contact_interactions'),
        AsyncStorage.getItem('relationships')
      ]);
      
      if (savedContacts) {
        const parsedContacts = JSON.parse(savedContacts);
        setContacts(parsedContacts);
        setFilteredContacts(parsedContacts);
      }
      
      if (savedInteractions) {
        setInteractions(JSON.parse(savedInteractions));
      }

      if (savedRelationships) {
        setRelationships(JSON.parse(savedRelationships));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterContacts = () => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.phoneNumbers && contact.phoneNumbers.some(phone => 
          phone.number.includes(searchQuery)
        )) ||
        (contact.emails && contact.emails.some(email => 
          email.email.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
      setFilteredContacts(filtered);
    }
  };

  const handleCall = async (contact: Contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phoneNumber = contact.phoneNumbers[0].number;
      const url = `tel:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          await recordInteraction(contact.id, 'call');
        } else {
          Alert.alert('Error', 'Phone app is not available');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to make call');
      }
    } else {
      Alert.alert('No Phone Number', 'This contact has no phone number available');
    }
  };

  const handleMessage = async (contact: Contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phoneNumber = contact.phoneNumbers[0].number;
      const url = `sms:${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          await recordInteraction(contact.id, 'message');
        } else {
          Alert.alert('Error', 'Messages app is not available');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open messages');
      }
    } else {
      Alert.alert('No Phone Number', 'This contact has no phone number available');
    }
  };

  const handleEmail = async (contact: Contact) => {
    if (contact.emails && contact.emails.length > 0) {
      const email = contact.emails[0].email;
      const url = `mailto:${email}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          await recordInteraction(contact.id, 'email');
        } else {
          Alert.alert('Error', 'Email app is not available');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open email');
      }
    } else {
      Alert.alert('No Email', 'This contact has no email address available');
    }
  };

  const handleWhatsApp = async (contact: Contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phoneNumber = contact.phoneNumbers[0].number.replace(/\D/g, '');
      const url = `whatsapp://send?phone=${phoneNumber}`;
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          await recordInteraction(contact.id, 'whatsapp');
        } else {
          Alert.alert('WhatsApp Not Installed', 'WhatsApp is not installed on this device');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open WhatsApp');
      }
    } else {
      Alert.alert('No Phone Number', 'This contact has no phone number available');
    }
  };

  const handleFindOnLinkedIn = async (contact: Contact) => {
    const searchQuery = encodeURIComponent(contact.name);
    const url = `https://www.linkedin.com/search/results/all/?keywords=${searchQuery}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        await recordInteraction(contact.id, 'linkedin_search');
      } else {
        Alert.alert('Error', 'Cannot open LinkedIn');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search on LinkedIn');
    }
  };

  const handleFindOnX = async (contact: Contact) => {
    const searchQuery = encodeURIComponent(contact.name);
    const url = `https://twitter.com/search?q=${searchQuery}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        await recordInteraction(contact.id, 'twitter_search');
      } else {
        Alert.alert('Error', 'Cannot open X (Twitter)');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search on X');
    }
  };

  const markAsContacted = async (contact: Contact) => {
    Alert.alert(
      'Mark as Contacted',
      `Mark ${contact.name} as contacted?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => recordInteraction(contact.id, 'marked_contacted')
        },
      ]
    );
  };

  const recordInteraction = async (contactId: string, type: string) => {
    const newInteraction: ContactInteraction = {
      id: Date.now().toString(),
      contactId,
      date: new Date().toISOString(),
      type,
    };

    const updatedInteractions = [...interactions, newInteraction];
    setInteractions(updatedInteractions);

    try {
      await AsyncStorage.setItem('contact_interactions', JSON.stringify(updatedInteractions));
    } catch (error) {
      console.error('Error saving interaction:', error);
    }
  };

  const getLastInteraction = (contactId: string): ContactInteraction | null => {
    const contactInteractions = interactions
      .filter(i => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return contactInteractions[0] || null;
  };

  const getRelationship = (contactId: string): Relationship | null => {
    return relationships.find(r => r.contactId === contactId) || null;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const showContactActions = (contact: Contact) => {
    setSelectedContact(contact);
    setShowActionModal(true);
  };

  const showContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const lastInteraction = getLastInteraction(item.id);
    const relationship = getRelationship(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.contactCard} 
        onPress={() => showContactDetails(item)}
      >
        <View style={styles.contactHeader}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.name}</Text>
            {relationship && (
              <View style={styles.relationshipTags}>
                {relationship.tags.slice(0, 2).map((tag, index) => (
                  <View key={index} style={styles.relationshipTag}>
                    <Text style={styles.relationshipTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            {item.phoneNumbers && item.phoneNumbers[0] && (
              <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
            )}
            {item.emails && item.emails[0] && (
              <Text style={styles.contactEmail}>{item.emails[0].email}</Text>
            )}
          </View>
          
          <View style={styles.contactActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleCall(item)}
            >
              <Phone size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleMessage(item)}
            >
              <MessageCircle size={18} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {lastInteraction && (
          <View style={styles.lastInteraction}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.lastInteractionText}>
              Last {lastInteraction.type.replace('_', ' ')}: {formatDate(lastInteraction.date)}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.getInTouchButton} 
          onPress={() => showContactActions(item)}
        >
          <ExternalLink size={16} color="#3B82F6" />
          <Text style={styles.getInTouchText}>Get in Touch</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderContactDetail = () => (
    <Modal visible={showContactDetail} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedContact?.name}</Text>
          <TouchableOpacity onPress={() => setShowContactDetail(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {selectedContact && (
          <ScrollView style={styles.detailContent}>
            {/* Contact Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              {selectedContact.phoneNumbers && selectedContact.phoneNumbers.map((phone, index) => (
                <View key={index} style={styles.contactDetailRow}>
                  <Phone size={16} color="#6B7280" />
                  <Text style={styles.contactDetailText}>{phone.number}</Text>
                </View>
              ))}
              {selectedContact.emails && selectedContact.emails.map((email, index) => (
                <View key={index} style={styles.contactDetailRow}>
                  <Mail size={16} color="#6B7280" />
                  <Text style={styles.contactDetailText}>{email.email}</Text>
                </View>
              ))}
            </View>

            {/* Relationship Information */}
            {(() => {
              const relationship = getRelationship(selectedContact.id);
              if (relationship) {
                return (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Relationship</Text>
                    <View style={styles.relationshipInfo}>
                      <View style={styles.relationshipTags}>
                        {relationship.tags.map((tag, index) => (
                          <View key={index} style={styles.relationshipTag}>
                            <Text style={styles.relationshipTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.relationshipDetail}>
                        Last contact: {formatDate(relationship.lastContactDate)}
                      </Text>
                      <Text style={styles.relationshipDetail}>
                        Method: {relationship.lastContactMethod.replace('inPerson', 'In person')}
                      </Text>
                      {relationship.notes && (
                        <Text style={styles.relationshipNotes}>{relationship.notes}</Text>
                      )}
                      {(relationship.familyInfo.spouse || relationship.familyInfo.kids || relationship.familyInfo.siblings) && (
                        <View style={styles.familyInfo}>
                          <Text style={styles.familyTitle}>Family Information</Text>
                          {relationship.familyInfo.spouse && (
                            <Text style={styles.familyDetail}>Spouse: {relationship.familyInfo.spouse}</Text>
                          )}
                          {relationship.familyInfo.kids && (
                            <Text style={styles.familyDetail}>Kids: {relationship.familyInfo.kids}</Text>
                          )}
                          {relationship.familyInfo.siblings && (
                            <Text style={styles.familyDetail}>Siblings: {relationship.familyInfo.siblings}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              }
              return null;
            })()}

            {/* Interaction History */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Recent Interactions</Text>
              {(() => {
                const contactInteractions = interactions
                  .filter(i => i.contactId === selectedContact.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5);

                if (contactInteractions.length === 0) {
                  return (
                    <Text style={styles.noInteractions}>No interactions recorded</Text>
                  );
                }

                return contactInteractions.map((interaction, index) => (
                  <View key={index} style={styles.interactionItem}>
                    <View style={styles.interactionIcon}>
                      {interaction.type === 'call' && <Phone size={14} color="#3B82F6" />}
                      {interaction.type === 'message' && <MessageCircle size={14} color="#10B981" />}
                      {interaction.type === 'email' && <Mail size={14} color="#F97316" />}
                      {interaction.type === 'whatsapp' && <MessageSquare size={14} color="#25D366" />}
                      {interaction.type === 'linkedin_search' && <Linkedin size={14} color="#0077B5" />}
                      {interaction.type === 'twitter_search' && <Twitter size={14} color="#1DA1F2" />}
                      {interaction.type === 'marked_contacted' && <CheckCircle size={14} color="#10B981" />}
                    </View>
                    <View style={styles.interactionDetails}>
                      <Text style={styles.interactionType}>
                        {interaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={styles.interactionDate}>{formatDate(interaction.date)}</Text>
                    </View>
                  </View>
                ));
              })()}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.primaryActionButton}
                onPress={() => {
                  setShowContactDetail(false);
                  showContactActions(selectedContact);
                }}
              >
                <Text style={styles.primaryActionButtonText}>Get in Touch</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderActionModal = () => (
    <Modal visible={showActionModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.actionModalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Contact {selectedContact?.name}</Text>
          <TouchableOpacity onPress={() => setShowActionModal(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.actionContent}>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleCall(selectedContact);
              }}
            >
              <Phone size={24} color="#3B82F6" />
              <Text style={styles.actionOptionText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleMessage(selectedContact);
              }}
            >
              <MessageCircle size={24} color="#10B981" />
              <Text style={styles.actionOptionText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleWhatsApp(selectedContact);
              }}
            >
              <MessageSquare size={24} color="#25D366" />
              <Text style={styles.actionOptionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleEmail(selectedContact);
              }}
            >
              <Mail size={24} color="#F97316" />
              <Text style={styles.actionOptionText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleFindOnLinkedIn(selectedContact);
              }}
            >
              <Linkedin size={24} color="#0077B5" />
              <Text style={styles.actionOptionText}>Find on LinkedIn</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && handleFindOnX(selectedContact);
              }}
            >
              <Twitter size={24} color="#1DA1F2" />
              <Text style={styles.actionOptionText}>Find on X</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowActionModal(false);
                selectedContact && markAsContacted(selectedContact);
              }}
            >
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.actionOptionText}>Mark as Contacted</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <Text style={styles.subtitle}>{filteredContacts.length} contacts</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.content}>
        {filteredContacts.length > 0 ? (
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <User size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No contacts found' : 'No contacts available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? `No contacts match "${searchQuery}"`
                : 'Allow contact access to see your contacts here'
              }
            </Text>
          </View>
        )}
      </View>

      {renderContactDetail()}
      {renderActionModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 20,
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
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  contactCard: {
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
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  relationshipTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  relationshipTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationshipTagText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  lastInteraction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lastInteractionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  getInTouchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  getInTouchText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
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
  detailContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  detailSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  contactDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  relationshipInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
  },
  relationshipDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  relationshipNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  familyInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  familyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  familyDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  noInteractions: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  interactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionDetails: {
    flex: 1,
  },
  interactionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  interactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtonsContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  primaryActionButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  actionContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 16,
  },
  actionOption: {
    width: '45%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});