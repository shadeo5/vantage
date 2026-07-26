import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";
import { Spot, spotImageSource } from "../lib/spots";
import type { LightRead } from "../lib/light";
import { NudgeSignal, Confidence } from "../lib/nudge";

// Lowercase just the first character, for weaving heroPhrase mid-sentence.
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

const SIG_COLOR: Record<NudgeSignal["key"], string> = {
  light: colors.golden,
  activity: colors.crowdHigh,
  gear: colors.blueHour,
};

export function InspirationHero({
  spot, light, isGoing, whyOpen, gearLens, confidence, go, whySignals,
  onOpen, onGo, onToggleWhy,
}: {
  spot: Spot; light: LightRead; isGoing: boolean; whyOpen: boolean; gearLens: string;
  confidence: Confidence; go: boolean; whySignals: NudgeSignal[];
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
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${spot.name} — open details`}>
        <ImageBackground source={spotImageSource(spot)} style={styles.banner}>
          {/* warm golden wash + bottom scrim */}
          <LinearGradient colors={["rgba(246,185,94,0.55)", "rgba(214,138,60,0.5)", "rgba(138,90,82,0.55)"]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(24,20,18,0.25)", "rgba(22,22,24,0.02)", colors.surface]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.badge}>
            <Animated.View style={[styles.badgeDot, { opacity: go ? pulse : 0.4 }]} />
            {/* Confidence never shown as a raw grade (#T2): a ✦ flourish is reserved
                for HIGH, MEDIUM reads as a plain confident label, and a genuinely
                weak night becomes an honest "quiet night" — never a "MEDIUM". */}
            <Text style={styles.badgeText}>{go ? (confidence === "high" ? "TONIGHT'S PICK  ✦" : "TONIGHT'S PICK") : "A QUIET NIGHT"}</Text>
          </View>
          <Text style={styles.heroName}>{go ? <>{spot.name} is{"\n"}alive tonight.</> : <>{spot.name},{"\n"}if you head out.</>}</Text>
        </ImageBackground>
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.lede}>
          {go ? (
            <>{light.heroPhrase} — grab your <Text style={styles.gold}>{gearLens}</Text> and go.</>
          ) : (
            <>Quiet night, but {lowerFirst(light.heroPhrase)} — bring your <Text style={styles.gold}>{gearLens}</Text> for a slow walk.</>
          )}
        </Text>

        <View style={styles.chips}>
          <Text style={[styles.chip, styles.chipGold]}>{light.icon} {light.chipLabel}</Text>
          {spot.type ? <Text style={styles.chip}>{spot.type}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onGo} accessibilityRole="button" accessibilityLabel={isGoing ? `You're going to ${spot.name} — tap to cancel` : `I'm going to ${spot.name}`} accessibilityState={{ selected: isGoing }} android_ripple={{ color: "rgba(26,20,8,0.12)" }} style={({ pressed }) => [styles.goBtn, isGoing ? styles.goOn : styles.goOff, pressed && styles.pressed]}>
            <Text style={[styles.goLabel, { color: isGoing ? colors.crowdLow : "#1a1408" }]}>
              {isGoing ? "✓ You're going" : "I'm going"}
            </Text>
          </Pressable>
          <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Details for ${spot.name}`} android_ripple={{ color: "rgba(255,255,255,0.08)" }} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}><Text style={styles.detailsLabel}>Details</Text></Pressable>
        </View>

        <Pressable onPress={onToggleWhy} accessibilityRole="button" accessibilityLabel="Why this pick?" accessibilityState={{ expanded: whyOpen }} style={styles.whyRow}>
          <Text style={styles.whyLabel}>Why this pick?</Text>
          <Text style={styles.whyChev}>{whyOpen ? "▲" : "▼"}</Text>
        </Pressable>
        {whyOpen && (
          <View style={styles.whyBody}>
            {whySignals.map((s) => (
              <WhyLine key={s.key} color={SIG_COLOR[s.key]} k={`${s.label}.`} v={s.detail} />
            ))}
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
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
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
