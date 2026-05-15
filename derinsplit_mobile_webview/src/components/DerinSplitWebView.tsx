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
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';

import LoadingScreen from '../screens/LoadingScreen';
import OfflineScreen from '../screens/OfflineScreen';
import { COLORS, USER_AGENT_SUFFIX, isAllowedOrigin } from '../config';

interface Props {
  /** Resolved DerinSplit URL — caller guarantees this is non-empty. */
  url: string;
}

/**
 * Fullscreen WebView shell.
 *
 * Owns:
 *   - load lifecycle (`loading` → `error` → retry)
 *   - pull-to-refresh (RefreshControl on iOS, native bounce on Android)
 *   - Android hardware-back → WebView history
 *   - external-link guard: anything outside the configured DerinSplit
 *     domain (or non-http schemes like mailto/tel/whatsapp/sms/intent)
 *     is bounced to the system browser via Linking
 *   - reload by bumping a `key`, which fully recreates the WebView
 */
export default function DerinSplitWebView({ url }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Android hardware back → WebView history navigation
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
  }, []);

  const handleNavStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  /**
   * External-link guard. The WebView only ever shows the DerinSplit
   * catalog; everything else opens in the system browser / native app.
   */
  const shouldStartLoad = useCallback((req: ShouldStartLoadRequest) => {
    if (req.url.startsWith('about:') || req.url.startsWith('data:')) {
      return true;
    }
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

  return (
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
      // The WebView captures touch — we only need the ScrollView for the
      // RefreshControl gesture, so don't let it scroll on its own.
      scrollEnabled={false}
    >
      <View style={styles.fill}>
        <WebView
          key={reloadKey}
          ref={webRef}
          source={{ uri: url }}
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
            // Treat 5xx as fatal; ignore 4xx (asset 404s, etc.)
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
  );
}

const styles = StyleSheet.create({
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
