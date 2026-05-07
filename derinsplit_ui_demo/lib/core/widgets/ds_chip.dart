import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSMlChip extends StatelessWidget {
  final int amountMl;
  final bool selected;
  final bool disabled;
  final VoidCallback? onTap;

  const DSMlChip({
    super.key,
    required this.amountMl,
    this.selected = false,
    this.disabled = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = disabled
        ? DSColors.bgSecondary
        : (selected ? DSColors.accentGold : DSColors.bgTertiary);
    final fg = disabled
        ? DSColors.textTertiary
        : (selected ? DSColors.bgPrimary : DSColors.textPrimary);

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DSRadius.chip),
          side: BorderSide(
            color: selected ? DSColors.accentGold : DSColors.surface,
            width: 1,
          ),
        ),
        child: InkWell(
          onTap: disabled ? null : onTap,
          borderRadius: BorderRadius.circular(DSRadius.chip),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            constraints: const BoxConstraints(minWidth: 64),
            child: Center(
              child: Text(
                '$amountMl ml',
                style: TextStyle(
                  color: fg,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DSFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  const DSFilterChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? DSColors.accentGold : DSColors.bgTertiary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DSRadius.chip),
        side: BorderSide(
          color: selected ? DSColors.accentGold : DSColors.surface,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DSRadius.chip),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? DSColors.bgPrimary : DSColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
