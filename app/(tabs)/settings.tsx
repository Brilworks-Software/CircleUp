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
  CheckCircle
} from 'lucide-react-native';
import { useAuth } from '../../firebase/hooks/useAuth';
import NotificationService from '../../services/NotificationService';

export default function SettingsScreen() {
  const { currentUser, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      const enabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setIsLoading(true);
      const notificationService = NotificationService.getInstance();
      
      if (value) {
        const initialized = await notificationService.initialize();
        if (initialized) {
          setNotificationsEnabled(true);
          Alert.alert('Success', 'Notifications enabled successfully!');
        } else {
          Alert.alert('Error', 'Failed to enable notifications. Please check your device settings.');
        }
      } else {
        await notificationService.cancelAllNotifications();
        setNotificationsEnabled(false);
        Alert.alert('Success', 'Notifications disabled successfully!');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    // TODO: Implement dark mode functionality
    Alert.alert('Coming Soon', 'Dark mode will be available in a future update.');
  };

  const handleSignOut = () => {
    Alert.alert(
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
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenSettings = () => {
    Alert.alert(
      'Device Settings',
      'To manage notification permissions, please go to your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handleTestNotifications = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      const testTime = new Date(Date.now() + 5000); // 5 seconds from now
      
      const notificationId = await notificationService.scheduleNotificationForDateTime(
        `test_${Date.now()}`,
        'Test Notification',
        'This is a test notification from CircleUp!',
        testTime,
        { type: 'test' }
      );
      
      if (notificationId) {
        Alert.alert('Success', 'Test notification scheduled! You should receive it in 5 seconds.');
      } else {
        Alert.alert('Error', 'Failed to schedule test notification.');
      }
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification.');
    }
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    showChevron = true 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Icon size={20} color="#6B7280" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
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
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be available soon.')}
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
            onPress={() => Alert.alert('Help Center', 'Help center will be available soon.')}
          />
          <SettingItem
            icon={Info}
            title="About"
            subtitle="App version and information"
            onPress={() => Alert.alert('About', 'CircleUp v1.0.0\nBuilt with React Native and Expo')}
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
});
