import 'dart:async';

import 'package:flutter/material.dart';

/// A single destination in [PopupBottomNavBar].
class PopupNavItem {
  const PopupNavItem({
    required this.icon,
    required this.label,
    IconData? activeIcon,
  }) : activeIcon = activeIcon ?? icon;

  final IconData icon;
  final IconData activeIcon;
  final String label;
}

/// Bottom navigation bar that pops a label bubble above the item the user
/// hovers (desktop / web) or presses (touch), with a lift + scale animation
/// on the icon itself.
class PopupBottomNavBar extends StatefulWidget {
  const PopupBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  /// Height of the solid bar itself, excluding the transparent popup zone
  /// above it. Useful for padding content that scrolls under the bar.
  static const double barHeight = 66;

  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<PopupNavItem> items;

  @override
  State<PopupBottomNavBar> createState() => _PopupBottomNavBarState();
}

class _PopupBottomNavBarState extends State<PopupBottomNavBar>
    with SingleTickerProviderStateMixin {
  static const double _barHeight = PopupBottomNavBar.barHeight;
  static const double _popupZone = 50;
  static const Duration _pressPopupDuration = Duration(milliseconds: 900);

  late final AnimationController _popupController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 200),
    reverseDuration: const Duration(milliseconds: 140),
  );

  late final Animation<double> _popupScale = CurvedAnimation(
    parent: _popupController,
    curve: Curves.easeOutBack,
    reverseCurve: Curves.easeIn,
  );

  late final Animation<double> _popupFade = CurvedAnimation(
    parent: _popupController,
    curve: Curves.easeOut,
    reverseCurve: Curves.easeIn,
  );

  /// Index the bubble is anchored to. Kept while the bubble animates out so it
  /// does not jump back to the first item on the way down.
  int _popupIndex = 0;
  int? _hoveredIndex;
  int? _pressedIndex;
  Timer? _pressTimer;

  int? get _activeIndex => _hoveredIndex ?? _pressedIndex;

  @override
  void dispose() {
    _pressTimer?.cancel();
    _popupController.dispose();
    super.dispose();
  }

  void _syncPopup() {
    final active = _activeIndex;
    if (active != null) {
      _popupIndex = active;
      _popupController.forward();
    } else {
      _popupController.reverse();
    }
  }

  void _setHovered(int index, bool hovering) {
    setState(() {
      if (hovering) {
        _hoveredIndex = index;
      } else if (_hoveredIndex == index) {
        _hoveredIndex = null;
      }
      _syncPopup();
    });
  }

  void _setPressed(int? index) {
    _pressTimer?.cancel();
    setState(() {
      _pressedIndex = index;
      _syncPopup();
    });
  }

  /// Touch devices have no hover, so keep the bubble up briefly after a tap.
  void _holdPressedPopup(int index) {
    _pressTimer?.cancel();
    _pressTimer = Timer(_pressPopupDuration, () {
      if (!mounted) return;
      setState(() {
        if (_pressedIndex == index) _pressedIndex = null;
        _syncPopup();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: _barHeight + _popupZone,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final itemWidth = constraints.maxWidth / widget.items.length;

              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: _barHeight,
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark
                            ? Color.alphaBlend(
                                colorScheme.primary.withAlpha(18),
                                colorScheme.surface,
                              )
                            : colorScheme.surface,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(24),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isDark
                                ? Colors.black54
                                : const Color.fromRGBO(0, 0, 0, 0.10),
                            blurRadius: 20,
                            offset: const Offset(0, -4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          for (var i = 0; i < widget.items.length; i++)
                            Expanded(
                              child: _NavBarItem(
                                item: widget.items[i],
                                selected: widget.currentIndex == i,
                                highlighted: _activeIndex == i,
                                onHover: (hovering) => _setHovered(i, hovering),
                                onTapDown: () => _setPressed(i),
                                onTapCancel: () => _setPressed(null),
                                onTap: () {
                                  _setPressed(i);
                                  _holdPressedPopup(i);
                                  widget.onTap(i);
                                },
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 0,
                    left: itemWidth * _popupIndex,
                    width: itemWidth,
                    height: _popupZone,
                    child: IgnorePointer(
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: OverflowBox(
                          alignment: Alignment.bottomCenter,
                          maxWidth: constraints.maxWidth,
                          child: FadeTransition(
                            opacity: _popupFade,
                            child: ScaleTransition(
                              scale: _popupScale,
                              alignment: Alignment.bottomCenter,
                              child: _PopupBubble(
                                label: widget.items[_popupIndex].label,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  const _NavBarItem({
    required this.item,
    required this.selected,
    required this.highlighted,
    required this.onHover,
    required this.onTap,
    required this.onTapDown,
    required this.onTapCancel,
  });

  final PopupNavItem item;
  final bool selected;
  final bool highlighted;
  final ValueChanged<bool> onHover;
  final VoidCallback onTap;
  final VoidCallback onTapDown;
  final VoidCallback onTapCancel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final active = selected || highlighted;
    final iconColor = selected
        ? colorScheme.primary
        : highlighted
            ? colorScheme.primary.withAlpha(200)
            : colorScheme.onSurface.withAlpha(140);

    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => onHover(true),
        onExit: (_) => onHover(false),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => onTapDown(),
          onTapCancel: onTapCancel,
          onTap: onTap,
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              transform: Matrix4.translationValues(0, active ? -3 : 0, 0),
              transformAlignment: Alignment.center,
              decoration: BoxDecoration(
                color: active
                    ? colorScheme.primary.withAlpha(selected ? 38 : 20)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: AnimatedScale(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                scale: highlighted ? 1.18 : 1.0,
                child: Icon(
                  selected ? item.activeIcon : item.icon,
                  color: iconColor,
                  size: 26,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PopupBubble extends StatelessWidget {
  const _PopupBubble({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: colorScheme.primary,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.22),
                blurRadius: 12,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Text(
            label,
            style: TextStyle(
              color: colorScheme.onPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
            ),
          ),
        ),
        CustomPaint(
          size: const Size(14, 7),
          painter: _BubbleArrowPainter(color: colorScheme.primary),
        ),
        const SizedBox(height: 6),
      ],
    );
  }
}

class _BubbleArrowPainter extends CustomPainter {
  const _BubbleArrowPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_BubbleArrowPainter oldDelegate) =>
      oldDelegate.color != color;
}
