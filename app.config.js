import 'dotenv/config';

export default {
  expo: {
    name: 'circle-up',
    slug: 'circle-up',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.brilworks.circleUp',
      config: {
        usesNonExemptEncryption: false,
      },
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSContactsUsageDescription:
          'We use your contacts to sync your friends and connections between our mobile and web apps. Contacts will be securely uploaded to our server only with your consent.',
      },
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        NSContactsUsageDescription: "CircleUp needs access to your contacts to help you manage relationships, track interactions, and set reminders for staying connected with the people who matter to you."
      }
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/images/icon.png',
          imageWidth: 200,
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    android: {
      package: 'com.brilworks.circleUp',
      googleServicesFile: './google-services.json',
    },
    extra: {
      // Firebase configuration from environment variables
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,

      eas: {
        projectId: "e192a659-fba6-49e5-b3fa-501e337889c5"
      }
    },
    updates: {
      url: "https://u.expo.dev/e192a659-fba6-49e5-b3fa-501e337889c5"
    },
    runtimeVersion: {
      policy: "appVersion"
    }
  }
};
