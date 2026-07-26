import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
//
// The root is wrapped in SafeAreaProvider so every screen can read real device
// insets via useSafeAreaInsets (the app drives top/bottom padding from them
// rather than hardcoding for one device). `initialMetrics` seeds the insets on
// first paint so there's no frame of zero-inset layout on launch. (.ts file, so
// the tree is built with createElement rather than JSX.)
registerRootComponent(() =>
  createElement(SafeAreaProvider, { initialMetrics: initialWindowMetrics }, createElement(App)),
);
