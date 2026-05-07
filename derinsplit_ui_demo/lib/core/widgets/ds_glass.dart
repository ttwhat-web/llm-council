import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class GlassCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Color? leftAccent;
  final double blur;
  final bool liftOnHover;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(DSSpacing.l),
    this.radius = DSRadius.card,
    this.onTap,
    this.leftAccent,
    this.blur = 18,
    this.liftOnHover = true,
  });

  @override
  State<GlassCard> createState() => _GlassCardState();
}

class _GlassCardState extends State<GlassCard> {
  bool _hover = false;
  bool _press = false;

  @override
  Widget build(BuildContext context) {
    final scale = _press ? 0.985 : (_hover ? 1.005 : 1.0);
    final lift = _hover ? -2.0 : 0.0;
    return MouseRegion(
      onEnter: widget.liftOnHover ? (_) => setState(() => _hover = true) : null,
      onExit: widget.liftOnHover ? (_) => setState(() => _hover = false) : null,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _press = true),
        onTapUp: (_) => setState(() => _press = false),
        onTapCancel: () => setState(() => _press = false),
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          transform: Matrix4.identity()
            ..translate(0.0, lift)
            ..scale(scale),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_hover ? 0.55 : 0.4),
                blurRadius: _hover ? 24 : 16,
                offset: Offset(0, _hover ? 12 : 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.radius),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: widget.blur, sigmaY: widget.blur),
              child: Container(
                decoration: BoxDecoration(
                  color: DSColors.glassFill,
                  border: Border.all(color: DSColors.glassBorder, width: 1),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white.withOpacity(0.06),
                      Colors.white.withOpacity(0.015),
                    ],
                  ),
                ),
                child: Stack(
                  children: [
                    if (widget.leftAccent != null)
                      Positioned(
                        left: 0,
                        top: 0,
                        bottom: 0,
                        child: Container(
                          width: 3,
                          decoration: BoxDecoration(
                            color: widget.leftAccent,
                            boxShadow: [
                              BoxShadow(
                                color: widget.leftAccent!.withOpacity(0.6),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                        ),
                      ),
                    Padding(padding: widget.padding, child: widget.child),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AuroraBackdrop extends StatelessWidget {
  final Widget child;
  const AuroraBackdrop({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: const BoxDecoration(gradient: DSColors.auroraGradient),
          ),
        ),
        Positioned(
          top: -120,
          right: -80,
          child: Container(
            width: 320,
            height: 320,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  DSColors.accentGold.withOpacity(0.25),
                  DSColors.accentGold.withOpacity(0.0),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -160,
          left: -100,
          child: Container(
            width: 380,
            height: 380,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  DSColors.info.withOpacity(0.18),
                  DSColors.info.withOpacity(0.0),
                ],
              ),
            ),
          ),
        ),
        Positioned.fill(child: child),
      ],
    );
  }
}
