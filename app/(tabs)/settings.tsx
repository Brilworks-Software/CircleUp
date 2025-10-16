import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Linking,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  User, 
  Shield, 
  HelpCircle, 
  Info, 
  LogOut,
  ChevronRight,
  CheckCircle,
  Trash2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../firebase/hooks/useAuth';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    
    if (buttons.length === 2 && buttons[0].text === 'Cancel' && buttons[1].text === 'Sign Out') {
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

export default function SettingsScreen() {
  const { currentUser, signOut, deleteAccount, isDeletingAccount, reauthenticate } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isReauthLoading, setIsReauthLoading] = useState(false);


  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    // TODO: Implement dark mode functionality
    showAlert('Coming Soon', 'Dark mode will be available in a future update.');
  };

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              showAlert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, relationships, and reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Show second confirmation
            showAlert(
              'Final Confirmation',
              'This will permanently delete your account and all data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand, Delete',
                  style: 'destructive',
                  onPress: () => {
                    // Always require re-authentication for security
                    setShowReauthModal(true);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleReauthAndDelete = async () => {
    if (!password.trim()) {
      showAlert('Error', 'Please enter your password.');
      return;
    }

    try {
      setIsReauthLoading(true);
      await reauthenticate(password);
      await deleteAccount();
      
      // Small delay to ensure account deletion completes, then navigate to auth screen
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 500);
    } catch (error: any) {
      console.error('Error during re-authentication and deletion:', error);
      
      // Handle specific error cases
      if (error.message?.includes('wrong-password') || error.code === 'auth/wrong-password') {
        showAlert('Error', 'Incorrect password. Please try again.');
      } else if (error.message?.includes('invalid-credential') || error.code === 'auth/invalid-credential') {
        showAlert('Error', 'Invalid password. Please check your password and try again.');
      } else {
        showAlert('Error', 'Failed to delete account. Please check your password and try again.');
      }
    } finally {
      setIsReauthLoading(false);
      setShowReauthModal(false);
      setPassword('');
    }
  };

  const handleCancelReauth = () => {
    setShowReauthModal(false);
    setPassword('');
  };


  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    showChevron = true,
    isDestructive = false
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress || isLoading}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Icon size={20} color={isDestructive ? "#EF4444" : "#6B7280"} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, isDestructive && styles.destructiveSubtitle]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && onPress && <ChevronRight size={16} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SettingsIcon size={24} color="#111827" />
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileSection}>
            <View style={styles.profileIcon}>
              <User size={24} color="#3B82F6" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {currentUser?.email || 'User'}
              </Text>
              
            </View>
          </View>
        </View>

        

        {/* Appearance Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <SettingItem
            icon={darkMode ? Moon : Sun}
            title="Dark Mode"
            subtitle="Switch between light and dark themes"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={darkMode ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
        </View> */}

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <SettingItem
            icon={Shield}
            title="Privacy Policy"
            subtitle="Learn how we protect your data"
            onPress={() => showAlert('Privacy Policy', 'Privacy policy will be available soon.')}
          />
          {/* <SettingItem
            icon={Shield}
            title="Data Export"
            subtitle="Export your data"
            onPress={() => Alert.alert('Data Export', 'Data export feature will be available soon.')}
          /> */}
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <SettingItem
            icon={HelpCircle}
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => showAlert('Help Center', 'Help center will be available soon.')}
          />
          <SettingItem
            icon={Info}
            title="About"
            subtitle="App version and information"
            onPress={() => showAlert('About', 'CircleUp v1.0.0\nBuilt with React Native and Expo')}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            icon={LogOut}
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            showChevron={false}
          />
          <SettingItem
            icon={Trash2}
            title="Delete Account"
            subtitle="Permanently delete your account and all data"
            onPress={handleDeleteAccount}
            showChevron={false}
            isDestructive={true}
          />
        </View>
      </ScrollView>

      {/* Re-authentication Modal */}
      <Modal
        visible={showReauthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelReauth}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Security Verification Required</Text>
            <Text style={styles.modalMessage}>
              For your security, please enter your current password to confirm account deletion. This ensures only you can delete your account.
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoFocus={true}
              editable={!isReauthLoading}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelReauth}
                disabled={isReauthLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleReauthAndDelete}
                disabled={isReauthLoading || !password.trim()}
              >
                <Text style={styles.deleteButtonText}>
                  {isReauthLoading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destructiveText: {
    color: '#EF4444',
  },
  destructiveSubtitle: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
