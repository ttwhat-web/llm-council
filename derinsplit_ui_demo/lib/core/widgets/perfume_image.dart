import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Editorial-grade perfume photo placeholder.
///
/// Renders an atmospheric product shot using only Flutter primitives:
///   - moody multi-stop gradient background
///   - directional key light leak from the top
///   - depth: floor / horizon line + soft glow halo
///   - hand-painted bottle silhouette (5 shapes: flask, tall, round, niche, dome)
///   - specular glass highlights on the bottle
///   - embossed gold label band
///   - reflection on the floor surface
///   - subtle dust particles
///
/// Drop a real photo into `assets/images/perfumes/<key>.jpg` and pass it as
/// [assetPath] to swap in the photography. PerfumeImage falls back to its
/// placeholder if the asset can't be resolved.
class PerfumeImage extends StatelessWidget {
  final String? assetPath;
  final PerfumeMood mood;
  final BottleShape shape;
  final double aspectRatio;
  final BorderRadius? borderRadius;

  const PerfumeImage({
    super.key,
    this.assetPath,
    this.mood = PerfumeMood.amber,
    this.shape = BottleShape.flask,
    this.aspectRatio = 4 / 5,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (assetPath != null)
              Image.asset(
                assetPath!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _Placeholder(mood: mood, shape: shape),
              )
            else
              _Placeholder(mood: mood, shape: shape),
          ],
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final PerfumeMood mood;
  final BottleShape shape;
  const _Placeholder({required this.mood, required this.shape});

  @override
  Widget build(BuildContext context) {
    final palette = _palettes[mood]!;
    return Stack(
      fit: StackFit.expand,
      children: [
        // 1) Sky / environment gradient — three stops give a sense of depth
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                palette.skyTop,
                palette.skyMid,
                palette.floor,
              ],
              stops: const [0.0, 0.55, 1.0],
            ),
          ),
        ),

        // 2) Directional key light leak (top-right corner, warm)
        Positioned(
          right: -60,
          top: -60,
          child: Container(
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  palette.keyLight.withOpacity(0.55),
                  palette.keyLight.withOpacity(0),
                ],
              ),
            ),
          ),
        ),

        // 3) Horizon line — separates "wall" from "table"
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          child: CustomPaint(
            painter: _HorizonPainter(
              floorColor: palette.floor,
              ratio: 0.62,
            ),
          ),
        ),

        // 4) Soft circular spotlight on the bottle pedestal
        Align(
          alignment: const Alignment(0, 0.18),
          child: Container(
            width: 220,
            height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  palette.keyLight.withOpacity(0.22),
                  palette.keyLight.withOpacity(0),
                ],
              ),
            ),
          ),
        ),

        // 5) Bottle reflection on the floor (drawn first → bottle paints over)
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          child: ClipRect(
            child: OverflowBox(
              maxHeight: double.infinity,
              alignment: Alignment.topCenter,
              child: Transform(
                alignment: Alignment.topCenter,
                transform: Matrix4.diagonal3Values(1, -1, 1),
                child: Opacity(
                  opacity: 0.18,
                  child: ShaderMask(
                    shaderCallback: (rect) => LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black,
                        Colors.transparent,
                      ],
                    ).createShader(rect),
                    blendMode: BlendMode.dstIn,
                    child: SizedBox(
                      width: 200,
                      height: 200,
                      child: _Bottle(
                        shape: shape,
                        palette: palette,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        // 6) The bottle itself
        Center(
          child: FractionallySizedBox(
            heightFactor: 0.78,
            child: _Bottle(shape: shape, palette: palette),
          ),
        ),

        // 7) Subtle dust particles
        const Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(painter: _DustPainter()),
          ),
        ),

        // 8) Subtle vignette pulling focus to the centre
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 0.95,
                  colors: [
                    Color(0x00000000),
                    Color(0x55000000),
                  ],
                  stops: [0.55, 1.0],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HorizonPainter extends CustomPainter {
  final Color floorColor;
  final double ratio;
  _HorizonPainter({required this.floorColor, required this.ratio});

  @override
  void paint(Canvas canvas, Size size) {
    // Subtle floor surface — slightly darker rectangle below the horizon
    final hy = size.height * ratio;
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          floorColor.withOpacity(0.0),
          floorColor.withOpacity(0.45),
        ],
      ).createShader(Rect.fromLTWH(0, hy, size.width, size.height - hy));
    canvas.drawRect(
      Rect.fromLTWH(0, hy, size.width, size.height - hy),
      paint,
    );

    // hairline horizon
    canvas.drawLine(
      Offset(0, hy),
      Offset(size.width, hy),
      Paint()
        ..color = const Color(0x18FFFFFF)
        ..strokeWidth = 0.8,
    );
  }

  @override
  bool shouldRepaint(_HorizonPainter old) =>
      old.floorColor != floorColor || old.ratio != ratio;
}

class _DustPainter extends CustomPainter {
  const _DustPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final r = math.Random(42);
    final p = Paint()..color = Colors.white.withOpacity(0.05);
    final n = (size.width * size.height / 9000).clamp(40, 220).toInt();
    for (var i = 0; i < n; i++) {
      canvas.drawCircle(
        Offset(r.nextDouble() * size.width, r.nextDouble() * size.height),
        r.nextDouble() * 0.9 + 0.2,
        p,
      );
    }
  }

  @override
  bool shouldRepaint(_DustPainter old) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTLE — five hand-shaped silhouettes with glass-style lighting
// ─────────────────────────────────────────────────────────────────────────────

class _Bottle extends StatelessWidget {
  final BottleShape shape;
  final _MoodPalette palette;
  const _Bottle({required this.shape, required this.palette});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final h = c.maxHeight;
        return SizedBox(
          height: h,
          child: CustomPaint(
            painter: _BottlePainter(shape: shape, palette: palette),
          ),
        );
      },
    );
  }
}

