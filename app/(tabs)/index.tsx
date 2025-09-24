import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Users, Bell, TrendingUp, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../firebase/hooks/useAuth';
import { useUser } from '../../firebase/hooks/useUser';

interface BusinessCard {
  fullName: string;
  about: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
}

interface Stats {
  totalReminders: number;
  totalRelationships: number;
}

export default function HomeScreen() {
  const { currentUser, signOut } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(currentUser?.uid || '');
  
  const [businessCard, setBusinessCard] = useState<BusinessCard>({
    fullName: '',
    about: '',
    company: '',
    jobTitle: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    notes: '',
  });
  const [stats, setStats] = useState<Stats>({ totalReminders: 0, totalRelationships: 0 });
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  // Update business card when user profile loads
  useEffect(() => {
    if (userProfile && !isLoadingProfile) {
      setBusinessCard(prev => ({
        ...prev,
        fullName: userProfile.name || prev.fullName,
        email: userProfile.email || prev.email,
        phone: userProfile.phone || prev.phone,
      }));
    }
  }, [userProfile, isLoadingProfile]);

  const initializeApp = async () => {
    try {
      await requestContactsPermission();
      await loadBusinessCard();
      await loadStats();
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // User will be automatically redirected by auth state change
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setHasContactPermission(true);
        await importContacts();
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

  const importContacts = async () => {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      await AsyncStorage.setItem('imported_contacts', JSON.stringify(data));
    } catch (error) {
      console.error('Error importing contacts:', error);
    }
  };

  const loadBusinessCard = async () => {
    try {
      const savedCard = await AsyncStorage.getItem('business_card');
      if (savedCard) {
        setBusinessCard(JSON.parse(savedCard));
      } else if (userProfile) {
        // Initialize business card with user profile data
        setBusinessCard(prev => ({
          ...prev,
          fullName: userProfile.name || '',
          email: userProfile.email || '',
          phone: userProfile.phone || '',
        }));
      }
    } catch (error) {
      console.error('Error loading business card:', error);
    }
  };

  const loadStats = async () => {
    try {
      const reminders = await AsyncStorage.getItem('reminders');
      const relationships = await AsyncStorage.getItem('relationships');
      setStats({
        totalReminders: reminders ? JSON.parse(reminders).length : 0,
        totalRelationships: relationships ? JSON.parse(relationships).length : 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveBusinessCard = async () => {
    try {
      await AsyncStorage.setItem('business_card', JSON.stringify(businessCard));
      Alert.alert('Success', 'Business card saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save business card.');
    }
  };

  const handleInputChange = (field: keyof BusinessCard, value: string) => {
    setBusinessCard(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || isLoadingProfile) {
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
                Welcome Back{userProfile?.fullName ? `, ${userProfile.fullName.split(' ')[0]}` : ''}
              </Text>
              <Text style={styles.subtitle}>Manage your connections</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => router.push('/(tabs)/reminders')}
          >
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{stats.totalReminders}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/relationships')}
          >
            <Users size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.totalRelationships}</Text>
            <Text style={styles.statLabel}>Relationships</Text>
          </TouchableOpacity>
        </View>

        {/* Business Card Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Your Business Card</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={businessCard.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>About/Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={businessCard.about}
                onChangeText={(value) => handleInputChange('about', value)}
                placeholder="Tell us about yourself"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={businessCard.company}
                  onChangeText={(value) => handleInputChange('company', value)}
                  placeholder="Company name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                <Text style={styles.label}>Job Title</Text>
                <TextInput
                  style={styles.input}
                  value={businessCard.jobTitle}
                  onChangeText={(value) => handleInputChange('jobTitle', value)}
                  placeholder="Your position"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={businessCard.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={businessCard.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  placeholder="Phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={businessCard.website}
                onChangeText={(value) => handleInputChange('website', value)}
                placeholder="https://yourwebsite.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={businessCard.address}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder="Your address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={businessCard.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                placeholder="Additional notes"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveBusinessCard}>
              <Plus size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Business Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/relationships')}
            >
              <Users size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Add Relationship</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/reminders')}
            >
              <Bell size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Set Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
});