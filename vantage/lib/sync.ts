// App ↔ cloud sync. On launch the app signs in anonymously (a lightweight auth
// identity so RLS can scope data to this device), then mirrors the gear profile
// up to Supabase so the server-side nudge can decide + push when the app is closed.
import { supabase } from "./supabase";

// Ensure a session exists — anonymous sign-in on first launch, reused after.
export async function ensureSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[sync] anonymous sign-in failed:", error.message);
    return null;
  }
  return data.user?.id ?? null;
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Mirror the current gear profile (+ timezone) up to the cloud. Best-effort.
export async function saveProfile(cameraId: string, lensIds: string[]): Promise<void> {
  const id = await ensureSession();
  if (!id) return;
  const { error } = await supabase.from("profiles").upsert({
    id,
    camera_id: cameraId,
    lens_ids: lensIds,
    timezone: deviceTimezone(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("[sync] saveProfile failed:", error.message);
  else console.log("[sync] profile saved:", cameraId, lensIds.join(","));
}

// Save this device's push token onto its profile row (so the backend can nudge it).
export async function savePushToken(token: string): Promise<void> {
  const id = await ensureSession();
  if (!id) return;
  const { error } = await supabase.from("profiles").update({ push_token: token }).eq("id", id);
  if (error) console.warn("[sync] savePushToken failed:", error.message);
  else console.log("[sync] push token saved");
}
