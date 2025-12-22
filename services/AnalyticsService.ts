import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
} from 'firebase/analytics';
import { app, analyticsInstance } from '../firebase/config';
import { Platform } from 'react-native';


// Import React Native Firebase Analytics for mobile platforms (modular API)
let nativeAnalytics: any = null;
let getAnalyticsRNFB: (() => any) | null = null;
let setUserIdRNFB:
  | ((analytics: any, userId: string | null) => Promise<void>)
  | null = null;
let setUserPropertyRNFB:
  | ((analytics: any, name: string, value: string | null) => Promise<void>)
  | null = null;
let logEventRNFB:
  | ((
      analytics: any,
      eventName: string,
      params?: Record<string, any>
    ) => Promise<void>)
  | null = null;
let setAnalyticsCollectionEnabledRNFB:
  | ((analytics: any, enabled: boolean) => Promise<void>)
  | null = null;

let logScreenViewRNFB:
  | ((
      analytics: any,
      screenName: string,
      screenClass?: string
    ) => Promise<void>)
  | null = null;
if (Platform.OS !== 'web') {
  try {
    const analyticsModule = require('@react-native-firebase/analytics');
    // Use modular API (available in v23+)
    if (
      analyticsModule.getAnalytics &&
      analyticsModule.setUserId &&
      analyticsModule.setUserProperty &&
      analyticsModule.logEvent &&
      analyticsModule.logScreenView
    ) {
      getAnalyticsRNFB = analyticsModule.getAnalytics;
      setUserIdRNFB = analyticsModule.setUserId;
      setUserPropertyRNFB = analyticsModule.setUserProperty;
      logEventRNFB = analyticsModule.logEvent;
      setAnalyticsCollectionEnabledRNFB =
        analyticsModule.setAnalyticsCollectionEnabled;
      logScreenViewRNFB = analyticsModule.logScreenView;
      if (getAnalyticsRNFB) {
        nativeAnalytics = getAnalyticsRNFB();
      }
    } else {
      // Fallback to default export (deprecated but still works)
      nativeAnalytics = analyticsModule.default();
    }
  } catch (error) {
    console.warn('@react-native-firebase/analytics not available:', error);
  }
}
/**
 * Service Wrapper for Google Analytics (Firebase)
 * Handles all event logging, user properties, and screen tracking.
 */
class AnalyticsService {
  /**
   * Log a custom event with optional parameters.
   * @param eventName Name of the event (snake_case recommended)
   * @param params Optional parameters for the event
   */
  async logEvent(eventName: string, params?: Record<string, any>) {
    try {
      if (Platform.OS === 'web') {
        logEvent(analyticsInstance, eventName, params);
      } else {
        if (nativeAnalytics) {
          if (logEventRNFB && nativeAnalytics) {
            // Use modular API: logEvent(analytics, eventName, params)
            await logEventRNFB(nativeAnalytics, eventName, params || {});
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.logEvent(eventName, params || {});
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics Event]', eventName, params);
          }
        }
      }
      console.log(`[Analytics] Event: ${eventName}`, params);
    } catch (error) {
      console.error(`[Analytics] Failed to log event: ${eventName}`, error);
    }
  }

  /**
   * Sets the user ID for the current session.
   * @param userId Unique user identifier
   */
  async setUserId(userId: string | null) {
    try {
      if (Platform.OS === 'web') {
        setUserId(analyticsInstance, userId);
      } else {
        if (nativeAnalytics) {
          if (setUserIdRNFB && nativeAnalytics) {
            // Use modular API: setUserId(analytics, userId)
            await setUserIdRNFB(nativeAnalytics, userId);
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.setUserId(userId);
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Set User ID:', userId);
          }
        }
      }
      console.log(`[Analytics] User ID set: ${userId}`);
    } catch (error) {
      console.error(`[Analytics] Failed to set user ID`, error);
    }
  }

  /**
   * Sets user properties for audience segmentation.
   * @param properties Key-value pairs of user properties
   */
  async setUserProperties(properties: Record<string, string | null>) {
    try {
      if (Platform.OS === 'web') {
        setUserProperties(analyticsInstance, properties);
      } else {
        if (nativeAnalytics) {
          for (const [key, value] of Object.entries(properties)) {
            if (setUserPropertyRNFB && nativeAnalytics) {
              // Use modular API: setUserProperty(analytics, name, value)
              await setUserPropertyRNFB(nativeAnalytics, key, value);
            } else {
              // Fallback to deprecated instance method
              await nativeAnalytics.setUserProperty(key, value);
            }
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Set User Properties:', properties);
          }
        }
      }
      console.log(`[Analytics] User Properties set`, properties);
    } catch (error) {
      console.error(`[Analytics] Failed to set user properties`, error);
    }
  }

  /**
   * Logs a screen view manually.
   * Note: Required for Expo Router as generic automatic tracking might not catch specific route names perfectly.
   * @param screenName Name of the screen
   * @param screenClass Class name (usually 'MainActivity' or similar, optional)
   */
  async logScreenView(screenName: string, screenClass?: string) {
    try {
      if (Platform.OS === 'web') {
        await this.logEvent('screen_view', {
          screen_name: screenName,
          screen_class: screenClass,
        });
      } else {
        if (nativeAnalytics) {
          if (logScreenViewRNFB && nativeAnalytics) {
            // Use modular API: logScreenView(analytics, screenName, screenClass)
            await logScreenViewRNFB(
              nativeAnalytics,
                screenName,
                screenClass || 'AppScreen'
            );
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.logScreenView({
                screen_name: screenName,
                screen_class: screenClass || 'AppScreen',
            });
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Screen View:', screenName, screenClass);
          }
        }
      }
      console.log(`[Analytics] Screen View: ${screenName}`);
    } catch (error) {
      console.error(`[Analytics] Failed to log screen view`, error);
    }
  }

  /**
   * Logs the beginning of a checkout/flow (e.g. Sign Up Start)
   */
  async logBeginCheckout(params?: Record<string, any>) {
    await this.logEvent('begin_checkout', params);
  }

  /**
   * Logs specific add_to_cart or similar intent (e.g. Add Activity Click)
   */
  async logAddActivityClick() {
    await this.logEvent('add_activity_click');
  }
}

export const analyticsService = new AnalyticsService();
