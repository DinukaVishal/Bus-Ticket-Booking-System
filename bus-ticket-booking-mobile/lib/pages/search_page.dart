import 'package:flutter/material.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final List<String> _cities = [];
  final List<_RouteTripPair> _searchResults = [];
  List<RouteOption> _allRoutes = [];
  String? _fromCity;
  String? _toCity;
  DateTime _travelDate = DateTime.now().add(const Duration(days: 1));
  bool _isLoading = true;
  String? _errorMessage;

  String get _formattedDate {
    return '${_travelDate.day.toString().padLeft(2, '0')} / ${_travelDate.month.toString().padLeft(2, '0')} / ${_travelDate.year}';
  }

  @override
  void initState() {
    super.initState();
    _loadRoutes();
  }

  Future<void> _loadRoutes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      _allRoutes = await SupabaseService.fetchRoutes();
      final cities = <String>{};
      for (var route in _allRoutes) {
        cities.add(route.from);
        cities.add(route.to);
      }
      setState(() {
        _cities.clear();
        _cities.addAll(cities.toList()..sort());
      });
    } catch (error) {
      setState(() {
        _errorMessage = 'Unable to load routes. Please try again.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _travelDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (selected != null) {
      setState(() {
        _travelDate = selected;
      });
    }
  }

  void _searchRoutes() {
    if (_fromCity == null || _toCity == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please choose both departure and destination.')),
      );
      return;
    }

    if (_fromCity == _toCity) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Departure and destination cannot be the same.')),
      );
      return;
    }

    final results = <_RouteTripPair>[];
    for (final route in _allRoutes) {
      if (route.from == _fromCity && route.to == _toCity) {
        for (final trip in route.trips) {
          results.add(_RouteTripPair(route: route, trip: trip));
        }
      }
    }

    setState(() {
      _searchResults.clear();
      _searchResults.addAll(results);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.directions_bus_filled, color: colorScheme.primary, size: 28),
            const SizedBox(width: 12),
            Text(
              'Search Trips',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Panel
            Container(
              color: colorScheme.primary.withAlpha(15),
              padding: const EdgeInsets.all(20),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Plan Your Next Trip',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 18),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'From',
                          prefixIcon: Icon(Icons.location_on_outlined),
                        ),
                        initialValue: _fromCity,
                        items: _cities.map((city) {
                          return DropdownMenuItem(value: city, child: Text(city));
                        }).toList(),
                        onChanged: (value) => setState(() => _fromCity = value),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'To',
                          prefixIcon: Icon(Icons.location_on),
                        ),
                        initialValue: _toCity,
                        items: _cities.map((city) {
                          return DropdownMenuItem(value: city, child: Text(city));
                        }).toList(),
                        onChanged: (value) => setState(() => _toCity = value),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _pickDate,
                        borderRadius: BorderRadius.circular(18),
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Travel Date',
                            prefixIcon: Icon(Icons.calendar_month),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_formattedDate),
                              const Icon(Icons.calendar_month, size: 20),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton.icon(
                        onPressed: _searchRoutes,
                        icon: const Icon(Icons.search),
                        label: const Text('Search Buses'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Results Section
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline, size: 56, color: colorScheme.error.withAlpha(179)),
                              const SizedBox(height: 16),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        )
                      : _searchResults.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search_off, size: 56, color: colorScheme.onSurface.withAlpha(127)),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Search to see available buses',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'between your chosen cities',
                                    style: Theme.of(context).textTheme.bodySmall,
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            )
                          : Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_searchResults.length} buses found',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 12),
                                  Expanded(
                                    child: ListView.separated(
                                      itemCount: _searchResults.length,
                                      separatorBuilder: (context, _) => const SizedBox(height: 14),
                                      itemBuilder: (context, index) {
                                        final pair = _searchResults[index];
                                        return _RouteCard(
                                          route: pair.route,
                                          trip: pair.trip,
                                          onTap: () => Navigator.pushNamed(
                                            context,
                                            '/select-seat',
                                            arguments: {
                                              'route': pair.route,
                                              'trip': pair.trip,
                                              'date': _travelDate,
                                            },
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RouteTripPair {
  final RouteOption route;
  final TripOption trip;

  _RouteTripPair({required this.route, required this.trip});
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({required this.route, required this.trip, required this.onTap});

  final RouteOption route;
  final TripOption trip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(route.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  Text('LKR ${trip.price.toStringAsFixed(2)}', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 10),
              Text('${route.from} → ${route.to}', style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  Chip(label: Text(route.serviceType)),
                  Chip(label: Text(route.busType.name.toUpperCase())),
                  Chip(label: Text('${route.totalSeats} seats')),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${trip.departureTime} - ${trip.arrivalTime}', style: const TextStyle(fontWeight: FontWeight.w500)),
                  Text(route.duration, style: const TextStyle(color: Colors.grey)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
