import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';

import LoadingScreen from '../screens/LoadingScreen';
import OfflineScreen from '../screens/OfflineScreen';
import { COLORS, USER_AGENT_SUFFIX, isAllowedOrigin } from '../config';

const TAG = '[DerinSplitWebView]';

interface Props {
  /** Resolved DerinSplit URL — caller guarantees this is non-empty. */
  url: string;
}

interface ErrorState {
  description: string;
  statusCode?: number;
}

/**
 * Fullscreen WebView shell.
 *
 * NOTE: the WebView is rendered as a direct flex child — NOT wrapped in a
 * ScrollView. Wrapping a react-native-webview in a ScrollView is a known
 * footgun that collapses the WebView to 0 height (blank screen). Pull-to-
 * refresh is provided by the WebView's own `pullToRefreshEnabled` on iOS;
 * on Android the website + the in-app retry handle refresh.
 */
export default function DerinSplitWebView({ url }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    console.log(`${TAG} mount — selected URL:`, url);
  }, [url]);

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
    console.log(`${TAG} retry pressed — recreating WebView`);
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleNavStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  /**
   * External-link guard. Only same registrable-domain URLs stay in-app;
   * everything else (other domains, mailto/tel/whatsapp/sms/intent) opens
   * in the system browser.
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
      console.log(`${TAG} external scheme → system browser:`, req.url);
      Linking.openURL(req.url).catch(() => undefined);
      return false;
    }
    if (req.url.startsWith('http')) {
      if (isAllowedOrigin(req.url)) return true;
      console.log(`${TAG} off-domain → system browser:`, req.url);
      Linking.openURL(req.url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  const handleError = useCallback((e: WebViewErrorEvent) => {
    const { description, code } = e.nativeEvent;
    console.warn(`${TAG} onError`, { code, description });
    setLoading(false);
    setError({
      description: description || 'Bilinmeyen WebView hatası',
      statusCode: typeof code === 'number' ? code : undefined,
    });
  }, []);

  const handleHttpError = useCallback((e: WebViewHttpErrorEvent) => {
    const { statusCode, description, url: failedUrl } = e.nativeEvent;
    console.warn(`${TAG} onHttpError`, { statusCode, description, failedUrl });
    // Only surface server failures (5xx). 4xx on sub-assets shouldn't blank
    // the whole shell.
    if (statusCode >= 500) {
      setLoading(false);
      setError({
        description: description || `Sunucu hatası (${statusCode})`,
        statusCode,
      });
    }
  }, []);

  return (
    <View style={styles.fill}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri: url }}
        applicationNameForUserAgent={USER_AGENT_SUFFIX}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled={Platform.OS === 'ios'}
        style={styles.webview}
        containerStyle={styles.fill}
        onLoadStart={(e) => {
          console.log(`${TAG} onLoadStart:`, e.nativeEvent.url);
          setError(null);
          setLoading(true);
        }}
        onLoadEnd={(e) => {
          console.log(`${TAG} onLoadEnd:`, e.nativeEvent.url);
          setLoading(false);
        }}
        onError={handleError}
        onHttpError={handleHttpError}
        onNavigationStateChange={handleNavStateChange}
        onShouldStartLoadWithRequest={shouldStartLoad}
        renderError={undefined}
      />

      {loading && !error && (
        <View pointerEvents="none" style={styles.overlay}>
          <LoadingScreen />
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <OfflineScreen
            message={error.description}
            statusCode={error.statusCode}
            onRetry={handleReload}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
