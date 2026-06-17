import 'package:flutter/material.dart';

class BusOwnerPageTwo extends StatelessWidget {
  const BusOwnerPageTwo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(
        child: Text(
          'Welcome to Page 2',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}