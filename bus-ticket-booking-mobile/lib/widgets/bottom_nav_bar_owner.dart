import 'package:flutter/material.dart';

class BottomNavBarOwner extends StatefulWidget {
  final Function(int) onTabChanged;

  const BottomNavBarOwner({
    Key? key,
    required this.onTabChanged,
  }) : super(key: key);

  @override
  State<BottomNavBarOwner> createState() => _BottomNavBarOwnerState();
}

class _BottomNavBarOwnerState extends State<BottomNavBarOwner> {
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
          icon: Icon(Icons.favorite),
          label: 'Test 1',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.settings),
          label: 'Test 2',
        ),
      ],
    );
  }
}
