// Supabase client for the app. Uses the PUBLIC anon key (safe to ship — every row
// is protected by Row Level Security). React Native needs the URL polyfill and
// AsyncStorage for session persistence (per Supabase's RN setup docs).
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no URL-based auth callback in a native app
  },
});
