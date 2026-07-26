import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";
import { safeTop, safeBottom } from "../lib/safeArea";
import { Spot, spotImageSource } from "../lib/spots";
import { lightStripModel } from "../lib/light";
import { shootBrief } from "../lib/shootBrief";
import { type Forecast } from "../lib/weather";
import type { LensSpec } from "../lib/gear";
import { LightStrip } from "./LightStrip";
import { ShootBriefCard } from "./ShootBriefCard";

export function SpotDetail({
  spot, isGoing, isSaved, cloud, cameraId, lenses, onBack, onToggleGoing, onToggleSaved,
}: {
  spot: Spot; isGoing: boolean; isSaved: boolean; cloud?: Forecast | null; cameraId: string; lenses: LensSpec[]; onBack: () => void; onToggleGoing: () => void; onToggleSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  // The detail page is now-first (E9 · PH3/PH4): what the light's doing at THIS moment,
  // what to shoot in it, and the kit's readiness — not a golden-hour countdown.
  const strip = lightStripModel(now, spot.lat, spot.lon, cloud);
  const brief = shootBrief(now, spot, cameraId, lenses, cloud);
  const nowLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, "");

  // Cross-fade the detail in over the current screen (it's an overlay above the pager,
  // so opacity 0 reveals Today underneath — never black). Hold the fade until the hero
  // image is painted so we don't flash a gradient-only header (#T5). Fallback timer so a
  // cached image that never fires onLoadEnd (common on web) still animates in.
  const anim = useRef(new Animated.Value(0)).current;
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setImgReady(true), 250);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (imgReady) Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [imgReady, anim]);

  return (
    <Animated.View style={[styles.root, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} alwaysBounceVertical overScrollMode="always">
        <ImageBackground source={spotImageSource(spot)} style={[styles.hero, { paddingTop: safeTop(insets, 14, 52) }]} onLoadEnd={() => setImgReady(true)}>
          <LinearGradient colors={["rgba(246,185,94,0.5)", "rgba(214,138,60,0.45)", "rgba(122,85,96,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(16,13,13,0.4)", "rgba(20,15,13,0.05)", colors.canvas]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTop}>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]} hitSlop={10} android_ripple={{ color: "rgba(255,255,255,0.14)", borderless: true, radius: 24 }}><Text style={styles.circleGlyph} allowFontScaling={false}>‹</Text></Pressable>
            <Pressable onPress={onToggleSaved} accessibilityRole="button" accessibilityLabel={isSaved ? `Saved — remove ${spot.name} from saved` : `Save ${spot.name}`} accessibilityState={{ selected: isSaved }} style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]} hitSlop={10} android_ripple={{ color: "rgba(224,122,139,0.24)", borderless: true, radius: 24 }}><Text style={[styles.circleGlyph, { fontSize: 17, color: isSaved ? colors.saved : colors.ink }]} allowFontScaling={false}>{isSaved ? "♥" : "♡"}</Text></Pressable>
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.heroChips}>
              <Text style={styles.hChip}>{spot.type}</Text>
              <Text style={[styles.hChip, styles.hChipGold]}>{strip.read.icon} {strip.read.chipLabel}</Text>
            </View>
            <Text style={styles.title}>{spot.name}</Text>
            <Text style={styles.tagline}>{spot.tagline}</Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.why}>{spot.why}</Text>

          {/* What to shoot now (PH3) — the tactical headline of the body, this moment + this kit. */}
          <ShootBriefCard brief={brief} title="WHAT TO SHOOT NOW" trailing={`${nowLabel} · ${strip.read.stripMain.toLowerCase()}`} />
          {/* Light, demoted (PH4) — a slim, forward, phase-honest strip, not the headline. */}
          <View style={styles.stripWrap}><LightStrip model={strip} /></View>

          <Text style={styles.secTitle}>What to look for here</Text>
          <Text style={styles.secSub}>Where the good frames hide</Text>
          <View style={{ gap: 14, marginBottom: 30 }}>
            {spot.look.map((t, i) => (
              <View key={i} style={styles.lookRow}>
                <View style={styles.lookNum}><Text style={styles.lookNumTxt} allowFontScaling={false}>{i + 1}</Text></View>
                <Text style={styles.lookText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.getting}>
            <Text style={styles.gArrow} allowFontScaling={false}>➤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gLabel}>GETTING THERE</Text>
              <Text style={styles.gText}>{spot.getting}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LinearGradient colors={["rgba(15,15,17,0)", colors.canvas]} style={[styles.bottomBar, { paddingBottom: safeBottom(insets, 12, 30) }]}>
        <Pressable onPress={onToggleGoing} accessibilityRole="button" accessibilityLabel={isGoing ? `You're going to ${spot.name} — tap to cancel` : `I'm going to ${spot.name}`} accessibilityState={{ selected: isGoing }} android_ripple={{ color: isGoing ? "rgba(127,176,122,0.18)" : "rgba(26,20,8,0.12)" }} style={({ pressed }) => [styles.goBtn, isGoing ? styles.goOn : styles.goOff, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
          <Text style={[styles.goLabel, { color: isGoing ? colors.crowdLow : "#1a1408" }]}>{isGoing ? "✓ You're going" : "I'm going"}</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  hero: { minHeight: 340, justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 18 },
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
  stripWrap: { marginTop: 14 },
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
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14 },
  goBtn: { alignItems: "center", paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  goOff: { backgroundColor: colors.golden, borderColor: "transparent" },
  goOn: { backgroundColor: "rgba(127,176,122,0.16)", borderColor: "rgba(127,176,122,0.4)" },
  goLabel: { fontFamily: fonts.sansBold, fontSize: 15 },
});
