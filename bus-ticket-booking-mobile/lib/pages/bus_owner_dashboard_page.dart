import 'package:bus_ticket_booking_mobile/pages/bus_owner_page_one.dart';
import 'package:bus_ticket_booking_mobile/pages/bus_owner_page_two.dart';
import 'package:flutter/material.dart';
<<<<<<< HEAD
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';
=======
import 'package:bus_ticket_booking_mobile/widgets/bottom_nav_bar_owner.dart';
import 'bus_owner_home_page.dart';
>>>>>>> 3271614d8279c8bf2f1af3859ac85b01b36121a9
import '../services/supabase_service.dart';

class BusOwnerDashboardPage extends StatefulWidget {
  const BusOwnerDashboardPage({Key? key}) : super(key: key);

  @override
  State<BusOwnerDashboardPage> createState() => _BusOwnerDashboardPageState();
}

<<<<<<< HEAD
class _BusOwnerDashboardPageState extends State<BusOwnerDashboardPage> with TickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<OwnerBus> _ownerBuses = [];
  List<BusRoute> _routes = [];
  List<BusTrip> _trips = [];
  int _activeBusCount = 0;
  int _pendingApprovalCount = 0;
  int _totalTripsToday = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadDashboardData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/login');
      }
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Load buses for the current owner first, then fallback to any existing buses in the database.
      List<OwnerBus> parseBuses(List<dynamic>? busesData) {
        return busesData
                ?.map((item) {
                  final json = Map<String, dynamic>.from(item as Map);
                  return OwnerBus.fromJson(json);
                })
                .toList() ??
            [];
      }

      final busesResponse = await Supabase.instance.client
          .from('owner_buses')
          .select(
              'id,bus_number,bus_type,total_seats,approval_status,is_active,registration_number,insurance_number,insurance_expiry,created_at')
          .eq('bus_owner_id', userId)
          .order('created_at', ascending: false);

      final busesData = busesResponse as List<dynamic>?;
      var buses = parseBuses(busesData);

      if (buses.isEmpty) {
        final fallbackResponse = await Supabase.instance.client
            .from('owner_buses')
            .select(
                'id,bus_number,bus_type,total_seats,approval_status,is_active,registration_number,insurance_number,insurance_expiry,created_at')
            .order('created_at', ascending: false);

        final fallbackData = fallbackResponse as List<dynamic>?;
        buses = parseBuses(fallbackData);
      }

      // Load driver and conductor data for each bus
      final updatedBuses = <OwnerBus>[];
      for (final bus in buses) {
        BusDriver? driver;
        BusConductor? conductor;

        // Get driver for this bus by driver_id if available, otherwise by bus_id.
        try {
          var driverQuery = Supabase.instance.client
              .from('bus_drivers')
              .select('id,bus_owner_id,bus_id,driver_name,driver_phone');

          if (bus.driverId != null) {
            driverQuery = driverQuery.filter('id', 'eq', bus.driverId!);
          } else if (bus.id != null) {
            driverQuery = driverQuery.filter('bus_id', 'eq', bus.id!);
          }

          final driverResponse = await driverQuery.limit(1) as List<dynamic>?;

          if (driverResponse != null && driverResponse.isNotEmpty) {
            final driverData = Map<String, dynamic>.from(driverResponse.first as Map);
            driver = BusDriver.fromJson(driverData);
          }
        } catch (e) {
          // Driver not found is okay
        }

        // Get conductor for this bus by conductor_id if available, otherwise by bus_id.
        try {
          var conductorQuery = Supabase.instance.client
              .from('bus_conductors')
              .select('id,bus_owner_id,bus_id,conductor_name,conductor_phone');

          if (bus.conductorId != null) {
            conductorQuery = conductorQuery.filter('id', 'eq', bus.conductorId!);
          } else if (bus.id != null) {
            conductorQuery = conductorQuery.filter('bus_id', 'eq', bus.id!);
          }

          final conductorResponse = await conductorQuery.limit(1) as List<dynamic>?;

          if (conductorResponse != null && conductorResponse.isNotEmpty) {
            final conductorData = Map<String, dynamic>.from(conductorResponse.first as Map);
            conductor = BusConductor.fromJson(conductorData);
          }
        } catch (e) {
          // Conductor not found is okay
        }

        // Create updated bus with driver and conductor
        updatedBuses.add(
          OwnerBus(
            id: bus.id,
            busNumber: bus.busNumber,
            busType: bus.busType,
            totalSeats: bus.totalSeats,
            registrationNumber: bus.registrationNumber,
            insuranceNumber: bus.insuranceNumber,
            insuranceExpiry: bus.insuranceExpiry,
            approvalStatus: bus.approvalStatus,
            isActive: bus.isActive,
            driverId: bus.driverId,
            conductorId: bus.conductorId,
            driver: driver,
            conductor: conductor,
            assignedRouteIds: bus.assignedRouteIds,
            createdAt: bus.createdAt,
          ),
        );
      }
      buses = updatedBuses;

      // Load routes
      final routesResponse = await Supabase.instance.client
          .from('routes')
          .select('id,name,from_city,to_city,distance,estimated_duration')
          .order('created_at', ascending: false)
          .limit(20);

      final routesData = routesResponse as List<dynamic>?;
      final routes = routesData
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

      // Load trips
      final tripsResponse = await Supabase.instance.client
          .from('trips')
          .select('id,route_id,bus_id,departure_time,arrival_time,price,is_active,created_at')
          .order('created_at', ascending: false)
          .limit(50);

      final tripsData = tripsResponse as List<dynamic>?;
      final trips = tripsData
              ?.map((item) {
                final json = Map<String, dynamic>.from(item as Map);
                return BusTrip.fromJson(json);
              })
              .toList() ??
          [];

      final activeCount = buses.where((bus) => bus.isActive).length;
      final pendingCount = buses.where((bus) => bus.approvalStatus == 'pending').length;
      final tripsToday = trips.length;

      if (mounted) {
        setState(() {
          _ownerBuses = buses;
          _routes = routes;
          _trips = trips;
          _activeBusCount = activeCount;
          _pendingApprovalCount = pendingCount;
          _totalTripsToday = tripsToday;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load dashboard: $error')),
        );
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _toggleBusStatus(OwnerBus bus) async {
    try {
      await Supabase.instance.client
          .from('owner_buses')
          .update({'is_active': !bus.isActive})
          .eq('id', bus.id!);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Bus ${bus.isActive ? 'deactivated' : 'activated'} successfully')),
        );
        _loadDashboardData();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to toggle bus status: $error')),
        );
      }
    }
  }

  Future<void> _deleteBus(String busId) async {
    try {
      await Supabase.instance.client.from('owner_buses').delete().eq('id', busId);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bus deleted successfully')),
        );
        _loadDashboardData();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete bus: $error')),
        );
      }
    }
  }

