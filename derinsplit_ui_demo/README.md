# DerinSplit – Flutter UI Demo (MVP, no backend)

Premium niche parfüm topluluğu için iki modüllü mobil uygulama: **Split (dekant)** ve **Pazar (marketplace)**. Bu repo, **backend kurmadan** ayağa kalkan bir Flutter UI demosudur. iOS, Android, Huawei (APK), Honor (APK) ve Web (canlı önizleme) hedefler.

> Tüm veriler `Fake*Repository` sınıflarından gelir. `Future.delayed` ile gerçekçi network gecikmesi simüle edilir.

## 📦 Stack

- Flutter 3.x (Material 3, Dark + Gold tema)
- `flutter_riverpod` (state)
- `go_router` (navigasyon, auth redirect, shell route + bottom nav)
- `dio` (sadece interceptor iskeleti — demoda gerçek çağrı yok)
- `intl`

## 🚀 Hızlı başlangıç

```bash
# 0) Flutter kurulu olmalı (3.19+)
flutter --version

# 1) Bağımlılıklar
flutter pub get

# 2) Web’de çalıştır (önerilir – en hızlı önizleme)
flutter run -d chrome

# 3) Mobilde çalıştır
flutter run -d ios
flutter run -d android
```

## 🌐 Canlı önizleme (preview link) almak

### Seçenek 1 – Netlify Drop (en kolay, 2 dk)
```bash
flutter build web --release
# build/web klasörünü https://app.netlify.com/drop adresine sürükle bırak
# https://<random>.netlify.app linki anında üretilir
```

### Seçenek 2 – Vercel
```bash
flutter build web --release
cd build/web
npx vercel --prod
```

### Seçenek 3 – Firebase Hosting
```bash
flutter build web --release
firebase init hosting   # public dir: build/web
firebase deploy --only hosting
```

## 📱 Platform desteği

| Platform | Durum | Not |
| --- | --- | --- |
| **Android** | ✅ | `flutter build apk` ile APK üretilebilir |
| **iOS** | ✅ | `flutter build ipa` (Xcode + Apple Developer hesabı) |
| **Huawei (HMS)** | ✅ APK | `flutter build apk` çıktısı doğrudan AppGallery’ye yüklenir; Push için MVP sonrası Huawei Push Kit önerilir |
| **Honor** | ✅ APK | Honor cihazlar Android tabanlıdır; Play Store olmayan cihazlarda APK doğrudan yüklenir |
| **Web** | ✅ | Önizleme + masaüstü demo için kullanılır |

> **Notlar:** MVP demosunda push notification, ödeme, harita gibi GMS/HMS özel servisleri YOKTUR; sadece UI + akış. Production aşamasında Firebase + HMS Push paralel entegrasyonu önerilir.

## 🧪 Demo Kontrol Paneli

Splash veya Login ekranındaki **logoya basılı tut** (long-press) ya da Profil → Ayarlar üzerinden:

- **Trusted Seller** toggle → Splitler sekmesinde "Split Aç" FAB
- **İlan Verebilir** toggle → Pazar sekmesinde "İlan Ver" FAB
- **Force Error** → Tüm repo çağrıları hata fırlatır (error state'i test et)
- **Force Empty** → Listeleri boş döndür (empty state'i test et)
- **Yüksek Trafik** → +900ms ek gecikme + Home'da canlı banner
- **Network Delay** → 0–2000ms slider (loading state'i test et)

## ✨ Polish Katmanı

- Glassmorphism kartlar (`GlassCard`, `AuroraBackdrop`)
- Hover-lift + tap-press scale micro-interactions
- Fade + slide page transitions (`fadeSlidePage`)
- Splash: elastic logo ölçek + altın shimmer wordmark
- Chat: animasyonlu typing indicator (yanıt geldiğinde)
- Listing Wizard AI step: streaming AI mesajları
  ```
  › AI authenticity check running...
  › OCR ile batch kodu okunuyor...
  › Batch code verified (simulated)
  › Görsel kalitesi ve şişe uyumu analiz ediliyor...
  › Risk score: LOW
  ```
- Publish başarısı: elastic check + altın CTA

## 🗺️ Ekranlar (SCR-001..SCR-017)

| Ekran | Path | Modül |
| --- | --- | --- |
| Splash | `/splash` | Auth |
| Onboarding (3 adım) | `/onboarding` | Auth |
| Login + OTP | `/login` | Auth |
| Home (Özet Vitrin) | `/home` | Home |
| Global Search | `/search` | Home |
| Notifications | `/notifications` | Home |
| Split List | `/splits` | Split |
| Split Detail | `/splits/:id` | Split |
| Split Request Sheet | (modal) | Split |
| Bottle Request | `/splits/:id/bottle` | Split |
| Payment | `/payment` | Transaction |
| Split Dashboard | `/dashboard/splits` | Split |
| Market List | `/market` | Pazar |
| Listing Detail | `/listings/:id` | Pazar |
| Listing Create (5 adım + AI stub) | `/listings/new` | Pazar |
| Sales Dashboard | `/dashboard/sales` | Pazar |
| Messages List | `/messages` | Mesaj |
| Message Detail | `/messages/:id` | Mesaj |
| Profile | `/profile` | Profil |
| Orders | `/orders` | Profil |
| Order Detail | `/orders/:id` | Profil |
| Settings | `/settings` | Profil |

## 🎨 Tasarım Sistemi

- **Tema:** Dark + Gold (Premium)
- **Tokenlar:** `lib/core/theme/tokens.dart`
- **Bileşenler:** `lib/core/widgets/` altında `DSPrimaryButton`, `DSSecondaryButton`, `DSMlChip`, `DSFilterChip`, `DSCard`, `DSBadge`, `RiskBadge`, `DSProgressBar`, `DSShimmer`, `DSInput`, `DSEmptyState`, `DSErrorState`, `DSLoading`

## 🔄 Akışlar (Demoda çalışan)

1. **Onboarding → Login → Home**
   - Login’de OTP ekranında "Demo: 123456 ile devam et" butonu kullanılabilir.
2. **Split List → Split Detail → ML seçimi → BottomSheet → Rezervasyon → Payment → Success**
3. **Market List → Listing Detail → Mesaj Gönder → Message Detail**
4. **Listing Create 5 adım → 3. adımda AI Analiz Et → risk skoru → 5. adımda Yayınla**

## 🧱 Proje Yapısı

```
lib/
  main.dart
  app.dart
  core/
    theme/   (tokens + theme)
    routing/ (app_router.dart)
    widgets/ (DS components + main_shell)
    network/ (dio + interceptor iskeleti)
    demo/    (demo state + control panel)
    models/  (User, Split, Listing, Message)
    utils/   (format helpers)
  features/
    auth/
    home/
    splits/
    market/
    messages/
    profile/
```

## 📋 MVP Backlog Eşleşmesi

Bu demo, `DerinSplit_AllInOne_Handoff_v1.0.md` belgesinde tanımlı SCR-001..SCR-017 ekranlarını ve Implementation Spec’deki kritik akışları **UI** seviyesinde karşılar. Backend entegrasyonu için `lib/core/network/dio_provider.dart` skeleton’ı hazırdır; gerçek BFF (OpenAPI stub’a göre) bağlanırken `Fake*Repository`'ler gerçek `*Repository`'lerle değiştirilir.

## 📝 Lisans

Proprietary – DerinSplit / www.derinsplit.com
