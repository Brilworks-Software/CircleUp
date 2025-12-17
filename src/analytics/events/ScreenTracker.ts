import Analytics from "../Analytics";

let currentScreen: string | null = null;
let screenStart: number | null = null;

export function trackScreenView(name: string) {
    // If we were already on a screen, log the duration we spent there
    if (currentScreen && screenStart) {
        const duration = Date.now() - screenStart;
        Analytics.log("time_on_screen", {
            screen: currentScreen,
            duration_ms: duration,
        });
    }

    currentScreen = name;
    screenStart = Date.now();

    Analytics.log("screen_view", { screen: name });
}
