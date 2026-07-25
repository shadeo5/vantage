import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme";
import type { LightStripModel , LightType } from "../lib/light";

// The demoted, phase-honest light module (E9 · PH4, wire Option A). A slim strip — a
// glanceable phase label + sub, and a mini forward sparkline — instead of the old
// full-width chart headline. Daytime/blue/golden: the light you can still catch in the
// next ~6h. Full night: a quiet "the city's yours" + a peek at tomorrow's dawn ramp.
const BAR_COLOR: Record<LightType, string> = {
  golden: colors.golden,
  blue: colors.blueHour,
  flat: colors.flat,
  night: "#3a4152",
};
const MAX = 30;

export function LightStrip({ model }: { model: LightStripModel }) {
  const { read, bars, night } = model;
  return (
    <View style={styles.strip} accessibilityLabel={`Light: ${read.stripMain}${read.stripSub ? ` · ${read.stripSub}` : ""}`}>
      <View style={styles.lab}>
        <Text style={styles.k}>{read.icon} Light</Text>
        <Text style={styles.v}>{read.stripMain}</Text>
        {read.stripSub && <Text style={[styles.sub, night && styles.subNight]}>{read.stripSub}</Text>}
      </View>
      <View style={styles.bars}>
        {bars.map((b, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(3, MAX * b.quality),
                backgroundColor: BAR_COLOR[b.type],
                opacity: b.isNow ? 1 : b.type === "night" ? 0.55 : b.type === "flat" ? 0.5 : 0.9,
                borderWidth: b.isNow ? 1.5 : 0,
                borderColor: colors.ink,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 12, marginBottom: 28 },
  lab: { width: 116 },
  k: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase" },
  v: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 13, marginTop: 3 },
  sub: { color: colors.golden, fontFamily: fonts.sansMed, fontSize: 11, marginTop: 1 },
  subNight: { color: colors.golden },
  bars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2, height: MAX },
  bar: { flex: 1, borderRadius: 2 },
});
