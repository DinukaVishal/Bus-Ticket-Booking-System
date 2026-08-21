// import 'package:flutter/material.dart';
// import '../services/supabase_service.dart';

// class BusOwnerHomePage extends StatefulWidget {
//   const BusOwnerHomePage({super.key});

//   @override
//   State<BusOwnerHomePage> createState() => _BusOwnerHomePageState();
// }

// class _BusOwnerHomePageState extends State<BusOwnerHomePage> {
//   bool _isLoading = true;
//   List<Map<String, dynamic>> _ownerBuses = [];
//   int _activeBusCount = 0;
//   int _pendingApprovalCount = 0;

//   @override
//   void initState() {
//     super.initState();
//     // _loadOwnerDashboard();
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       _checkAndLoad();
//     });
//   }

//   Future<void> _checkAndLoad() async {
//     final userId = SupabaseService.currentUser?.id;

//     if (!mounted) return;

//     if (userId == null) {
//       if (mounted) {
//         Navigator.pushReplacementNamed(context, '/login');
//       }
//       return;
//     }

//     await _loadOwnerDashboard(userId);
//   }

//   Future<void> _loadOwnerDashboard(String userId) async {
//     if (!mounted) return;

//     setState(() {
//       _isLoading = true;
//     });

//     try {
//       final response = await Supabase.instance.client
//           .from('owner_buses')
//           .select(
//             'id,bus_number,bus_type,total_seats,approval_status,is_active,registration_number',
//           )
//           .eq('bus_owner_id', userId)
//           .order('created_at', ascending: false);

//       final data = response as List<dynamic>?;

//       final buses =
//           data
//               ?.map((item) => Map<String, dynamic>.from(item as Map))
//               .toList() ??
//           [];

//       final activeCount = buses.where((bus) => bus['is_active'] == true).length;

//       final pendingCount = buses
//           .where((bus) => bus['approval_status'] == 'pending')
//           .length;

//       if (!mounted) return;

//       setState(() {
//         _ownerBuses = buses;
//         _activeBusCount = activeCount;
//         _pendingApprovalCount = pendingCount;
//       });
//     } catch (error) {
//       if (!mounted) return;

//       ScaffoldMessenger.of(context).showSnackBar(
//         SnackBar(content: Text('Failed to load owner dashboard: $error')),
//       );
//     } finally {
//       if (!mounted) return;

//       setState(() {
//         _isLoading = false;
//       });
//     }
//   }

//   Future<void> _handleLogout() async {
//     await SupabaseService.signOut();
//     if (!mounted) return;
//     Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
//   }

//   @override
//   Widget build(BuildContext context) {
//     final email = SupabaseService.currentUser?.email ?? 'Owner';

