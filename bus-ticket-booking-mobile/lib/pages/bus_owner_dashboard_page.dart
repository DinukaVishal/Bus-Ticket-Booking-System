import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';

class BusOwnerDashboardPage extends StatefulWidget {
  const BusOwnerDashboardPage({super.key});

  @override
  State<BusOwnerDashboardPage> createState() => _BusOwnerDashboardPageState();
}

class _BusOwnerDashboardPageState extends State<BusOwnerDashboardPage> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _ownerBuses = [];
  int _activeBusCount = 0;
  int _pendingApprovalCount = 0;

  @override
  void initState() {
    super.initState();
    _loadOwnerDashboard();
  }

  Future<void> _loadOwnerDashboard() async {
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
      final response = await Supabase.instance.client
          .from('owner_buses')
          .select('id,bus_number,bus_type,total_seats,approval_status,is_active,registration_number')
          .eq('bus_owner_id', userId)
          .order('created_at', ascending: false);

      final data = response as List<dynamic>?;
      final buses = data
              ?.map((item) => Map<String, dynamic>.from(item as Map))
              .toList() ??
          [];

      final activeCount = buses.where((bus) => bus['is_active'] == true).length;
      final pendingCount = buses.where((bus) => bus['approval_status'] == 'pending').length;

      setState(() {
        _ownerBuses = buses;
        _activeBusCount = activeCount;
        _pendingApprovalCount = pendingCount;
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load owner dashboard: $error')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final email = SupabaseService.currentUser?.email ?? 'Owner';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bus Owner Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadOwnerDashboard,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back, $email',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Manage your buses, approval status, and upcoming routes from a single place.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildMetricCard('Your buses', _ownerBuses.length.toString(), Colors.deepPurple),
                        _buildMetricCard('Active buses', _activeBusCount.toString(), Colors.green),
                        _buildMetricCard('Pending', _pendingApprovalCount.toString(), Colors.orange),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Bus fleet',
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
                                'No buses found yet',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 10),
                              const Text(
                                'Create your first bus entry to start assigning routes and managing staff.',
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.pushReplacementNamed(context, '/owner-signup');
                                },
                                child: const Text('Add a bus'),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Column(
                        children: _ownerBuses.map((bus) {
                          final status = bus['approval_status'] as String? ?? 'pending';
                          final isActive = bus['is_active'] == true;
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                            elevation: 4,
                            margin: const EdgeInsets.only(bottom: 16),
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        bus['bus_number'] as String? ?? 'Bus',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                      ),
                                      Chip(
                                        backgroundColor: isActive ? Colors.green.shade100 : Colors.grey.shade200,
                                        label: Text(
                                          isActive ? 'Active' : 'Inactive',
                                          style: TextStyle(
                                            color: isActive ? Colors.green.shade800 : Colors.grey.shade700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Text('Type: ${bus['bus_type'] ?? 'unknown'}'),
                                  const SizedBox(height: 4),
                                  Text('Seats: ${bus['total_seats'] ?? '—'}'),
                                  const SizedBox(height: 4),
                                  Text('Registration: ${bus['registration_number'] ?? '—'}'),
                                  const SizedBox(height: 14),
                                  Row(
                                    children: [
                                      _buildStatusTag(status),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          status == 'approved'
                                              ? 'Service is live for passengers.'
                                              : status == 'rejected'
                                                  ? 'Your bus requires review.'
                                                  : 'Approval is pending with the operations team.',
                                          style: Theme.of(context).textTheme.bodySmall,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _loadOwnerDashboard,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Refresh dashboard'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _handleLogout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricCard(String title, String value, MaterialColor color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(18),
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: color.withAlpha(31),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color.shade700)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusTag(String status) {
    var label = status;
    MaterialColor color = Colors.orange;

    if (status == 'approved') {
      color = Colors.green;
      label = 'Approved';
    } else if (status == 'rejected') {
      color = Colors.red;
      label = 'Rejected';
    } else if (status == 'pending') {
      color = Colors.orange;
      label = 'Pending';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(46),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color.shade900),
      ),
    );
  }
}
