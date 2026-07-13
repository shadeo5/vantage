import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts } from "../theme";

// The return-loop moment: "you said you'd go — did you?" Honest and low-pressure.
export function CheckInCard({ spotName, onWent, onSkipped }: {
  spotName: string; onWent: () => void; onSkipped: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>SINCE YOU LAST LOOKED</Text>
      <Text style={styles.q}>Did you make it to {spotName}?</Text>
      <View style={styles.row}>
        <Pressable onPress={onWent} style={[styles.btn, styles.yes]}>
          <Text style={styles.yesText}>I shot it 📷</Text>
        </Pressable>
        <Pressable onPress={onSkipped} style={[styles.btn, styles.no]}>
          <Text style={styles.noText}>Not this time</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(233,184,114,0.35)", borderRadius: 18, padding: 16, marginBottom: 18 },
  eyebrow: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1 },
  q: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginTop: 6, marginBottom: 14 },
  row: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 13, borderWidth: 1 },
  yes: { backgroundColor: colors.golden, borderColor: "transparent" },
  yesText: { color: "#1a1408", fontFamily: fonts.sansBold, fontSize: 14 },
  no: { backgroundColor: "transparent", borderColor: colors.hairline },
  noText: { color: colors.muted3, fontFamily: fonts.sansSemi, fontSize: 14 },
});
