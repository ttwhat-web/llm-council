import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'ds_glass.dart';

class DSCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? leftAccent;

  const DSCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(DSSpacing.l),
    this.onTap,
    this.leftAccent,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      padding: padding,
      leftAccent: leftAccent,
      child: child,
    );
  }
}
