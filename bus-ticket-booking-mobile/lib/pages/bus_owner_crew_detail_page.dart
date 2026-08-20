import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum CrewFilter { driver, conductor, assignment }

class DriverInfo {
  DriverInfo({
    required this.id,
    required this.name,
    required this.phone,
    required this.isActive,
  });

  final String id;
  final String name;
  final String phone;
  bool isActive;

  factory DriverInfo.fromMap(Map<String, dynamic> map) => DriverInfo(
    id: map['id']?.toString() ?? '',
    name: map['driver_name']?.toString() ?? 'N/A',
    phone: map['driver_phone']?.toString() ?? 'N/A',
    isActive: map['is_active'] == true,
  );
}

class ConductorInfo {
  ConductorInfo({
    required this.id,
    required this.name,
    required this.phone,
    required this.isActive,
  });

  final String id;
  final String name;
  final String phone;
  bool isActive;

  factory ConductorInfo.fromMap(Map<String, dynamic> map) => ConductorInfo(
    id: map['id']?.toString() ?? '',
    name: map['conductor_name']?.toString() ?? 'N/A',
    phone: map['conductor_phone']?.toString() ?? 'N/A',
    isActive: map['is_active'] == true,
  );
}

class AssignmentInfo {
  AssignmentInfo({
    required this.id,
    required this.bus,
    required this.route,
    required this.driver,
    required this.conductor,
    required this.status,
    required this.isActive,
  });

  final String id;
  final String bus;
  final String route;
  final String driver;
  final String conductor;
  final String status;
  bool isActive;
}

class BusOwnerCrewDetailPage extends StatefulWidget {
  const BusOwnerCrewDetailPage({super.key});

  @override
  State<BusOwnerCrewDetailPage> createState() => _BusOwnerCrewDetailPageState();
}

class _BusOwnerCrewDetailPageState extends State<BusOwnerCrewDetailPage> {
  CrewFilter _selectedFilter = CrewFilter.driver;
  bool _isLoading = true;

  List<DriverInfo> _drivers = [];
  List<ConductorInfo> _conductors = [];
  List<AssignmentInfo> _assignments = [];

  final Set<String> _togglingIds = {};

