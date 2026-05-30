import 'package:flutter/material.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class BookingSummaryPage extends StatefulWidget {
  const BookingSummaryPage({
    super.key,
    required this.route,
    required this.trip,
    required this.travelDate,
    required this.seatNumber,
  });

  final RouteOption route;
  final TripOption trip;
  final DateTime travelDate;
  final int seatNumber;

  @override
  State<BookingSummaryPage> createState() => _BookingSummaryPageState();
}

class _BookingSummaryPageState extends State<BookingSummaryPage> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _confirmBooking() async {
    final passengerName = _fullNameController.text.trim();
    final passengerPhone = _phoneController.text.trim();

    if (passengerName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your full name to continue.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await SupabaseService.createBooking(
        route: widget.route,
        trip: widget.trip,
        travelDate: widget.travelDate,
        seatNumber: widget.seatNumber,
        passengerName: passengerName,
        passengerPhone: passengerPhone,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking confirmed! See it under My Bookings.')),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/my-bookings', (route) => route.settings.name == '/home');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: ${error.toString()}')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final route = widget.route;
    final trip = widget.trip;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Summary'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Trip details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Text(route.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('${route.from} → ${route.to} • Seat ${widget.seatNumber}'),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${trip.departureTime} - ${trip.arrivalTime}'),
                          Text(route.duration, style: const TextStyle(color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Fare: LKR ${trip.price.toStringAsFixed(2)}', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text('Passenger details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _fullNameController,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone number (optional)'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 22),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _confirmBooking,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: _isSubmitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Confirm booking', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
