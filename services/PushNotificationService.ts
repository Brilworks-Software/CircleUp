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

export async function updateUserFCMToken() {
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

    // Update the user's FCM token in Firestore
    await UsersService.updateUser(currentUser.uid, { fcmToken: token });
    console.log('FCM token updated successfully for user:', currentUser.uid);
  } catch (error) {
    console.error('Error updating FCM token:', error);
  }
}