class _BottlePainter extends CustomPainter {
  final BottleShape shape;
  final _MoodPalette palette;
  _BottlePainter({required this.shape, required this.palette});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // shadow under bottle
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..maskFilter = const ui.MaskFilter.blur(ui.BlurStyle.normal, 18);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w / 2, h * 0.96),
        width: w * 0.55,
        height: h * 0.05,
      ),
      shadowPaint,
    );

    final geom = _bottleGeom(shape, w, h);

    // body fill
    final bodyPath = Path()..addRRect(geom.bodyRect);
    final bodyPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          palette.glass.withOpacity(0.95),
          palette.glassDark.withOpacity(0.95),
        ],
      ).createShader(geom.bodyRect.outerRect);
    canvas.drawPath(bodyPath, bodyPaint);

    // body stroke for definition
    canvas.drawPath(
      bodyPath,
      Paint()
        ..color = Colors.black.withOpacity(0.55)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.9,
    );

    // specular highlight strip on the left side of the bottle
    final highlightRect = Rect.fromLTWH(
      geom.bodyRect.left + geom.bodyRect.width * 0.08,
      geom.bodyRect.top + geom.bodyRect.height * 0.08,
      geom.bodyRect.width * 0.10,
      geom.bodyRect.height * 0.78,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(highlightRect, const Radius.circular(4)),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withOpacity(0.32),
            Colors.white.withOpacity(0.05),
            Colors.transparent,
          ],
        ).createShader(highlightRect),
    );

    // gold label band — embossed look
    final labelRect = Rect.fromLTWH(
      geom.bodyRect.left + geom.bodyRect.width * 0.16,
      geom.bodyRect.top + geom.bodyRect.height * 0.42,
      geom.bodyRect.width * 0.68,
      geom.bodyRect.height * 0.18,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(labelRect, const Radius.circular(2)),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: const [
            DSColors.accentGoldDark,
            DSColors.accentGoldLight,
            DSColors.accentGoldDark,
          ],
          stops: const [0.0, 0.5, 1.0],
        ).createShader(labelRect),
    );
    // inner monogram on the label
    canvas.drawRect(
      Rect.fromCenter(
        center: labelRect.center,
        width: labelRect.width * 0.18,
        height: labelRect.height * 0.40,
      ),
      Paint()..color = Colors.black.withOpacity(0.55),
    );

    // collar (between body + cap)
    canvas.drawRect(
      geom.collarRect,
      Paint()..color = palette.glassDark.withOpacity(0.95),
    );

    // cap
    canvas.drawRRect(
      geom.capRect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [palette.cap, palette.capDark],
        ).createShader(geom.capRect.outerRect),
    );
    // cap rim highlight
    canvas.drawRRect(
      geom.capRect,
      Paint()
        ..color = Colors.white.withOpacity(0.18)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.6,
    );

    // optional disc/topper on top of cap (dome shape)
    if (shape == BottleShape.dome) {
      final cx = geom.capRect.center.dx;
      canvas.drawCircle(
        Offset(cx, geom.capRect.top - geom.capRect.height * 0.18),
        geom.capRect.width * 0.32,
        Paint()
          ..shader = const RadialGradient(
            colors: [
              DSColors.accentGoldLight,
              DSColors.accentGoldDark,
            ],
          ).createShader(Rect.fromCircle(
            center: Offset(cx, geom.capRect.top),
            radius: geom.capRect.width * 0.32,
          )),
      );
    }
  }

  @override
  bool shouldRepaint(_BottlePainter old) =>
      old.shape != shape || old.palette != palette;
}

