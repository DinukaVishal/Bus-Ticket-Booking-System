// QuickBus — loading screen, rewritten as a native Flutter widget.
// No assets, no WebView, no video: one CustomPainter + one AnimationController.
//
// Usage:
//   1. copy this file to lib/quickbus_loading_screen.dart
//   2. show it while your app boots / data loads:
//        if (loading) return const QuickBusLoadingScreen();
//   3. (optional, for the Barlow type) add to pubspec.yaml:
//        dependencies:
//          google_fonts: ^6.2.1
//      then swap the TextStyle families below for GoogleFonts.barlow(...) /
//      GoogleFonts.barlowCondensed(...). Without it the system font is used.

import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/material.dart';

const Color kPaper = Color(0xFFFBFBFC);
const Color kText = Color(0xFF1D1F20);
const Color kRoad = Color(0xFFDFE1E4);
const Color kMainRoad = Color(0xFFD5D8DD);
const Color kAccent = Color(0xFF416180); // Industry steel accent
const double kTile = 120; // world spacing between streets
const double kLoop = 3.6; // seconds per loop

class QuickBusLoadingScreen extends StatefulWidget {
  const QuickBusLoadingScreen({
    super.key,
    this.accent = kAccent,
    this.tagline = 'Track, book and board any bus around your city — in a few taps.',
  });

  final Color accent;
  final String tagline;

  @override
  State<QuickBusLoadingScreen> createState() => _QuickBusLoadingScreenState();
}

class _QuickBusLoadingScreenState extends State<QuickBusLoadingScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: (kLoop * 1000).round()),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kPaper,
      body: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value * kLoop; // authored seconds
          final u = _c.value; // 0..1 through the loop
          final dots = ((u * 3) % 1 * 3).floor() + 1;
          final sweep = (u * 2) % 1;
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(flex: 2),
              AspectRatio(
                aspectRatio: 1,
                child: CustomPaint(
                  painter: _StreetsPainter(accent: widget.accent, t: t, u: u),
                ),
              ),
              const SizedBox(height: 8),
              _Wordmark(accent: widget.accent),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Text(
                  widget.tagline,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.45,
                    color: kText.withOpacity(0.52),
                  ),
                ),
              ),
              const Spacer(flex: 2),
              _Progress(accent: widget.accent, sweep: sweep),
              const SizedBox(height: 14),
              Text(
                'FINDING BUSES NEAR YOU${'.' * dots}',
                style: TextStyle(
                  fontSize: 12,
                  letterSpacing: 2.4,
                  color: kText.withOpacity(0.52),
                ),
              ),
              const SizedBox(height: 48),
            ],
          );
        },
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) {
    const base = TextStyle(fontSize: 52, height: 1, fontWeight: FontWeight.w600, color: kText);
    return RichText(
      text: TextSpan(
        style: base,
        children: [
          const TextSpan(text: 'Quick'),
          TextSpan(text: 'Bus', style: TextStyle(color: accent)),
        ],
      ),
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.accent, required this.sweep});
  final Color accent;
  final double sweep;

  @override
  Widget build(BuildContext context) {
    const w = 200.0, seg = 70.0;
    return SizedBox(
      width: w,
      height: 3,
      child: ClipRect(
        child: Stack(children: [
          Container(color: kText.withOpacity(0.12)),
          Transform.translate(
            offset: Offset(-seg + sweep * (w + seg), 0),
            child: Container(width: seg, height: 3, color: accent),
          ),
        ]),
      ),
    );
  }
}

/// Isometric street grid scrolling under a 3D bus.
class _StreetsPainter extends CustomPainter {
  _StreetsPainter({required this.accent, required this.t, required this.u});

  final Color accent;
  final double t; // authored seconds
  final double u; // 0..1 loop phase

  // isometric projection: world (x, y, z) -> canvas offset
  Offset _iso(double x, double y, double z) =>
      Offset(0.866 * (x - y), 0.5 * (x + y) - z);

