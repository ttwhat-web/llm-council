import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../config';

/**
 * Splash-style loading screen shown while the WebView fetches the first
 * paint. Renders the DerinSplit wordmark with a subtle shimmer + a gold
 * `ActivityIndicator` so the brand is the first thing the user sees.
 */
export default function LoadingScreen() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.55, 1, 0.55],
  });

  return (
    <View style={styles.root}>
      <View style={styles.emblem}>
        <View style={styles.emblemInner} />
      </View>
      <Animated.Text style={[styles.wordmark, { opacity }]}>
        DERİN  SPLIT
      </Animated.Text>
      <Text style={styles.tagline}>PRIVATE COLLECTOR CLUB</Text>
      <ActivityIndicator
        color={COLORS.goldLight}
        size="small"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  emblemInner: {
    width: 8,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
  },
  wordmark: {
    fontSize: 18,
    letterSpacing: 4.5,
    fontWeight: '800',
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 10,
    fontSize: 9.5,
    letterSpacing: 3,
    fontWeight: '700',
    color: COLORS.inkTertiary,
  },
  spinner: { marginTop: 36 },
});
