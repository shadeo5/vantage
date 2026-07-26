import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { colors, fonts, screen } from "../theme";
import { type Genre, type LensSpec, getCamera } from "../lib/gear";
import { cameraLabel, cameraMeta, fixedLensLabel, lensLabel, specKey, LENS_PRESETS } from "../lib/gearProfile";
import { CameraPicker } from "./CameraPicker";
import { buildLabel } from "../lib/appVersion";

const STYLES = ["Street", "Portraits", "Landscape", "Architecture", "Nature"];

export function BagScreen({
  cameraId, onPickCamera, lenses, onToggleLens, onAddLens, onRemoveLens, kitGenres,
  styleOpen, stylePick, onToggleStyle, onPickStyle,
}: {
  cameraId: string; onPickCamera: (id: string) => void;
  lenses: LensSpec[]; onToggleLens: (spec: LensSpec) => void; onAddLens: (spec: LensSpec) => void; onRemoveLens: (spec: LensSpec) => void;
  kitGenres: Genre[];
  styleOpen: boolean; stylePick: string | null;
  onToggleStyle: () => void; onPickStyle: (s: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [focal, setFocal] = useState("");
  const [focalTo, setFocalTo] = useState("");
  const [aperture, setAperture] = useState("");
  const [macro, setMacro] = useState(false);
  const cam = getCamera(cameraId);

  const selectedKeys = new Set(lenses.map(specKey));
  // Lenses the user added that aren't one of the quick-pick presets → shown as removable.
  const customLenses = lenses.filter((l) => !LENS_PRESETS.some((p) => specKey(p.spec) === specKey(l)));

  const submitLens = () => {
    const min = parseFloat(focal);
    const ap = parseFloat(aperture);
    if (!min || min <= 0 || !ap || ap <= 0) return; // ignore incomplete input
    const max = parseFloat(focalTo);
    const spec: LensSpec = { minFocal: min, maxFocal: max && max > min ? max : min, maxAperture: ap, ...(macro ? { macro: true } : {}) };
    onAddLens(spec);
    setFocal(""); setFocalTo(""); setAperture(""); setMacro(false); setAddOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical overScrollMode="always">
      <Text style={styles.eyebrow}>YOUR GEAR · SAVES AS YOU GO</Text>
      <Text style={styles.title}>Your bag</Text>
      <Text style={styles.sub}>What you shoot with, so we only suggest shoots your gear can nail — and tell you <Text style={styles.gold}>which lens to grab.</Text></Text>

      <Text style={styles.section}>CAMERA</Text>
      <Pressable style={({ pressed }) => [styles.camCard, pressed && { opacity: 0.75 }]} onPress={() => setPickerOpen(true)}>
        <View style={styles.camIcon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.golden} strokeWidth={1.6}>
            <Rect x={3} y={7} width={18} height={13} rx={3} /><Circle cx={12} cy={13.5} r={3.4} /><Path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.camName}>{cameraLabel(cam)}</Text>
          <Text style={styles.camMeta}>{cameraMeta(cam)}</Text>
        </View>
        <Text style={styles.change}>Change</Text>
      </Pressable>

      {cam.fixedLens ? (
        // Fixed-lens body: its built-in lens IS the kit — no lens picker (you can't attach
        // a lens to an X100 or a Q). Show the built-in as the honest, informative panel.
        <>
          <Text style={styles.section}>LENS</Text>
          <View style={styles.builtIn}>
            <Text style={styles.builtInLabel}>Built-in {fixedLensLabel(cam)} · f/{cam.fixedLens.maxAperture}</Text>
            <Text style={styles.builtInSub}>Your {cam.model} has a fixed lens — it’s your whole kit. Nothing to add.</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.section}>LENSES / FOCAL LENGTHS</Text>
          <View style={styles.chips}>
            {LENS_PRESETS.map((p) => {
              const on = selectedKeys.has(specKey(p.spec));
              return (
                <Pressable key={p.label} onPress={() => onToggleLens(p.spec)} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && styles.chipPressed]}>
                  <Text style={[styles.chipText, { color: on ? "#F0D9AE" : colors.muted3 }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {customLenses.length > 0 && (
            <View style={[styles.chips, { marginTop: 9 }]}>
              {customLenses.map((l) => (
                <Pressable key={specKey(l)} onPress={() => onRemoveLens(l)} android_ripple={{ color: "rgba(233,184,114,0.14)" }} style={({ pressed }) => [styles.chip, styles.chipOn, pressed && styles.chipPressed]}>
                  <Text style={[styles.chipText, { color: "#F0D9AE" }]}>{lensLabel(l)} · f/{l.maxAperture}  ✕</Text>
                </Pressable>
              ))}
            </View>
          )}

          {addOpen ? (
            <View style={styles.addForm}>
              <View style={styles.addRow}>
                <TextInput style={styles.addInput} placeholder="Focal (mm)" placeholderTextColor={colors.muted} keyboardType="numeric" value={focal} onChangeText={setFocal} />
                <Text style={styles.addDash}>–</Text>
                <TextInput style={styles.addInput} placeholder="to (zoom)" placeholderTextColor={colors.muted} keyboardType="numeric" value={focalTo} onChangeText={setFocalTo} />
              </View>
              <View style={styles.addRow}>
                <TextInput style={styles.addInput} placeholder="Max f/ (e.g. 1.8)" placeholderTextColor={colors.muted} keyboardType="numeric" value={aperture} onChangeText={setAperture} />
                <Pressable onPress={() => setMacro((v) => !v)} style={({ pressed }) => [styles.chip, macro ? styles.chipOn : styles.chipOff, pressed && styles.chipPressed]}>
                  <Text style={[styles.chipText, { color: macro ? "#F0D9AE" : colors.muted3 }]}>Macro</Text>
                </Pressable>
              </View>
              <View style={styles.addActions}>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => { setAddOpen(false); setFocal(""); setFocalTo(""); setAperture(""); setMacro(false); }}><Text style={styles.cancel}>Cancel</Text></Pressable>
                <Pressable onPress={submitLens} android_ripple={{ color: "rgba(233,184,114,0.2)" }} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}><Text style={styles.addBtnText}>Add</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAddOpen(true)} android_ripple={{ color: "rgba(255,255,255,0.06)" }} style={({ pressed }) => [styles.addLens, pressed && { opacity: 0.7 }]}>
              <Text style={styles.addLensText}>+ Add a lens (any focal + aperture)</Text>
            </Pressable>
          )}
        </>
      )}

      {/* The payoff of the screen (#B3) — the reward for setting gear. */}
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

      <Text style={styles.buildLabel}>Vantage · {buildLabel()}</Text>

      <CameraPicker visible={pickerOpen} currentId={cameraId} onPick={onPickCamera} onClose={() => setPickerOpen(false)} />
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
  change: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 13 },
  builtIn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 15 },
  builtInLabel: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 15 },
  builtInSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  chipPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  chipOn: { backgroundColor: "rgba(233,184,114,0.16)", borderColor: "rgba(233,184,114,0.5)" },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.hairline },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13.5 },
  addLens: { marginTop: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 13 },
  addLensText: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 14 },
  addForm: { marginTop: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 12, gap: 12 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: { flex: 1, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.hairline, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: colors.ink, fontFamily: fonts.sans, fontSize: 14 },
  addDash: { color: colors.muted, fontFamily: fonts.sans, fontSize: 15 },
  addActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  cancel: { color: colors.muted, fontFamily: fonts.sansMed, fontSize: 14 },
  addBtn: { backgroundColor: colors.golden, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 20 },
  addBtnText: { color: colors.onAccent, fontFamily: fonts.sansBold, fontSize: 14 },
  kitPanel: { marginTop: 24, backgroundColor: "rgba(233,184,114,0.07)", borderWidth: 1, borderColor: "rgba(233,184,114,0.22)", borderRadius: 16, padding: 16 },
  kitPanelLabel: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 12.5, letterSpacing: 0.6, marginBottom: 8 },
  kitSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, marginBottom: 12 },
  genrePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "rgba(233,184,114,0.12)", borderWidth: 1, borderColor: "rgba(233,184,114,0.35)" },
  genreText: { color: "#F0D9AE", fontFamily: fonts.sansSemi, fontSize: 13 },
  dashed2: { alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 14, padding: 14, marginTop: 22 },
  dashed2Text: { color: colors.muted3, fontFamily: fonts.sansMed, fontSize: 14 },
  buildLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, textAlign: "center", marginTop: 28, letterSpacing: 0.3 },
});
