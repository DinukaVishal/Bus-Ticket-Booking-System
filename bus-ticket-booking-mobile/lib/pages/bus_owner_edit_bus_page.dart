import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';

class BusOwnerEditBusPage extends StatefulWidget {
  final OwnerBus bus;

  const BusOwnerEditBusPage({super.key, required this.bus});

  @override
  State<BusOwnerEditBusPage> createState() => _BusOwnerEditBusPageState();
}

class _BusOwnerEditBusPageState extends State<BusOwnerEditBusPage> with TickerProviderStateMixin {
  late TabController _tabController;
  bool _isSubmitting = false;

  // Bus Details
  late TextEditingController _busNumberController;
  late BusType _selectedBusType;
  late TextEditingController _totalSeatsController;
  late TextEditingController _registrationNumberController;
  late TextEditingController _insuranceNumberController;
  DateTime? _insuranceExpiry;

  // Driver Details
  late TextEditingController _driverNameController;
  late TextEditingController _driverPhoneController;
  late TextEditingController _licenseNumberController;
  DateTime? _licenseExpiry;

  // Conductor Details
  late TextEditingController _conductorNameController;
  late TextEditingController _conductorPhoneController;
  late TextEditingController _conductorIdController;

  final _busFormKey = GlobalKey<FormState>();
  final _driverFormKey = GlobalKey<FormState>();
  final _conductorFormKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    _busNumberController = TextEditingController(text: widget.bus.busNumber);
    _selectedBusType = widget.bus.busType;
    _totalSeatsController = TextEditingController(text: widget.bus.totalSeats.toString());
    _registrationNumberController = TextEditingController(text: widget.bus.registrationNumber);
    _insuranceNumberController = TextEditingController(text: widget.bus.insuranceNumber ?? '');
    _insuranceExpiry = widget.bus.insuranceExpiry;

    _driverNameController = TextEditingController(text: widget.bus.driver?.name ?? '');
    _driverPhoneController = TextEditingController(text: widget.bus.driver?.phone ?? '');
    _licenseNumberController = TextEditingController(text: widget.bus.driver?.licenseNumber ?? '');
    _licenseExpiry = widget.bus.driver?.licenseExpiry;

    _conductorNameController = TextEditingController(text: widget.bus.conductor?.name ?? '');
    _conductorPhoneController = TextEditingController(text: widget.bus.conductor?.phone ?? '');
    _conductorIdController = TextEditingController(text: widget.bus.conductor?.idNumber ?? '');
  }

  @override
  void dispose() {
    _tabController.dispose();
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
    if (!_busFormKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all bus details')),
      );
      return;
    }

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
      // Update bus record
      await Supabase.instance.client.from('owner_buses').update({
        'bus_number': _busNumberController.text,
        'bus_type': busTypeToString(_selectedBusType),
        'total_seats': int.parse(_totalSeatsController.text),
        'registration_number': _registrationNumberController.text,
        'insurance_number': _insuranceNumberController.text,
        'insurance_expiry': _insuranceExpiry?.toIso8601String(),
      }).eq('id', widget.bus.id!);

      // Update driver record
      if (widget.bus.driver != null) {
        await Supabase.instance.client.from('bus_drivers').update({
          'driver_name': _driverNameController.text,
          'driver_phone': _driverPhoneController.text,
        }).eq('id', widget.bus.driver!.id!);
      }

      // Update conductor record
      if (widget.bus.conductor != null) {
        await Supabase.instance.client.from('bus_conductors').update({
          'conductor_name': _conductorNameController.text,
          'conductor_phone': _conductorPhoneController.text,
        }).eq('id', widget.bus.conductor!.id!);
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Bus updated successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update bus: $error'),
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
        title: Text('Edit ${widget.bus.busNumber}'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Bus Details'),
            Tab(text: 'Driver'),
            Tab(text: 'Conductor'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildBusDetailsTab(),
          _buildDriverDetailsTab(),
          _buildConductorDetailsTab(),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(20),
        child: ElevatedButton(
          onPressed: _isSubmitting ? null : _submitForm,
          child: _isSubmitting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Save Changes'),
        ),
      ),
    );
  }

  Widget _buildBusDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _busFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                        'Bus status: ${widget.bus.approvalStatus}',
                        style: TextStyle(color: Colors.blue.shade900, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _busNumberController,
              decoration: InputDecoration(
                labelText: 'Bus Number/Name',
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
                  _selectedBusType = type!;
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

  Widget _buildDriverDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _driverFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.bus.driver?.accessCode != null)
              Card(
                color: Colors.amber.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Driver Access Code',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              widget.bus.driver!.accessCode ?? '',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Access code copied to clipboard')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
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

  Widget _buildConductorDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _conductorFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.bus.conductor?.accessCode != null)
              Card(
                color: Colors.amber.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Conductor Access Code',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              widget.bus.conductor!.accessCode ?? '',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Access code copied to clipboard')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
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
}
