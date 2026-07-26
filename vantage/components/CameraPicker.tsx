import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, TextInput, SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, screen } from "../theme";
import { safeTop } from "../lib/safeArea";
import { CAMERAS, type Camera } from "../lib/gear";
import { cameraLabel, cameraMeta } from "../lib/gearProfile";

// The camera-body picker (gear overhaul · Phase 1). A searchable, brand-grouped list —
// the catalog is ~70+ Fuji/Sony/Leica bodies, so a flat chip row won't do. Rendered as a
// modal over the Bag screen; a virtualized SectionList keeps it smooth as the catalog grows.
const BRAND_ORDER = ["Fujifilm", "Sony", "Leica"];

export function CameraPicker({
  visible, currentId, onPick, onClose,
}: {
  visible: boolean; currentId: string; onPick: (id: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (c: Camera) => !q || `${c.brand} ${c.model}`.toLowerCase().includes(q);
    return BRAND_ORDER.map((brand) => ({
      brand,
      data: CAMERAS
        .filter((c) => c.brand === brand && match(c))
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0)), // newest first
    })).filter((s) => s.data.length > 0);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: safeTop(insets, 12, 48) }]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Your camera</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Done" hitSlop={10} android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true, radius: 20 }}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search Fujifilm · Sony · Leica…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <SectionList
            sections={sections}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
            ListEmptyComponent={<Text style={styles.empty}>No match — try a model name.</Text>}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHead}>{section.brand.toUpperCase()}</Text>}
            renderItem={({ item }) => {
              const on = item.id === currentId;
              return (
                <Pressable
                  onPress={() => { onPick(item.id); onClose(); }}
                  accessibilityRole="button"
                  accessibilityLabel={cameraLabel(item)}
                  accessibilityState={{ selected: on }}
                  android_ripple={{ color: "rgba(233,184,114,0.12)" }}
                  style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, on && { color: "#F0D9AE" }]}>{cameraLabel(item)}</Text>
                    <Text style={styles.rowMeta}>{cameraMeta(item)}{item.year ? ` · ${item.year}` : ""}</Text>
                  </View>
                  {on && <Text style={styles.check} allowFontScaling={false}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Full-height sheet (a peek of dimmed backdrop at the very top): the search pins to the
  // top so the soft keyboard never covers it, and the results list fills the whole screen
  // above the keyboard (dismiss-on-drag reveals the rest). Avoids the bottom-sheet + keyboard
  // clash where the keyboard ate the list.
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { flex: 1, backgroundColor: colors.canvas, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: screen.padSide, paddingTop: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 24 },
  close: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 15 },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.chip, paddingHorizontal: 16, paddingVertical: 11, color: colors.ink, fontFamily: fonts.sans, fontSize: 15, marginBottom: 10 },
  sectionHead: { color: colors.golden, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface, marginBottom: 8 },
  rowOn: { borderColor: "rgba(233,184,114,0.5)", backgroundColor: "rgba(233,184,114,0.10)" },
  rowName: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 15 },
  rowMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2 },
  check: { color: colors.golden, fontFamily: fonts.sansBold, fontSize: 16 },
  empty: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14, textAlign: "center", marginTop: 30 },
});