//     return Scaffold(
//       body: _isLoading
//           ? const Center(child: CircularProgressIndicator())
//           : RefreshIndicator(
//               onRefresh: _checkAndLoad,
//               child: SingleChildScrollView(
//                 physics: const AlwaysScrollableScrollPhysics(),
//                 padding: const EdgeInsets.symmetric(
//                   horizontal: 20,
//                   vertical: 24,
//                 ),
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(
//                       'Welcome back, $email',
//                       style: Theme.of(context).textTheme.headlineSmall
//                           ?.copyWith(fontWeight: FontWeight.bold),
//                     ),
//                     const SizedBox(height: 12),
//                     Text(
//                       'Manage your buses, approval status, and upcoming routes from a single place.',
//                       style: Theme.of(context).textTheme.bodyMedium,
//                     ),
//                     const SizedBox(height: 24),
//                     Row(
//                       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                       children: [
//                         _buildMetricCard(
//                           'Your buses',
//                           _ownerBuses.length.toString(),
//                           Colors.deepPurple,
//                         ),
//                         _buildMetricCard(
//                           'Active buses',
//                           _activeBusCount.toString(),
//                           Colors.green,
//                         ),
//                         _buildMetricCard(
//                           'Pending',
//                           _pendingApprovalCount.toString(),
//                           Colors.orange,
//                         ),
//                       ],
//                     ),
//                     const SizedBox(height: 24),
//                     Text(
//                       'Bus fleet',
//                       style: Theme.of(context).textTheme.headlineSmall
//                           ?.copyWith(fontWeight: FontWeight.bold),
//                     ),
//                     const SizedBox(height: 12),
//                     if (_ownerBuses.isEmpty)
//                       Card(
//                         shape: RoundedRectangleBorder(
//                           borderRadius: BorderRadius.circular(24),
//                         ),
//                         elevation: 4,
//                         child: Padding(
//                           padding: const EdgeInsets.all(20),
//                           child: Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               const Text(
//                                 'No buses found yet',
//                                 style: TextStyle(
//                                   fontSize: 18,
//                                   fontWeight: FontWeight.bold,
//                                 ),
//                               ),
//                               const SizedBox(height: 10),
//                               const Text(
//                                 'Create your first bus entry to start assigning routes and managing staff.',
//                               ),
//                               const SizedBox(height: 16),
//                               ElevatedButton(
//                                 onPressed: () {
//                                   Navigator.pushReplacementNamed(
//                                     context,
//                                     '/owner-signup',
//                                   );
//                                 },
//                                 style: ElevatedButton.styleFrom(
//                                   foregroundColor: Colors.white,
//                                 ),
//                                 child: const Text(
//                                   'Add a bus',
//                                   style: TextStyle(color: Colors.white),
//                                 ),
//                               ),
//                             ],
//                           ),
//                         ),
//                       )
//                     else
//                       Column(
//                         children: _ownerBuses.map((bus) {
//                           final status =
//                               bus['approval_status'] as String? ?? 'pending';
//                           final isActive = bus['is_active'] == true;
//                           return Card(
//                             shape: RoundedRectangleBorder(
//                               borderRadius: BorderRadius.circular(24),
//                             ),
//                             elevation: 4,
//                             margin: const EdgeInsets.only(bottom: 16),
//                             child: Padding(
//                               padding: const EdgeInsets.all(18),
//                               child: Column(
//                                 crossAxisAlignment: CrossAxisAlignment.start,
//                                 children: [
//                                   Row(
//                                     mainAxisAlignment:
//                                         MainAxisAlignment.spaceBetween,
//                                     children: [
//                                       Text(
//                                         bus['bus_number'] as String? ?? 'Bus',
//                                         style: const TextStyle(
//                                           fontSize: 18,
//                                           fontWeight: FontWeight.bold,
//                                         ),
//                                       ),
//                                       Chip(
//                                         backgroundColor: isActive
//                                             ? Colors.green.shade100
//                                             : Colors.grey.shade200,
//                                         label: Text(
//                                           isActive ? 'Active' : 'Inactive',
//                                           style: TextStyle(
//                                             color: isActive
//                                                 ? Colors.green.shade800
//                                                 : Colors.grey.shade700,
//                                           ),
//                                         ),
//                                       ),
//                                     ],
//                                   ),
//                                   const SizedBox(height: 10),
//                                   Text('Type: ${bus['bus_type'] ?? 'unknown'}'),
//                                   const SizedBox(height: 4),
//                                   Text('Seats: ${bus['total_seats'] ?? '—'}'),
//                                   const SizedBox(height: 4),
//                                   Text(
//                                     'Registration: ${bus['registration_number'] ?? '—'}',
//                                   ),
//                                   const SizedBox(height: 14),
//                                   Row(
//                                     children: [
//                                       _buildStatusTag(status),
//                                       const SizedBox(width: 10),
//                                       Expanded(
//                                         child: Text(
//                                           status == 'approved'
//                                               ? 'Service is live for passengers.'
//                                               : status == 'rejected'
//                                               ? 'Your bus requires review.'
//                                               : 'Approval is pending with the operations team.',
//                                           style: Theme.of(
//                                             context,
//                                           ).textTheme.bodySmall,
//                                         ),
//                                       ),
//                                     ],
//                                   ),
//                                 ],
//                               ),
//                             ),
//                           );
//                         }).toList(),
//                       ),
//                     const SizedBox(height: 24),
//                     ElevatedButton.icon(
//                       onPressed: _checkAndLoad,
//                       style: ElevatedButton.styleFrom(
//                         foregroundColor: Colors.white,
//                       ),
//                       icon: const Icon(Icons.refresh, color: Colors.white),
//                       label: const Text(
//                         'Refresh dashboard',
//                         style: TextStyle(color: Colors.white),
//                       ),
//                     ),
//                     const SizedBox(height: 12),
//                     OutlinedButton.icon(
//                       onPressed: _handleLogout,
//                       icon: const Icon(Icons.logout),
//                       label: const Text('Logout'),
//                     ),
//                   ],
//                 ),
//               ),
//             ),
//     );
//   }

//   Widget _buildMetricCard(String title, String value, MaterialColor color) {
//     return Expanded(
//       child: Container(
//         padding: const EdgeInsets.all(18),
//         margin: const EdgeInsets.only(right: 12),
//         decoration: BoxDecoration(
//           color: color.withAlpha(31),
//           borderRadius: BorderRadius.circular(24),
//         ),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Text(
//               title,
//               style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
//             ),
//             const SizedBox(height: 10),
//             Text(
//               value,
//               style: TextStyle(
//                 fontSize: 28,
//                 fontWeight: FontWeight.bold,
//                 color: color.shade700,
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }

