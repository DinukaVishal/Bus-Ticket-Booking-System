import 'package:bus_ticket_booking_mobile/pages/staff_home_page.dart';
import 'package:bus_ticket_booking_mobile/widgets/map.dart';
import 'package:flutter/material.dart';
import 'package:bus_ticket_booking_mobile/widgets/bottom_nav_bar_staff.dart';
import '../services/supabase_service.dart';

class StaffDashboardPage extends StatefulWidget {
  const StaffDashboardPage({Key? key}) : super(key: key);

  @override
  State<StaffDashboardPage> createState() => _StaffDashboardPageState();
}

class _StaffDashboardPageState extends State<StaffDashboardPage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const StaffHomePage(),
    const GoogleMapWidget()
  ];

  
  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bus Staff Dashboard'),
        actions: [
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