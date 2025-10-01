import * as Notifications from "expo-notifications";
import { getDevicePushTokenAsync } from "expo-notifications";
import { Platform } from "react-native";
import { authService } from "../firebase/services/AuthService";
import UsersService from "../firebase/services/UserService";

export async function registerForPushNotificationsAsync() {
  let token;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token!");
    return null;
  }

  // token = (await Notifications.getExpoPushTokenAsync({
  //   projectId: "e192a659-fba6-49e5-b3fa-501e337889c5"
  // })).data;
  token = (await getDevicePushTokenAsync()).data;
  console.log("Expo Push Token:", token);

  return token;
}

export async function addUserFCMToken() {
  try {
    // Only run on mobile platforms
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web platform');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.log('No authenticated user found');
      return;
    }

    // Get the push notification token
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      console.log('Failed to get push notification token');
      return;
    }

    // Add the FCM token to user's token list in Firestore
    await UsersService.addFCMToken(currentUser.uid, token);
    console.log('FCM token added successfully for user:', currentUser.uid);
  } catch (error) {
    console.error('Error adding FCM token:', error);
  }
}

export async function removeUserFCMToken() {
  try {
    // Only run on mobile platforms
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web platform');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.log('No authenticated user found');
      return;
    }

    // Get the current push notification token
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      console.log('Failed to get push notification token');
      return;
    }

    // Remove the FCM token from user's token list in Firestore
    await UsersService.removeFCMToken(currentUser.uid, token);
    console.log('FCM token removed successfully for user:', currentUser.uid);
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
}

export async function clearUserFCMTokens() {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.log('No authenticated user found');
      return;
    }

    // Clear all FCM tokens for the user
    await UsersService.clearFCMTokens(currentUser.uid);
    console.log('All FCM tokens cleared successfully for user:', currentUser.uid);
  } catch (error) {
    console.error('Error clearing FCM tokens:', error);
  }
}