//   Widget _buildStatusTag(String status) {
//     var label = status;
//     MaterialColor color = Colors.orange;

//     if (status == 'approved') {
//       color = Colors.green;
//       label = 'Approved';
//     } else if (status == 'rejected') {
//       color = Colors.red;
//       label = 'Rejected';
//     } else if (status == 'pending') {
//       color = Colors.orange;
//       label = 'Pending';
//     }

//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
//       decoration: BoxDecoration(
//         color: color.withAlpha(46),
//         borderRadius: BorderRadius.circular(16),
//       ),
//       child: Text(
//         label,
//         style: TextStyle(
//           fontSize: 12,
//           fontWeight: FontWeight.bold,
//           color: color.shade900,
//         ),
//       ),
//     );
//   }
// }

import 'dart:async';
import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class BusOwnerHomePage extends StatefulWidget {
  const BusOwnerHomePage({super.key});

  @override
  State<BusOwnerHomePage> createState() => _BusOwnerHomePageState();
}

class _BusOwnerHomePageState extends State<BusOwnerHomePage> {
  Timer? _clockTimer;
  DateTime _now = DateTime.now();

  String _ownerName = 'Owner';
  String _role = 'Unknown';

  bool _isLoadingStats = true;

  // Bus stats
  int _activeBuses = 0;
  int _pendingBuses = 0;
  int _totalBuses = 0;

  // Crew stats
  int _totalDrivers = 0;
  int _availableDrivers = 0;
  int _assignedDrivers = 0;
  int _totalCrew = 0;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  void _loadProfile() async {
    final user = SupabaseService.currentUser;
    if (user != null) {
      final displayName =
          user.userMetadata?['display_name']?.toString() ?? 'Owner';
      String role = user.userMetadata?['role']?.toString() ?? 'Unknown';
      final userId = user.id;
      if (role == "bus_owner") {
        role = "Bus Owner";
      }
      setState(() {
        _ownerName = displayName;
        _role = role;
      });
      await _loadBusStats(userId);
      await _loadCrewStats(userId);
    }
    else {
      _handleLogout();
    }
  }

