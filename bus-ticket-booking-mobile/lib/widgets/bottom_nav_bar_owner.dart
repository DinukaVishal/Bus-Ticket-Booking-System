import 'package:flutter/material.dart';

class BottomNavBarOwner extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTabChanged;

  const BottomNavBarOwner({
    Key? key,
    required this.currentIndex,
    required this.onTabChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTabChanged,

      // Make the colors explicit
      backgroundColor: Colors.white,
      selectedItemColor: Colors.purple,
      unselectedItemColor: Colors.grey,

      // Prevent the selected item from moving/zooming
      type: BottomNavigationBarType.fixed,

      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.directions_bus),
          label: 'Bus Details',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.groups),
          label: 'Crew Details',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}