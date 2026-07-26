import React from "react";
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable } from "react-native";
import { colors, fonts, screen } from "../theme";
import { findSpot, spotImageSource, windowMeta, type Spot } from "../lib/spots";
import { fitGapLabel } from "../lib/gearProfile";
import type { LensSpec } from "../lib/gear";

// When a card falls: `offset` = N days from today; `dow` = the next occurrence of a
// weekday (0=Sun). Event-anchored spots use `dow` so "the Sunday market" really lands
// on a Sunday and "Friday art walk" on a Friday — no more hand-typed labels drifting
// out of sync with the calendar. (Near-term #P1 fix; longer-term the week comes from
// the nudge brain over the next several days' light.)
type When = { offset: number } | { dow: number };
type PlanMeta = { id: string; when: When; tag: string; reason: string };
const PLAN: PlanMeta[] = [
  { id: "sweetauburn", when: { offset: 0 }, tag: "The light", reason: "Golden light straight down Auburn Ave." },
  { id: "krog", when: { dow: 0 }, tag: "The crowd", reason: "The Sunday market crowd fills the strip." },
  { id: "jackson", when: { offset: 3 }, tag: "The light", reason: "Clear skies line up behind the towers." },
  { id: "ponce", when: { dow: 5 }, tag: "Happening", reason: "BeltLine art walk after work." },
];
const tagColor = (t: string) => (t === "Happening" ? colors.crowdHigh : t === "The crowd" ? colors.flat : colors.golden);

export function PlanScreen({ spots, going, cameraId, lenses, windowTimeFor, onOpen, onToggleGoing }: {
  spots: Spot[]; going: string[]; cameraId: string; lenses: LensSpec[]; windowTimeFor: (t: string) => string; onOpen: (id: string) => void; onToggleGoing: (id: string) => void;
}) {
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateFor = (w: When) => {
    const d = new Date(today0);
    if ("offset" in w) d.setDate(d.getDate() + w.offset);
    else d.setDate(d.getDate() + ((w.dow - d.getDay() + 7) % 7));
    return d;
  };
  const dayLabel = (d: Date) => {
    const dow = d.toLocaleDateString("en-US", { weekday: "short" });
    if (d.getTime() === today0.getTime()) return `Tonight · ${dow}`;
    if (d.getTime() === today0.getTime() + 86400000) return `Tomorrow · ${dow}`;
    return dow;
  };
  const week = PLAN.map((m) => ({ ...m, date: dateFor(m.when) })).sort((a, b) => a.date.getTime() - b.date.getTime());
  return (
    <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical overScrollMode="always">
      <Text style={styles.eyebrow}>YOUR PLAN · {going.length} GOING</Text>
      <Text style={styles.title}>This week</Text>

      <View style={{ gap: 26 }}>
        {week.map((m) => {
          const spot = findSpot(spots, m.id);
          const wm = windowMeta(spot.windowType);
          const on = going.includes(m.id);
          const fitGap = fitGapLabel(cameraId, lenses, spot.genre); // only shows when the kit falls short (#P3)
          return (
            <View key={m.id}>
              <View style={styles.dayRow}>
                <Text style={styles.dayLabel}>{dayLabel(m.date).toUpperCase()}</Text>
                <View style={styles.dayLine} />
              </View>
              <View style={styles.card}>
                <Pressable style={({ pressed }) => [styles.cardTop, pressed && { opacity: 0.7 }]} onPress={() => onOpen(m.id)}>
                  <ImageBackground source={spotImageSource(spot)} style={styles.thumb} imageStyle={{ borderRadius: 13 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.tag, { color: tagColor(m.tag) }]}>{m.tag.toUpperCase()}</Text>
                    <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>
                    <Text style={styles.reason} numberOfLines={1}>{m.reason}</Text>
                    <View style={styles.meta}>
                      <Text style={[styles.window, { color: wm.color }]}>{wm.icon} {wm.label} · {windowTimeFor(spot.windowType)}</Text>
                      {fitGap && <Text style={styles.fit}>{fitGap}</Text>}
                    </View>
                  </View>
                </Pressable>
                {/* Secondary, compact outline pill (#P2) — solid gold is reserved for
                    the one primary CTA (the Today hero), so four cards don't each shout. */}
                <View style={styles.goWrap}>
                  <Pressable onPress={() => onToggleGoing(m.id)} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.goPill, on ? styles.goPillOn : styles.goPillOff, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.goPillText, { color: on ? colors.crowdLow : colors.golden }]}>{on ? "✓ Going" : "I'm going"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: screen.padTop, paddingHorizontal: screen.padSide, paddingBottom: 118 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, marginTop: 6, marginBottom: 24 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  dayLabel: { color: colors.muted3, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.6 },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface },
  cardTop: { flexDirection: "row", gap: 13, padding: 13 },
  thumb: { width: 82, height: 82 },
  tag: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 0.4 },
  name: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, marginTop: 3 },
  reason: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 13, marginTop: 3 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  window: { fontFamily: fonts.sansSemi, fontSize: 12 },
  fit: { color: colors.golden, fontFamily: fonts.sansMed, fontSize: 12 },
  goWrap: { paddingHorizontal: 13, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.hairline, alignItems: "flex-start" },
  goPill: { paddingVertical: 7, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
  goPillOff: { borderColor: "rgba(233,184,114,0.5)", backgroundColor: "rgba(233,184,114,0.08)" },
  goPillOn: { borderColor: "rgba(127,176,122,0.5)", backgroundColor: "rgba(127,176,122,0.14)" },
  goPillText: { fontFamily: fonts.sansSemi, fontSize: 13 },
});
