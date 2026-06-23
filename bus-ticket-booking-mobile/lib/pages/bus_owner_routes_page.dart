import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';

class BusOwnerRoutesPage extends StatefulWidget {
  const BusOwnerRoutesPage({super.key});

  @override
  State<BusOwnerRoutesPage> createState() => _BusOwnerRoutesPageState();
}

class _BusOwnerRoutesPageState extends State<BusOwnerRoutesPage> {
  bool _isLoading = true;
  List<BusRoute> _routes = [];
  late TextEditingController _routeNameController;
  late TextEditingController _fromCityController;
  late TextEditingController _toCityController;
  late TextEditingController _distanceController;
  late TextEditingController _durationController;

  @override
  void initState() {
    super.initState();
    _routeNameController = TextEditingController();
    _fromCityController = TextEditingController();
    _toCityController = TextEditingController();
    _distanceController = TextEditingController();
    _durationController = TextEditingController();
    _loadRoutes();
  }

  @override
  void dispose() {
    _routeNameController.dispose();
    _fromCityController.dispose();
    _toCityController.dispose();
    _distanceController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  Future<void> _loadRoutes() async {
    setState(() => _isLoading = true);

    try {
      final response = await Supabase.instance.client
          .from('routes')
          .select('*')
          .order('created_at', ascending: false)
          .limit(50);

      final data = response as List<dynamic>?;
      final routes = data
              ?.map((item) {
                final json = Map<String, dynamic>.from(item as Map);
                return BusRoute(
                  id: json['id'] as String?,
                  name: json['name'] as String? ?? '',
                  from: json['from_city'] as String? ?? '',
                  to: json['to_city'] as String? ?? '',
                  distance: json['distance'] as String?,
                  estimatedDuration: json['estimated_duration'] as String?,
                );
              })
              .toList() ??
          [];

      if (mounted) {
        setState(() {
          _routes = routes;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load routes: $error')),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  void _showAddRouteDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Route'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _routeNameController,
                decoration: const InputDecoration(
                  labelText: 'Route Name',
                  hintText: 'e.g., Colombo - Kandy Express',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _fromCityController,
                decoration: const InputDecoration(
                  labelText: 'From City',
                  hintText: 'e.g., Colombo',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _toCityController,
                decoration: const InputDecoration(
                  labelText: 'To City',
                  hintText: 'e.g., Kandy',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _distanceController,
                decoration: const InputDecoration(
                  labelText: 'Distance (km)',
                  hintText: 'e.g., 115',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _durationController,
                decoration: const InputDecoration(
                  labelText: 'Duration',
                  hintText: 'e.g., 2.5 hours',
                ),
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
            onPressed: _addRoute,
            child: const Text('Add Route'),
          ),
        ],
      ),
    );
  }

  Future<void> _addRoute() async {
    if (_routeNameController.text.isEmpty ||
        _fromCityController.text.isEmpty ||
        _toCityController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    try {
      await Supabase.instance.client.from('routes').insert({
        'name': _routeNameController.text,
        'from_city': _fromCityController.text,
        'to_city': _toCityController.text,
        'distance': _distanceController.text,
        'estimated_duration': _durationController.text,
      });

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Route added successfully!')),
        );
        _clearForm();
        _loadRoutes();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add route: $error')),
        );
      }
    }
  }

  void _clearForm() {
    _routeNameController.clear();
    _fromCityController.clear();
    _toCityController.clear();
    _distanceController.clear();
    _durationController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Routes Management'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _routes.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.route,
                          size: 80,
                          color: Theme.of(context).colorScheme.primary.withAlpha(127),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'No routes found',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Create routes to schedule your bus trips',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _showAddRouteDialog,
                          icon: const Icon(Icons.add),
                          label: const Text('Add Route'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadRoutes,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    itemCount: _routes.length,
                    itemBuilder: (context, index) {
                      final route = _routes[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: const Icon(Icons.route),
                          title: Text(route.name),
                          subtitle: Text('${route.from} → ${route.to}'),
                          trailing: const Icon(Icons.arrow_forward),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Route: ${route.name}')),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddRouteDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Route'),
      ),
    );
  }
}
