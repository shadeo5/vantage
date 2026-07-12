// Vantage design tokens — from the current design (docs/design/handoff_v2/)
export const colors = {
  canvas: "#0F0F11",
  surface: "#161618",
  surfaceSubtle: "#141416",
  ink: "#F4F1EA",
  muted: "#8C8A93",
  muted2: "#9b98a2",
  muted3: "#c4c1cb",
  golden: "#E9B872",
  goldenBright: "#F2A93B",
  blueHour: "#7FA0CF",
  flat: "#9DB89A",
  crowdLow: "#7FB07A",
  crowdMed: "#E0B15A",
  crowdHigh: "#D17A6B",
  saved: "#E07A8B",
  hairline: "rgba(255,255,255,0.07)",
  onAccent: "#15110a",
};

// Font family names come from the @expo-google-fonts packages (see App.tsx useFonts).
export const fonts = {
  serif: "Newsreader_400Regular",
  serifMed: "Newsreader_500Medium",
  sans: "HankenGrotesk_400Regular",
  sansMed: "HankenGrotesk_500Medium",
  sansSemi: "HankenGrotesk_600SemiBold",
  sansBold: "HankenGrotesk_700Bold",
};

export const radius = { card: 20, chip: 20, pill: 999 };

export const screen = { padTop: 64, padSide: 20, padBottom: 40 };

// Tonal gradients used behind photo-less area cards (varied by index).
export const cardGradients: [string, string][] = [
  ["#3a2a18", "#1c1610"],
  ["#23314a", "#151a26"],
  ["#2a3a2a", "#161c16"],
  ["#3a2330", "#1f1620"],
  ["#2e2c3a", "#17161f"],
];
