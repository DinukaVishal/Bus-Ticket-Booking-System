import 'package:bus_ticket_booking_mobile/pages/bus_owner_page_one.dart';
import 'package:bus_ticket_booking_mobile/pages/bus_owner_page_two.dart';
import 'package:flutter/material.dart';
import 'package:bus_ticket_booking_mobile/widgets/bottom_nav_bar_owner.dart';
import 'bus_owner_home_page.dart';
import '../services/supabase_service.dart';

class BusOwnerDashboardPage extends StatefulWidget {
  const BusOwnerDashboardPage({Key? key}) : super(key: key);

  @override
  State<BusOwnerDashboardPage> createState() => _BusOwnerDashboardPageState();
}

class _BusOwnerDashboardPageState extends State<BusOwnerDashboardPage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const BusOwnerHomePage(),
    const BusOwnerPageOne(),
    const BusOwnerPageTwo(),
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
        title: const Text('Bus Owner Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavBarOwner(
        onTabChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}