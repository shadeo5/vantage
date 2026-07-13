import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar } from "react-native";
import { useFonts } from "expo-font";
import { Newsreader_400Regular, Newsreader_500Medium } from "@expo-google-fonts/newsreader";
import {
  HankenGrotesk_400Regular, HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold, HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";

import { colors, fonts, screen as scr } from "./theme";
import { SPOTS, getSpot, HERO_ID } from "./lib/spots";
import { getLightWindows, goldenWindowLabel, fmtTime } from "./lib/light";
import { GearBanner } from "./components/GearBanner";
import { InspirationHero } from "./components/InspirationHero";
import { SpotRow } from "./components/SpotRow";
import { SpotDetail } from "./components/SpotDetail";
import { BottomNav } from "./components/BottomNav";
import { LockScreen } from "./components/LockScreen";
import { BagScreen } from "./components/BagScreen";
import { PlanScreen } from "./components/PlanScreen";
import { LENS_CHIPS, DEFAULT_CAMERA_ID, DEFAULT_LENS_IDS, kitGenres, primaryLensLabel, bestLensForGenre } from "./lib/gearProfile";
import { loadLensIds, saveLensIds, loadCameraId, saveCameraId } from "./lib/gearStorage";
import { tonightNudge } from "./lib/nudge";
import { nudgeCopy } from "./lib/nudgeCopy";
import { CheckInCard } from "./components/CheckInCard";
import { Commitment, JournalEntry, loadPending, savePending, loadJournal, saveJournal, shotCount } from "./lib/journal";

type Screen = "lock" | "today" | "plan" | "bag" | "detail";

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular, Newsreader_500Medium,
    HankenGrotesk_400Regular, HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold, HankenGrotesk_700Bold,
  });

  const [screen, setScreen] = useState<Screen>("lock");
  const [openId, setOpenId] = useState<string>(HERO_ID);
  const [detailFrom, setDetailFrom] = useState<Screen>("today");
  const [going, setGoing] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>(["piedmont"]);
  const [gearBanner, setGearBanner] = useState(true);
  const [whyOpen, setWhyOpen] = useState(false);
  const [lenses, setLenses] = useState<string[]>(DEFAULT_LENS_IDS);
  const [cameraId, setCameraId] = useState<string>(DEFAULT_CAMERA_ID);
  const [styleOpen, setStyleOpen] = useState(false);
  const [stylePick, setStylePick] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState<Commitment[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [dueIds, setDueIds] = useState<string[]>([]);

  // Load the saved profile + journal once on launch, then persist on every change (G1/N4).
  useEffect(() => {
    Promise.all([loadLensIds(), loadCameraId(), loadPending(), loadJournal()]).then(([ids, cam, pend, log]) => {
      if (ids) setLenses(ids);
      if (cam) setCameraId(cam);
      setPending(pend);
      setJournal(log);
      setDueIds(pend.map((c) => c.spotId)); // commitments from a prior session → due to check in
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) {
      saveLensIds(lenses);
      saveCameraId(cameraId);
      savePending(pending);
      saveJournal(journal);
    }
  }, [lenses, cameraId, pending, journal, hydrated]);

  if (!fontsLoaded) return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.golden} /></View>;

  const now = new Date();
  // The nudge brain (N1) decides tonight's pick + whether it's worth going out.
  const verdict = tonightNudge(now, cameraId, lenses);
  const hero = verdict.spot;
  const windows = getLightWindows(now, hero.lat, hero.lon);
  const goldenRange = goldenWindowLabel(windows);
  const goldenStart = fmtTime(windows.goldenEvening.start);
  const blueStart = fmtTime(windows.blueEvening.start);
  const windowTimeFor = (t: string) => (t === "blue" ? blueStart : goldenStart);

  // Lens to name in the lede — the one that actually fits the hero's genre.
  const gearLens = bestLensForGenre(cameraId, lenses, hero.genre) ?? primaryLensLabel(lenses);
  // Fresh, personal push copy for the lock screen (N3).
  const lockCopy = nudgeCopy(verdict, gearLens, now);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const toggleGoing = toggle(setGoing);
  const toggleSaved = toggle(setSaved);
  const toggleLens = toggle(setLenses);
  const openDetail = (id: string, from: Screen) => { setOpenId(id); setDetailFrom(from); setScreen("detail"); };

  // Return loop (N4): "I'm going" records a commitment; a check-in resolves it into the journal.
  const commit = (spotId: string) => {
    const turningOn = !going.includes(spotId);
    toggleGoing(spotId);
    if (turningOn) setPending((p) => (p.some((c) => c.spotId === spotId) ? p : [...p, { spotId, at: now.toISOString() }]));
  };
  const checkIn = (spotId: string, went: boolean) => {
    setJournal((j) => [...j, { spotId, at: now.toISOString(), went }]);
    setPending((p) => p.filter((c) => c.spotId !== spotId));
    setDueIds((d) => d.filter((id) => id !== spotId));
  };
  const dueCommitment = pending.find((c) => dueIds.includes(c.spotId));
  const dueSpot = dueCommitment ? getSpot(dueCommitment.spotId) : null;

  const navVisible = screen === "today" || screen === "plan" || screen === "bag";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {screen === "lock" && (
        <LockScreen onEnter={() => setScreen("today")} title={lockCopy.title} body={lockCopy.body} heroImg={hero.img} />
      )}

      {screen === "today" && (
        <ScrollView contentContainerStyle={styles.content}>
          {dueSpot && <CheckInCard spotName={dueSpot.name} onWent={() => checkIn(dueSpot.id, true)} onSkipped={() => checkIn(dueSpot.id, false)} />}
          {gearBanner && <GearBanner onAdd={() => setScreen("bag")} onDismiss={() => setGearBanner(false)} />}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{`${now.toLocaleDateString("en-US", { weekday: "short" })} · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · good evening`.toUpperCase()}</Text>
              <Text style={styles.title}>Your shoot{"\n"}tonight</Text>
            </View>
            <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
          </View>
          <InspirationHero
            spot={hero} goldenRange={goldenRange} gearLens={gearLens}
            confidence={verdict.confidence} go={verdict.go} whySignals={verdict.signals}
            isGoing={going.includes(hero.id)} whyOpen={whyOpen}
            onOpen={() => openDetail(hero.id, "today")} onGo={() => commit(hero.id)} onToggleWhy={() => setWhyOpen((v) => !v)}
          />
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Best near you</Text>
            <Text style={styles.secCount}>{SPOTS.length} tonight</Text>
          </View>
          <View style={{ gap: 12 }}>
            {SPOTS.filter((s) => s.id !== hero.id).map((spot, i) => (
              <SpotRow key={spot.id} spot={spot} rank={i + 2} windowTime={windowTimeFor(spot.windowType)} onPress={() => openDetail(spot.id, "today")} />
            ))}
          </View>
          {shotCount(journal) > 0 && (
            <View style={styles.journalSec}>
              <Text style={styles.secTitle}>Your shoots</Text>
              <Text style={styles.journalStat}>You've been out {shotCount(journal)} {shotCount(journal) === 1 ? "time" : "times"} — keep the streak going.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {screen === "plan" && (
        <PlanScreen going={going} cameraId={cameraId} lensIds={lenses} windowTimeFor={windowTimeFor} onOpen={(id) => openDetail(id, "plan")} onToggleGoing={commit} />
      )}

      {screen === "bag" && (
        <BagScreen
          cameraId={cameraId} onPickCamera={setCameraId}
          lensChips={LENS_CHIPS} selectedLensIds={lenses} kitGenres={kitGenres(cameraId, lenses)}
          styleOpen={styleOpen} stylePick={stylePick}
          onToggleLens={toggleLens} onToggleStyle={() => setStyleOpen((v) => !v)} onPickStyle={setStylePick}
          onContinue={() => setScreen("today")}
        />
      )}

      {screen === "detail" && (
        <SpotDetail
          spot={getSpot(openId)} isGoing={going.includes(openId)} isSaved={saved.includes(openId)}
          onBack={() => setScreen(detailFrom)} onToggleGoing={() => toggleGoing(openId)} onToggleSaved={() => toggleSaved(openId)}
        />
      )}

      {navVisible && <BottomNav active={screen as "today" | "plan" | "bag"} onNavigate={setScreen} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { justifyContent: "center", alignItems: "center" },
  content: { paddingTop: scr.padTop, paddingHorizontal: scr.padSide, paddingBottom: 118 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 22 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, marginTop: 6 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#2a2a30", borderWidth: 1, borderColor: colors.hairline, justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 15 },
  secHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 },
  secTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22 },
  secCount: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 13 },
  journalSec: { marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.hairline },
  journalStat: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 8 },
});