  @override
  void initState() {
    super.initState();
    _loadCrew();
  }

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  Future<void> _loadCrew() async {
    setState(() => _isLoading = true);
    try {
      final userId = SupabaseService.currentUser?.id;
      if (userId == null) {
        setState(() {
          _drivers = [];
          _conductors = [];
          _assignments = [];
          _isLoading = false;
        });
        _handleLogout();
        return;
      }

      final results = await Future.wait([
        _loadDrivers(userId),
        _loadConductors(userId),
        _loadAssignments(userId),
      ]);

      setState(() {
        _drivers = results[0] as List<DriverInfo>;
        _conductors = results[1] as List<ConductorInfo>;
        _assignments = results[2] as List<AssignmentInfo>;
        _isLoading = false;
      });
    } catch (error) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading crew: $error')));
      }
    }
  }

  Future<List<DriverInfo>> _loadDrivers(String userId) async {
    final data = await Supabase.instance.client
        .from('bus_drivers')
        .select('*')
        .eq('bus_owner_id', userId)
        .order('created_at', ascending: false);

    return (data as List)
        .map((row) => DriverInfo.fromMap(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  Future<List<ConductorInfo>> _loadConductors(String userId) async {
    final data = await Supabase.instance.client
        .from('bus_conductors')
        .select('*')
        .eq('bus_owner_id', userId)
        .order('created_at', ascending: false);

    return (data as List)
        .map(
          (row) => ConductorInfo.fromMap(Map<String, dynamic>.from(row as Map)),
        )
        .toList();
  }

  Future<List<AssignmentInfo>> _loadAssignments(String userId) async {
    final data = await Supabase.instance.client
        .from('owner_buses')
        .select('''
        id,
        bus_number,
        is_active,
        bus_drivers (
          id,
          is_active,
          driver_name,
          driver_phone,
          assignment_date
        ),
        bus_conductors (
          id,
          is_active,
          conductor_name,
          conductor_phone,
          assignment_date
        ),
        owner_routes (
          id,
          route_id,
          is_active,
          routes (
            id,
            name,
            from_city,
            to_city,
            departure_time,
            arrival_time
          )
        )
      ''')
        .eq('bus_owner_id', userId)
        .order('created_at', ascending: false);

    final List<AssignmentInfo> assignments = [];

    for (final row in data) {
      final bus = row;

      final routes = (bus['owner_routes'] as List?) ?? [];

      for (final ownerRoute in routes) {
        final route = ownerRoute['routes'];

        assignments.add(
          AssignmentInfo(
            id: ownerRoute['id']?.toString() ?? '',
            bus: bus['bus_number']?.toString() ?? 'N/A',

            route: route?['name']?.toString() ?? 'N/A',

            driver: (bus['bus_drivers'] as List?)?.isNotEmpty == true
                ? bus['bus_drivers'][0]['driver_name']?.toString() ?? 'N/A'
                : 'N/A',

            conductor: (bus['bus_conductors'] as List?)?.isNotEmpty == true
                ? bus['bus_conductors'][0]['conductor_name']?.toString() ??
                      'N/A'
                : 'N/A',

            status: ownerRoute['is_active'] == true ? 'Active' : 'Inactive',

            isActive: ownerRoute['is_active'] == true,
          ),
        );
      }
    }

    return assignments;
  }

  Future<void> _toggleDriverActive(DriverInfo driver, bool value) async {
    final previous = driver.isActive;
    setState(() {
      driver.isActive = value;
      _togglingIds.add(driver.id);
    });
    try {
      await Supabase.instance.client
          .from('bus_drivers')
          .update({'is_active': value})
          .eq('id', driver.id);
    } catch (_) {
      setState(() => driver.isActive = previous);
      _showToggleError();
    } finally {
      if (mounted) setState(() => _togglingIds.remove(driver.id));
    }
  }

  Future<void> _toggleConductorActive(
    ConductorInfo conductor,
    bool value,
  ) async {
    final previous = conductor.isActive;
    setState(() {
      conductor.isActive = value;
      _togglingIds.add(conductor.id);
    });
    try {
      await Supabase.instance.client
          .from('bus_conductors')
          .update({'is_active': value})
          .eq('id', conductor.id);
    } catch (_) {
      setState(() => conductor.isActive = previous);
      _showToggleError();
    } finally {
      if (mounted) setState(() => _togglingIds.remove(conductor.id));
    }
  }

  Future<void> _toggleAssignmentActive(
    AssignmentInfo assignment,
    bool value,
  ) async {
    final previous = assignment.isActive;
    setState(() {
      assignment.isActive = value;
      _togglingIds.add(assignment.id);
    });
    try {
      await Supabase.instance.client
          .from('bus_assignments')
          .update({'is_active': value})
          .eq('id', assignment.id);
    } catch (_) {
      setState(() => assignment.isActive = previous);
      _showToggleError();
    } finally {
      if (mounted) setState(() => _togglingIds.remove(assignment.id));
    }
  }

  void _showToggleError() {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to update status')));
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
      appBar: AppBar(title: const Text('Crew'), elevation: 0),
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
            child: LayoutBuilder(
              builder: (context, constraints) {
                const verticalPadding = 16.0;
                return RefreshIndicator(
                  onRefresh: _loadCrew,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: verticalPadding,
                    ),
                    child: SizedBox(
                      height: constraints.maxHeight - verticalPadding * 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _FilterBar(
                            selected: _selectedFilter,
                            onChanged: (filter) =>
                                setState(() => _selectedFilter = filter),
                            colorScheme: colorScheme,
                          ),
                          const SizedBox(height: 16),
                          if (_isLoading)
                            const Expanded(
                              child: Center(child: CircularProgressIndicator()),
                            )
                          else
                            Expanded(
                              child: _buildTableCard(colorScheme, theme),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableCard(ColorScheme colorScheme, ThemeData theme) {
    switch (_selectedFilter) {
      case CrewFilter.driver:
        return _ScrollableTableCard(
          colorScheme: colorScheme,
          icon: Icons.badge_outlined,
          iconColor: Colors.indigo,
          title: 'Drivers',
          isEmpty: _drivers.isEmpty,
          emptyLabel: 'No drivers added yet',
          columns: const ['Name', 'Phone', 'Status', 'Action'],
          rows: _drivers
              .map(
                (driver) => DataRow(
                  cells: [
                    DataCell(Text(driver.name)),
                    DataCell(Text(driver.phone)),
                    DataCell(_StatusBadge(isActive: driver.isActive)),
                    DataCell(
                      _togglingIds.contains(driver.id)
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Switch(
                              value: driver.isActive,
                              activeTrackColor: Colors.green,
                              onChanged: (value) =>
                                  _toggleDriverActive(driver, value),
                            ),
                    ),
                  ],
                ),
              )
              .toList(),
        );

      case CrewFilter.conductor:
        return _ScrollableTableCard(
          colorScheme: colorScheme,
          icon: Icons.confirmation_number_outlined,
          iconColor: Colors.teal,
          title: 'Conductors',
          isEmpty: _conductors.isEmpty,
          emptyLabel: 'No conductors added yet',
          columns: const ['Name', 'Phone', 'Status', 'Action'],
          rows: _conductors
              .map(
                (conductor) => DataRow(
                  cells: [
                    DataCell(Text(conductor.name)),
                    DataCell(Text(conductor.phone)),
                    DataCell(_StatusBadge(isActive: conductor.isActive)),
                    DataCell(
                      _togglingIds.contains(conductor.id)
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Switch(
                              value: conductor.isActive,
                              activeTrackColor: Colors.green,
                              onChanged: (value) =>
                                  _toggleConductorActive(conductor, value),
                            ),
                    ),
                  ],
                ),
              )
              .toList(),
        );

      case CrewFilter.assignment:
        return _ScrollableTableCard(
          colorScheme: colorScheme,
          icon: Icons.assignment_outlined,
          iconColor: Colors.orange,
          title: 'Assignments',
          isEmpty: _assignments.isEmpty,
          emptyLabel: 'No assignments yet',
          columns: const [
            'Bus',
            'Route',
            'Driver',
            'Conductor',
            'Status',
            'Action',
          ],
          rows: _assignments
              .map(
                (a) => DataRow(
                  cells: [
                    DataCell(Text(a.bus)),
                    DataCell(Text(a.route)),
                    DataCell(Text(a.driver)),
                    DataCell(Text(a.conductor)),
                    DataCell(
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: colorScheme.primary.withAlpha(25),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          a.status[0].toUpperCase() + a.status.substring(1),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.primary,
                          ),
                        ),
                      ),
                    ),
                    DataCell(
                      _togglingIds.contains(a.id)
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Switch(
                              value: a.isActive,
                              activeTrackColor: Colors.green,
                              onChanged: (value) =>
                                  _toggleAssignmentActive(a, value),
                            ),
                    ),
                  ],
                ),
              )
              .toList(),
        );
    }
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selected,
    required this.onChanged,
    required this.colorScheme,
  });

  final CrewFilter selected;
  final ValueChanged<CrewFilter> onChanged;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final options = const [
      (CrewFilter.driver, 'Driver', Icons.badge_outlined),
      (CrewFilter.conductor, 'Conductor', Icons.confirmation_number_outlined),
      (CrewFilter.assignment, 'Assignment', Icons.assignment_outlined),
    ];

    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withAlpha(90),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: options.map((option) {
          final isSelected = selected == option.$1;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(option.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? colorScheme.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: colorScheme.primary.withAlpha(60),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      option.$3,
                      size: 18,
                      color: isSelected
                          ? colorScheme.onPrimary
                          : colorScheme.onSurface.withAlpha(150),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      option.$2,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? colorScheme.onPrimary
                            : colorScheme.onSurface.withAlpha(150),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ScrollableTableCard extends StatelessWidget {
  const _ScrollableTableCard({
    required this.colorScheme,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.columns,
    required this.rows,
    required this.isEmpty,
    required this.emptyLabel,
  });

  final ColorScheme colorScheme;
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<String> columns;
  final List<DataRow> rows;
  final bool isEmpty;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    final horizontalController = ScrollController();
    final verticalController = ScrollController();

    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const SizedBox(width: 4),
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: iconColor.withAlpha(31),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: iconColor, size: 22),
                ),
                const SizedBox(width: 14),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '${rows.length} total',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withAlpha(140),
                  ),
                ),
                const SizedBox(width: 4),
              ],
            ),
            const SizedBox(height: 16),
            if (isEmpty)
              Expanded(
                child: Center(
                  child: Text(
                    emptyLabel,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurface.withAlpha(140),
                    ),
                  ),
                ),
              )
            else
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withAlpha(60),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Scrollbar(
                    controller: horizontalController,
                    thumbVisibility: true,
                    notificationPredicate: (notif) => notif.depth == 0,
                    child: SingleChildScrollView(
                      controller: horizontalController,
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Scrollbar(
                        controller: verticalController,
                        thumbVisibility: true,
                        notificationPredicate: (notif) => notif.depth == 0,
                        child: SingleChildScrollView(
                          controller: verticalController,
                          scrollDirection: Axis.vertical,
                          child: DataTable(
                            headingRowColor: WidgetStateProperty.all(
                              colorScheme.primary.withAlpha(20),
                            ),
                            columnSpacing: 24,
                            columns: columns
                                .map(
                                  (c) => DataColumn(
                                    label: Text(
                                      c,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                            rows: rows,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final color = isActive ? Colors.green : Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(31),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isActive ? 'Active' : 'Inactive',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
