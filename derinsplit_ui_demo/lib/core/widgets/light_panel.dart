import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// A large light frosted-glass panel used by the Şişe (catalog) and
/// Hesabım (dashboard) pages. Renders on top of the cinematic dark
/// backdrop and gives those pages the parchment / luxury catalog look
/// matching the derinsplit.com dashboard.
class LightFrostedPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final double maxWidth;

  const LightFrostedPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(48, 48, 48, 56),
    this.borderRadius = 28,
    this.maxWidth = 1320,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(borderRadius),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              padding: padding,
              decoration: BoxDecoration(
                color: DSColors.lightSurface.withOpacity(0.92),
                borderRadius: BorderRadius.circular(borderRadius),
                border: Border.all(color: DSColors.lightBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.55),
                    blurRadius: 40,
                    offset: const Offset(0, 20),
                  ),
                ],
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// Smaller white-ish translucent card used INSIDE a LightFrostedPanel
/// (product cards, dashboard form cards).
class LightCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double borderRadius;

  const LightCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.borderRadius = 18,
  });

  @override
  Widget build(BuildContext context) {
    final body = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: DSColors.lightCard,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: DSColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
    if (onTap == null) return body;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(onTap: onTap, child: body),
    );
  }
}
