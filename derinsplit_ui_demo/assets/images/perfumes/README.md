# Perfume photo assets

Drop real product photography here to replace the procedural
`PerfumeImage` placeholders.

## Naming convention

Use a stable lowercase key based on the listing id (without the
`l_` prefix). Examples:

```
clive_hedonistic.jpg
xerjoff_alex2.jpg
nishane_hacivat.jpg
pdm_layton.jpg
roja_elysium.jpg
amouage_interlude.jpg
```

Recommended specs:

- **Format:** JPEG or WebP
- **Aspect ratio:** 1:1 (square) for catalog cards
- **Hero shots:** 16:9 or 21:9 (used by category cards on home)
- **Resolution:** 1200×1200 px or higher (CanvasKit will downsample)
- **Background:** dark, editorial. Black / charcoal with a single warm
  spot light or window-side lighting works best for the cinematic theme.

## How to wire a photo into the app

1. Drop the file into this directory (`assets/images/perfumes/`).
2. Confirm `pubspec.yaml` already declares the directory:
   ```yaml
   flutter:
     assets:
       - assets/images/perfumes/
   ```
3. Pass `assetPath` to `PerfumeImage`:
   ```dart
   PerfumeImage(
     assetPath: 'assets/images/perfumes/clive_hedonistic.jpg',
     mood: PerfumeMood.oud,        // fallback mood if asset missing
     aspectRatio: 1,
   )
   ```
   `PerfumeImage` falls back to its placeholder if the asset can't be
   resolved, so you can ship partial assets without breaking the UI.

## Hero backdrop

The home hero uses an inline gradient backdrop. To switch to a real
hero photo, set `assetPath` on the `_HeroBackdrop` widget in
`lib/features/home/presentation/cinematic_home_screen.dart`.
