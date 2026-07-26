import type { EdgeInsets } from "react-native-safe-area-context";

// Safe-area padding helpers. On a real device we clear the actual status-bar /
// notch / home-indicator inset and add the design's breathing `gap`. Where
// there's no inset (the web preview reports 0), we fall back to the original
// fixed value so that layout still looks intentional there.
//
// Centralised so the top/bottom formula lives in exactly one place — screens,
// the bottom nav, and the detail action bar all read from here rather than each
// re-deriving "inset + a magic number".

export const safeTop = (insets: EdgeInsets, gap: number, web: number): number =>
  insets.top ? insets.top + gap : web;

export const safeBottom = (insets: EdgeInsets, gap: number, web: number): number =>
  insets.bottom ? insets.bottom + gap : web;
