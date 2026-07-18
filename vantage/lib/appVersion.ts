// A single honest string for "which build is this?" — shown in the Bag footer so
// you can glance at your phone and know whether it's the newest build (no more
// asking). `nativeApplicationVersion` is the app.json version ("1.0.0");
// `nativeBuildVersion` is the per-build number (Android versionCode), which now
// auto-increments on every EAS preview build — so it's the value that actually
// changes build-to-build. Both are null on web / Expo Go (no native binary).
import * as Application from "expo-application";

export function buildLabel(): string {
  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const build = Application.nativeBuildVersion;
  return build ? `v${version} (build ${build})` : `v${version} · dev`;
}
