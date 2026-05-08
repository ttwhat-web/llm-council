import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Cinematic luxury background. Used on the Home / Hero screens.
///
/// Stack of layers (bottom → top):
///   1. solid #06070A
///   2. low-frequency warm gradient (midnight → smoky violet)
///   3. animated radial gold glows (top-left, mid-right) — slow pulse
///   4. soft amber spotlight at top
///   5. deterministic noise / film grain (CustomPainter)
///   6. heavy vignette at the edges
class CinematicBackdrop extends StatefulWidget {
  final Widget child;
  final double grainOpacity;

  const CinematicBackdrop({
    super.key,
    required this.child,
    this.grainOpacity = 0.06,
  });

  @override
  State<CinematicBackdrop> createState() => _CinematicBackdropState();
}

class _CinematicBackdropState extends State<CinematicBackdrop>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value;
        return Stack(
          fit: StackFit.expand,
          children: [
            // Layer 1: base midnight
            const ColoredBox(color: DSColors.bgPrimary),

            // Layer 2: low-frequency warm gradient
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF06070A),
                    Color(0xFF0B0814),
                    Color(0xFF06070A),
                  ],
                ),
              ),
            ),

            // Layer 3a: top-left amber glow (drifts slowly)
            Positioned(
              left: -120 + 40 * math.sin(t * 2 * math.pi),
              top: -120 + 40 * math.cos(t * 2 * math.pi),
              child: _RadialGlow(
                size: 540,
                color: DSColors.accentGold.withOpacity(0.18),
                strength: 0.55 + 0.15 * math.sin(t * 2 * math.pi),
              ),
            ),

            // Layer 3b: bottom-right deep violet glow
            Positioned(
              right: -180 + 60 * math.cos(t * 2 * math.pi + math.pi / 2),
              bottom: -160 + 60 * math.sin(t * 2 * math.pi + math.pi / 2),
              child: _RadialGlow(
                size: 620,
                color: const Color(0xFF6B3E8E).withOpacity(0.10),
                strength: 0.5 + 0.1 * math.cos(t * 2 * math.pi),
              ),
            ),

            // Layer 4: amber halo at the very top, narrow
            Positioned(
              top: -340,
              left: 0,
              right: 0,
              child: Center(
                child: _RadialGlow(
                  size: 900,
                  color: DSColors.accentGold.withOpacity(0.07),
                  strength: 0.4,
                ),
              ),
            ),

            // Layer 5: film grain — paints once, repaints rarely
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _GrainPainter(
                    opacity: widget.grainOpacity,
                    seed: 1337,
                  ),
                ),
              ),
            ),

            // Layer 6: vignette
            const Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment.center,
                      radius: 1.1,
                      colors: [
                        Color(0x00000000),
                        Color(0x00000000),
                        Color(0x66000000),
                        Color(0xCC000000),
                      ],
                      stops: [0.0, 0.55, 0.85, 1.0],
                    ),
                  ),
                ),
              ),
            ),

            // Content
            Positioned.fill(child: widget.child),
          ],
        );
      },
    );
  }
}

class _RadialGlow extends StatelessWidget {
  final double size;
  final Color color;
  final double strength;

  const _RadialGlow({
    required this.size,
    required this.color,
    this.strength = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              color.withOpacity(color.opacity * strength),
              color.withOpacity(0),
            ],
            stops: const [0.0, 1.0],
          ),
        ),
      ),
    );
  }
}

/// Deterministic film grain. We rasterise a 220px tile once on first build
/// and stamp it across the canvas afterwards — no per-frame randomness, no
/// CPU cost on subsequent paints.
class _GrainPainter extends CustomPainter {
  final double opacity;
  final int seed;
  static ui.Image? _cached;
  static const int _tileSize = 220;
  static bool _generating = false;

  _GrainPainter({required this.opacity, required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    final paint = Paint()
      ..color = Colors.white.withOpacity(opacity)
      ..blendMode = BlendMode.softLight;

    final img = _cached;
    if (img == null) {
      if (!_generating) {
        _generating = true;
        // ignore: discarded_futures
        _generate();
      }
      _drawSparse(canvas, size, paint);
      return;
    }

    final src = Rect.fromLTWH(0, 0, img.width.toDouble(), img.height.toDouble());
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    for (double y = 0; y < size.height; y += _tileSize) {
      for (double x = 0; x < size.width; x += _tileSize) {
        canvas.drawImageRect(
          img,
          src,
          Rect.fromLTWH(x, y, _tileSize.toDouble(), _tileSize.toDouble()),
          paint,
        );
      }
    }
    canvas.restore();
  }

  void _drawSparse(Canvas canvas, Size size, Paint p) {
    final r = math.Random(seed);
    final n = (size.width * size.height / 4500).clamp(120, 1800).toInt();
    for (var i = 0; i < n; i++) {
      canvas.drawCircle(
        Offset(r.nextDouble() * size.width, r.nextDouble() * size.height),
        0.6,
        p,
      );
    }
  }

  Future<void> _generate() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final r = math.Random(seed);
    final p = Paint();
    for (var y = 0; y < _tileSize; y++) {
      for (var x = 0; x < _tileSize; x++) {
        final v = r.nextDouble();
        if (v < 0.6) continue;
        p.color = Color.fromRGBO(255, 255, 255, (v - 0.6) * 0.9);
        canvas.drawRect(Rect.fromLTWH(x.toDouble(), y.toDouble(), 1, 1), p);
      }
    }
    final pic = recorder.endRecording();
    _cached = await pic.toImage(_tileSize, _tileSize);
  }

  @override
  bool shouldRepaint(_GrainPainter old) => false;
}
