import 'package:flutter/material.dart';

import 'tokens.dart';

ThemeData buildDerinSplitTheme() {
  final base = ThemeData.dark(useMaterial3: true);

  final textTheme = base.textTheme.apply(
    bodyColor: DSColors.textPrimary,
    displayColor: DSColors.textPrimary,
    fontFamily: 'Roboto',
  );

  return base.copyWith(
    scaffoldBackgroundColor: DSColors.bgPrimary,
    colorScheme: const ColorScheme.dark(
      primary: DSColors.accentGold,
      secondary: DSColors.accentGoldLight,
      surface: DSColors.bgSecondary,
      error: DSColors.error,
      onPrimary: DSColors.bgPrimary,
      onSecondary: DSColors.bgPrimary,
      onSurface: DSColors.textPrimary,
      onError: DSColors.textPrimary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: DSColors.bgPrimary,
      surfaceTintColor: DSColors.bgPrimary,
      foregroundColor: DSColors.textPrimary,
      centerTitle: true,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: DSColors.textPrimary,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
      iconTheme: IconThemeData(color: DSColors.textPrimary),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: DSColors.bgSecondary,
      selectedItemColor: DSColors.accentGold,
      unselectedItemColor: DSColors.textTertiary,
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
    ),
    cardTheme: CardTheme(
      color: DSColors.bgSecondary,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DSRadius.card),
        side: const BorderSide(color: DSColors.surface, width: 1),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: DSColors.bgTertiary,
      hintStyle: const TextStyle(color: DSColors.textTertiary),
      labelStyle: const TextStyle(color: DSColors.textSecondary),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DSRadius.input),
        borderSide: const BorderSide(color: DSColors.surface),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DSRadius.input),
        borderSide: const BorderSide(color: DSColors.surface),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DSRadius.input),
        borderSide: const BorderSide(color: DSColors.accentGold, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DSRadius.input),
        borderSide: const BorderSide(color: DSColors.error),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: DSColors.surface,
      thickness: 1,
      space: 1,
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: DSColors.bgTertiary,
      contentTextStyle: TextStyle(color: DSColors.textPrimary),
      behavior: SnackBarBehavior.floating,
    ),
    textTheme: textTheme,
  );
}
