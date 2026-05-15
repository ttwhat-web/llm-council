import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config';

/**
 * Renders when EXPO_PUBLIC_DERINSPLIT_URL is not set. Spelled out so the
 * developer sees exactly which env var to fill instead of a blank screen.
 */
export default function MissingUrlScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>YAPILANDIRMA HATASI</Text>
      <Text style={styles.title}>DerinSplit URL tanımlı değil.</Text>
      <Text style={styles.body}>
        Bu uygulamayı çalıştırmak için bir DerinSplit web URL'i gerekiyor.
      </Text>
      <View style={styles.codeBlock}>
        <Text style={styles.code}>EXPO_PUBLIC_DERINSPLIT_URL=https://...</Text>
      </View>
      <Text style={styles.body}>
        Değeri proje kökünde <Text style={styles.mono}>.env</Text> dosyasına
        yazın ve <Text style={styles.mono}>npx expo start --clear</Text> ile
        yeniden başlatın.
      </Text>
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
  eyebrow: {
    color: COLORS.error,
    fontSize: 10.5,
    letterSpacing: 3,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 360,
  },
  codeBlock: {
    backgroundColor: 'rgba(245,241,232,0.06)',
    borderColor: 'rgba(245,241,232,0.10)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
  },
  code: {
    color: COLORS.goldLight,
    fontFamily: 'Courier',
    fontSize: 12.5,
  },
  mono: {
    fontFamily: 'Courier',
    color: COLORS.goldLight,
  },
});
