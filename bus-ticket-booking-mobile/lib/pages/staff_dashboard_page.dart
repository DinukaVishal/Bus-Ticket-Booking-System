import 'package:bus_ticket_booking_mobile/pages/staff_home_page.dart';
import 'package:bus_ticket_booking_mobile/pages/qr_scanner_page.dart';
import 'package:bus_ticket_booking_mobile/widgets/map.dart';
import 'package:bus_ticket_booking_mobile/widgets/bottom_nav_bar_staff.dart';
import 'package:flutter/material.dart';
import '../services/supabase_service.dart';

class StaffDashboardPage extends StatefulWidget {
  const StaffDashboardPage({super.key});

  @override
  State<StaffDashboardPage> createState() => _StaffDashboardPageState();
}

class _StaffDashboardPageState extends State<StaffDashboardPage> {
  // NOT final — setState reassigns this below.
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    StaffHomePage(),
    GoogleMapWidget(),
  ];

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  Future<void> _openScanner() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QrScannerPage()),
    );

    if (code == null || !mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('QR Code: $code')),
    );

    // TODO: validate the ticket against Supabase here.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bus Staff Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: _openScanner,
            tooltip: 'Scan ticket',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavBarStaff(
        onTabChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}
