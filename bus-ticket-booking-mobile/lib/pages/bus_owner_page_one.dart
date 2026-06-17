import 'package:flutter/material.dart';

class BusOwnerPageOne extends StatelessWidget {
  const BusOwnerPageOne({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(
        child: Text(
          'Welcome to Page 1',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}