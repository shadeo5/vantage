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
                opacity: b.type === "flat" ? 0.4 : b.type === "night" ? 0.5 : 1,
                borderWidth: b.isNow ? 2 : 0,
                borderColor: colors.ink,
              },
            ]}
          />
        ))}
      </View>
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
  wrap: { gap: 14 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: MAX },
  bar: { flex: 1, borderRadius: 2 },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
});
