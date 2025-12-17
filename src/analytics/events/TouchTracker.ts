import { Gesture } from "react-native-gesture-handler";
import Analytics from "../Analytics";

export function createTouchGesture() {
    return Gesture.Tap()
        .onTouchesDown(() => {
            Analytics.log("touch_event", { type: "start" });
        })
        .onEnd(() => {
            Analytics.log("touch_event", { type: "end" });
        });
}
