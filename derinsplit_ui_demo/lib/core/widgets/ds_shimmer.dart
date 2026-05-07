import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSShimmer extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const DSShimmer({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius,
  });

  @override
  State<DSShimmer> createState() => _DSShimmerState();
}

class _DSShimmerState extends State<DSShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
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
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(8),
            gradient: LinearGradient(
              begin: Alignment(-1 + 2 * t, 0),
              end: Alignment(1 + 2 * t, 0),
              colors: const [
                DSColors.bgSecondary,
                DSColors.bgTertiary,
                DSColors.bgSecondary,
              ],
            ),
          ),
        );
      },
    );
  }
}

class DSCardSkeleton extends StatelessWidget {
  const DSCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: DSColors.bgSecondary,
        borderRadius: BorderRadius.circular(DSRadius.card),
        border: Border.all(color: DSColors.surface),
      ),
      padding: const EdgeInsets.all(DSSpacing.l),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DSShimmer(height: 100, borderRadius: BorderRadius.circular(12)),
          const SizedBox(height: DSSpacing.m),
          const DSShimmer(height: 14, width: 160),
          const SizedBox(height: DSSpacing.s),
          const DSShimmer(height: 12, width: 100),
        ],
      ),
    );
  }
}