  Future<void> _loadBusStats(String userId) async {
    if (!mounted) return;

    setState(() {
      _isLoadingStats = true;
    });

    try {
      final response = await Supabase.instance.client
          .from('owner_buses')
          .select(
            'id,bus_number,bus_type,total_seats,approval_status,is_active,registration_number',
          )
          .eq('bus_owner_id', userId)
          .order('created_at', ascending: false);

      final data = response as List<dynamic>;

      final buses = data
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

      final activeBuses = buses.where((bus) => bus['is_active'] == true).length;

      final pendingBuses = buses
          .where((bus) => bus['approval_status'] == 'pending')
          .length;

      final totalBuses = buses.length;

      if (!mounted) return;

      setState(() {
        _activeBuses = activeBuses;
        _pendingBuses = pendingBuses;
        _totalBuses = totalBuses;
        _isLoadingStats = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isLoadingStats = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load dashboard stats: $error')),
      );
    }
  }

  Future<void> _loadCrewStats(String userId) async {
    if (!mounted) return;

    setState(() {
      _isLoadingStats = true;
    });

    try {
      final response = await Supabase.instance.client.rpc(
        'get_crew_dashboard_stats',
        params: {'_owner_id': userId},
      );

      final data = response as List<dynamic>?;

      if (data == null || data.isEmpty) {
        throw Exception('No dashboard statistics found');
      }

      final stats = Map<String, dynamic>.from(data.first as Map);

      if (!mounted) return;

      setState(() {
        _totalDrivers = stats['total_drivers'] ?? 0;
        // _activeDrivers = stats['active_drivers'] ?? 0;
        _availableDrivers = stats['available_drivers'] ?? 0;
        _assignedDrivers = stats['assigned_drivers'] ?? 0;
        // _onLeaveDrivers = stats['on_leave_drivers'] ?? 0;

        _totalCrew = stats['total_crew'] ?? 0;
        // _activeCrew = stats['active_crew'] ?? 0;
        // _assignedBuses = stats['assigned_buses'] ?? 0;

        _isLoadingStats = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isLoadingStats = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load dashboard stats: $error')),
      );
    }
  }

  String _formatDate(DateTime date) {
    const weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final weekday = weekdays[date.weekday - 1];
    final month = months[date.month - 1];
    return '$weekday, ${date.day} $month ${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour24 = date.hour;
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final second = date.second.toString().padLeft(2, '0');
    final period = hour24 >= 12 ? 'PM' : 'AM';
    return '${hour12.toString().padLeft(2, '0')}:$minute:$second $period';
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
              onRefresh: () async {
                _loadProfile();
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Greeting Header Card
                      Card(
                        elevation: 8,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                colorScheme.primary,
                                colorScheme.primary.withAlpha(180),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(28),
                          ),
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 52,
                                    height: 52,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.white.withAlpha(46),
                                    ),
                                    child: const Icon(
                                      Icons.person,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Welcome back,',
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.white.withAlpha(200),
                                          ),
                                        ),
                                        Text(
                                          _ownerName,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withAlpha(46),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      _role,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(31),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.calendar_today,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _formatDate(_now),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      _formatTime(_now),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Bus Section
                      _StatSection(
                        icon: Icons.directions_bus_filled,
                        iconColor: Colors.blue,
                        title: 'Bus',
                        isLoading: _isLoadingStats,
                        stats: [
                          _StatData(
                            label: 'Active',
                            value: _activeBuses,
                            icon: Icons.check_circle_outline,
                            color: Colors.green,
                          ),
                          _StatData(
                            label: 'Total',
                            value: _totalBuses,
                            icon: Icons.directions_bus_filled,
                            color: Colors.blue,
                          ),
                          _StatData(
                            label: 'Pending Approval',
                            value: _pendingBuses,
                            icon: Icons.hourglass_empty,
                            color: Colors.orange,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Crew Section
                      _StatSection(
                        icon: Icons.groups_outlined,
                        iconColor: Colors.purple,
                        title: 'Crew',
                        isLoading: _isLoadingStats,
                        stats: [
                          _StatData(
                            label: 'Total Drivers',
                            value: _totalDrivers,
                            icon: Icons.badge_outlined,
                            color: Colors.indigo,
                          ),
                          _StatData(
                            label: 'Available Drivers',
                            value: _availableDrivers,
                            icon: Icons.person_search_outlined,
                            color: Colors.green,
                          ),
                          _StatData(
                            label: 'Assigned Drivers',
                            value: _assignedDrivers,
                            icon: Icons.assignment_ind_outlined,
                            color: Colors.orange,
                          ),
                          _StatData(
                            label: 'Total Crew',
                            value: _totalCrew,
                            icon: Icons.groups_outlined,
                            color: Colors.purple,
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatData {
  const _StatData({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color color;
}

class _StatSection extends StatelessWidget {
  const _StatSection({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.stats,
    required this.isLoading,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final List<_StatData> stats;
  final bool isLoading;

  static const double _spacing = 12.0;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
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
              ],
            ),
            const SizedBox(height: 18),
            if (isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              _buildGrid(),
          ],
        ),
      ),
    );
  }

  Widget _buildGrid() {
    final columns = stats.length >= 4 ? 2 : stats.length;
    final rows = <List<_StatData>>[];
    for (var i = 0; i < stats.length; i += columns) {
      rows.add(
        stats.sublist(
          i,
          (i + columns > stats.length) ? stats.length : i + columns,
        ),
      );
    }

    return Column(
      children: [
        for (int r = 0; r < rows.length; r++) ...[
          if (r > 0) const SizedBox(height: _spacing),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (int i = 0; i < rows[r].length; i++) ...[
                  if (i > 0) const SizedBox(width: _spacing),
                  Expanded(child: _StatBox(stat: rows[r][i])),
                ],
                // Pad the last row if it has fewer items than `columns`
                // so boxes don't stretch to fill the missing slot.
                if (rows[r].length < columns)
                  for (int i = 0; i < columns - rows[r].length; i++) ...[
                    const SizedBox(width: _spacing),
                    const Expanded(child: SizedBox()),
                  ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.stat});

  final _StatData stat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: stat.color.withAlpha(20),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: stat.color.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: stat.color.withAlpha(40),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(stat.icon, color: stat.color, size: 18),
          ),
          const SizedBox(height: 10),
          Text(
            stat.value.toString(),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            stat.label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface.withAlpha(150),
            ),
          ),
        ],
      ),
    );
  }
}
