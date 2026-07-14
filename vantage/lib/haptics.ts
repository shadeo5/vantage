// Thin haptics wrapper (part of the on-device pass) — native-feel feedback on the
// moments that matter: committing to a shoot, switching tabs, toggling a save. All
// no-ops on web (expo-haptics only fires on iOS/Android), and every call is
// fire-and-forget with failures swallowed so haptics can never break an interaction.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

// A light tick — tab switches, chip/selection toggles.
export function tapFeedback(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

// A firmer bump — committing ("I'm going"), the primary CTA.
export function commitFeedback(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
