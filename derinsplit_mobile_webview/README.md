# DerinSplit Mobile (WebView shell)

Native iOS / Android shell that wraps the deployed DerinSplit web site
(`derinsplit_web_mvp`) inside a fullscreen WebView. Ürün yönetimi web
tarafında kalır; uygulama tek bir kod tabanı olarak iki mağazaya çıkar
ve site güncellendiğinde içerik otomatik tazelenir.

## Stack

- Expo 51 (managed workflow)
- React Native 0.74
- `react-native-webview` 13
- `expo-splash-screen` + `expo-status-bar` + `expo-network`
- TypeScript

## Quick start

```bash
cd derinsplit_mobile_webview
npm install

# point the shell at your live web preview
cp .env.example .env
# edit .env → EXPO_PUBLIC_DERINSPLIT_URL=https://<your-vercel>.vercel.app

npx expo start                    # Metro + QR; press `i` (iOS sim) / `a` (Android)
```

If `EXPO_PUBLIC_DERINSPLIT_URL` is empty the app shows a clear in-app
"DerinSplit URL tanımlı değil" screen with the env-var name baked in.

### Config — env variables

| Variable                          | Required | Default | Notes                                  |
| --------------------------------- | -------- | ------- | -------------------------------------- |
| `EXPO_PUBLIC_DERINSPLIT_URL`      | **yes**  | —       | The HTTPS URL the WebView opens.       |
| `EXPO_PUBLIC_USER_AGENT_SUFFIX`   | no       | `DerinSplit-Mobile/1.0` | Appended to the WebView UA. |

`EXPO_PUBLIC_*` is the official Expo prefix that gets inlined into the
JS bundle at build time, so EAS production builds pick up whatever you
set without an extra config layer.

## What the shell does

- **Fullscreen WebView** loading `EXPO_PUBLIC_DERINSPLIT_URL`
- **Loading screen** (gold emblem + animated wordmark + spinner) while
  the page boots; native splash is held until the JS layer takes over.
- **Offline / error screen** with a single "TEKRAR DENE" button
- **Pull-to-refresh** (native iOS bounce + Android `RefreshControl`)
- **Android hardware back** → WebView history navigation
- **External links** (other domains, `mailto:`, `tel:`, `whatsapp:`) are
  bounced to the system browser via `Linking.openURL` so the WebView only
  ever shows the DerinSplit catalog.
- **Status bar** light + brand-bg, status bar respects the safe area.

## Production builds (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure                    # one-time, picks up app.json
eas build -p ios     --profile preview # ad-hoc / TestFlight
eas build -p android --profile preview # APK / internal track
eas submit -p ios                      # → App Store Connect
eas submit -p android                  # → Google Play
```

To bake the URL into the production build:

```bash
EXPO_PUBLIC_DERINSPLIT_URL=https://www.derinsplit.com \
  eas build -p all --profile production
```

## Asset placeholders

`assets/{icon,adaptive-icon,splash,favicon}.png` are programmatic
placeholders (gold disc + halo on brand-bg). Replace with real artwork
before store submission — Expo accepts PNGs at the same paths.

## How content stays fresh

The WebView always loads the live URL. Anything Kuzey adds via the web
admin panel (`/admin/products/new` or `/admin/import`) is served by
the next `npx expo start --clear` cold-load and after every pull-to-
refresh — no app re-deploy required.
