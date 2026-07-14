import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { colors, fonts, screen } from "../theme";
import { type Genre, getCamera, CAMERAS } from "../lib/gear";
import { cameraLabel, cameraMeta } from "../lib/gearProfile";

const STYLES = ["Street", "Portraits", "Landscape", "Architecture", "Nature"];

export function BagScreen({
  cameraId, onPickCamera, lensChips, selectedLensIds, kitGenres, styleOpen, stylePick, onToggleLens, onToggleStyle, onPickStyle,
}: {
  cameraId: string; onPickCamera: (id: string) => void;
  lensChips: { id: string; label: string }[]; selectedLensIds: string[]; kitGenres: Genre[];
  styleOpen: boolean; stylePick: string | null;
  onToggleLens: (id: string) => void; onToggleStyle: () => void; onPickStyle: (s: string) => void;
}) {
  const [camOpen, setCamOpen] = useState(false);
  const cam = getCamera(cameraId);
  return (
    <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical overScrollMode="always">
      <Text style={styles.eyebrow}>YOUR GEAR · SAVES AS YOU GO</Text>
      <Text style={styles.title}>Your bag</Text>
      <Text style={styles.sub}>What you shoot with, so we only suggest shoots your gear can nail — and tell you <Text style={styles.gold}>which lens to grab.</Text></Text>

      <Text style={styles.section}>CAMERA</Text>
      <Pressable style={({ pressed }) => [styles.camCard, pressed && { opacity: 0.75 }]} onPress={() => setCamOpen((v) => !v)}>
        <View style={styles.camIcon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.golden} strokeWidth={1.6}>
            <Rect x={3} y={7} width={18} height={13} rx={3} /><Circle cx={12} cy={13.5} r={3.4} /><Path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.camName}>{cameraLabel(cam)}</Text>
          <Text style={styles.camMeta}>{cameraMeta(cam)}</Text>
        </View>
        <Text style={styles.change}>{camOpen ? "▲" : "Change"}</Text>
      </Pressable>
      {camOpen && (
        <View style={[styles.chips, { marginTop: 10 }]}>
          {CAMERAS.map((c) => {
            const on = c.id === cameraId;
            return (
              <Pressable key={c.id} onPress={() => { onPickCamera(c.id); setCamOpen(false); }} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && styles.chipPressed]}>
                <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{cameraLabel(c)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.section}>LENSES / FOCAL LENGTHS</Text>
      <View style={styles.chips}>
        {lensChips.map((l) => {
          const on = selectedLensIds.includes(l.id);
          return (
            <Pressable key={l.id} onPress={() => onToggleLens(l.id)} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && styles.chipPressed]}>
              <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* The payoff of the screen (#B3) — elevated into its own gold panel so it
          reads as the reward for setting gear, not an afterthought below the fold. */}
      <View style={styles.kitPanel}>
        <Text style={styles.kitPanelLabel}>YOUR KIT'S IDEAL FOR</Text>
        <Text style={styles.kitSub}>Matched from your gear — updates as you change camera or lenses.</Text>
        <View style={styles.chips}>
          {kitGenres.length === 0
            ? <Text style={styles.kitSub}>Add a lens to see what this kit's ideal for.</Text>
            : kitGenres.map((g) => (
                <View key={g} style={styles.genrePill}><Text style={styles.genreText}>{g}</Text></View>
              ))}
        </View>
      </View>

      <Pressable onPress={onToggleStyle} android_ripple={{ color: "rgba(255,255,255,0.06)" }} style={({ pressed }) => [styles.dashed2, pressed && { opacity: 0.7 }]}><Text style={styles.dashed2Text}>Not sure? Pick your style instead →</Text></Pressable>
      {styleOpen && (
        <View style={styles.chips}>
          {STYLES.map((s) => {
            const on = stylePick === s;
            return (
              <Pressable key={s} onPress={() => onPickStyle(s)} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && styles.chipPressed]}>
                <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: screen.padTop, paddingHorizontal: screen.padSide, paddingBottom: 118 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, marginTop: 6 },
  sub: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, marginTop: 12 },
  gold: { color: colors.golden },
  section: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.6, marginTop: 26, marginBottom: 12 },
  camCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 14 },
  camIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#232327", justifyContent: "center", alignItems: "center" },
  camName: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 15 },
  camMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 1 },
  edit: { color: colors.muted, fontSize: 14 },
  change: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 13 },
  dashed: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 13, marginTop: 10 },
  dashedText: { color: colors.muted, fontFamily: fonts.sansMed, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  chipPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  chipOn: { backgroundColor: "rgba(233,184,114,0.16)", borderColor: "rgba(233,184,114,0.5)" },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.hairline },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13.5 },
  kitPanel: { marginTop: 24, backgroundColor: "rgba(233,184,114,0.07)", borderWidth: 1, borderColor: "rgba(233,184,114,0.22)", borderRadius: 16, padding: 16 },
  kitPanelLabel: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 12.5, letterSpacing: 0.6, marginBottom: 8 },
  kitSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, marginBottom: 12 },
  genrePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "rgba(233,184,114,0.12)", borderWidth: 1, borderColor: "rgba(233,184,114,0.35)" },
  genreText: { color: "#F0D9AE", fontFamily: fonts.sansSemi, fontSize: 13 },
  dashed2: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 14, marginTop: 22 },
  dashed2Text: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 14 },
});
