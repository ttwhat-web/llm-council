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

## Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure

# test builds
eas build -p android --profile preview     # APK
eas build -p ios     --profile preview     # TestFlight

# production + store submit
eas build  -p all --profile production
eas submit -p ios
eas submit -p android
```
