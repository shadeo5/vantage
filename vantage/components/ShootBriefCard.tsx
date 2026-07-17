import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, radius } from "../theme";
import type { ShootBrief } from "../lib/shootBrief";
import type { ReadyLevel } from "../lib/shootBrief";

// The honest answer to a quiet night (E8 · CB4): whatever the light, here's whether
// your kit's up for it and what to shoot. Sits under the hero — where an empty "best
// near you" list would otherwise leave a gap.
const LEVEL_COLOR: Record<ReadyLevel, string> = {
  set: colors.crowdLow,      // green — you're good
  workable: colors.golden,
  borderline: colors.crowdMed,
  slow: colors.crowdHigh,    // clay — needs a workaround
  fine: colors.blueHour,
};

export function ShootBriefCard({ brief, title = "TONIGHT'S SHOOT", trailing }: { brief: ShootBrief; title?: string; trailing?: string | null }) {
  const { readiness, rainWarning, shots } = brief;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>{title}</Text>
        {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      </View>

      {readiness.line && (
        <View style={styles.readyRow}>
          <View style={[styles.dot, { backgroundColor: LEVEL_COLOR[readiness.level] }]} />
          <Text style={styles.ready}>{readiness.line}</Text>
        </View>
      )}

      {rainWarning && (
        <View style={styles.rain}>
          <Text style={styles.rainText}>{rainWarning}</Text>
        </View>
      )}

      <View style={styles.shots}>
        {shots.map((s, i) => (
          <View key={i} style={styles.shotRow}>
            <Text style={styles.mark}>▸</Text>
            <Text style={styles.shot}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, padding: 18, gap: 12, marginTop: 16 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.5, color: colors.golden },
  trailing: { fontFamily: fonts.sansMed, fontSize: 11, letterSpacing: 0.3, color: colors.muted },
  readyRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  ready: { flex: 1, fontFamily: fonts.sansMed, fontSize: 15, lineHeight: 21, color: colors.ink },
  rain: { borderLeftWidth: 2, borderLeftColor: colors.crowdHigh, paddingLeft: 11, paddingVertical: 2 },
  rainText: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.muted3 },
  shots: { gap: 8 },
  shotRow: { flexDirection: "row", gap: 9 },
  mark: { color: colors.golden, fontSize: 13, lineHeight: 20 },
  shot: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted3 },
});
