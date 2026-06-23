import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class BusOwnerAddBusPage extends StatefulWidget {
  const BusOwnerAddBusPage({super.key});

  @override
  State<BusOwnerAddBusPage> createState() => _BusOwnerAddBusPageState();
}

class _BusOwnerAddBusPageState extends State<BusOwnerAddBusPage> {
  late PageController _pageController;
  int _currentStep = 0;
  bool _isSubmitting = false;

  // Bus Details Form
  late TextEditingController _busNumberController;
  BusType? _selectedBusType;
  late TextEditingController _totalSeatsController;
  late TextEditingController _registrationNumberController;
  late TextEditingController _insuranceNumberController;
  DateTime? _insuranceExpiry;

  // Driver Details Form
  late TextEditingController _driverNameController;
  late TextEditingController _driverPhoneController;
  late TextEditingController _licenseNumberController;
  DateTime? _licenseExpiry;

  // Conductor Details Form
  late TextEditingController _conductorNameController;
  late TextEditingController _conductorPhoneController;
  late TextEditingController _conductorIdController;

  final _busFormKey = GlobalKey<FormState>();
  final _driverFormKey = GlobalKey<FormState>();
  final _conductorFormKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    _busNumberController = TextEditingController();
    _totalSeatsController = TextEditingController();
    _registrationNumberController = TextEditingController();
    _insuranceNumberController = TextEditingController();

    _driverNameController = TextEditingController();
    _driverPhoneController = TextEditingController();
    _licenseNumberController = TextEditingController();

