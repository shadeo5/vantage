// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/ is the Deno nightly push — a different runtime with jsr:/npm: imports the
    // Node/Expo linter can't resolve (tsconfig excludes it for the same reason). dist/.expo
    // are build output.
    ignores: ["dist/*", ".expo/*", "supabase/**"],
  },
  {
    rules: {
      // React Native <Text> renders apostrophes/quotes fine — this is a web-DOM rule, and
      // Vantage is copy-heavy ("tonight's", "you're"). Off by design.
      "react/no-unescaped-entities": "off",

      // The new React-Compiler-era rules (react-hooks v6, added by eslint-config-expo 57)
      // flag idiomatic patterns already shipped and tested here — notably the standard
      // `useRef(new Animated.Value()).current` animation ref. Surface them as guidance, but
      // don't block `npm run check`. Tracked as clean-up in docs/BACKLOG.md (DX).
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
