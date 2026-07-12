import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { colors, fonts, screen } from "../theme";

const LENSES = ["23mm", "35mm f/2", "50mm", "200mm"];
const STYLES = ["Street", "Portraits", "Landscape", "Architecture", "Nature"];

export function BagScreen({
  lenses, styleOpen, stylePick, onToggleLens, onToggleStyle, onPickStyle, onContinue,
}: {
  lenses: string[]; styleOpen: boolean; stylePick: string | null;
  onToggleLens: (l: string) => void; onToggleStyle: () => void; onPickStyle: (s: string) => void; onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>SETUP · 2 OF 3</Text>
      <Text style={styles.title}>What's in{"\n"}your bag?</Text>
      <Text style={styles.sub}>So we only suggest shoots your gear can nail — and tell you <Text style={styles.gold}>which lens to grab.</Text></Text>

      <Text style={styles.section}>CAMERAS</Text>
      <View style={styles.camCard}>
        <View style={styles.camIcon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.golden} strokeWidth={1.6}>
            <Rect x={3} y={7} width={18} height={13} rx={3} /><Circle cx={12} cy={13.5} r={3.4} /><Path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.camName}>Fujifilm X100VI</Text>
          <Text style={styles.camMeta}>Fixed 35mm-equiv · f/2</Text>
        </View>
        <Text style={styles.edit}>✎</Text>
      </View>
      <View style={styles.dashed}><Text style={styles.dashedText}>+ Add a camera</Text></View>

      <Text style={styles.section}>LENSES / FOCAL LENGTHS</Text>
      <View style={styles.chips}>
        {LENSES.map((l) => {
          const on = lenses.includes(l);
          return (
            <Pressable key={l} onPress={() => onToggleLens(l)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
              <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{l}</Text>
            </Pressable>
          );
        })}
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
  dashed: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 13, marginTop: 10 },
  dashedText: { color: colors.muted, fontFamily: fonts.sansMed, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1 },
  chipOn: { backgroundColor: "rgba(233,184,114,0.16)", borderColor: "rgba(233,184,114,0.5)" },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.hairline },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13.5 },
  dashed2: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 14, marginTop: 22 },
  dashed2Text: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 14 },
  continue: { alignItems: "center", paddingVertical: 16, borderRadius: 16, backgroundColor: colors.golden },
  continueText: { color: "#1a1408", fontFamily: fonts.sansBold, fontSize: 15 },
  skip: { alignItems: "center", paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline },
  skipText: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 15 },
});
