import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final bool fullWidth;

  const DSPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.icon,
    this.fullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    final btn = Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: disabled ? null : onPressed,
          borderRadius: BorderRadius.circular(DSRadius.button),
          child: Ink(
            height: 56,
            decoration: BoxDecoration(
              gradient: DSColors.goldGradient,
              borderRadius: BorderRadius.circular(DSRadius.button),
              boxShadow: disabled
                  ? null
                  : [
                      BoxShadow(
                        color: DSColors.accentGold.withOpacity(0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
            ),
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: DSColors.bgPrimary,
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, color: DSColors.bgPrimary, size: 20),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          label,
                          style: const TextStyle(
                            color: DSColors.bgPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
    return fullWidth ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

class DSSecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;

  const DSSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.fullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final btn = OutlinedButton.icon(
      onPressed: onPressed,
      icon: icon == null
          ? const SizedBox.shrink()
          : Icon(icon, color: DSColors.accentGold, size: 18),
      label: Text(
        label,
        style: const TextStyle(
          color: DSColors.accentGold,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: DSColors.accentGold, width: 1.6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DSRadius.button),
        ),
      ),
    );
    return fullWidth ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

class DSGhostButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  const DSGhostButton({super.key, required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: DSColors.textSecondary,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      child: Text(label),
    );
  }
}
