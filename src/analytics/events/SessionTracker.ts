import { AppState, AppStateStatus } from "react-native";
import Analytics from "../Analytics";

let lastState: AppStateStatus = "active";

export function registerSessionTracking() {
    Analytics.log("session_start");

    AppState.addEventListener("change", (next: AppStateStatus) => {
        if (lastState === "active" && next.match(/inactive|background/)) {
            Analytics.log("session_end");
        }
        if (next === "active" && lastState !== "active") {
            Analytics.log("session_start");
        }
        lastState = next;
    });
}
