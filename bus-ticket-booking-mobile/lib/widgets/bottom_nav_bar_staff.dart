import 'package:flutter/material.dart';

class BottomNavBarStaff extends StatefulWidget {
  final Function(int) onTabChanged;

  const BottomNavBarStaff({
    Key? key,
    required this.onTabChanged,
  }) : super(key: key);

  @override
  State<BottomNavBarStaff> createState() => _BottomNavBarStaffState();
}

class _BottomNavBarStaffState extends State<BottomNavBarStaff> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: _selectedIndex,
      onTap: (int index) {
        setState(() {
          _selectedIndex = index;
        });
        widget.onTabChanged(index);
      },
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.map),
          label: 'Map',
        ),
      ],
    );
  }
}
