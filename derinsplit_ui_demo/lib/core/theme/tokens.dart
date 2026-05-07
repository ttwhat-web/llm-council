import 'package:flutter/material.dart';

class DSColors {
  static const bgPrimary = Color(0xFF0B0B0F);
  static const bgSecondary = Color(0xFF141420);
  static const bgTertiary = Color(0xFF1B1B2A);
  static const surface = Color(0xFF252538);

  static const accentGold = Color(0xFFC8A24A);
  static const accentGoldLight = Color(0xFFE2C46E);
  static const accentGoldDark = Color(0xFFA8842F);

  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFFB5B5C5);
  static const textTertiary = Color(0xFF7A7A8C);

  static const success = Color(0xFF4ADE80);
  static const warning = Color(0xFFFBBF24);
  static const error = Color(0xFFF87171);
  static const info = Color(0xFF60A5FA);

  static const goldGradient = LinearGradient(
    colors: [accentGoldLight, accentGold, accentGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const heroGradient = LinearGradient(
    colors: [Color(0xFF0B0B0F), Color(0xFF1B1B2A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const auroraGradient = LinearGradient(
    colors: [
      Color(0xFF1B1B2A),
      Color(0xFF2A1F38),
      Color(0xFF1B1B2A),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Color glassFill = const Color(0xFFFFFFFF).withOpacity(0.04);
  static Color glassBorder = const Color(0xFFFFFFFF).withOpacity(0.08);
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
