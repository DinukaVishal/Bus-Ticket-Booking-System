import 'package:flutter/material.dart';
import '../services/supabase_service.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.onToggleTheme});

  final VoidCallback onToggleTheme;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final gradientColors = isDark
        ? [colorScheme.primary.withAlpha(20), colorScheme.surface]
        : [colorScheme.primary.withAlpha(31), const Color(0xFFF4F5FF)];

    return Scaffold(
      appBar: AppBar(
        title: const Text('QuickBus'),
        actions: [
          IconButton(
            icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
            onPressed: onToggleTheme,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await SupabaseService.signOut();
              if (context.mounted) {
                Navigator.pushReplacementNamed(context, '/login');
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: gradientColors,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.deepPurple.withAlpha(20),
                          blurRadius: 30,
                          offset: const Offset(0, 15),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello,',
                          style: TextStyle(fontSize: 16, color: colorScheme.onSurface.withValues(alpha: 184)),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Welcome to QuickBus',
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          SupabaseService.currentUser?.email ?? 'Signed in user',
                          style: TextStyle(fontSize: 16, color: colorScheme.onSurface.withValues(alpha: 217)),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Book tickets, view trips, and manage your profile with ease.',
                          style: TextStyle(fontSize: 15, color: colorScheme.onSurface.withValues(alpha: 184)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: ListView(
                      physics: const BouncingScrollPhysics(),
                      children: [
                        _HomeCard(
                          icon: Icons.directions_bus_filled,
                          title: 'Book Tickets',
                          subtitle: 'Search buses and reserve seats',
                          onTap: () => Navigator.pushNamed(context, '/search'),
                        ),
                        const SizedBox(height: 16),
                        _HomeCard(
                          icon: Icons.receipt_long,
                          title: 'My Bookings',
                          subtitle: 'View upcoming and past trips',
                          onTap: () => Navigator.pushNamed(context, '/my-bookings'),
                        ),
                        const SizedBox(height: 16),
                        _HomeCard(
                          icon: Icons.person_outline,
                          title: 'Profile',
                          subtitle: 'Update your account details',
                          onTap: () => Navigator.pushNamed(context, '/profile'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
class _HomeCard extends StatelessWidget {
  const _HomeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: theme.brightness == Brightness.dark ? Colors.black26 : const Color.fromRGBO(0, 0, 0, 0.06),
              blurRadius: 18,
              spreadRadius: 1,
            ),
          ],
        ),
        padding: const EdgeInsets.all(18),
            child: Row(
          children: [
            CircleAvatar(
              radius: 26,
                  backgroundColor: Theme.of(context).colorScheme.primary.withAlpha(31),
              child: Icon(icon, size: 28, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withAlpha(179)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.black38),
          ],
        ),
      ),
    );
  }
}
