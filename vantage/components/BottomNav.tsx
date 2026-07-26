import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Rect, Path } from "react-native-svg";
import { colors, fonts } from "../theme";
import { safeBottom } from "../lib/safeArea";

type Tab = "today" | "plan" | "bag";
const ACTIVE = colors.golden;
const INACTIVE = "#9a97a1"; // brighter than before so inactive icons don't get lost

export function BottomNav({ active, onNavigate }: { active: Tab; onNavigate: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={["rgba(15,15,17,0)", colors.canvas]} style={[styles.bar, { paddingBottom: safeBottom(insets, 12, 30) }]}>
      <Item label="Today" active={active === "today"} onPress={() => onNavigate("today")} icon={TodayIcon} />
      <Item label="Plan" active={active === "plan"} onPress={() => onNavigate("plan")} icon={PlanIcon} />
      <Item label="Bag" active={active === "bag"} onPress={() => onNavigate("bag")} icon={BagIcon} />
    </LinearGradient>
  );
}

function Item({ label, active, onPress, icon: Icon }: { label: string; active: boolean; onPress: () => void; icon: (c: string) => React.ReactNode }) {
  const color = active ? ACTIVE : INACTIVE;
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: active }}
      android_ripple={{ color: "rgba(233,184,114,0.18)", borderless: true, radius: 44 }}
      hitSlop={8}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>{Icon(color)}</View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const TodayIcon = (c: string) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
    <Circle cx={12} cy={12} r={4.2} /><Line x1={12} y1={2.5} x2={12} y2={5} /><Line x1={12} y1={19} x2={12} y2={21.5} />
    <Line x1={2.5} y1={12} x2={5} y2={12} /><Line x1={19} y1={12} x2={21.5} y2={12} />
  </Svg>
);
const PlanIcon = (c: string) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
    <Rect x={3.5} y={4.5} width={17} height={16} rx={3} /><Line x1={3.5} y1={9} x2={20.5} y2={9} />
    <Line x1={8} y1={2.5} x2={8} y2={6} /><Line x1={16} y1={2.5} x2={16} y2={6} />
  </Svg>
);
const BagIcon = (c: string) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
    <Rect x={3} y={7} width={18} height={13} rx={3} /><Circle cx={12} cy={13.5} r={3.4} /><Path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
  </Svg>
);

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 12 },
  item: { flex: 1, alignItems: "center", gap: 5 },
  pressed: { opacity: 0.6 },
  iconWrap: { width: 52, height: 30, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: "rgba(233,184,114,0.14)" }, // subtle gold pill marks the active tab
  label: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 0.3 },
});
