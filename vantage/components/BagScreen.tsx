import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { colors, fonts, screen } from "../theme";
import { type Genre, getCamera, CAMERAS } from "../lib/gear";
import { cameraLabel, cameraMeta } from "../lib/gearProfile";

const STYLES = ["Street", "Portraits", "Landscape", "Architecture", "Nature"];

export function BagScreen({
  cameraId, onPickCamera, lensChips, selectedLensIds, kitGenres, styleOpen, stylePick, onToggleLens, onToggleStyle, onPickStyle, onContinue,
}: {
  cameraId: string; onPickCamera: (id: string) => void;
  lensChips: { id: string; label: string }[]; selectedLensIds: string[]; kitGenres: Genre[];
  styleOpen: boolean; stylePick: string | null;
  onToggleLens: (id: string) => void; onToggleStyle: () => void; onPickStyle: (s: string) => void; onContinue: () => void;
}) {
  const [camOpen, setCamOpen] = useState(false);
  const cam = getCamera(cameraId);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>SETUP · 2 OF 3</Text>
      <Text style={styles.title}>What's in{"\n"}your bag?</Text>
      <Text style={styles.sub}>So we only suggest shoots your gear can nail — and tell you <Text style={styles.gold}>which lens to grab.</Text></Text>

      <Text style={styles.section}>CAMERA</Text>
      <Pressable style={styles.camCard} onPress={() => setCamOpen((v) => !v)}>
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
              <Pressable key={c.id} onPress={() => { onPickCamera(c.id); setCamOpen(false); }} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
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
            <Pressable key={l.id} onPress={() => onToggleLens(l.id)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
              <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>YOUR KIT SHOOTS</Text>
      <Text style={styles.kitSub}>Matched from your gear — updates as you change camera or lenses.</Text>
      <View style={styles.chips}>
        {kitGenres.length === 0
          ? <Text style={styles.kitSub}>Add a lens to see what this body can shoot.</Text>
          : kitGenres.map((g) => (
              <View key={g} style={styles.genrePill}><Text style={styles.genreText}>{g}</Text></View>
            ))}
      </View>

      <Pressable onPress={onToggleStyle} style={styles.dashed2}><Text style={styles.dashed2Text}>Not sure? Pick your style instead →</Text></Pressable>
      {styleOpen && (
        <View style={styles.chips}>
          {STYLES.map((s) => {
            const on = stylePick === s;
            return (
              <Pressable key={s} onPress={() => onPickStyle(s)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ gap: 11, marginTop: 30 }}>
        <Pressable onPress={onContinue} style={styles.continue}><Text style={styles.continueText}>Continue</Text></Pressable>
        <Pressable onPress={onContinue} style={styles.skip}><Text style={styles.skipText}>Skip — I'll add later</Text></Pressable>
      </View>
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
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1 },
  chipOn: { backgroundColor: "rgba(233,184,114,0.16)", borderColor: "rgba(233,184,114,0.5)" },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.hairline },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13.5 },
  kitSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: -4, marginBottom: 12 },
  genrePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "rgba(233,184,114,0.12)", borderWidth: 1, borderColor: "rgba(233,184,114,0.35)" },
  genreText: { color: "#F0D9AE", fontFamily: fonts.sansSemi, fontSize: 13 },
  dashed2: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 14, marginTop: 22 },
  dashed2Text: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 14 },
  continue: { alignItems: "center", paddingVertical: 16, borderRadius: 16, backgroundColor: colors.golden },
  continueText: { color: "#1a1408", fontFamily: fonts.sansBold, fontSize: 15 },
  skip: { alignItems: "center", paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline },
  skipText: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 15 },
});
