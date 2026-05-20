import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color ink900 = Color(0xFF1A1917);
  static const Color ink600 = Color(0xFF6B6860);
  static const Color ink400 = Color(0xFFA8A49E);
  static const Color paper100 = Color(0xFFFAFAF8);
  static const Color paper200 = Color(0xFFF2EFE9);
  static const Color ink200 = Color(0xFFD4D0CB);
  static const Color paper300 = Color(0xFFE8E4DD);
  static const Color accent = Color(0xFF1A1A2E);
  static const Color green = Color(0xFF16A34A);
  static const Color amber = Color(0xFFD97706);
  static const Color red = Color(0xFFDC2626);
  static const Color blue = Color(0xFF1D4ED8);

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: paper100,
    colorScheme: ColorScheme.light(
      primary: accent,
      secondary: ink600,
      surface: paper100,
      error: red,
    ),
    textTheme: GoogleFonts.dmSansTextTheme().copyWith(
      displayLarge: GoogleFonts.playfairDisplay(color: ink900, fontWeight: FontWeight.w400),
      displayMedium: GoogleFonts.playfairDisplay(color: ink900, fontWeight: FontWeight.w400),
      headlineLarge: GoogleFonts.playfairDisplay(color: ink900, fontWeight: FontWeight.w400),
      headlineMedium: GoogleFonts.playfairDisplay(color: ink900, fontWeight: FontWeight.w400),
      headlineSmall: GoogleFonts.playfairDisplay(color: ink900, fontWeight: FontWeight.w400),
      bodyLarge: GoogleFonts.dmSans(color: ink900, fontWeight: FontWeight.w300),
      bodyMedium: GoogleFonts.dmSans(color: ink900, fontWeight: FontWeight.w300),
      bodySmall: GoogleFonts.dmSans(color: ink600, fontWeight: FontWeight.w300),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: paper100,
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: paper300,
      titleTextStyle: GoogleFonts.playfairDisplay(color: ink900, fontSize: 20, fontWeight: FontWeight.w400),
      iconTheme: const IconThemeData(color: ink900),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: paper300)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: paper300)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: accent, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      labelStyle: GoogleFonts.dmSans(color: ink600, fontSize: 13),
      hintStyle: GoogleFonts.dmSans(color: ink400, fontSize: 14, fontWeight: FontWeight.w300),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: paper100,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w400),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ink900,
        side: const BorderSide(color: paper300),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w400),
      ),
    ),
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: paper300)),
    ),
    dividerTheme: const DividerThemeData(color: paper300, thickness: 1),
    chipTheme: ChipThemeData(
      backgroundColor: paper200,
      labelStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w400),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: const BorderSide(color: paper300),
    ),
  );
}
