import 'package:flutter/material.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class PaymentGatewayPage extends StatefulWidget {
  const PaymentGatewayPage({
    super.key,
    required this.route,
    required this.trip,
    required this.travelDate,
    required this.seatNumbers,
    required this.passengerName,
    required this.passengerPhone,
    required this.paymentMethod,
    required this.gender,
  });

  final RouteOption route;
  final TripOption trip;
  final DateTime travelDate;
  final List<int> seatNumbers;
  final String passengerName;
  final String passengerPhone;
  final String paymentMethod;
  final String gender;

  @override
  State<PaymentGatewayPage> createState() => _PaymentGatewayPageState();
}

class _PaymentGatewayPageState extends State<PaymentGatewayPage> {
  final _formKey = GlobalKey<FormState>();
  final _cardNameController = TextEditingController();
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvcController = TextEditingController();
  final _mobileMoneyController = TextEditingController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _cardNameController.dispose();
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvcController.dispose();
    _mobileMoneyController.dispose();
    super.dispose();
  }

  Future<bool> _simulatePayHereCheckout() async {
    await Future.delayed(const Duration(seconds: 2));
    return true;
  }

  Future<void> _handlePayment() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isProcessing = true;
    });

    try {
      final paymentSuccess = await _simulatePayHereCheckout();
      if (!paymentSuccess) throw Exception('PayHere sandbox authorization failed.');

      await SupabaseService.createBooking(
        route: widget.route,
        trip: widget.trip,
        travelDate: widget.travelDate,
        seatNumbers: widget.seatNumbers,
        passengerName: widget.passengerName,
        passengerPhone: widget.passengerPhone,
        paymentMethod: widget.paymentMethod,
        gender: widget.gender,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment completed and booking confirmed!')),
      );

      Navigator.pushNamedAndRemoveUntil(context, '/my-bookings', (route) => route.settings.name == '/home');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment failed: ${error.toString()}')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Widget _buildPaymentFields() {
    if (widget.paymentMethod == 'Mobile Money') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _mobileMoneyController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile money number',
              hintText: '07XXXXXXXX',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Enter a mobile money number to continue';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          Text(
            'PayHere sandbox will simulate your mobile money checkout. Use a valid number to complete the booking.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _cardNameController,
          decoration: const InputDecoration(
            labelText: 'Cardholder name',
            hintText: 'John Doe',
          ),
          validator: (value) {
            if (value == null || value.trim().length < 2) {
              return 'Enter the cardholder name';
            }
            return null;
          },
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _cardNumberController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Card number',
            hintText: '1234 5678 9012 3456',
          ),
          validator: (value) {
            final digits = value?.replaceAll(RegExp(r'\D'), '') ?? '';
            if (digits.length < 13 || digits.length > 19) {
              return 'Enter a valid card number';
            }
            return null;
          },
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _expiryController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Expiry',
                  hintText: 'MM/YY',
                ),
                validator: (value) {
                  if (value == null || !RegExp(r'^(0[1-9]|1[0-2])/(\d{2})$').hasMatch(value)) {
                    return 'Enter expiry in MM/YY';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _cvcController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'CVC',
                  hintText: '123',
                ),
                validator: (value) {
                  if (value == null || value.trim().length < 3 || value.trim().length > 4) {
                    return 'Enter a valid CVC';
                  }
                  return null;
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'PayHere sandbox is enabled. This flow simulates a secure gateway transaction before confirming your booking.',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalPrice = widget.trip.price * widget.seatNumbers.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Payment'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Secure checkout', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Text(
                        'You are one step away from completing your booking for ${widget.route.from} → ${widget.route.to}.',
                        style: const TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          const Icon(Icons.lock_outline, color: Colors.deepPurple),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'This page uses secure payment processing. Your card and mobile money details are never stored on the app.',
                              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                            ),
                          ),
                        ],
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
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Payment summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Payment method', style: TextStyle(color: Colors.grey)),
                          Text(widget.paymentMethod, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Passenger', style: TextStyle(color: Colors.grey)),
                          Text(widget.passengerName, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Gender', style: TextStyle(color: Colors.grey)),
                          Text(widget.gender[0].toUpperCase() + widget.gender.substring(1), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total price', style: TextStyle(color: Colors.grey)),
                          Text('LKR ${totalPrice.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Form(
                key: _formKey,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Payment details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        _buildPaymentFields(),
                      ],
                    ),
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
                      const Text('Payment gateway', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 14),
                      const Text(
                        'PayHere sandbox mode is active. Your transaction will be processed in a sandbox environment for testing before booking confirmation.',
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Icon(Icons.shield_outlined, color: Colors.deepPurple),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'This emulates the PayHere sandbox checkout experience, then confirms the booking after the transaction succeeds.',
                              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        bottom: true,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
          child: ElevatedButton(
            onPressed: _isProcessing ? null : _handlePayment,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            child: _isProcessing
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Pay LKR ${totalPrice.toStringAsFixed(2)}', style: const TextStyle(fontSize: 16)),
          ),
        ),
      ),
    );
  }
}
