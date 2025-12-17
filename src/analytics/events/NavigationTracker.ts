import Analytics from "../Analytics";
import { NavigationContainerRef } from "@react-navigation/native";

export function registerNavigationTracking(navRef: NavigationContainerRef<any>) {
    if (!navRef) return;

    navRef.addListener("state", () => {
        const route = navRef.getCurrentRoute();
        if (route) {
            Analytics.log("navigation_action", {
                screen: route.name,
                params: route.params,
            });
        }
    });
}
