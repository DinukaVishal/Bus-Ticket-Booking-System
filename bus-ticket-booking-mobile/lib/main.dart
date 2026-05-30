import 'package:flutter/material.dart';
import 'models/booking_models.dart';
import 'pages/booking_summary_page.dart';
import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/my_bookings_page.dart';
import 'pages/profile_page.dart';
import 'pages/search_page.dart';
import 'pages/select_seat_page.dart';
import 'pages/signup_page.dart';
import 'services/supabase_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  ThemeMode _themeMode = ThemeMode.system;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    final lightColorScheme = ColorScheme.fromSeed(seedColor: Colors.deepPurple);
    final darkColorScheme = ColorScheme.fromSeed(seedColor: Colors.deepPurple, brightness: Brightness.dark);

    return MaterialApp(
      title: 'QuickBus',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        colorScheme: lightColorScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF4F5FF),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: Colors.deepPurple.shade900,
          iconTheme: IconThemeData(color: Colors.deepPurple.shade900),
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          hintStyle: TextStyle(color: Colors.grey.shade500),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(22),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(22),
            borderSide: BorderSide(color: Colors.deepPurple.shade100, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.deepPurple,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            minimumSize: const Size.fromHeight(56),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: Colors.deepPurple,
            textStyle: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 8,
          shadowColor: Colors.deepPurple.withAlpha(26),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        ),
      ),
      darkTheme: ThemeData(
        colorScheme: darkColorScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: darkColorScheme.onSurface,
          iconTheme: IconThemeData(color: darkColorScheme.onSurface),
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1F2937),
          hintStyle: TextStyle(color: Colors.grey.shade400),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(22),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(22),
            borderSide: BorderSide(color: darkColorScheme.primary.withAlpha(80), width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: darkColorScheme.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            minimumSize: const Size.fromHeight(56),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: darkColorScheme.primary,
            textStyle: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF111827),
          elevation: 8,
          shadowColor: Colors.black26,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        ),
      ),
      initialRoute: SupabaseService.currentUser != null ? '/home' : '/login',
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/home': (context) => HomePage(onToggleTheme: _toggleTheme),
        '/search': (context) => const SearchPage(),
        '/my-bookings': (context) => const MyBookingsPage(),
        '/profile': (context) => const ProfilePage(),
      },
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/select-seat':
            final arguments = settings.arguments as Map<String, dynamic>?;
            if (arguments == null) return null;
            return MaterialPageRoute(
              builder: (_) => SelectSeatPage(
                route: arguments['route'] as RouteOption,
                trip: arguments['trip'] as TripOption,
                travelDate: arguments['date'] as DateTime,
              ),
            );
          case '/booking-summary':
            final arguments = settings.arguments as Map<String, dynamic>?;
            if (arguments == null) return null;
            return MaterialPageRoute(
              builder: (_) => BookingSummaryPage(
                route: arguments['route'] as RouteOption,
                trip: arguments['trip'] as TripOption,
                travelDate: arguments['travelDate'] as DateTime,
                seatNumber: arguments['seatNumber'] as int,
              ),
            );
          default:
            return null;
        }
      },
    );
  }
}
