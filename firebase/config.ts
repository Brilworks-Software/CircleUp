import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
  
 
// Firebase configuration from Expo Constants
const firebaseConfig = {
  apiKey: "AIzaSyDGBdd61kRdK_N_c7quJZxd7t4EywkGyAE",
  authDomain: "backend-in7gy7.firebaseapp.com",
  projectId: "backend-in7gy7",
  storageBucket: "backend-in7gy7.firebasestorage.app",
  messagingSenderId: "708438594834",
  appId: "1:708438594834:web:c4528a3e617effba154fcb"
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
