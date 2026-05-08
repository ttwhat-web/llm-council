import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Reusable perfume photo container.
///
/// If [assetPath] is null (default for the demo), renders an editorial
/// placeholder: deep mood gradient + amber spotlight + abstract bottle
/// silhouette + subtle glass reflection. Drop a real `assets/images/perfumes/<key>.jpg`
/// later and pass it as [assetPath] to swap in the real photography.
class PerfumeImage extends StatelessWidget {
  final String? assetPath;
  final PerfumeMood mood;
  final double aspectRatio;
  final BorderRadius? borderRadius;
  final bool darkenForOverlay;

  const PerfumeImage({
    super.key,
    this.assetPath,
    this.mood = PerfumeMood.amber,
    this.aspectRatio = 4 / 5,
    this.borderRadius,
    this.darkenForOverlay = false,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    final body = AspectRatio(
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
                errorBuilder: (_, __, ___) => _placeholder(),
              )
            else
              _placeholder(),
            if (darkenForOverlay)
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0x00000000),
                      Color(0x99000000),
                    ],
                    stops: [0.45, 1.0],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
    return body;
  }

  Widget _placeholder() {
    final palette = _palettes[mood]!;
    return Stack(
      fit: StackFit.expand,
      children: [
        // base mood gradient
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: palette.bg,
            ),
          ),
        ),
        // amber/violet spotlight
        Positioned(
          top: -40,
          right: -30,
          child: Container(
            width: 220,
            height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  palette.spot.withOpacity(0.55),
                  palette.spot.withOpacity(0),
                ],
              ),
            ),
          ),
        ),
        // bottle silhouette
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: _BottleSilhouette(color: palette.bottle),
          ),
        ),
        // subtle floor reflection
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  palette.bottle.withOpacity(0.18),
                ],
              ),
            ),
          ),
        ),
        // editorial grain overlay (very subtle)
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    Color(0x00000000),
                    Color(0x55000000),
                  ],
                  stops: [0.6, 1.0],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BottleSilhouette extends StatelessWidget {
  final Color color;
  const _BottleSilhouette({required this.color});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final h = c.maxHeight;
        final w = h * 0.42;
        return SizedBox(
          width: w,
          height: h,
          child: Column(
            children: [
              // cap
              Container(
                width: w * 0.45,
                height: h * 0.10,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // collar
              Container(
                width: w * 0.32,
                height: h * 0.04,
                color: color.withOpacity(0.75),
              ),
              const SizedBox(height: 2),
              // body
              Expanded(
                child: Container(
                  width: w,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(8),
                      topRight: Radius.circular(8),
                      bottomLeft: Radius.circular(28),
                      bottomRight: Radius.circular(28),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        color.withOpacity(0.85),
                        color.withOpacity(0.55),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: color.withOpacity(0.45),
                        blurRadius: 30,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: Center(
                    // gold label band
                    child: FractionallySizedBox(
                      widthFactor: 0.78,
                      heightFactor: 0.18,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              DSColors.accentGoldLight.withOpacity(0.85),
                              DSColors.accentGoldDark.withOpacity(0.85),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

enum PerfumeMood { amber, oud, citrus, violet, smoke, ivory }

class _MoodPalette {
  final List<Color> bg;
  final Color spot;
  final Color bottle;
  const _MoodPalette({required this.bg, required this.spot, required this.bottle});
}

const _palettes = <PerfumeMood, _MoodPalette>{
  PerfumeMood.amber: _MoodPalette(
    bg: [Color(0xFF1A1108), Color(0xFF06070A)],
    spot: Color(0xFFD4A24A),
    bottle: Color(0xFFC8A24A),
  ),
  PerfumeMood.oud: _MoodPalette(
    bg: [Color(0xFF180D08), Color(0xFF06040A)],
    spot: Color(0xFF8E2A2A),
    bottle: Color(0xFF6E1A1A),
  ),
  PerfumeMood.citrus: _MoodPalette(
    bg: [Color(0xFF15140A), Color(0xFF06070A)],
    spot: Color(0xFFE8C879),
    bottle: Color(0xFFE8C879),
  ),
  PerfumeMood.violet: _MoodPalette(
    bg: [Color(0xFF110D1A), Color(0xFF06070A)],
    spot: Color(0xFF6B3E8E),
    bottle: Color(0xFF382550),
  ),
  PerfumeMood.smoke: _MoodPalette(
    bg: [Color(0xFF101013), Color(0xFF06070A)],
    spot: Color(0xFF7A7672),
    bottle: Color(0xFF1F1F23),
  ),
  PerfumeMood.ivory: _MoodPalette(
    bg: [Color(0xFF14110A), Color(0xFF0A080A)],
    spot: Color(0xFFE8E0CB),
    bottle: Color(0xFFD7CCAF),
  ),
};
