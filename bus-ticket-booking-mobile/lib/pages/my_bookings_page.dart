import 'package:flutter/material.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class MyBookingsPage extends StatefulWidget {
  const MyBookingsPage({super.key});

  @override
  State<MyBookingsPage> createState() => _MyBookingsPageState();
}

class _MyBookingsPageState extends State<MyBookingsPage> {
  List<BookingRecord> _bookings = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      _bookings = await SupabaseService.fetchMyBookings();
    } catch (error) {
      _errorMessage = 'Unable to load your bookings. Please try again.';
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = SupabaseService.currentUser?.email ?? 'Guest';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Signed in as $email', style: const TextStyle(fontSize: 14, color: Colors.grey)),
              const SizedBox(height: 16),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _errorMessage != null
                        ? Center(child: Text(_errorMessage!))
                        : _bookings.isEmpty
                            ? const Center(child: Text('No bookings yet. Start by searching for a trip.'))
                            : RefreshIndicator(
                                onRefresh: _loadBookings,
                                child: ListView.separated(
                                  itemCount: _bookings.length,
                                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                                  itemBuilder: (context, index) {
                                    final booking = _bookings[index];
                                    return Card(
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      child: Padding(
                                        padding: const EdgeInsets.all(18),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(booking.routeName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                                ),
                                                Text(booking.status, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text('Seat ${booking.seatNumber} • ${booking.travelDate.day}/${booking.travelDate.month}/${booking.travelDate.year}'),
                                            const SizedBox(height: 6),
                                            Text('Booked on ${booking.createdAt.day}/${booking.createdAt.month}/${booking.createdAt.year}', style: const TextStyle(color: Colors.grey)),
                                            const SizedBox(height: 8),
                                            Text('Booking code: ${booking.bookingId}', style: const TextStyle(fontWeight: FontWeight.w500)),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
