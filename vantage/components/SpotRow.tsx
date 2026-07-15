import React from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable } from "react-native";
import { colors, fonts } from "../theme";
import { Spot, spotImageSource, windowMeta } from "../lib/spots";

export function SpotRow({ spot, rank, windowTime, onPress }: { spot: Spot; rank: number; windowTime: string; onPress: () => void }) {
  const wm = windowMeta(spot.windowType);
  return (
    <Pressable onPress={onPress} android_ripple={{ color: "rgba(255,255,255,0.06)" }} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <ImageBackground source={spotImageSource(spot)} style={styles.thumb} imageStyle={styles.thumbImg}>
        <Text style={styles.rank}>{rank}</Text>
      </ImageBackground>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>
        <Text style={styles.reason} numberOfLines={1}>{spot.reason}</Text>
        <View style={styles.meta}>
          <Text style={[styles.window, { color: wm.color }]}>{wm.icon} {wm.label} · {windowTime}</Text>
          {spot.distance ? <Text style={styles.dist}>{spot.distance}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 13, alignItems: "center", backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 11, overflow: "hidden" },
  rowPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  thumb: { width: 74, height: 74, justifyContent: "flex-start" },
  thumbImg: { borderRadius: 12 },
  rank: { margin: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  body: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17 },
  reason: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 13, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 },
  window: { fontFamily: fonts.sansSemi, fontSize: 12 },
  dist: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
});
