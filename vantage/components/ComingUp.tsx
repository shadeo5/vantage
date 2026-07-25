import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts, radius } from "../theme";
import { whenLabel, dateLabel, type Opportunity } from "../lib/events";

// "Coming up" (B4) — the forward-looking events shelf. Evergreen spots answer "tonight";
// this answers "what's worth planning for." Events are seasonal, so most of the year the
// value is here — the lead-up — not the day-of takeover. Each card taps open to reveal the
// event's "why" + what to look for + getting there (the curated editorial), so a
// photographer can plan the shoot weeks out. Phase-honest: the label is always forward
// ("In 6 weeks"), never a passed date.
export function ComingUp({ events, now }: { events: Opportunity[]; now: Date }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!events.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>COMING UP</Text>
      <View style={styles.list}>
        {events.map((ev) => {
          const open = openId === ev.id;
          return (
            <Pressable
              key={ev.id}
              onPress={() => setOpenId(open ? null : ev.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              android_ripple={{ color: "rgba(255,255,255,0.05)" }}
              accessibilityRole="button"
              accessibilityLabel={`${ev.name}, ${whenLabel(now, ev)}. Tap for details.`}
            >
              <View style={styles.topRow}>
                <View style={styles.whenChip}>
                  <Text style={styles.whenText}>{whenLabel(now, ev).toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>{dateLabel(ev)}</Text>
                <Text style={styles.caret}>{open ? "▲" : "▼"}</Text>
              </View>

              <Text style={styles.name}>{ev.name}</Text>
              <Text style={styles.tagline}>{ev.tagline}</Text>
              <Text style={styles.hood}>{ev.neighborhood}</Text>

              {open && (
                <View style={styles.detail}>
                  <Text style={styles.why}>{ev.why}</Text>
                  <Text style={styles.lookHead}>WHAT TO LOOK FOR</Text>
                  {ev.look.map((l, i) => (
                    <View key={i} style={styles.lookRow}>
                      <Text style={styles.mark}>▸</Text>
                      <Text style={styles.look}>{l}</Text>
                    </View>
                  ))}
                  <Text style={styles.getting}>{ev.getting}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  eyebrow: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.5, color: colors.golden, marginBottom: 12 },
  list: { gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, padding: 16 },
  pressed: { opacity: 0.85 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  whenChip: { backgroundColor: "rgba(233,184,114,0.13)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  whenText: { fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 0.6, color: colors.golden },
  date: { fontFamily: fonts.sansMed, fontSize: 12.5, color: colors.muted, flex: 1 },
  caret: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted },
  name: { fontFamily: fonts.serifMed, fontSize: 21, color: colors.ink, lineHeight: 26 },
  tagline: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted3, marginTop: 3, lineHeight: 19 },
  hood: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.muted, marginTop: 7 },
  detail: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.hairline, gap: 8 },
  why: { fontFamily: fonts.sans, fontSize: 14.5, color: colors.muted3, lineHeight: 21 },
  lookHead: { fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 1, color: colors.muted, marginTop: 4 },
  lookRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  mark: { fontFamily: fonts.sans, fontSize: 13, color: colors.golden, lineHeight: 20 },
  look: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.muted3, lineHeight: 20 },
  getting: { fontFamily: fonts.sansMed, fontSize: 12.5, color: colors.muted, marginTop: 6, lineHeight: 18 },
});
