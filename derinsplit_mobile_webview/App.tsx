import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import DerinSplitWebView from './src/components/DerinSplitWebView';
import MissingUrlScreen from './src/screens/MissingUrlScreen';
import { COLORS, DERINSPLIT_URL } from './src/config';

// Hold the native splash up until the JS shell has decided what to render
// (the configured WebView vs. the missing-URL guard). `hideAsync` is
// awaited inside Shell so the gold splash dissolves into the loading
// screen without a flash of background colour.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  useEffect(() => {
    console.log('[App] selected DERINSPLIT_URL:', DERINSPLIT_URL);
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={COLORS.bg} translucent={false} />
      {DERINSPLIT_URL ? (
        <DerinSplitWebView url={DERINSPLIT_URL} />
      ) : (
        <MissingUrlScreen />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
