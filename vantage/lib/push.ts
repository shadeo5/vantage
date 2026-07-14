// Push-notification registration (N2). Gets this device's Expo push token so the
// backend can nudge it. No-op on web / simulators (real tokens need a physical
// device + a dev build). Android also needs a notification channel + FCM creds
// in the build. Pattern per Expo SDK 57 docs.
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Show notifications while the app is foregrounded, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Ask permission + return this device's Expo push token, or null if unavailable.
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators & web can't receive push

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Nudges",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] no EAS projectId — run `eas init` first");
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (e) {
    console.warn("[push] getExpoPushTokenAsync failed:", String(e));
    return null;
  }
}
