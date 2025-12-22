
import { app } from '../../firebase/config';
import {analyticsService} from "../../services/AnalyticsService"


class Analytics {
    static async log(event: string, payload: Record<string, any> = {}) {
        const timestamp = Date.now();
        console.log(`[ANALYTICS] ${event}:`, payload);

        try {
            // Handle special cases and reserved event names
            if (event === 'screen_view') {
                const screenName = payload.screen || 'unknown_screen';
                const screenClass = payload.screen_class || screenName;
                 analyticsService.logEvent('screen_view', {
                    screen_name: screenName,
                    screen_class: screenClass,
                });
            } else if (event === 'session_start') {
                // Firebase handles session_start automatically.
                // We can log a custom event if we want to track our specific logic.
                 analyticsService.logEvent('custom_session_start', payload);
            } else {
                // Send to Firebase Analytics for other events
                 analyticsService.logEvent(event, payload);
            }
        } catch (error) {
            console.error('[ANALYTICS] Failed to log event to Firebase:', error);
        }
    }
}

export default Analytics;
