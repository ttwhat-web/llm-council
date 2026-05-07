import 'package:flutter/material.dart';

class DSColors {
  static const bgPrimary = Color(0xFF0A0A0A);
  static const bgSecondary = Color(0xFF141414);
  static const bgTertiary = Color(0xFF1E1E1E);
  static const surface = Color(0xFF2A2A2A);

  static const accentGold = Color(0xFFD4AF37);
  static const accentGoldLight = Color(0xFFE5C158);
  static const accentGoldDark = Color(0xFFB8960C);

  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFFB0B0B0);
  static const textTertiary = Color(0xFF808080);

  static const success = Color(0xFF4CAF50);
  static const warning = Color(0xFFFFC107);
  static const error = Color(0xFFF44336);
  static const info = Color(0xFF2196F3);

  static const goldGradient = LinearGradient(
    colors: [accentGoldLight, accentGold, accentGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const heroGradient = LinearGradient(
    colors: [Color(0xFF000000), Color(0xFF1A1A1A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
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
