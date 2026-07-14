import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Pressable, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
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
import { loadSavedIds, saveSavedIds } from "./lib/savedStorage";
import { tonightNudge } from "./lib/nudge";
import { nudgeCopy } from "./lib/nudgeCopy";
import { CheckInCard } from "./components/CheckInCard";
import { Commitment, JournalEntry, loadPending, savePending, loadJournal, saveJournal, shotCount } from "./lib/journal";
import { saveProfile, savePushToken } from "./lib/sync";
import { registerForPush } from "./lib/push";
import { tapFeedback, commitFeedback } from "./lib/haptics";

type Tab = "today" | "plan" | "bag";
const TABS: Tab[] = ["today", "plan", "bag"];

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular, Newsreader_500Medium,
    HankenGrotesk_400Regular, HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold, HankenGrotesk_700Bold,
  });

  const [tab, setTab] = useState<Tab>("today");
  const [detailOpen, setDetailOpen] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [openId, setOpenId] = useState<string>(HERO_ID);
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

  // Horizontal pager (N1): Today/Plan/Bag are three full-width pages; swipe and the
  // bottom bar both drive it and stay in sync. Detail rides above as an overlay so the
  // pager keeps its scroll position underneath.
  const { width: winWidth, height } = useWindowDimensions();
  // Cap the content to a phone-scale column on wide screens (web) so the UI doesn't
  // stretch edge-to-edge; on a real phone winWidth is already below the cap. The pager's
  // paging math uses this same capped width, so swipe + scrollTo stay consistent.
  const width = Math.min(winWidth, 440);
  const pagerRef = useRef<ScrollView>(null);
  const goToTab = (t: Tab) => {
    tapFeedback();
    pagerRef.current?.scrollTo({ x: TABS.indexOf(t) * width, animated: true });
    setTab(t);
  };
  // Keep the bottom bar in sync with a swipe. Driven from onScroll (not
  // onMomentumScrollEnd, which doesn't fire reliably on web) — only commits
  // once a page is more than halfway in view, and only on an actual change.
  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const next = TABS[i];
    if (next && next !== tab) setTab(next);
  };

  // Load the saved profile + journal once on launch, then persist on every change (G1/N4).
  useEffect(() => {
    Promise.all([loadLensIds(), loadCameraId(), loadPending(), loadJournal(), loadSavedIds()]).then(([ids, cam, pend, log, savedIds]) => {
      if (ids) setLenses(ids);
      if (cam) setCameraId(cam);
      setPending(pend);
      setJournal(log);
      if (savedIds) setSaved(savedIds);
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
      saveSavedIds(saved);
    }
  }, [lenses, cameraId, pending, journal, saved, hydrated]);
  // Mirror the gear profile to the cloud (anon sign-in + upsert) so the server can nudge.
  useEffect(() => {
    if (hydrated) saveProfile(cameraId, lenses);
  }, [cameraId, lenses, hydrated]);
  // Register this device for push once, and save its token to the profile (no-op on web).
  useEffect(() => {
    if (!hydrated) return;
    registerForPush().then((token) => { if (token) savePushToken(token); });
  }, [hydrated]);

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

  // Echo the Bag's "your kit shoots" payoff on Today (#B3) — a quiet reminder that
  // the picks are tuned to the gear. Humanized list of up to three genres.
  const kitEcho = kitGenres(cameraId, lenses).slice(0, 3).map((g) => g.toLowerCase());
  const kitEchoText = kitEcho.length === 0 ? null
    : kitEcho.length === 1 ? kitEcho[0]
    : `${kitEcho.slice(0, -1).join(", ")} & ${kitEcho[kitEcho.length - 1]}`;

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const toggleGoing = toggle(setGoing);
  const toggleSaved = toggle(setSaved);
  const toggleLens = toggle(setLenses);
  const openDetail = (id: string) => { setOpenId(id); setDetailOpen(true); };

  // Return loop (N4): "I'm going" records a commitment; a check-in resolves it into the journal.
  const commit = (spotId: string) => {
    const turningOn = !going.includes(spotId);
    commitFeedback();
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.column, { width }]}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {/* Today */}
        <ScrollView style={{ width, height }} contentContainerStyle={styles.content} alwaysBounceVertical overScrollMode="always">
          {dueSpot && <CheckInCard spotName={dueSpot.name} onWent={() => checkIn(dueSpot.id, true)} onSkipped={() => checkIn(dueSpot.id, false)} />}
          {gearBanner && lenses.length === 0 && <GearBanner onAdd={() => goToTab("bag")} onDismiss={() => setGearBanner(false)} />}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{`${now.toLocaleDateString("en-US", { weekday: "short" })} · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · good evening`.toUpperCase()}</Text>
              <Text style={styles.title}>Your shoot{"\n"}tonight</Text>
              {kitEchoText && <Text style={styles.kitEcho}>Your kit shoots {kitEchoText}.</Text>}
            </View>
            {/* Neutral gear/profile entry (#T4) — no mock initial (there's no name to
                derive), and it leads to the Bag tab instead of being a dead tap. */}
            <Pressable onPress={() => goToTab("bag")} accessibilityLabel="Your gear" accessibilityRole="button" hitSlop={8} android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true, radius: 24 }} style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.6 }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.muted3} strokeWidth={1.8}>
                <Circle cx={12} cy={8} r={3.4} />
                <Path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
              </Svg>
            </Pressable>
          </View>
          <InspirationHero
            spot={hero} goldenRange={goldenRange} gearLens={gearLens}
            confidence={verdict.confidence} go={verdict.go} whySignals={verdict.signals}
            isGoing={going.includes(hero.id)} whyOpen={whyOpen}
            onOpen={() => openDetail(hero.id)} onGo={() => commit(hero.id)} onToggleWhy={() => setWhyOpen((v) => !v)}
          />
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Best near you</Text>
            <Text style={styles.secCount}>{SPOTS.length} tonight</Text>
          </View>
          <View style={{ gap: 12 }}>
            {SPOTS.filter((s) => s.id !== hero.id).map((spot, i) => (
              <SpotRow key={spot.id} spot={spot} rank={i + 2} windowTime={windowTimeFor(spot.windowType)} onPress={() => openDetail(spot.id)} />
            ))}
          </View>
          {shotCount(journal) > 0 && (
            <View style={styles.journalSec}>
              <Text style={styles.secTitle}>Your shoots</Text>
              <Text style={styles.journalStat}>You've been out {shotCount(journal)} {shotCount(journal) === 1 ? "time" : "times"} — keep the streak going.</Text>
            </View>
          )}
        </ScrollView>

        {/* Plan */}
        <View style={{ width, height }}>
          <PlanScreen going={going} cameraId={cameraId} lensIds={lenses} windowTimeFor={windowTimeFor} onOpen={openDetail} onToggleGoing={commit} />
        </View>

        {/* Bag */}
        <View style={{ width, height }}>
          <BagScreen
            cameraId={cameraId} onPickCamera={(id) => { tapFeedback(); setCameraId(id); }}
            lensChips={LENS_CHIPS} selectedLensIds={lenses} kitGenres={kitGenres(cameraId, lenses)}
            styleOpen={styleOpen} stylePick={stylePick}
            onToggleLens={(id) => { tapFeedback(); toggleLens(id); }} onToggleStyle={() => setStyleOpen((v) => !v)} onPickStyle={(s) => { tapFeedback(); setStylePick(s); }}
          />
        </View>
      </ScrollView>

      {!detailOpen && !showLock && <BottomNav active={tab} onNavigate={goToTab} />}

      {/* Detail rides above the pager so the pager keeps its scroll position (N1). */}
      {detailOpen && (
        <View style={StyleSheet.absoluteFill}>
          <SpotDetail
            spot={getSpot(openId)} isGoing={going.includes(openId)} isSaved={saved.includes(openId)}
            onBack={() => setDetailOpen(false)} onToggleGoing={() => { commitFeedback(); toggleGoing(openId); }} onToggleSaved={() => { tapFeedback(); toggleSaved(openId); }}
          />
        </View>
      )}

      {showLock && (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen onEnter={() => { setShowLock(false); goToTab("today"); }} title={lockCopy.title} body={lockCopy.body} heroImg={hero.img} />
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, alignItems: "center" },
  column: { flex: 1 }, // phone-scale column, width capped + centered on wide (web) screens
  pager: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  content: { paddingTop: scr.padTop, paddingHorizontal: scr.padSide, paddingBottom: 118 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 22 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, marginTop: 6 },
  kitEcho: { color: colors.muted2, fontFamily: fonts.sans, fontSize: 13, marginTop: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#2a2a30", borderWidth: 1, borderColor: colors.hairline, justifyContent: "center", alignItems: "center" },
  secHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 },
  secTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22 },
  secCount: { color: colors.muted, fontFamily: fonts.sansSemi, fontSize: 13 },
  journalSec: { marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.hairline },
  journalStat: { color: colors.muted3, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 8 },
});
