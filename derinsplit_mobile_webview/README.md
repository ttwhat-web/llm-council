# DerinSplit Mobile

Native iOS / Android shell that opens the live **https://derinsplit.com**
site in a fullscreen WebView. No local catalog, no mock data, no separate
UI — whatever the web admin/sync panel changes shows up in the app, because
the app just opens the live site.

## Run

```bash
cd derinsplit_mobile_webview
npm install
npx expo start          # press i (iOS) / a (Android) / scan QR
```

The app opens `https://derinsplit.com/login?callbackUrl=/` directly.

To point at a different domain (staging), set `EXPO_PUBLIC_DERINSPLIT_URL`
in a `.env` file — otherwise it defaults to production.

### Watching logs

The shell logs the full WebView lifecycle to the Metro console so a blank
screen is never a mystery:

```
[App] selected DERINSPLIT_URL: https://derinsplit.com/login?callbackUrl=/
[DerinSplitWebView] mount — selected URL: ...
[DerinSplitWebView] onLoadStart: ...
[DerinSplitWebView] onLoadEnd: ...
[DerinSplitWebView] onError { code, description }       # network / SSL / etc.
[DerinSplitWebView] onHttpError { statusCode, ... }     # 5xx
```

On a failure the in-app error screen shows the raw `description` **and**
the `HTTP <statusCode>` so you can diagnose without a cable.

## If Expo Go won't open the app

Expo Go from the App Store / Play Store only runs the **latest** Expo SDK.
This project targets **SDK 51**, so a freshly-installed Expo Go may refuse
to open it ("incompatible SDK"). The reliable path is a **development
build** — your own dev client that bundles the exact native modules:

```bash
npm install -g eas-cli
eas login
eas build:configure

# iOS Simulator dev client
eas build -p ios --profile development
# Android dev client APK (install on device / emulator)
eas build -p android --profile development

# then run Metro and open the dev client instead of Expo Go:
npx expo start --dev-client
```

A development build is also the only way to test push, deep links, and
custom native config — Expo Go can't.

## Build (EAS)

`eas.json` ships two ready profiles:

| Profile       | Android         | iOS              |
| ------------- | --------------- | ---------------- |
| `development` | dev-client APK  | simulator client |
| `preview`     | APK             | simulator        |
| `production`  | app-bundle (aab)| store build      |

```bash
npm install -g eas-cli
eas login
eas build:configure

# preview test builds
eas build -p android --profile preview     # internal APK
eas build -p ios     --profile preview     # simulator build

# production + store submit
eas build  -p all --profile production
eas submit -p ios
eas submit -p android
```