=======
class _BusOwnerDashboardPageState extends State<BusOwnerDashboardPage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const BusOwnerHomePage(),
    const BusOwnerPageOne(),
    const BusOwnerPageTwo(),
  ];

  
>>>>>>> 3271614d8279c8bf2f1af3859ac85b01b36121a9
  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
<<<<<<< HEAD
    final colorScheme = Theme.of(context).colorScheme;

=======
>>>>>>> 3271614d8279c8bf2f1af3859ac85b01b36121a9
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.directions_bus_filled, color: colorScheme.primary, size: 28),
            const SizedBox(width: 12),
            Text(
              'My Fleet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              // Navigate to profile
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Profile page coming soon')),
              );
            },
            tooltip: 'Profile',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'Dashboard'),
            Tab(icon: Icon(Icons.directions_bus), text: 'Buses'),
            Tab(icon: Icon(Icons.route), text: 'Routes'),
            Tab(icon: Icon(Icons.schedule), text: 'Trips'),
          ],
        ),
      ),
<<<<<<< HEAD
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildDashboardTab(),
                  _buildBusesTab(),
                  _buildRoutesTab(),
                  _buildTripsTab(),
                ],
              ),
            ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          if (_tabController.index == 1)
            FloatingActionButton.extended(
              heroTag: 'add_bus',
              onPressed: () => Navigator.pushNamed(context, '/owner-add-bus'),
              label: const Text('Add Bus'),
              icon: const Icon(Icons.add),
            ),
          if (_tabController.index == 2)
            FloatingActionButton.extended(
              heroTag: 'add_route',
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Add route page coming soon')),
                );
              },
              label: const Text('Add Route'),
              icon: const Icon(Icons.add),
            ),
          if (_tabController.index == 3)
            FloatingActionButton.extended(
              heroTag: 'add_trip',
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Add trip page coming soon')),
                );
              },
              label: const Text('Add Trip'),
              icon: const Icon(Icons.add),
            ),
        ],
      ),
    );
  }

  Widget _buildDashboardTab() {
    final colorScheme = Theme.of(context).colorScheme;
    final ownerEmail = SupabaseService.currentUser?.email ?? 'Bus Owner';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back, $ownerEmail',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your entire bus fleet from here.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withAlpha(153),
                ),
          ),
          const SizedBox(height: 24),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              _buildMetricCard(
                'Total Buses',
                _ownerBuses.length.toString(),
                Icons.directions_bus,
                Colors.blue,
              ),
              _buildMetricCard(
                'Active Buses',
                _activeBusCount.toString(),
                Icons.check_circle,
                Colors.green,
              ),
              _buildMetricCard(
                'Pending Approval',
                _pendingApprovalCount.toString(),
                Icons.pending_actions,
                Colors.orange,
              ),
              _buildMetricCard(
                'Active Trips',
                _totalTripsToday.toString(),
                Icons.schedule,
                Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionCard(
                  icon: Icons.directions_bus,
                  label: 'Add Bus',
                  onTap: () => Navigator.pushNamed(context, '/owner-add-bus'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionCard(
                  icon: Icons.route,
                  label: 'Routes',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Routes management coming soon')),
                    );
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionCard(
                  icon: Icons.schedule,
                  label: 'Trips',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Trips management coming soon')),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionCard(
                  icon: Icons.people,
                  label: 'Staff',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Staff management coming soon')),
                    );
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Fleet Status',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          if (_ownerBuses.isEmpty)
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'No buses registered yet',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    const Text('Add your first bus to start managing your fleet.'),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.pushNamed(context, '/owner-add-bus'),
                      icon: const Icon(Icons.add),
                      label: const Text('Add Bus'),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._ownerBuses.take(3).map((bus) => _buildBusCard(bus)),
            ...[
                if (_ownerBuses.length > 3)
                  Align(
                    alignment: Alignment.center,
                    child: TextButton.icon(
                      icon: const Icon(Icons.more),
                      label: const Text('View all buses'),
                      onPressed: () {
                        _tabController.animateTo(1);
                      },
                    ),
                  ),
              ],
        ],
      ),
    );
  }

  Widget _buildBusesTab() {
    if (_ownerBuses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.directions_bus, size: 80, color: Theme.of(context).colorScheme.primary.withAlpha(127)),
              const SizedBox(height: 24),
              const Text(
                'No buses registered',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Add your first bus to start managing your fleet',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => Navigator.pushNamed(context, '/owner-add-bus'),
                icon: const Icon(Icons.add),
                label: const Text('Add Bus'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      itemCount: _ownerBuses.length,
      itemBuilder: (context, index) => _buildBusCard(_ownerBuses[index]),
    );
  }

  Widget _buildBusCard(OwnerBus bus) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  bus.busNumber,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Chip(
                  backgroundColor: bus.isActive ? Colors.green.shade100 : Colors.grey.shade200,
                  label: Text(
                    bus.isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      color: bus.isActive ? Colors.green.shade800 : Colors.grey.shade700,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildBusDetailItem(
                    icon: Icons.category,
                    label: 'Type',
                    value: busTypeConfigs[bus.busType]?.name ?? 'Unknown',
                  ),
                ),
                Expanded(
                  child: _buildBusDetailItem(
                    icon: Icons.event_seat,
                    label: 'Seats',
                    value: bus.totalSeats.toString(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildBusDetailItem(
                    icon: Icons.badge,
                    label: 'Reg. No.',
                    value: bus.registrationNumber,
                  ),
                ),
                Expanded(
                  child: _buildBusDetailItem(
                    icon: Icons.info,
                    label: 'Status',
                    value: bus.approvalStatus,
                  ),
                ),
              ],
            ),
            if (bus.driver != null || bus.conductor != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  children: [
                    if (bus.driver != null)
                      Expanded(
                        child: _buildStaffBadge('Driver', bus.driver!.name),
                      ),
                    if (bus.conductor != null)
                      Expanded(
                        child: _buildStaffBadge('Conductor', bus.conductor!.name),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pushNamed(context, '/owner-edit-bus', arguments: bus);
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Edit'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      if (bus.approvalStatus == 'approved') {
                        _toggleBusStatus(bus);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Bus must be approved before activation')),
                        );
                      }
                    },
                    icon: Icon(bus.isActive ? Icons.pause : Icons.play_arrow),
                    label: Text(bus.isActive ? 'Pause' : 'Activate'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Delete Bus'),
                          content: Text('Are you sure you want to delete ${bus.busNumber}?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Cancel'),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(context);
                                _deleteBus(bus.id!);
                              },
                              child: const Text('Delete', style: TextStyle(color: Colors.red)),
                            ),
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text('Delete'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBusDetailItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStaffBadge(String role, String name) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withAlpha(31),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            role,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          ),
          Text(
            name,
            style: const TextStyle(fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRoutesTab() {
    if (_routes.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.route, size: 80, color: Theme.of(context).colorScheme.primary.withAlpha(127)),
              const SizedBox(height: 24),
              const Text(
                'No routes found',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Create routes to manage your bus trips',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
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
                const SnackBar(content: Text('Route details page coming soon')),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildTripsTab() {
    if (_trips.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.schedule, size: 80, color: Theme.of(context).colorScheme.primary.withAlpha(127)),
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
            ],
          ),
        ),
      );
    }

    return ListView.builder(
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
            trailing: Chip(
              backgroundColor: trip.isActive ? Colors.green.shade100 : Colors.grey.shade200,
              label: Text(trip.isActive ? 'Active' : 'Inactive'),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: color.withAlpha(31),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color.shade700, size: 32),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color.shade700),
          ),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
=======
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavBarOwner(
        onTabChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}
>>>>>>> 3271614d8279c8bf2f1af3859ac85b01b36121a9
