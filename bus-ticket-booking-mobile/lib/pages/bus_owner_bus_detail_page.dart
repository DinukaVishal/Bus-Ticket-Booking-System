import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class BusInfo {
  BusInfo({
    required this.id,
    required this.busNumber,
    required this.registrationNumber,
    required this.totalSeats,
    required this.busType,
    required this.status,
    required this.isActive,
    required this.staffCode,
    required this.routeNames,
    required this.routePaths,
    this.driverName = 'N/A',
    this.driverPhone = 'N/A',
    this.conductorName = 'N/A',
    this.conductorPhone = 'N/A',
  });

  final String id;
  final String busNumber;
  final String registrationNumber;
  final int totalSeats;
  final String busType;
  final String status;
  bool isActive;
  final String staffCode;
  final String routeNames;
  final String routePaths;
  String driverName;
  String driverPhone;
  String conductorName;
  String conductorPhone;

  factory BusInfo.fromMap(Map<String, dynamic> map) {
    return BusInfo(
      id: map['id']?.toString() ?? '',
      busNumber: map['bus_number']?.toString() ?? 'Unknown',
      registrationNumber: map['registration_number']?.toString() ?? 'N/A',
      totalSeats: (map['total_seats'] as num?)?.toInt() ?? 0,
      busType: map['bus_type']?.toString() ?? 'N/A',
      status: map['approval_status']?.toString() ?? 'pending',
      isActive: map['is_active'] == true,
      staffCode: map['staff_access_code']?.toString() ?? 'N/A',
      routeNames: '',
      routePaths: '',
    );
  }
}

class BusOwnerBusDetailPage extends StatefulWidget {
  const BusOwnerBusDetailPage({super.key});

  @override
  State<BusOwnerBusDetailPage> createState() => _BusOwnerBusDetailPageState();
}

class _BusOwnerBusDetailPageState extends State<BusOwnerBusDetailPage> {
  bool _isLoading = true;
  List<BusInfo> _buses = [];
  final Set<String> _expandedIds = {};
  final Set<String> _togglingIds = {};