class _BottleGeom {
  final RRect bodyRect;
  final Rect collarRect;
  final RRect capRect;
  const _BottleGeom({
    required this.bodyRect,
    required this.collarRect,
    required this.capRect,
  });
}

_BottleGeom _bottleGeom(BottleShape shape, double w, double h) {
  switch (shape) {
    case BottleShape.flask:
      // Tom-Ford-ish: rectangular body with slight rounded edges, broad cap
      final bw = w * 0.46;
      final bh = h * 0.62;
      final body = Rect.fromCenter(
        center: Offset(w / 2, h * 0.62),
        width: bw,
        height: bh,
      );
      final cap = Rect.fromCenter(
        center: Offset(w / 2, h * 0.20),
        width: bw * 0.62,
        height: h * 0.12,
      );
      return _BottleGeom(
        bodyRect: RRect.fromRectAndCorners(
          body,
          topLeft: const Radius.circular(6),
          topRight: const Radius.circular(6),
          bottomLeft: const Radius.circular(8),
          bottomRight: const Radius.circular(8),
        ),
        collarRect: Rect.fromCenter(
          center: Offset(w / 2, body.top - h * 0.025),
          width: bw * 0.32,
          height: h * 0.04,
        ),
        capRect: RRect.fromRectAndRadius(cap, const Radius.circular(2)),
      );
    case BottleShape.tall:
      // Clive-Christian-ish: tall narrow square
      final bw = w * 0.32;
      final bh = h * 0.70;
      final body = Rect.fromCenter(
        center: Offset(w / 2, h * 0.60),
        width: bw,
        height: bh,
      );
      final cap = Rect.fromCenter(
        center: Offset(w / 2, h * 0.16),
        width: bw * 0.78,
        height: h * 0.10,
      );
      return _BottleGeom(
        bodyRect: RRect.fromRectAndCorners(
          body,
          topLeft: const Radius.circular(2),
          topRight: const Radius.circular(2),
          bottomLeft: const Radius.circular(4),
          bottomRight: const Radius.circular(4),
        ),
        collarRect: Rect.fromCenter(
          center: Offset(w / 2, body.top - h * 0.018),
          width: bw * 0.45,
          height: h * 0.03,
        ),
        capRect: RRect.fromRectAndRadius(cap, const Radius.circular(2)),
      );
    case BottleShape.round:
      // Roja-Elysium-ish: oval glass body
      final bw = w * 0.50;
      final bh = h * 0.58;
      final body = Rect.fromCenter(
        center: Offset(w / 2, h * 0.62),
        width: bw,
        height: bh,
      );
      final cap = Rect.fromCenter(
        center: Offset(w / 2, h * 0.22),
        width: bw * 0.40,
        height: h * 0.10,
      );
      return _BottleGeom(
        bodyRect: RRect.fromRectAndCorners(
          body,
          topLeft: const Radius.circular(36),
          topRight: const Radius.circular(36),
          bottomLeft: const Radius.circular(80),
          bottomRight: const Radius.circular(80),
        ),
        collarRect: Rect.fromCenter(
          center: Offset(w / 2, body.top - h * 0.03),
          width: bw * 0.28,
          height: h * 0.05,
        ),
        capRect: RRect.fromRectAndRadius(cap, const Radius.circular(8)),
      );
    case BottleShape.niche:
      // Xerjoff-ish: geometric body with brass cap
      final bw = w * 0.42;
      final bh = h * 0.60;
      final body = Rect.fromCenter(
        center: Offset(w / 2, h * 0.62),
        width: bw,
        height: bh,
      );
      final cap = Rect.fromCenter(
        center: Offset(w / 2, h * 0.20),
        width: bw * 0.55,
        height: h * 0.13,
      );
      return _BottleGeom(
        bodyRect: RRect.fromRectAndCorners(
          body,
          topLeft: const Radius.circular(20),
          topRight: const Radius.circular(20),
          bottomLeft: const Radius.circular(6),
          bottomRight: const Radius.circular(6),
        ),
        collarRect: Rect.fromCenter(
          center: Offset(w / 2, body.top - h * 0.02),
          width: bw * 0.36,
          height: h * 0.035,
        ),
        capRect: RRect.fromRectAndCorners(
          cap,
          topLeft: const Radius.circular(8),
          topRight: const Radius.circular(8),
          bottomLeft: const Radius.circular(2),
          bottomRight: const Radius.circular(2),
        ),
      );
    case BottleShape.dome:
      // Memo / Initio: rounded shoulders with disc cap (disc drawn separately)
      final bw = w * 0.48;
      final bh = h * 0.58;
      final body = Rect.fromCenter(
        center: Offset(w / 2, h * 0.64),
        width: bw,
        height: bh,
      );
      final cap = Rect.fromCenter(
        center: Offset(w / 2, h * 0.24),
        width: bw * 0.45,
        height: h * 0.08,
      );
      return _BottleGeom(
        bodyRect: RRect.fromRectAndCorners(
          body,
          topLeft: const Radius.circular(48),
          topRight: const Radius.circular(48),
          bottomLeft: const Radius.circular(12),
          bottomRight: const Radius.circular(12),
        ),
        collarRect: Rect.fromCenter(
          center: Offset(w / 2, body.top - h * 0.025),
          width: bw * 0.30,
          height: h * 0.04,
        ),
        capRect: RRect.fromRectAndRadius(cap, const Radius.circular(4)),
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTES
// ─────────────────────────────────────────────────────────────────────────────

enum PerfumeMood { amber, oud, citrus, violet, smoke, ivory }

enum BottleShape { flask, tall, round, niche, dome }

class _MoodPalette {
  final Color skyTop;
  final Color skyMid;
  final Color floor;
  final Color keyLight;
  final Color glass;       // bottle main
  final Color glassDark;   // bottle bottom
  final Color cap;         // cap top
  final Color capDark;     // cap bottom
  const _MoodPalette({
    required this.skyTop,
    required this.skyMid,
    required this.floor,
    required this.keyLight,
    required this.glass,
    required this.glassDark,
    required this.cap,
    required this.capDark,
  });
}

const _palettes = <PerfumeMood, _MoodPalette>{
  PerfumeMood.amber: _MoodPalette(
    skyTop: Color(0xFF1B1108),
    skyMid: Color(0xFF120A06),
    floor: Color(0xFF050304),
    keyLight: Color(0xFFE8B868),
    glass: Color(0xFF8E5A1F),
    glassDark: Color(0xFF3A2410),
    cap: Color(0xFF2A1A10),
    capDark: Color(0xFF120907),
  ),
  PerfumeMood.oud: _MoodPalette(
    skyTop: Color(0xFF1A0708),
    skyMid: Color(0xFF120606),
    floor: Color(0xFF050203),
    keyLight: Color(0xFFC85050),
    glass: Color(0xFF6B0F12),
    glassDark: Color(0xFF240608),
    cap: Color(0xFF1A0C0C),
    capDark: Color(0xFF0A0303),
  ),
  PerfumeMood.citrus: _MoodPalette(
    skyTop: Color(0xFF181208),
    skyMid: Color(0xFF0E0A06),
    floor: Color(0xFF050403),
    keyLight: Color(0xFFF0D08A),
    glass: Color(0xFFB89E5E),
    glassDark: Color(0xFF4A3F22),
    cap: Color(0xFF2A2010),
    capDark: Color(0xFF120D06),
  ),
  PerfumeMood.violet: _MoodPalette(
    skyTop: Color(0xFF120B1A),
    skyMid: Color(0xFF0A0613),
    floor: Color(0xFF030204),
    keyLight: Color(0xFFA86BD0),
    glass: Color(0xFF3A2055),
    glassDark: Color(0xFF110820),
    cap: Color(0xFF160A22),
    capDark: Color(0xFF080310),
  ),
  PerfumeMood.smoke: _MoodPalette(
    skyTop: Color(0xFF101013),
    skyMid: Color(0xFF0A0A0D),
    floor: Color(0xFF030304),
    keyLight: Color(0xFF9C9692),
    glass: Color(0xFF1F1F23),
    glassDark: Color(0xFF0A0A0D),
    cap: Color(0xFF111114),
    capDark: Color(0xFF050506),
  ),
  PerfumeMood.ivory: _MoodPalette(
    skyTop: Color(0xFF1A1610),
    skyMid: Color(0xFF120F0B),
    floor: Color(0xFF050403),
    keyLight: Color(0xFFEAE0C8),
    glass: Color(0xFFD7CCAF),
    glassDark: Color(0xFF6B5F47),
    cap: Color(0xFF332B20),
    capDark: Color(0xFF15110B),
  ),
};
