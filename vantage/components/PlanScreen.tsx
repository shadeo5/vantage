import React from "react";
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable } from "react-native";
import { colors, fonts, screen } from "../theme";
import { getSpot, img, windowMeta } from "../lib/spots";
import { fitLabel } from "../lib/gearProfile";

type PlanMeta = { id: string; label: string; tag: string; reason: string };
const PLAN: PlanMeta[] = [
  { id: "sweetauburn", label: "Tonight · Sat", tag: "The light", reason: "Golden light straight down Auburn Ave." },
  { id: "krog", label: "Sun", tag: "The crowd", reason: "The Sunday market crowd fills the strip." },
  { id: "jackson", label: "Wed", tag: "The light", reason: "Clear skies line up behind the towers." },
  { id: "ponce", label: "Fri", tag: "Happening", reason: "BeltLine art walk after work." },
];
const tagColor = (t: string) => (t === "Happening" ? colors.crowdHigh : t === "The crowd" ? colors.flat : colors.golden);

export function PlanScreen({ going, cameraId, lensIds, windowTimeFor, onOpen, onToggleGoing }: {
  going: string[]; cameraId: string; lensIds: string[]; windowTimeFor: (t: string) => string; onOpen: (id: string) => void; onToggleGoing: (id: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR PLAN · {going.length} GOING</Text>
      <Text style={styles.title}>This week</Text>

      <View style={{ gap: 26 }}>
        {PLAN.map((m) => {
          const spot = getSpot(m.id);
          const wm = windowMeta(spot.windowType);
          const on = going.includes(m.id);
          return (
            <View key={m.id}>
              <View style={styles.dayRow}>
                <Text style={styles.dayLabel}>{m.label.toUpperCase()}</Text>
                <View style={styles.dayLine} />
              </View>
              <View style={styles.card}>
                <Pressable style={styles.cardTop} onPress={() => onOpen(m.id)}>
                  <ImageBackground source={img(spot.img)} style={styles.thumb} imageStyle={{ borderRadius: 13 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.tag, { color: tagColor(m.tag) }]}>{m.tag.toUpperCase()}</Text>
                    <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>
                    <Text style={styles.reason} numberOfLines={1}>{m.reason}</Text>
                    <View style={styles.meta}>
                      <Text style={[styles.window, { color: wm.color }]}>{wm.icon} {wm.label} · {windowTimeFor(spot.windowType)}</Text>
                      <Text style={styles.fit}>{fitLabel(cameraId, lensIds, spot.genre)}</Text>
                    </View>
                  </View>
                </Pressable>
                <Pressable onPress={() => onToggleGoing(m.id)} style={[styles.goBar, on ? styles.goOn : styles.goOff]}>
                  <Text style={[styles.goText, { color: on ? colors.crowdLow : "#1a1408" }]}>{on ? "✓ You're going" : "I'm going"}</Text>
                </Pressable>
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
  goBar: { alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
  goOff: { backgroundColor: colors.golden },
  goOn: { backgroundColor: "rgba(127,176,122,0.16)" },
  goText: { fontFamily: fonts.sansBold, fontSize: 14 },
});
