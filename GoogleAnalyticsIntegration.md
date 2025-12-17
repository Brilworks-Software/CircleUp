# Google Analytics Integration Guide (React Native Firebase Modular SDK)

This guide documents the integration of Google Analytics (GA4) into the CircleUp application using the **React Native Firebase Modular SDK**.

## 1. Prerequisites & Installation

Ensure you have the necessary Firebase packages installed.

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
# or
yarn add @react-native-firebase/app @react-native-firebase/analytics
```

For iOS, remember to install pods:
```bash
npx pod-install
```

## 2. Firebase Configuration

Initialize the Firebase App instance. This is typically done in `firebase/config.ts`.

```typescript
// firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from '@react-native-firebase/analytics';

const firebaseConfig = {
  // ... your firebase config from google-services.json / GoogleService-Info.plist
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };
```

## 3. Analytics Service (Wrapper)

We use a centralized service `services/AnalyticsService.ts` to handle all analytics interactions. This abstracts the underlying SDK and allows for easier maintenance and type safety.

**Key Features:**
- Uses **Modular SDK** methods: `getAnalytics`, `logEvent`, `logScreenView`, `setUserId`.
- Provides specific methods for common actions (`logBeginCheckout`, `logAddActivityClick`).
- Handles error logging consistently.

```typescript
// services/AnalyticsService.ts
import { getAnalytics, logEvent, logScreenView, setUserId, setUserProperties } from '@react-native-firebase/analytics';
import { app } from '../firebase/config';

const analyticsInstance = getAnalytics(app);

class AnalyticsService {
    async logEvent(eventName: string, params?: Record<string, any>) {
        try {
            await logEvent(analyticsInstance, eventName, params);
        } catch (error) {
            console.error(`[Analytics] Failed to log event: ${eventName}`, error);
        }
    }

    async logScreenView(screenName: string, screenClass?: string) {
        await logScreenView(analyticsInstance, {
            screen_name: screenName,
            screen_class: screenClass,
        });
    }
    
    // ... other helper methods
}

export const analyticsService = new AnalyticsService();
```

## 4. Automatic Tracking Implementation

The application implements automatic tracking for several key metrics:

### A. Screen Tracking
Located in `src/analytics/events/ScreenTracker.ts`. 
- Hooks into the Navigation Container state.
- Tracks `screen_view` events automatically when the route changes.
- Tracks `time_on_screen` by calculating the duration between screen mounts and unmounts/transitions.

### B. Session Tracking
Located in `src/analytics/events/SessionTracker.ts`.
- Listens to `AppState` changes (active/background).
- Logs `session_start` and `session_end` events.

### C. Interaction Tracking
- **Buttons**: `ButtonTracker.ts` attempts to monkey-patch `Pressable` to catch all button taps automatically (Note: Use with caution as this touches React Native internals).
- **Touches**: `TouchTracker.ts` uses `GestureDetector` to track global touch events (heatmap data potential).

### Initialization
All trackers are initialized in the root layout `app/_layout.tsx`:

```typescript
// app/_layout.tsx
import { registerSessionTracking } from '@/src/analytics/events/SessionTracker';
import { registerButtonTracking } from '@/src/analytics/events/ButtonTracker';
import { trackScreenView } from '@/src/analytics/events/ScreenTracker';

export default function RootLayout() {
  // ...
  useEffect(() => {
    registerSessionTracking();
    registerButtonTracking();

    const unsubscribe = navRef.addListener("state", () => {
       const route = navRef.getCurrentRoute();
       if(route) trackScreenView(route.name);
    });

    return () => unsubscribe();
  }, [navRef]);
  // ...
}
```

## 5. Usage in Components

To track custom events within your components, import and use the `analyticsService`.

```typescript
import { analyticsService } from '@/services/AnalyticsService';

const handlePurchase = async () => {
  // Perform logic...
  
  // Log event
  await analyticsService.logEvent('purchase_completed', {
    item_id: '123',
    value: 99.99,
    currency: 'USD'
  });
};
```

## 6. Migration Note (v22+)

We have migrated to the **Modular SDK** schema to resolve deprecation warnings from `@react-native-firebase/analytics` v22+.

**Old (Deprecated):**
```typescript
import analytics from '@react-native-firebase/analytics';
await analytics().logEvent(...);
```

**New (Modular):**
```typescript
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import { app } from '../firebaseConfig';

const instance = getAnalytics(app);
await logEvent(instance, ...);
```
