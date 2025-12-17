import { getAnalytics, logEvent, logScreenView, setUserId, setUserProperties } from '@react-native-firebase/analytics';
import { app } from '../firebase/config';

const analyticsInstance = getAnalytics(app);

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
            await logEvent(analyticsInstance, eventName, params);
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
            await setUserId(analyticsInstance, userId);
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
            await setUserProperties(analyticsInstance, properties);
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
            await logScreenView(analyticsInstance, {
                screen_name: screenName,
                screen_class: screenClass,
            });
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
