import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { colors, fonts } from "../theme";
import { type City } from "../lib/cityPack";

// A small map-pin glyph (matches the app's thin-stroke SVG style).
function PinIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M12 21c4.5-4.2 7-7.6 7-11a7 7 0 1 0-14 0c0 3.4 2.5 6.8 7 11z" />
      <Circle cx={12} cy={10} r={2.4} />
    </Svg>
  );
}

// The Today-header city switcher: a compact pill showing the current city; tapping it
// opens a modal list of the published cities to switch between. Selecting one loads
// that city's pack (handled by the parent) and the choice persists.
export function CitySwitcher({ cities, currentId, currentName, onSelect }: {
  cities: City[]; currentId: string; currentName: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // With only the current city known (cities list still loading / empty), keep the
  // pill inert — there's nothing to switch to yet.
  const canSwitch = cities.length > 1;

  const pick = (id: string) => { setOpen(false); if (id !== currentId) onSelect(id); };

  return (
    <>
      <Pressable
        onPress={() => canSwitch && setOpen(true)}
        disabled={!canSwitch}
        accessibilityRole="button"
        accessibilityLabel={`City: ${currentName}${canSwitch ? ". Change city" : ""}`}
        android_ripple={{ color: "rgba(233,184,114,0.14)" }}
        style={({ pressed }) => [styles.pill, pressed && canSwitch && { opacity: 0.7 }]}
      >
        <PinIcon color={colors.golden} />
        <Text style={styles.pillText}>{currentName}</Text>
        {canSwitch && <Text style={styles.chev}>▾</Text>}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stop taps inside the card from closing the sheet. */}
          <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
            <Text style={styles.sheetTitle}>Choose your city</Text>
            <Text style={styles.sheetHint}>More cities are on the way.</Text>
            <View style={{ marginTop: 6 }}>
              {cities.map((c) => {
                const active = c.id === currentId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => pick(c.id)}
                    accessibilityRole="button"
                    accessibilityLabel={c.region ? `${c.name}, ${c.region}` : c.name}
                    accessibilityState={{ selected: active }}
                    android_ripple={{ color: "rgba(255,255,255,0.06)" }}
                    style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.7 }]}
                  >
                    <PinIcon color={active ? colors.golden : colors.muted} size={15} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cityName, active && { color: colors.golden }]}>{c.name}</Text>
                      {c.region ? <Text style={styles.cityRegion}>{c.region}</Text> : null}
                    </View>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10,
    backgroundColor: "rgba(233,184,114,0.10)", borderWidth: 1, borderColor: "rgba(233,184,114,0.28)",
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
  },
  pillText: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 13 },
  chev: { color: colors.golden, fontSize: 10, marginLeft: 1 },

  backdrop: { flex: 1, backgroundColor: "rgba(8,8,10,0.66)", justifyContent: "center", alignItems: "center", padding: 28 },
  sheet: {
    width: "100%", maxWidth: 380, backgroundColor: colors.surface, borderRadius: 22,
    borderWidth: 1, borderColor: colors.hairline, padding: 20,
  },
  sheetTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21 },
  sheetHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: 1, borderColor: "transparent", marginTop: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  rowActive: { borderColor: "rgba(233,184,114,0.35)", backgroundColor: "rgba(233,184,114,0.08)" },
  cityName: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18 },
  cityRegion: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 12, marginTop: 2, letterSpacing: 0.4 },
  check: { color: colors.golden, fontFamily: fonts.sansBold, fontSize: 15 },
});
