import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";
import { Spot, img } from "../lib/spots";

export function InspirationHero({
  spot, goldenRange, isGoing, whyOpen, gearLens,
  onOpen, onGo, onToggleWhy,
}: {
  spot: Spot; goldenRange: string; isGoing: boolean; whyOpen: boolean; gearLens: string;
  onOpen: () => void; onGo: () => void; onToggleWhy: () => void;
}) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen}>
        <ImageBackground source={{ uri: img(spot.img) }} style={styles.banner}>
          {/* warm golden wash + bottom scrim */}
          <LinearGradient colors={["rgba(246,185,94,0.55)", "rgba(214,138,60,0.5)", "rgba(138,90,82,0.55)"]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(24,20,18,0.25)", "rgba(22,22,24,0.02)", colors.surface]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.badge}>
            <Animated.View style={[styles.badgeDot, { opacity: pulse }]} />
            <Text style={styles.badgeText}>TONIGHT'S PICK</Text>
          </View>
          <Text style={styles.heroName}>{spot.name} is{"\n"}alive tonight.</Text>
        </ImageBackground>
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.lede}>
          Golden hour hits <Text style={styles.gold}>{goldenRange.split("–")[0]}</Text> — perfect for the fast{" "}
          <Text style={styles.gold}>{gearLens}</Text> in your bag.
        </Text>

        <View style={styles.chips}>
          <Text style={[styles.chip, styles.chipGold]}>☀ {goldenRange}</Text>
          <Text style={styles.chip}>{spot.distance} away</Text>
          <Text style={styles.chip}>Street life</Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onGo} style={[styles.goBtn, isGoing ? styles.goOn : styles.goOff]}>
            <Text style={[styles.goLabel, { color: isGoing ? colors.crowdLow : "#1a1408" }]}>
              {isGoing ? "✓ You're going" : "I'm going"}
            </Text>
          </Pressable>
          <Pressable onPress={onOpen} style={styles.detailsBtn}><Text style={styles.detailsLabel}>Details</Text></Pressable>
        </View>

        <Pressable onPress={onToggleWhy} style={styles.whyRow}>
          <Text style={styles.whyLabel}>Why this pick?</Text>
          <Text style={styles.whyChev}>{whyOpen ? "▲" : "▼"}</Text>
        </Pressable>
        {whyOpen && (
          <View style={styles.whyBody}>
            <WhyLine color={colors.golden} k="Light." v={`Golden hour ${goldenRange} — the warmest light of the evening, raking down Auburn Ave.`} />
            <WhyLine color={colors.crowdHigh} k="Activity." v={`${spot.reason} — plenty of candid life in the frame.`} />
            <WhyLine color={colors.blueHour} k="Your kit." v={`The ${gearLens} is the exact lens for tight, low-light street.`} />
          </View>
        )}
      </View>
    </View>
  );
}

function WhyLine({ color, k, v }: { color: string; k: string; v: string }) {
  return (
    <View style={styles.whyLine}>
      <View style={[styles.whySquare, { backgroundColor: color }]} />
      <Text style={styles.whyText}><Text style={styles.whyBold}>{k}</Text> {v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, marginBottom: 30 },
  banner: { height: 230, justifyContent: "flex-end", padding: 18 },
  badge: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(10,9,11,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.goldenBright },
  badgeText: { color: "#F0D9AE", fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 0.8 },
  heroName: { color: colors.ink, fontFamily: fonts.serif, fontSize: 29, lineHeight: 32 },
  body: { padding: 18 },
  lede: { color: "#d8d4cc", fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  gold: { color: colors.golden, fontFamily: fonts.sansSemi },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { backgroundColor: "#1e1e21", color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 12, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, overflow: "hidden" },
  chipGold: { backgroundColor: "rgba(233,184,114,0.12)", color: colors.golden, fontFamily: fonts.sansSemi },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  goBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 15, borderWidth: 1 },
  goOff: { backgroundColor: colors.golden, borderColor: "transparent" },
  goOn: { backgroundColor: "rgba(127,176,122,0.16)", borderColor: "rgba(127,176,122,0.4)" },
  goLabel: { fontFamily: fonts.sansBold, fontSize: 15 },
  detailsBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 15, backgroundColor: "#1e1e21", borderWidth: 1, borderColor: colors.hairline },
  detailsLabel: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 15 },
  whyRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.hairline },
  whyLabel: { color: "#a9a6b0", fontFamily: fonts.sansSemi, fontSize: 13, flex: 1 },
  whyChev: { color: colors.muted, fontSize: 11 },
  whyBody: { gap: 11, marginTop: 13 },
  whyLine: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  whySquare: { width: 8, height: 8, borderRadius: 2, marginTop: 5 },
  whyText: { flex: 1, color: colors.muted3, fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20 },
  whyBold: { color: colors.ink, fontFamily: fonts.sansSemi },
});