    _conductorNameController = TextEditingController();
    _conductorPhoneController = TextEditingController();
    _conductorIdController = TextEditingController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _busNumberController.dispose();
    _totalSeatsController.dispose();
    _registrationNumberController.dispose();
    _insuranceNumberController.dispose();
    _driverNameController.dispose();
    _driverPhoneController.dispose();
    _licenseNumberController.dispose();
    _conductorNameController.dispose();
    _conductorPhoneController.dispose();
    _conductorIdController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(Function(DateTime) onDatePicked) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 365)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 1825)),
    );

    if (picked != null) {
      onDatePicked(picked);
    }
  }

  Future<void> _submitForm() async {
    if (!_driverFormKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all driver details')),
      );
      return;
    }

    if (!_conductorFormKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all conductor details')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final userId = SupabaseService.currentUser?.id;
      if (userId == null) {
        throw Exception('User not authenticated');
      }

      final busResponse = await Supabase.instance.client.from('owner_buses').insert({
        'bus_owner_id': userId,
        'bus_number': _busNumberController.text,
        'bus_type': busTypeToString(_selectedBusType!),
        'total_seats': int.parse(_totalSeatsController.text),
        'registration_number': _registrationNumberController.text,
        'insurance_number': _insuranceNumberController.text,
        'insurance_expiry': _insuranceExpiry?.toIso8601String(),
        'fitness_certificate_expiry': _insuranceExpiry?.toIso8601String() ?? DateTime.now().add(const Duration(days: 365)).toIso8601String(),
        'approval_status': 'pending',
        'is_active': false,
      }).select();

      final busId = (busResponse as List).first['id'];

      await Supabase.instance.client.from('bus_drivers').insert({
        'bus_owner_id': userId,
        'bus_id': busId,
        'driver_name': _driverNameController.text,
        'driver_phone': _driverPhoneController.text,
        'is_active': true,
      });

      await Supabase.instance.client.from('bus_conductors').insert({
        'bus_owner_id': userId,
        'bus_id': busId,
        'conductor_name': _conductorNameController.text,
        'conductor_phone': _conductorPhoneController.text,
        'is_active': true,
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Bus added successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add bus: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add New Bus'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Progress indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStepIndicator(0, 'Bus Details'),
                    _buildStepIndicator(1, 'Driver'),
                    _buildStepIndicator(2, 'Conductor'),
                    _buildStepIndicator(3, 'Review'),
                  ],
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: (_currentStep + 1) / 4,
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
          // Page view
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (index) {
                setState(() {
                  _currentStep = index;
                });
              },
              children: [
                _buildBusDetailsStep(),
                _buildDriverDetailsStep(),
                _buildConductorDetailsStep(),
                _buildReviewStep(),
              ],
            ),
          ),
          // Navigation buttons
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                if (_currentStep > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: const Text('Previous'),
                    ),
                  ),
                if (_currentStep > 0) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSubmitting
                        ? null
                        : () {
                            if (_currentStep == 0) {
                              if (_busFormKey.currentState!.validate() && _selectedBusType != null) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                );
                              }
                            } else if (_currentStep == 1) {
                              if (_driverFormKey.currentState!.validate()) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                );
                              }
                            } else if (_currentStep == 2) {
                              if (_conductorFormKey.currentState!.validate()) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                );
                              }
                            } else if (_currentStep == 3) {
                              _submitForm();
                            }
                          },
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_currentStep == 3 ? 'Submit' : 'Next'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(int step, String label) {
    final isActive = step == _currentStep;
    final isCompleted = step < _currentStep;

    return Expanded(
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isActive || isCompleted ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isCompleted
                  ? const Icon(Icons.check, color: Colors.white, size: 20)
                  : Text(
                      '${step + 1}',
                      style: TextStyle(
                        color: isActive || isCompleted ? Colors.white : Colors.grey.shade600,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              color: isActive ? Theme.of(context).colorScheme.primary : Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildBusDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _busFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bus Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            const Text(
              'Enter your bus information',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _busNumberController,
              decoration: InputDecoration(
                labelText: 'Bus Number/Name',
                hintText: 'e.g., NB-1001',
                prefixIcon: const Icon(Icons.directions_bus),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (value) => value?.isEmpty ?? true ? 'Please enter bus number' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<BusType>(
              decoration: InputDecoration(
                labelText: 'Bus Type',
                prefixIcon: const Icon(Icons.category),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              initialValue: _selectedBusType,
              items: BusType.values
                  .map((type) => DropdownMenuItem(
                        value: type,
                        child: Text(busTypeConfigs[type]?.name ?? 'Unknown'),
                      ))
                  .toList(),
              onChanged: (type) {
                setState(() {
                  _selectedBusType = type;
                  if (type != null) {
                    _totalSeatsController.text = busTypeConfigs[type]!.defaultSeats.toString();
                  }
                });
              },
              validator: (value) => value == null ? 'Please select bus type' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _totalSeatsController,
              decoration: InputDecoration(
                labelText: 'Total Seats',
                prefixIcon: const Icon(Icons.event_seat),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              keyboardType: TextInputType.number,
              validator: (value) => value?.isEmpty ?? true ? 'Please enter total seats' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _registrationNumberController,
              decoration: InputDecoration(
                labelText: 'Registration Number',
                hintText: 'e.g., WP-SL-1234',
                prefixIcon: const Icon(Icons.badge),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (value) => value?.isEmpty ?? true ? 'Please enter registration number' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _insuranceNumberController,
              decoration: InputDecoration(
                labelText: 'Insurance Number (Optional)',
                prefixIcon: const Icon(Icons.security),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () => _pickDate((date) {
                setState(() {
                  _insuranceExpiry = date;
                });
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Insurance Expiry (Optional)',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _insuranceExpiry?.toString().split(' ')[0] ?? 'Select date',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const Icon(Icons.calendar_month),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDriverDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _driverFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Driver Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            const Text(
              'Enter your driver\'s information',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _driverNameController,
              decoration: InputDecoration(
                labelText: 'Driver Name',
                prefixIcon: const Icon(Icons.person),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (value) => value?.isEmpty ?? true ? 'Please enter driver name' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _driverPhoneController,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                prefixIcon: const Icon(Icons.phone),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              keyboardType: TextInputType.phone,
              validator: (value) => value?.isEmpty ?? true ? 'Please enter phone number' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _licenseNumberController,
              decoration: InputDecoration(
                labelText: 'License Number',
                prefixIcon: const Icon(Icons.badge),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (value) => value?.isEmpty ?? true ? 'Please enter license number' : null,
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () => _pickDate((date) {
                setState(() {
                  _licenseExpiry = date;
                });
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'License Expiry (Optional)',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _licenseExpiry?.toString().split(' ')[0] ?? 'Select date',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const Icon(Icons.calendar_month),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConductorDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _conductorFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Conductor Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            const Text(
              'Enter your conductor\'s information',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _conductorNameController,
              decoration: InputDecoration(
                labelText: 'Conductor Name',
                prefixIcon: const Icon(Icons.person),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (value) => value?.isEmpty ?? true ? 'Please enter conductor name' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _conductorPhoneController,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                prefixIcon: const Icon(Icons.phone),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              keyboardType: TextInputType.phone,
              validator: (value) => value?.isEmpty ?? true ? 'Please enter phone number' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _conductorIdController,
              decoration: InputDecoration(
                labelText: 'ID Number (Optional)',
                prefixIcon: const Icon(Icons.badge),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Review & Submit',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'Please review the information before submitting',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bus Information',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  _buildReviewRow('Bus Number', _busNumberController.text),
                  _buildReviewRow('Bus Type', busTypeConfigs[_selectedBusType]?.name ?? ''),
                  _buildReviewRow('Total Seats', _totalSeatsController.text),
                  _buildReviewRow('Registration No.', _registrationNumberController.text),
                  if (_insuranceNumberController.text.isNotEmpty)
                    _buildReviewRow('Insurance No.', _insuranceNumberController.text),
                  if (_insuranceExpiry != null)
                    _buildReviewRow('Insurance Expiry', _insuranceExpiry.toString().split(' ')[0]),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Driver Information',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  _buildReviewRow('Name', _driverNameController.text),
                  _buildReviewRow('Phone', _driverPhoneController.text),
                  _buildReviewRow('License No.', _licenseNumberController.text),
                  if (_licenseExpiry != null)
                    _buildReviewRow('License Expiry', _licenseExpiry.toString().split(' ')[0]),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Conductor Information',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  _buildReviewRow('Name', _conductorNameController.text),
                  _buildReviewRow('Phone', _conductorPhoneController.text),
                  if (_conductorIdController.text.isNotEmpty)
                    _buildReviewRow('ID No.', _conductorIdController.text),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            color: Colors.blue.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.info, color: Colors.blue),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your bus will be submitted for admin approval. You\'ll be notified once it\'s reviewed.',
                      style: TextStyle(color: Colors.blue.shade900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
