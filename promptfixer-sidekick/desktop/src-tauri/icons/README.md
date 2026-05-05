# Icons

Drop your branded icons into this directory before running `npm run tauri:build`.
The Tauri config expects:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico`  (Windows)

Generate them with:

```bash
npm install -g @tauri-apps/cli
cd desktop/src-tauri
tauri icon ../../public/logo.png
```

`tauri icon` will write all sizes into this folder.
