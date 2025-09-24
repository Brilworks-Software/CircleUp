import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import firestore, { getFirestore } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Access the Firebase instances
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const realtimeDb = database();

export { app, auth, db, firestore, realtimeDb, storage };
