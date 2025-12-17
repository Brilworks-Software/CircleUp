import { Pressable } from "react-native";
import Analytics from "../Analytics";

export function registerButtonTracking() {
    try {
        // Safety check: Ensure Pressable exists
        if (!Pressable) return;

        // Check for prototype.render (Class component)
        // @ts-ignore
        if (Pressable.prototype && Pressable.prototype.render) {
            // @ts-ignore
            const orig = Pressable.prototype.render;
            // @ts-ignore
            Pressable.prototype.render = function (...args: any[]) {
                const props = this.props;
                const originalPress = props.onPress;

                if (originalPress) {
                    props.onPress = (...args2: any[]) => {
                        Analytics.log("button_press", {
                            target: props.accessibilityLabel || props.testID || "unknown_button",
                        });
                        originalPress(...args2);
                    };
                }
                return orig.apply(this, args);
            };
            return;
        }

        // Check if it is a functional component with 'render' (ForwardRef sometimes exposes this on the wrapper)
        // @ts-ignore
        if ((Pressable as any).render) {
            console.log("[Analytics] Pressable seems to be a functional component or ForwardRef. Monkey-patching not fully supported safely.");
            // Attempting to patch direct render property if it exists and is writable
            // but typically this is not recommended/possible for simple functional components without a higher abstraction
        }

    } catch (e) {
        console.warn("[Analytics] Failed to initialize Button tracking:", e);
    }
}
