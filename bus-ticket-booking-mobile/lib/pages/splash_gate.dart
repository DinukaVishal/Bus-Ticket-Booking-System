import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import 'home_page.dart';
import 'login_page.dart';
import 'quickbus_loading_screen.dart';

/// Shows the QuickBus loading animation for one full loop, then replaces itself
/// with the home page (signed in) or the login page (signed out).
class SplashGate extends StatefulWidget {
  const SplashGate({super.key, required this.onToggleTheme});

  final VoidCallback onToggleTheme;

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    // One pass of the loading animation (kLoop = 3.6s).
    await Future.delayed(const Duration(milliseconds: 3600));

    if (!mounted) return;
    final signedIn = SupabaseService.currentUser != null;

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 450),
        pageBuilder: (_, _, _) => signedIn
            ? HomePage(onToggleTheme: widget.onToggleTheme)
            : const LoginPage(),
        transitionsBuilder: (_, a, _, child) =>
            FadeTransition(opacity: a, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => const QuickBusLoadingScreen();
}
