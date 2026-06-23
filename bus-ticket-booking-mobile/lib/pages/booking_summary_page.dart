import 'package:flutter/material.dart';
import '../models/booking_models.dart';

class BookingSummaryPage extends StatefulWidget {
  const BookingSummaryPage({
    super.key,
    required this.route,
    required this.trip,
    required this.travelDate,
    required this.seatNumbers,
  });

  final RouteOption route;
  final TripOption trip;
  final DateTime travelDate;
  final List<int> seatNumbers;

  @override
  State<BookingSummaryPage> createState() => _BookingSummaryPageState();
}

class _BookingSummaryPageState extends State<BookingSummaryPage> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _selectedPaymentMethod = 'Card';
  final List<String> _paymentMethods = ['Card', 'Mobile Money'];
  String _selectedGender = 'male';
  final List<String> _genderOptions = ['male', 'female'];

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

    Navigator.pushNamed(
      context,
      '/payment',
      arguments: {
        'route': widget.route,
        'trip': widget.trip,
        'travelDate': widget.travelDate,
        'seatNumbers': widget.seatNumbers,
        'passengerName': passengerName,
        'passengerPhone': passengerPhone,
        'paymentMethod': _selectedPaymentMethod,
        'gender': _selectedGender,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final route = widget.route;
    final trip = widget.trip;

    final totalPrice = trip.price * widget.seatNumbers.length;
    final seatsLabel = widget.seatNumbers.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review & Pay'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(22),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Trip details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
                              Text(route.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 18, color: Colors.deepPurple),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text('${route.from} → ${route.to}', style: const TextStyle(fontSize: 14))),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  const Icon(Icons.event_seat_outlined, size: 18, color: Colors.deepPurple),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text('Seats ${seatsLabel.join(', ')}', style: const TextStyle(fontSize: 14))),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 8,
                                runSpacing: 6,
                                children: seatsLabel.map((seat) {
                                  return Chip(
                                    label: Text('Seat $seat'),
                                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${trip.departureTime} - ${trip.arrivalTime}', style: const TextStyle(fontSize: 14)),
                                  Text(route.duration, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary.withAlpha(20),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Total amount', style: TextStyle(fontSize: 14, color: Colors.grey)),
                                    const SizedBox(height: 4),
                                    Text('LKR ${totalPrice.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(22),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Passenger details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
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
                              const SizedBox(height: 18),
                              const Text('Passenger gender', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 10),
                              DropdownButtonFormField<String>(
                                initialValue: _selectedGender,
                                decoration: const InputDecoration(labelText: 'Gender'),
                                items: _genderOptions.map((gender) {
                                  return DropdownMenuItem(value: gender, child: Text(gender[0].toUpperCase() + gender.substring(1)));
                                }).toList(),
                                onChanged: (value) {
                                  if (value == null) return;
                                  setState(() {
                                    _selectedGender = value;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(22),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Payment method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
                              DropdownButtonFormField<String>(
                                initialValue: _selectedPaymentMethod,
                                decoration: const InputDecoration(labelText: 'Payment method'),
                                items: _paymentMethods.map((method) {
                                  return DropdownMenuItem(value: method, child: Text(method));
                                }).toList(),
                                onChanged: (value) {
                                  if (value == null) return;
                                  setState(() {
                                    _selectedPaymentMethod = value;
                                  });
                                },
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'You will continue to a secure payment gateway after confirming your booking details.',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: ElevatedButton(
          onPressed: _confirmBooking,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          ),
          child: const Text('Proceed to payment', style: TextStyle(fontSize: 16)),
        ),
      ),
    );
  }
}
