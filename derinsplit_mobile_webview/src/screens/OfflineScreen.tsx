import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config';

interface Props {
  /** Optional contextual message — defaults to a friendly Turkish line. */
  message?: string;
  onRetry: () => void;
}

/**
 * Shown when network is unavailable OR the WebView fails to load. Gives
 * the user a single primary action: retry.
 */
export default function OfflineScreen({ message, onRetry }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <Text style={styles.iconGlyph}>⌀</Text>
      </View>
      <Text style={styles.eyebrow}>BAĞLANTI YOK</Text>
      <Text style={styles.title}>Sayfa yüklenemedi</Text>
      <Text style={styles.body}>
        {message ?? 'İnternet bağlantınızı kontrol edip tekrar deneyin.'}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Tekrar dene"
      >
        <Text style={styles.btnLabel}>TEKRAR DENE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  iconGlyph: {
    color: COLORS.goldLight,
    fontSize: 26,
    lineHeight: 28,
  },
  eyebrow: {
    color: COLORS.goldLight,
    fontSize: 10.5,
    letterSpacing: 3,
    fontWeight: '800',
    marginBottom: 10,
  },
  title: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnLabel: {
    color: COLORS.bg,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
  },
});