  @override
  void initState() {
    super.initState();
    _loadBuses();
  }

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  Future<void> _loadBuses() async {
    setState(() => _isLoading = true);
    try {
      final client = Supabase.instance.client;
      final userId = SupabaseService.currentUser?.id;

      if (userId == null) {
        setState(() {
          _buses = [];
          _isLoading = false;
        });
        return;
      }

      // 1. Fetch buses for this bus owner
      final busesData = await client
          .from('owner_buses')
          .select('*')
          .eq('bus_owner_id', userId)
          .order('created_at', ascending: false);

      final buses = (busesData as List)
          .map((row) => BusInfo.fromMap(row as Map<String, dynamic>))
          .toList();

      if (buses.isEmpty) {
        setState(() {
          _buses = [];
          _isLoading = false;
        });
        return;
      }

      final busIds = buses.map((b) => b.id).toList();

      // 2. Fetch active route assignments for these buses
      final routeAssignments = await client
          .from('owner_routes')
          .select('owner_bus_id, route_id')
          .eq('bus_owner_id', userId)
          .eq('is_active', true)
          .inFilter('owner_bus_id', busIds);

      final routeIdMap = <String, List<String>>{};
      for (final assignment in (routeAssignments as List)) {
        final busId = assignment['owner_bus_id']?.toString() ?? '';
        final routeId = assignment['route_id']?.toString() ?? '';
        routeIdMap.putIfAbsent(busId, () => []).add(routeId);
      }

      // 3. Fetch route details for all assigned routes
      final allRouteIds =
          routeIdMap.values.expand((ids) => ids).toSet().toList();
      final routeDetailsMap = <String, Map<String, dynamic>>{};

      if (allRouteIds.isNotEmpty) {
        final routeDetails = await client
            .from('routes')
            .select('id, name, from_city, to_city')
            .inFilter('id', allRouteIds);

        for (final route in (routeDetails as List)) {
          final id = route['id']?.toString() ?? '';
          routeDetailsMap[id] = route as Map<String, dynamic>;
        }
      }

      // 4. Combine route info into each bus
      for (final bus in buses) {
        final routeIds = routeIdMap[bus.id] ?? [];
        final details = routeIds
            .map((id) => routeDetailsMap[id])
            .whereType<Map<String, dynamic>>()
            .toList();

        final names = details.map((r) => r['name']?.toString() ?? '').join(' / ');
        final paths = details
            .map((r) => '${r['from_city']} → ${r['to_city']}')
            .join(' / ');

        final index = buses.indexOf(bus);
        buses[index] = BusInfo(
          id: bus.id,
          busNumber: bus.busNumber,
          registrationNumber: bus.registrationNumber,
          totalSeats: bus.totalSeats,
          busType: bus.busType,
          status: bus.status,
          isActive: bus.isActive,
          staffCode: bus.staffCode,
          routeNames: names,
          routePaths: paths,
        );
      }

      // 5. Load driver and conductor info for each bus
      for (final bus in buses) {
        try {
          final driverData = await client
              .from('bus_drivers')
              .select('driver_name, driver_phone')
              .eq('bus_id', bus.id)
              .maybeSingle();

          final conductorData = await client
              .from('bus_conductors')
              .select('conductor_name, conductor_phone')
              .eq('bus_id', bus.id)
              .maybeSingle();

          bus.driverName = driverData?['driver_name']?.toString() ?? 'N/A';
          bus.driverPhone = driverData?['driver_phone']?.toString() ?? 'N/A';
          bus.conductorName =
              conductorData?['conductor_name']?.toString() ?? 'N/A';
          bus.conductorPhone =
              conductorData?['conductor_phone']?.toString() ?? 'N/A';
        } catch (_) {
          // Leave defaults ('N/A') if a bus has no driver/conductor row
        }
      }

      setState(() {
        _buses = buses;
        _isLoading = false;
      });
    } catch (error) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading buses: $error')),
        );
      }
    }
  }

  Future<void> _toggleActive(BusInfo bus, bool value) async {
    final previous = bus.isActive;
    setState(() {
      bus.isActive = value;
      _togglingIds.add(bus.id);
    });

    try {
      await Supabase.instance.client
          .from('owner_buses')
          .update({'is_active': value})
          .eq('id', bus.id);
    } catch (error) {
      setState(() => bus.isActive = previous);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update bus status')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _togglingIds.remove(bus.id));
      }
    }
  }

  void _toggleExpand(String busId) {
    setState(() {
      if (_expandedIds.contains(busId)) {
        _expandedIds.remove(busId);
      } else {
        _expandedIds.add(busId);
      }
    });
  }

  void _copyStaffCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Staff code copied')),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final gradientColors = isDark
        ? [colorScheme.primary.withAlpha(20), colorScheme.surface]
        : [colorScheme.primary.withAlpha(31), const Color(0xFFF4F5FF)];

    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: gradientColors,
              ),
            ),
          ),
          SafeArea(
            child: RefreshIndicator(
              onRefresh: _loadBuses,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _buses.isEmpty
                      ? _buildEmptyState(colorScheme)
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(20),
                          itemCount: _buses.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final bus = _buses[index];
                            return _BusCard(
                              bus: bus,
                              expanded: _expandedIds.contains(bus.id),
                              isToggling: _togglingIds.contains(bus.id),
                              statusColor: _statusColor(bus.status),
                              onExpandToggle: () => _toggleExpand(bus.id),
                              onActiveChanged: (value) =>
                                  _toggleActive(bus, value),
                              onCopyStaffCode: () =>
                                  _copyStaffCode(bus.staffCode),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.directions_bus_filled,
                    size: 56,
                    color: colorScheme.primary.withAlpha(120),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No buses yet',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Buses you register will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurface.withAlpha(140),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BusCard extends StatelessWidget {
  const _BusCard({
    required this.bus,
    required this.expanded,
    required this.isToggling,
    required this.statusColor,
    required this.onExpandToggle,
    required this.onActiveChanged,
    required this.onCopyStaffCode,
  });

  final BusInfo bus;
  final bool expanded;
  final bool isToggling;
  final Color statusColor;
  final VoidCallback onExpandToggle;
  final ValueChanged<bool> onActiveChanged;
  final VoidCallback onCopyStaffCode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: onExpandToggle,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withAlpha(31),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.directions_bus_filled,
                      color: colorScheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                bus.busNumber,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: statusColor.withAlpha(31),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                bus.status[0].toUpperCase() +
                                    bus.status.substring(1),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          bus.routePaths.isNotEmpty
                              ? bus.routePaths
                              : 'No route assigned',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurface.withAlpha(150),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.secondary.withAlpha(25),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            bus.busType,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface.withAlpha(180),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedRotation(
                    turns: expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.keyboard_arrow_down),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: expanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Divider(color: colorScheme.outline.withAlpha(40)),
                        const SizedBox(height: 8),
                        _DetailRow(
                          icon: Icons.badge_outlined,
                          label: 'Registration',
                          value: bus.registrationNumber,
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(height: 10),
                        _DetailRow(
                          icon: Icons.event_seat_outlined,
                          label: 'Total Seats',
                          value: bus.totalSeats.toString(),
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(height: 10),

                        // Active status switch
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest
                                .withAlpha(80),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.power_settings_new,
                                size: 16,
                                color: colorScheme.onSurface.withAlpha(140),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Active Status',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: colorScheme.onSurface
                                            .withAlpha(140),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      bus.isActive ? 'Active' : 'Inactive',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: bus.isActive
                                            ? Colors.green
                                            : colorScheme.onSurface
                                                .withAlpha(150),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              isToggling
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : Switch(
                                      value: bus.isActive,
                                      activeTrackColor: Colors.green,
                                      onChanged: onActiveChanged,
                                    ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Staff code with copy
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest
                                .withAlpha(80),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.vpn_key_outlined,
                                size: 16,
                                color: colorScheme.onSurface.withAlpha(140),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Staff Code',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: colorScheme.onSurface
                                            .withAlpha(140),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      bus.staffCode,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.copy, size: 18),
                                onPressed: onCopyStaffCode,
                                tooltip: 'Copy staff code',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),

                        Text(
                          'Driver',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _StaffRow(
                          name: bus.driverName,
                          phone: bus.driverPhone,
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(height: 14),

                        Text(
                          'Conductor',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _StaffRow(
                          name: bus.conductorName,
                          phone: bus.conductorPhone,
                          colorScheme: colorScheme,
                        ),
                      ],
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.colorScheme,
  });

  final IconData icon;
  final String label;
  final String value;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withAlpha(80),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: colorScheme.onSurface.withAlpha(140)),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withAlpha(140),
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _StaffRow extends StatelessWidget {
  const _StaffRow({
    required this.name,
    required this.phone,
    required this.colorScheme,
  });

  final String name;
  final String phone;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withAlpha(80),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: colorScheme.primary.withAlpha(31),
            child: Icon(Icons.person, size: 18, color: colorScheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withAlpha(150),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}