import React from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";
import { img } from "../lib/spots";

export function LockScreen({ onEnter, title, body, heroImg }: {
  onEnter: () => void; title: string; body: string; heroImg: string;
}) {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, "");
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <ImageBackground source={img(heroImg)} style={styles.root}>
      <LinearGradient colors={["rgba(246,185,94,0.85)", "rgba(214,138,60,0.7)", "rgba(74,70,104,0.85)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(10,9,12,0.5)", "rgba(20,12,8,0.1)", "rgba(10,9,12,0.95)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.clock}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>

      <Pressable style={styles.notif} onPress={onEnter}>
        <View style={styles.notifHead}>
          <View style={styles.appIcon}><Text style={styles.appIconText}>V</Text></View>
          <Text style={styles.appName}>VANTAGE</Text>
          <Text style={styles.ago}>now</Text>
        </View>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifBody}>{body}</Text>
      </Pressable>

      <Text style={styles.tagline}>OWN THE LIFE, NOT THE LIGHT</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-start" },
  clock: { position: "absolute", top: 96, left: 0, right: 0, alignItems: "center" },
  date: { color: "rgba(244,241,234,0.85)", fontFamily: fonts.sansMed, fontSize: 15 },
  time: { color: colors.ink, fontFamily: fonts.sansMed, fontSize: 78, letterSpacing: -2, lineHeight: 80, marginTop: 2 },
  notif: { position: "absolute", left: 16, right: 16, bottom: 150, backgroundColor: "rgba(24,22,26,0.62)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 22, padding: 15 },
  notifHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 },
  appIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.goldenBright, justifyContent: "center", alignItems: "center" },
  appIconText: { fontFamily: fonts.serifMed, fontSize: 20, color: "#1a1408" },
  appName: { color: "rgba(244,241,234,0.9)", fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.6 },
  ago: { marginLeft: "auto", color: "rgba(244,241,234,0.55)", fontFamily: fonts.sans, fontSize: 12 },
  notifTitle: { color: colors.ink, fontFamily: fonts.serifMed, fontSize: 19, lineHeight: 22 },
  notifBody: { color: "rgba(244,241,234,0.78)", fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 5 },
  tagline: { position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", color: "rgba(244,241,234,0.4)", fontFamily: fonts.sansMed, fontSize: 12, letterSpacing: 2 },
});
