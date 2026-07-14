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
        <Pressable onPress={onWent} android_ripple={{ color: "rgba(26,20,8,0.12)" }} style={({ pressed }) => [styles.btn, styles.yes, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
          <Text style={styles.yesText}>I shot it 📷</Text>
        </Pressable>
        <Pressable onPress={onSkipped} android_ripple={{ color: "rgba(255,255,255,0.06)" }} style={({ pressed }) => [styles.btn, styles.no, pressed && { opacity: 0.6 }]}>
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