  Path _poly(List<List<double>> pts) {
    final p = Path();
    for (var i = 0; i < pts.length; i++) {
      final v = pts[i];
      final o = _iso(v[0], v[1], v.length > 2 ? v[2] : 0);
      i == 0 ? p.moveTo(o.dx, o.dy) : p.lineTo(o.dx, o.dy);
    }
    return p..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    // the grid is far larger than this box: clip it, or it spills as a hard square
    canvas.save();
    canvas.clipRect(rect);

    final scale = size.width / 720; // the design was drawn on a 720 box
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(scale);
    _paintStreets(canvas, u * kTile * 3); // exactly three blocks per loop
    _paintBus(canvas, math.sin(t * 8 * math.pi / kLoop) * 1.6);
    canvas.restore();

    // soft vignette so the grid dissolves into the paper instead of ending
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          colors: [kPaper.withOpacity(0), kPaper.withOpacity(0), kPaper],
          stops: const [0, 0.42, 0.86],
        ).createShader(Rect.fromCircle(
          center: rect.center,
          radius: size.width * 0.62,
        )),
    );
    canvas.restore();
  }

  void _paintStreets(Canvas canvas, double off) {
    canvas.save();
    // apply the iso matrix, then scroll the world along its main road
    canvas.transform(Float64List.fromList(<double>[
      0.866, 0.5, 0, 0, //
      -0.866, 0.5, 0, 0, //
      0, 0, 1, 0, //
      0, 0, 0, 1,
    ]));
    canvas.translate(0, off);

    final block = Paint()..color = accent.withOpacity(0.03);
    final blockAlt = Paint()..color = accent.withOpacity(0.07);
    final road = Paint()..color = kRoad;
    final main = Paint()..color = kMainRoad;

    for (var r = -5; r <= 5; r++) {
      for (var c = -5; c <= 5; c++) {
        if ((c + 7) % 3 == 0 && (r + 5) % 2 == 0) continue;
        canvas.drawRect(
          Rect.fromLTWH(c * kTile + 24, r * kTile + 24, kTile - 48, kTile - 48),
          (c + 9) % 4 == 0 ? blockAlt : block,
        );
      }
    }
    for (var i = -5; i <= 5; i++) {
      canvas.drawRect(Rect.fromLTWH(-760, i * kTile - 17, 1520, 34), road);
      canvas.drawRect(Rect.fromLTWH(i * kTile - 17, -760, 34, 1520), road);
    }
    canvas.drawRect(const Rect.fromLTWH(-32, -760, 64, 1520), main);

    // dashed centre line
    final dash = Paint()
      ..color = kPaper
      ..strokeWidth = 3;
    for (var y = -760.0; y < 760; y += 48) {
      canvas.drawLine(Offset(0, y), Offset(0, y + 26), dash);
    }
    canvas.restore();
  }

  void _paintBus(Canvas canvas, double bob) {
    const bw = 50.0, bl = 118.0, bh = 46.0;
    const hw = bw / 2, hl = bl / 2;
    final wheels = <double>[-32, 32];

    Color mix(Color a, Color b, double amt) => Color.lerp(a, b, amt)!;
    final roof = Paint()..color = mix(accent, Colors.white, 0.34);
    final flank = Paint()..color = accent;
    final rear = Paint()..color = mix(accent, Colors.black, 0.24);
    final skirt = Paint()..color = mix(accent, Colors.black, 0.55);
    final glass = Paint()..color = kPaper.withOpacity(0.82);
    final tyre = Paint()..color = const Color(0xFF2B2B2D);
    final tyreFar = Paint()..color = const Color(0xFF232325);
    final hub = Paint()..color = const Color(0xFF6A6B6F);

    canvas.save();
    canvas.scale(1.2);

    // ground shadow
    canvas.drawPath(
      _poly([[-hw - 4, -hl - 2], [hw + 8, -hl - 2], [hw + 8, hl + 6], [-hw - 4, hl + 6]]),
      Paint()..color = kText.withOpacity(0.09),
    );

    // wheels are circles living in the flank plane at world x
    void wheelPlane(double x, void Function() draw) {
      canvas.save();
      final o = _iso(x, 0, 0);
      canvas.transform(Float64List.fromList(<double>[
        -0.866, 0.5, 0, 0, //
        0, -1, 0, 0, //
        0, 0, 1, 0, //
        o.dx, o.dy, 0, 1,
      ]));
      draw();
      canvas.restore();
    }

    canvas.save();
    canvas.translate(0, bob);
    wheelPlane(-hw - 1, () {
      for (final y in wheels) {
        canvas.drawCircle(Offset(y, 11), 10.5, tyreFar);
      }
    });
    canvas.restore();

    canvas.save();
    canvas.translate(0, bob - 6); // chassis clearance
    canvas.drawPath(_poly([[hw, -hl + 6, 0], [hw, hl - 6, 0], [hw, hl - 6, 7], [hw, -hl + 6, 7]]), skirt);
    canvas.drawPath(_poly([[hw, -hl, 0], [hw, hl, 0], [hw, hl, bh], [hw, -hl, bh]]), flank);
    canvas.drawPath(_poly([[hw, hl, 0], [-hw, hl, 0], [-hw, hl, bh], [hw, hl, bh]]), rear);
    canvas.drawPath(
      _poly([[hw - 12, hl, 24], [-hw + 12, hl, 24], [-hw + 12, hl, 40], [hw - 12, hl, 40]]),
      Paint()..color = kPaper.withOpacity(0.5),
    );
    canvas.drawPath(_poly([[-hw, -hl, bh], [hw, -hl, bh], [hw, hl, bh], [-hw, hl, bh]]), roof);
    canvas.drawPath(
      _poly([[-hw + 16, -hl + 30, bh], [hw - 16, -hl + 30, bh], [hw - 16, -hl + 48, bh], [-hw + 16, -hl + 48, bh]]),
      Paint()..color = mix(accent, Colors.white, 0.18),
    );
    for (var i = 0; i < 4; i++) {
      final y0 = -hl + 24 + i * 24, y1 = y0 + 16;
      canvas.drawPath(_poly([[hw, y0, 22], [hw, y1, 22], [hw, y1, 40], [hw, y0, 40]]), glass);
    }
    canvas.drawPath(
      _poly([[hw, -hl, 22], [hw, -hl + 14, 22], [hw, -hl + 14, 42], [hw, -hl, 42]]),
      Paint()..color = kPaper.withOpacity(0.92),
    );
    canvas.drawPath(
      _poly([[-hw, -hl, bh], [hw, -hl, bh], [hw, hl, bh], [-hw, hl, bh]]),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = mix(accent, Colors.black, 0.38).withOpacity(0.5),
    );
    canvas.restore();

    canvas.save();
    canvas.translate(0, bob);
    wheelPlane(hw + 1, () {
      for (final y in wheels) {
        canvas.drawCircle(Offset(y, 11), 11, tyre);
        canvas.drawCircle(Offset(y, 11), 4.6, hub);
      }
    });
    canvas.restore();

    canvas.restore();
  }

  @override
  bool shouldRepaint(_StreetsPainter old) => old.t != t || old.accent != accent;
}
