import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';

import LoadingScreen from './src/components/LoadingScreen';
import MissingUrlScreen from './src/components/MissingUrlScreen';
import OfflineScreen from './src/components/OfflineScreen';
import {
  COLORS,
  DERINSPLIT_URL,
  USER_AGENT_SUFFIX,
  isAllowedOrigin,
} from './src/config';

// Keep the native splash up until we know whether we have a URL to load.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Hide the native splash as soon as we know what to render.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Android hardware back button → WebView history navigation.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const handleReload = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handlePullRefresh = useCallback(() => {
    setRefreshing(true);
    if (webRef.current) {
      webRef.current.reload();
    }
    // The WebView will fire onLoadEnd which clears `refreshing` below.
  }, []);

  const handleNavStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  /**
   * Bounce off-domain links to the system browser. WhatsApp / mailto /
   * tel / external https are all routed out so the WebView only ever
   * shows the DerinSplit catalog.
   */
  const shouldStartLoad = useCallback((req: ShouldStartLoadRequest) => {
    if (req.url.startsWith('about:') || req.url.startsWith('data:')) return true;
    if (
      req.url.startsWith('mailto:') ||
      req.url.startsWith('tel:') ||
      req.url.startsWith('whatsapp:') ||
      req.url.startsWith('sms:') ||
      req.url.startsWith('intent://')
    ) {
      Linking.openURL(req.url).catch(() => undefined);
      return false;
    }
    if (req.url.startsWith('http')) {
      if (isAllowedOrigin(req.url)) return true;
      Linking.openURL(req.url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  const handleError = useCallback((e: WebViewErrorEvent) => {
    setLoading(false);
    setRefreshing(false);
    setError(e.nativeEvent?.description ?? 'Sayfa yüklenemedi');
  }, []);

  // ── Render branches ──────────────────────────────────────────────────

  if (!DERINSPLIT_URL) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <MissingUrlScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={COLORS.bg} translucent={false} />

      {/* Pull-to-refresh wrapper — RefreshControl on a 0-height ScrollView
          is the standard React-Native pattern for adding pull gestures
          to a WebView. */}
      <ScrollView
        contentContainerStyle={styles.fill}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={COLORS.goldLight}
            colors={[COLORS.gold]}
            progressBackgroundColor={COLORS.bgSoft}
          />
        }
        scrollEnabled={false}
      >
        <View style={styles.fill}>
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ uri: DERINSPLIT_URL }}
            applicationNameForUserAgent={USER_AGENT_SUFFIX}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            allowsBackForwardNavigationGestures
            decelerationRate="normal"
            bounces={false}
            pullToRefreshEnabled={Platform.OS === 'ios'}
            style={styles.webview}
            onLoadStart={() => {
              setError(null);
              setLoading(true);
            }}
            onLoadEnd={() => {
              setLoading(false);
              setRefreshing(false);
            }}
            onError={handleError}
            onHttpError={(e) => {
              const status = e.nativeEvent?.statusCode ?? 0;
              if (status >= 500) handleError(e as unknown as WebViewErrorEvent);
            }}
            onNavigationStateChange={handleNavStateChange}
            onShouldStartLoadWithRequest={shouldStartLoad}
          />

          {loading && !error && (
            <View pointerEvents="none" style={styles.overlay}>
              <LoadingScreen />
            </View>
          )}
          {error && (
            <View style={styles.overlay}>
              <OfflineScreen message={error} onRetry={handleReload} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  fill: {
    flex: 1,
    minHeight: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
