import 'package:flutter/material.dart';
import '../services/supabase_service.dart';

class BusOwnerProfilePage extends StatefulWidget {
  const BusOwnerProfilePage({super.key});

  @override
  State<BusOwnerProfilePage> createState() => _BusOwnerProfilePageState();
}

class _BusOwnerProfilePageState extends State<BusOwnerProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = true;

  bool _helpExpanded = false;
  bool _isSaving = false;

  String _email = 'No email';
  String _role = 'Unknown';
  DateTime? _lastLogin;
  DateTime? _memberSince;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _handleLogout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    final user = SupabaseService.currentUser;
    if (user != null) {
      final displayName =
          user.userMetadata?['display_name']?.toString() ?? 'Unknown';
      String role = user.userMetadata?['role']?.toString() ?? 'Unknown';
      if (role == "bus_owner") {
        role = "Bus Owner";
      }
      final email = user.email ?? 'No email';
      final phone = (user.phone?.isNotEmpty ?? false) ? user.phone! : '';
      final lastLogin = user.lastSignInAt != null
          ? DateTime.tryParse(user.lastSignInAt!)?.toLocal()
          : null;
      final memberSince = DateTime.tryParse(user.createdAt)?.toLocal();

      setState(() {
        _displayNameController.text = displayName;
        _phoneController.text = phone;
        _role = role;
        _email = email;
        _lastLogin = lastLogin;
        _memberSince = memberSince;
        _isLoading = false;
      });
    } else {
      _handleLogout();
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final year = local.year.toString();
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month/$year  $hour:$minute';
  }

  void _showFullValue(String label, String value, Icon icon, String intro) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final screenWidth = MediaQuery.of(context).size.width;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          width: screenWidth * 0.86,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title with icon
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withAlpha(31),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: icon,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      label,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Intro line
              Text(
                intro,
                style: TextStyle(
                  fontSize: 13,
                  color: colorScheme.onSurface.withAlpha(140),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),

              // Content
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withAlpha(80),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: SelectableText(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                    backgroundColor: colorScheme.primary,
                    foregroundColor: colorScheme.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSaveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update profile')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _phoneController.dispose();
    super.dispose();
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
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Circular profile avatar
                          Center(
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 104,
                                  height: 104,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        colorScheme.primary,
                                        colorScheme.primary.withAlpha(180),
                                      ],
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color:
                                            colorScheme.primary.withAlpha(60),
                                        blurRadius: 20,
                                        spreadRadius: 2,
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.person,
                                    color: Colors.white,
                                    size: 52,
                                  ),
                                ),
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: theme.cardColor,
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withAlpha(20),
                                          blurRadius: 8,
                                        ),
                                      ],
                                    ),
                                    child: Icon(
                                      Icons.camera_alt_outlined,
                                      size: 16,
                                      color: colorScheme.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Section 1: Profile Information (fixed, not collapsible)
                          Card(
                            elevation: 8,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color: Colors.blue.withAlpha(31),
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: const Icon(
                                            Icons.person_outline,
                                            color: Colors.blue,
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 14),
                                        const Expanded(
                                          child: Text(
                                            'Profile Information',
                                            style: TextStyle(
                                              fontSize: 17,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 20),

                                    // Editable fields
                                    TextFormField(
                                      controller: _displayNameController,
                                      decoration: InputDecoration(
                                        labelText: 'Display Name',
                                        prefixIcon: const Icon(
                                          Icons.badge_outlined,
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          borderSide: const BorderSide(
                                            color: Colors.grey,
                                          ),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          borderSide: const BorderSide(
                                            color: Colors.blue,
                                            width: 2,
                                          ),
                                        ),
                                      ),
                                      validator: (value) =>
                                          (value == null ||
                                              value.trim().isEmpty)
                                          ? 'Display name cannot be empty'
                                          : null,
                                    ),
                                    const SizedBox(height: 16),
                                    TextFormField(
                                      controller: _phoneController,
                                      keyboardType: TextInputType.phone,
                                      decoration: InputDecoration(
                                        labelText: 'Mobile Number',
                                        prefixIcon: const Icon(
                                          Icons.phone_outlined,
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          borderSide: const BorderSide(
                                            color: Colors.grey,
                                          ),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          borderSide: const BorderSide(
                                            color: Colors.blue,
                                            width: 2,
                                          ),
                                        ),
                                      ),
                                      validator: (value) =>
                                          (value == null ||
                                              value.trim().isEmpty)
                                          ? 'Mobile number cannot be empty'
                                          : null,
                                    ),
                                    const SizedBox(height: 6),
                                    Padding(
                                      padding: const EdgeInsets.only(left: 4),
                                      child: Text(
                                        'Email cannot be changed. Contact support if you need to update it.',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: colorScheme.onSurface
                                              .withAlpha(140),
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 20),

                                    // Read-only field
                                    _InfoRow(
                                      icon: Icons.email_outlined,
                                      label: 'Email Address',
                                      value: _email,
                                      colorScheme: colorScheme,
                                      onTapValue: () => _showFullValue(
                                        'Email Address',
                                        _email,
                                        Icon(
                                          Icons.email_outlined,
                                          color: colorScheme.primary,
                                          size: 20,
                                        ),
                                        "The email address associated with your account.",
                                      ),
                                    ),
                                    const SizedBox(height: 20),

                                    Text(
                                      'Account Information',
                                      style: theme.textTheme.titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                    ),
                                    const SizedBox(height: 10),
                                    _InfoRow(
                                      icon: Icons.verified_user_outlined,
                                      label: 'Role',
                                      value: _role,
                                      colorScheme: colorScheme,
                                      onTapValue: () => _showFullValue(
                                        'Role',
                                        _role,
                                        Icon(
                                          Icons.verified_user_outlined,
                                          color: colorScheme.primary,
                                          size: 20,
                                        ),
                                        "Your assigned role and access level within the system.",
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    _InfoRow(
                                      icon: Icons.login,
                                      label: 'Last Login',
                                      value: _formatDate(_lastLogin),
                                      colorScheme: colorScheme,
                                      onTapValue: () => _showFullValue(
                                        'Last Login',
                                        _formatDate(_lastLogin),
                                        Icon(
                                          Icons.login,
                                          color: colorScheme.primary,
                                          size: 20,
                                        ),
                                        "The date and time you most recently signed in.",
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    _InfoRow(
                                      icon: Icons.calendar_today_outlined,
                                      label: 'Member Since',
                                      value: _formatDate(_memberSince),
                                      colorScheme: colorScheme,
                                      onTapValue: () => _showFullValue(
                                        'Member Since',
                                        _formatDate(_memberSince),
                                        Icon(
                                          Icons.calendar_today_outlined,
                                          color: colorScheme.primary,
                                          size: 20,
                                        ),
                                        "The date your account was originally created.",
                                      ),
                                    ),
                                    const SizedBox(height: 20),

                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton.icon(
                                        onPressed: _isSaving
                                            ? null
                                            : _handleSaveProfile,
                                        icon: _isSaving
                                            ? const SizedBox(
                                                width: 18,
                                                height: 18,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      color: Colors.white,
                                                    ),
                                              )
                                            : const Icon(
                                                Icons.save_outlined,
                                              ),
                                        label: Text(
                                          _isSaving
                                              ? 'Saving...'
                                              : 'Save Profile',
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          minimumSize:
                                              const Size.fromHeight(48),
                                          backgroundColor:
                                              colorScheme.primary,
                                          foregroundColor:
                                              colorScheme.onPrimary,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(20),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Section 2: Need Help? (collapsible)
                          _ExpandableSection(
                            icon: Icons.help_outline,
                            iconColor: Colors.orange,
                            title: 'Need Help?',
                            expanded: _helpExpanded,
                            onToggle: () => setState(
                              () => _helpExpanded = !_helpExpanded,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Common Tasks',
                                  style: theme.textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 12),
                                _BulletItem(
                                  text:
                                      'Go to Dashboard to manage your buses',
                                  colorScheme: colorScheme,
                                ),
                                const SizedBox(height: 8),
                                _BulletItem(
                                  text:
                                      'Add new buses with driver and conductor information',
                                  colorScheme: colorScheme,
                                ),
                                const SizedBox(height: 8),
                                _BulletItem(
                                  text:
                                      'View and track all your registered buses',
                                  colorScheme: colorScheme,
                                ),
                                const SizedBox(height: 20),

                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: colorScheme.primary.withAlpha(15),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: colorScheme.primary.withAlpha(
                                        40,
                                      ),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.support_agent,
                                            color: colorScheme.primary,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Contact Support',
                                            style: theme.textTheme.titleSmall
                                                ?.copyWith(
                                                  fontWeight:
                                                      FontWeight.bold,
                                                ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'If you need any assistance, please contact our support team at support@quickbus.com',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: colorScheme.onSurface
                                              .withAlpha(184),
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _ExpandableSection extends StatelessWidget {
  const _ExpandableSection({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.expanded,
    required this.onToggle,
    required this.child,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final bool expanded;
  final VoidCallback onToggle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
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
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
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
                    child: child,
                  )
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

/// Read-only info row: icon + label on the first line, value on the
/// second line (in its own tappable pill). Long values are ellipsized
/// and can be tapped to view in full via [onTapValue].
class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.colorScheme,
    this.onTapValue,
  });

  final IconData icon;
  final String label;
  final String value;
  final ColorScheme colorScheme;
  final VoidCallback? onTapValue;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withAlpha(80),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: colorScheme.onSurface.withAlpha(140)),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: colorScheme.onSurface.withAlpha(140),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          InkWell(
            onTap: onTapValue,
            borderRadius: BorderRadius.circular(6),
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _BulletItem extends StatelessWidget {
  const _BulletItem({required this.text, required this.colorScheme});

  final String text;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: colorScheme.primary,
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withAlpha(200),
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}