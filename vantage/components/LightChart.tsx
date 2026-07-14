import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme";
import { LightBar, LightType } from "../lib/light";

const BAR_COLOR: Record<LightType, string> = {
  golden: colors.golden,
  blue: colors.blueHour,
  flat: colors.flat,
  night: colors.muted,
};
const MAX = 68;

export function LightChart({ bars }: { bars: LightBar[] }) {
  return (
    <View style={styles.wrap}>
      {/* A gold caret sits above the current bar so it's unmistakable (#D2).
          Same flex:1 + gap layout as the bars row so the cells line up.
          (33 narrow bars — a single glyph fits where "NOW" text wouldn't.) */}
      <View style={styles.markerRow}>
        {bars.map((b, i) => (
          <View key={i} style={styles.markerCell}>
            {b.isNow && <Text style={styles.nowLabel}>▾</Text>}
          </View>
        ))}
      </View>
      <View style={styles.bars}>
        {bars.map((b, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                // Height ramps with real light quality → the curve you wanted.
                height: Math.max(5, MAX * b.quality),
                backgroundColor: BAR_COLOR[b.type],
                // Dim the quiet periods — but never the "now" bar, which stays lit.
                opacity: b.isNow ? 1 : b.type === "flat" ? 0.4 : b.type === "night" ? 0.5 : 1,
                borderWidth: b.isNow ? 2 : 0,
                borderColor: b.isNow ? colors.golden : colors.ink,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.hint}>Taller = better light. The gold-marked bar is right now.</Text>
      <View style={styles.legend}>
        <Legend color={colors.golden} label="Golden" />
        <Legend color={colors.blueHour} label="Blue hour" />
        <Legend color={colors.flat} label="Flat-day" dim />
      </View>
    </View>
  );
}

function Legend({ color, label, dim }: { color: string; label: string; dim?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color, opacity: dim ? 0.35 : 1 }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  markerRow: { flexDirection: "row", gap: 3, marginBottom: -3, height: 12 },
  markerCell: { flex: 1, alignItems: "center" },
  nowLabel: { color: colors.golden, fontSize: 11, lineHeight: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: MAX },
  bar: { flex: 1, borderRadius: 2 },
  hint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
});
