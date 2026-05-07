import 'package:flutter/material.dart';

import '../theme/tokens.dart';

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
    final card = Container(
      decoration: BoxDecoration(
        color: DSColors.bgSecondary,
        borderRadius: BorderRadius.circular(DSRadius.card),
        border: Border.all(color: DSColors.surface),
        boxShadow: const [
          BoxShadow(
            color: Color(0x66000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(DSRadius.card),
        child: Stack(
          children: [
            if (leftAccent != null)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Container(width: 4, color: leftAccent),
              ),
            Padding(padding: padding, child: child),
          ],
        ),
      ),
    );

    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(DSRadius.card),
        onTap: onTap,
        child: card,
      ),
    );
  }
}
