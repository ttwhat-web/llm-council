import 'package:flutter/material.dart';

class DSColors {
  // Cinematic luxury palette — deep midnight + warm ivory + venetian gold
  static const bgPrimary = Color(0xFF06070A);       // saf siyah değil, hafif mavi-mor underglow
  static const bgSecondary = Color(0xFF121218);     // card surface (alpha applied where used)
  static const bgTertiary = Color(0xFF1A1A24);
  static const surface = Color(0xFF24242F);

  // Warm venetian gold (more amber than yellow)
  static const accentGold = Color(0xFFC8A24A);
  static const accentGoldLight = Color(0xFFE8C879);
  static const accentGoldDark = Color(0xFF8E6F2C);

  // Ivory/parchment text — never pure white (luxury houses never use #FFF)
  static const textPrimary = Color(0xFFF5F1E8);
  static const textSecondary = Color(0xB8F5F1E8);   // 0.72 opacity
  static const textTertiary = Color(0x80F5F1E8);    // 0.50 opacity

  static const success = Color(0xFF6BB77B);
  static const warning = Color(0xFFD4A65B);
  static const error = Color(0xFFD97373);
  static const info = Color(0xFF7896C8);

  static const goldGradient = LinearGradient(
    colors: [accentGoldLight, accentGold, accentGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const heroGradient = LinearGradient(
    colors: [Color(0xFF06070A), Color(0xFF0E0F18)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Slightly warm aurora for splash / mode select
  static const auroraGradient = LinearGradient(
    colors: [
      Color(0xFF0A0B12),
      Color(0xFF15101C),
      Color(0xFF0A0B12),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Glass tones — tuned for the cinematic palette
  static Color glassFill = const Color(0xFFF5F1E8).withOpacity(0.04);
  static Color glassBorder = const Color(0xFFC8A24A).withOpacity(0.18);
  static Color goldGlow = const Color(0xFFC8A24A).withOpacity(0.25);
}

class DSSpacing {
  static const double xs = 4;
  static const double s = 8;
  static const double m = 12;
  static const double l = 16;
  static const double xl = 24;
  static const double xxl = 32;
}

class DSRadius {
  static const double input = 12;
  static const double card = 16;
  static const double chip = 22;
  static const double button = 12;
}
