import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSProgressBar extends StatelessWidget {
  final double value; // 0..1
  final double height;

  const DSProgressBar({super.key, required this.value, this.height = 8});

  @override
  Widget build(BuildContext context) {
    final v = value.clamp(0.0, 1.0);
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Stack(
        children: [
          Container(height: height, color: DSColors.bgTertiary),
          FractionallySizedBox(
            widthFactor: v,
            child: Container(
              height: height,
              decoration: const BoxDecoration(gradient: DSColors.goldGradient),
            ),
          ),
        ],
      ),
    );
  }
}
