import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";

export function GearBanner({ onAdd, onDismiss }: { onAdd: () => void; onDismiss: () => void }) {
  return (
    <LinearGradient colors={["rgba(233,184,114,0.14)", "rgba(233,184,114,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
      <Pressable style={{ flex: 1 }} onPress={onAdd}>
        <Text style={styles.title}>Personalize your picks →</Text>
        <Text style={styles.sub}>Add your camera + lenses so we match shoots to your kit.</Text>
      </Pressable>
      <Pressable style={styles.x} onPress={onDismiss} hitSlop={8}><Text style={styles.xText}>×</Text></Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(233,184,114,0.28)", borderRadius: 16, padding: 13, marginBottom: 22 },
  title: { color: "#F0D9AE", fontFamily: fonts.sansSemi, fontSize: 14 },
  sub: { color: "#b7a98d", fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2 },
  x: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: "rgba(233,184,114,0.3)", justifyContent: "center", alignItems: "center" },
  xText: { color: "#c9b892", fontSize: 15, lineHeight: 17 },
});
