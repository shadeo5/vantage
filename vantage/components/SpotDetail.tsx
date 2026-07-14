import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, screen } from "../theme";
import { Spot, img, windowMeta } from "../lib/spots";
import { getLightWindows, goldenWindowLabel, hourlyLight, fmtTime } from "../lib/light";
import { LightChart } from "./LightChart";

export function SpotDetail({
  spot, isGoing, isSaved, onBack, onToggleGoing, onToggleSaved,
}: {
  spot: Spot; isGoing: boolean; isSaved: boolean; onBack: () => void; onToggleGoing: () => void; onToggleSaved: () => void;
}) {
  const now = new Date();
  const windows = getLightWindows(now, spot.lat, spot.lon);
  const bars = hourlyLight(now, spot.lat, spot.lon);
  const wm = windowMeta(spot.windowType);
  const windowTime = spot.windowType === "blue" ? fmtTime(windows.blueEvening.start) : fmtTime(windows.goldenEvening.start);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start(); }, [anim]);

  return (
    <Animated.View style={[styles.root, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} alwaysBounceVertical overScrollMode="always">
        <ImageBackground source={img(spot.img)} style={styles.hero}>
          <LinearGradient colors={["rgba(246,185,94,0.5)", "rgba(214,138,60,0.45)", "rgba(122,85,96,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(16,13,13,0.4)", "rgba(20,15,13,0.05)", colors.canvas]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTop}>
            <Pressable onPress={onBack} style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]} hitSlop={10} android_ripple={{ color: "rgba(255,255,255,0.14)", borderless: true, radius: 24 }}><Text style={styles.circleGlyph}>‹</Text></Pressable>
            <Pressable onPress={onToggleSaved} style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]} hitSlop={10} android_ripple={{ color: "rgba(224,122,139,0.24)", borderless: true, radius: 24 }}><Text style={[styles.circleGlyph, { fontSize: 17, color: isSaved ? colors.saved : colors.ink }]}>{isSaved ? "♥" : "♡"}</Text></Pressable>
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.heroChips}>
              <Text style={styles.hChip}>{spot.type}</Text>
              <Text style={[styles.hChip, styles.hChipGold]}>{wm.icon} {wm.label} {windowTime}</Text>
            </View>
            <Text style={styles.title}>{spot.name}</Text>
            <Text style={styles.tagline}>{spot.tagline}</Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.why}>{spot.why}</Text>

          <View style={styles.secHead}><Text style={styles.secTitle}>When the light works</Text><Text style={styles.secTrail}>{goldenWindowLabel(windows)}</Text></View>
          <View style={styles.card}><LightChart bars={bars} /></View>

          <Text style={styles.secTitle}>What to look for here</Text>
          <Text style={styles.secSub}>Where the good frames hide</Text>
          <View style={{ gap: 14, marginBottom: 30 }}>
            {spot.look.map((t, i) => (
              <View key={i} style={styles.lookRow}>
                <View style={styles.lookNum}><Text style={styles.lookNumTxt}>{i + 1}</Text></View>
                <Text style={styles.lookText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.getting}>
            <Text style={styles.gArrow}>➤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gLabel}>GETTING THERE</Text>
              <Text style={styles.gText}>{spot.getting}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LinearGradient colors={["rgba(15,15,17,0)", colors.canvas]} style={styles.bottomBar}>
        <Pressable onPress={onToggleGoing} android_ripple={{ color: isGoing ? "rgba(127,176,122,0.18)" : "rgba(26,20,8,0.12)" }} style={({ pressed }) => [styles.goBtn, isGoing ? styles.goOn : styles.goOff, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
          <Text style={[styles.goLabel, { color: isGoing ? colors.crowdLow : "#1a1408" }]}>{isGoing ? "✓ You're going" : "I'm going"}</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  hero: { height: 340, justifyContent: "space-between", paddingTop: 52, paddingHorizontal: 18, paddingBottom: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  circle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(10,9,11,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", justifyContent: "center", alignItems: "center" },
  circlePressed: { opacity: 0.6, transform: [{ scale: 0.92 }] },
  circleGlyph: { color: colors.ink, fontFamily: fonts.sansMed, fontSize: 19, lineHeight: 21 },
  heroBottom: {},
  heroChips: { flexDirection: "row", gap: 8, marginBottom: 11 },
  hChip: { backgroundColor: "rgba(10,9,11,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 11, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, overflow: "hidden" },
  hChipGold: { backgroundColor: "rgba(233,184,114,0.16)", borderColor: "rgba(233,184,114,0.3)", color: "#F0D9AE" },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 34, lineHeight: 35 },
  tagline: { color: "#cfccd4", fontFamily: fonts.sans, fontSize: 14, marginTop: 4 },
  body: { paddingHorizontal: 20, paddingTop: 22 },
  why: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 25, marginBottom: 28 },
  secHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13 },
  secTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20 },
  secTrail: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 12 },
  secSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 18, padding: 16, marginBottom: 30 },
  lookRow: { flexDirection: "row", gap: 13, alignItems: "flex-start" },
  lookNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: "rgba(233,184,114,0.4)", justifyContent: "center", alignItems: "center" },
  lookNumTxt: { color: colors.golden, fontFamily: fonts.serif, fontSize: 12 },
  lookText: { flex: 1, color: colors.muted3, fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 22, paddingTop: 2 },
  galTall: { width: "100%", height: 200, borderRadius: 14, backgroundColor: colors.surface },
  galSmall: { flex: 1, height: 96, borderRadius: 14, backgroundColor: colors.surface },
  getting: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 15 },
  gArrow: { color: colors.golden, fontSize: 16, marginTop: 1 },
  gLabel: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.5, marginBottom: 5 },
  gText: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 },
  goBtn: { alignItems: "center", paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  goOff: { backgroundColor: colors.golden, borderColor: "transparent" },
  goOn: { backgroundColor: "rgba(127,176,122,0.16)", borderColor: "rgba(127,176,122,0.4)" },
  goLabel: { fontFamily: fonts.sansBold, fontSize: 15 },
});
