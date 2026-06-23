import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';

class BusOwnerTripsPage extends StatefulWidget {
  const BusOwnerTripsPage({super.key});

  @override
  State<BusOwnerTripsPage> createState() => _BusOwnerTripsPageState();
}

class _BusOwnerTripsPageState extends State<BusOwnerTripsPage> {
  bool _isLoading = true;
  List<BusTrip> _trips = [];
  late TextEditingController _departureTimeController;
  late TextEditingController _arrivalTimeController;
  late TextEditingController _priceController;

  @override
  void initState() {
    super.initState();
    _departureTimeController = TextEditingController();
    _arrivalTimeController = TextEditingController();
    _priceController = TextEditingController();
    _loadTrips();
  }

  @override
  void dispose() {
    _departureTimeController.dispose();
    _arrivalTimeController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _loadTrips() async {
    setState(() => _isLoading = true);

    try {
      final response = await Supabase.instance.client
          .from('trips')
          .select('*')
          .order('created_at', ascending: false)
          .limit(100);

      final data = response as List<dynamic>?;
      final trips = data
              ?.map((item) {
                final json = Map<String, dynamic>.from(item as Map);
                return BusTrip.fromJson(json);
              })
              .toList() ??
          [];

      if (mounted) {
        setState(() {
          _trips = trips;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load trips: $error')),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  void _showAddTripDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Trip'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _departureTimeController,
                decoration: const InputDecoration(
                  labelText: 'Departure Time',
                  hintText: 'e.g., 06:00 AM',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _arrivalTimeController,
                decoration: const InputDecoration(
                  labelText: 'Arrival Time',
                  hintText: 'e.g., 08:30 AM',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _priceController,
                decoration: const InputDecoration(
                  labelText: 'Price (Rs)',
                  hintText: 'e.g., 2500',
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: _addTrip,
            child: const Text('Add Trip'),
          ),
        ],
      ),
    );
  }

  Future<void> _addTrip() async {
    if (_departureTimeController.text.isEmpty ||
        _arrivalTimeController.text.isEmpty ||
        _priceController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    try {
      await Supabase.instance.client.from('trips').insert({
        'departure_time': _departureTimeController.text,
        'arrival_time': _arrivalTimeController.text,
        'price': double.parse(_priceController.text),
        'is_active': true,
        'created_at': DateTime.now().toIso8601String(),
      });

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trip added successfully!')),
        );
        _clearForm();
        _loadTrips();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add trip: $error')),
        );
      }
    }
  }

  void _clearForm() {
    _departureTimeController.clear();
    _arrivalTimeController.clear();
    _priceController.clear();
  }

  Future<void> _deleteTrip(String tripId) async {
    try {
      await Supabase.instance.client.from('trips').delete().eq('id', tripId);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trip deleted successfully')),
        );
        _loadTrips();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete trip: $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trips Management'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _trips.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.schedule,
                          size: 80,
                          color: Theme.of(context).colorScheme.primary.withAlpha(127),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'No trips scheduled',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Schedule your first trip to start accepting bookings',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _showAddTripDialog,
                          icon: const Icon(Icons.add),
                          label: const Text('Add Trip'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTrips,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    itemCount: _trips.length,
                    itemBuilder: (context, index) {
                      final trip = _trips[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: const Icon(Icons.schedule),
                          title: Text('${trip.departureTime} - ${trip.arrivalTime}'),
                          subtitle: Text('Price: Rs. ${trip.price.toStringAsFixed(2)}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Chip(
                                backgroundColor: trip.isActive ? Colors.green.shade100 : Colors.grey.shade200,
                                label: Text(trip.isActive ? 'Active' : 'Inactive'),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.delete, color: Colors.red),
                                onPressed: () {
                                  showDialog(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      title: const Text('Delete Trip'),
                                      content: const Text('Are you sure you want to delete this trip?'),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context),
                                          child: const Text('Cancel'),
                                        ),
                                        TextButton(
                                          onPressed: () {
                                            Navigator.pop(context);
                                            _deleteTrip(trip.id!);
                                          },
                                          child: const Text('Delete', style: TextStyle(color: Colors.red)),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddTripDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Trip'),
      ),
    );
  }
}
