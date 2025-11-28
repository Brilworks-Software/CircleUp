import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; 
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
  
 
// Firebase configuration from Expo Constants
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let messaging;

// Initialize Firebase services
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  
    // 💡 Only call initializeAuth immediately after app initialization
    if (Platform.OS === 'web') {
      auth = getAuth(app); // Web: No persistence needed here
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } else {
    app = getApp();
    auth = getAuth(app); // Don't call initializeAuth again here!
  }
  const db = getFirestore(app);
  const storage = getStorage(app);
  if (Platform.OS === 'web') {
    const {getMessaging} = require('firebase/messaging');
    messaging = getMessaging(app);
  }
export { app, auth, db, storage, messaging };
