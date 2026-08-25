import 'package:flutter/material.dart';
import 'my_bookings_page.dart';
import 'forgot_password_page.dart'; 

/// Profile screen for QuickBus.
///
/// STAGE 1 — header only.
/// Next up: account + travel sections, notification switches,
/// edit-profile sheet, sign-out dialog.
class ProfilePage extends StatefulWidget {
  const ProfilePage({
    super.key,
    this.email,
    this.fullName,
    this.phone,
    this.tripCount = 0,
    this.upcomingCount = 0,
    this.points = 0,
    this.onSignOut,
  });

  final String? email;
  final String? fullName;
  final String? phone;
  final int tripCount;
  final int upcomingCount;
  final int points;
  final Future<void> Function()? onSignOut;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late String _name = widget.fullName ?? '';
  late String _phone = widget.phone ?? '';

  bool _busy = false;

  String get _email => widget.email ?? 'Not signed in';

  String get _displayName =>
      _name.trim().isEmpty ? 'Add your name' : _name.trim();

  String get _initials {
    final source = _name.trim().isNotEmpty ? _name.trim() : _email;
    final parts = source
        .split(RegExp(r'[\s._@]+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      final first = parts.first;
      return (first.length >= 2 ? first.substring(0, 2) : first).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ─────────────────────────── actions ───────────────────────────

  void _toast(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  // TODO(stage 4): replace with the edit-profile bottom sheet.
  void _openEditProfile() => _toast('Edit profile — coming next');

  /// Pushes a page if one is wired up, otherwise shows a placeholder toast.
  void _go(String label, {Widget? page}) {
    if (page == null) {
      _toast('$label — coming soon');
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }

  // TODO(stage 5): wrap this in a confirmation dialog.
  Future<void> _signOut() async {
    setState(() => _busy = true);
    try {
      await widget.onSignOut?.call();
    } catch (_) {
      if (mounted) _toast('Could not sign out. Check your connection.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ─────────────────────────── build ───────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 20),
              child: Text(
                'Profile',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.5,
                ),
              ),
            ),

            _buildTicketCard(context),

            const SizedBox(height: 28),

            const _SectionLabel('Account'),
            _TileGroup(
              children: [
                _SettingTile(
                  icon: Icons.person_outline_rounded,
                  title: 'Personal details',
                  subtitle: _phone.trim().isEmpty
                      ? 'Add your mobile number'
                      : _phone.trim(),
                  onTap: _openEditProfile,
                ),
                _SettingTile(
                  icon: Icons.group_outlined,
                  title: 'Saved passengers',
                  subtitle: 'Fill booking forms faster',
                  onTap: () => _go('Saved passengers'),
                ),
                _SettingTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Password & security',
                  onTap: () => _go('Password & security' , page: const ForgotPasswordPage()),
                ),
              ],
            ),

            const SizedBox(height: 24),

            const _SectionLabel('Travel'),
            _TileGroup(
              children: [
                _SettingTile(
                  icon: Icons.confirmation_number_outlined,
                  title: 'My bookings',
                  subtitle: widget.upcomingCount > 0
                      ? '${widget.upcomingCount} upcoming'
                      : 'No upcoming trips',
                  badge: widget.upcomingCount > 0
                      ? '${widget.upcomingCount}'
                      : null,
                  onTap: () => _go('My bookings' , page: const MyBookingsPage()),
                ),
                _SettingTile(
                  icon: Icons.bookmark_outline_rounded,
                  title: 'Saved routes',
                  onTap: () => _go('Saved routes'),
                ),
                _SettingTile(
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'Payment methods',
                  onTap: () => _go('Payment methods'),
                ),
              ],
            ),
            // ↑ methanata

            const SizedBox(height: 32),

            const SizedBox(height: 32),

            OutlinedButton.icon(
              onPressed: _busy ? null : _signOut,
              icon: _busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.logout_rounded, size: 20),
              label: Text(_busy ? 'Signing out' : 'Sign out'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
                foregroundColor: scheme.error,
                side: BorderSide(color: scheme.error.withValues(alpha: 0.45)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Ticket-stub header. The notches and tear line tie the profile screen
  /// back to what the app actually sells.
  Widget _buildTicketCard(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final hasPhone = _phone.trim().isNotEmpty;

    return ClipPath(
      clipper: const _TicketClipper(notchY: 148),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color.alphaBlend(
                scheme.primary.withValues(alpha: 0.10),
                scheme.surfaceContainerHigh,
              ),
              scheme.surfaceContainerHigh,
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 12, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: scheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      _initials,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: scheme.onPrimary,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          _displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        if (hasPhone) ...[
                          const SizedBox(height: 2),
                          Text(
                            _phone.trim(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _openEditProfile,
                    icon: const Icon(Icons.edit_outlined, size: 20),
                    tooltip: 'Edit profile',
                    style: IconButton.styleFrom(
                      backgroundColor: scheme.surface.withValues(alpha: 0.5),
                      foregroundColor: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_rounded,
                        size: 15,
                        color: scheme.primary,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Verified account',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _DashedLine(color: scheme.outlineVariant),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 18),
              child: Row(
                children: [
                  Expanded(
                    child: _Stat(value: '${widget.tripCount}', label: 'Trips'),
                  ),
                  _StatDivider(color: scheme.outlineVariant),
                  Expanded(
                    child: _Stat(
                      value: '${widget.upcomingCount}',
                      label: 'Upcoming',
                    ),
                  ),
                  _StatDivider(color: scheme.outlineVariant),
                  Expanded(
                    child: _Stat(value: '${widget.points}', label: 'Points'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════ private helpers ═══════════════════════

/// Cuts two half-circle notches out of the card so it reads as a torn ticket.
class _TicketClipper extends CustomClipper<Path> {
  const _TicketClipper({
    required this.notchY,
    this.notchRadius = 14,
    this.corner = 24,
  });

  final double notchY;
  final double notchRadius;
  final double corner;

  @override
  Path getClip(Size size) {
    final body = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(0, 0, size.width, size.height),
          Radius.circular(corner),
        ),
      );
    final leftNotch = Path()
      ..addOval(
        Rect.fromCircle(center: Offset(0, notchY), radius: notchRadius),
      );
    final rightNotch = Path()
      ..addOval(
        Rect.fromCircle(
          center: Offset(size.width, notchY),
          radius: notchRadius,
        ),
      );

    return Path.combine(
      PathOperation.difference,
      Path.combine(PathOperation.difference, body, leftNotch),
      rightNotch,
    );
  }

  @override
  bool shouldReclip(_TicketClipper oldClipper) =>
      oldClipper.notchY != notchY ||
      oldClipper.notchRadius != notchRadius ||
      oldClipper.corner != corner;
}

/// A horizontal dashed rule that fills whatever width it is given.
class _DashedLine extends StatelessWidget {
  const _DashedLine({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const dashWidth = 6.0;
        const dashGap = 5.0;
        final count = (constraints.maxWidth / (dashWidth + dashGap)).floor();

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(
            count,
            (_) => Container(width: dashWidth, height: 1.2, color: color),
          ),
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            letterSpacing: 0.4,
          ),
        ),
      ],
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 32, color: color);
}

/// Small uppercase label that heads each group of tiles.
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 0, 0, 10),
      child: Text(
        text.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

/// Wraps tiles into one rounded card with hairline dividers between them.
class _TileGroup extends StatelessWidget {
  const _TileGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      rows.add(children[i]);
      if (i != children.length - 1) {
        rows.add(Divider(
          height: 1,
          thickness: 1,
          indent: 56,
          color: scheme.outlineVariant.withValues(alpha: 0.4),
        ));
      }
    }

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(children: rows),
    );
  }
}

/// One tappable row inside a [_TileGroup].
class _SettingTile extends StatelessWidget {
  const _SettingTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.badge,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? badge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      horizontalTitleGap: 14,
      leading: Icon(icon, size: 22, color: scheme.onSurfaceVariant),
      title: Text(
        title,
        style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w500),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: scheme.primary,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                badge!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: scheme.onPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          const SizedBox(width: 6),
          Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
        ],
      ),
    );
  }
}
