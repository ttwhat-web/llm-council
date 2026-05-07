import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'ds_button.dart';

class DSEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const DSEmptyState({
    super.key,
    this.icon = Icons.inbox,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: DSColors.bgSecondary,
                shape: BoxShape.circle,
                border: Border.all(color: DSColors.surface),
              ),
              child: Icon(icon, size: 36, color: DSColors.accentGold),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: DSColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: DSColors.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: 220,
                child: DSPrimaryButton(label: actionLabel!, onPressed: onAction),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class DSErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const DSErrorState({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: DSColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(color: DSColors.error.withOpacity(0.4)),
              ),
              child: const Icon(Icons.error_outline,
                  size: 36, color: DSColors.error),
            ),
            const SizedBox(height: 16),
            const Text(
              'Bir şeyler ters gitti',
              style: TextStyle(
                color: DSColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: DSColors.textSecondary,
                fontSize: 13,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: 200,
                child: DSSecondaryButton(
                  label: 'Tekrar Dene',
                  icon: Icons.refresh,
                  onPressed: onRetry,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class DSLoading extends StatelessWidget {
  const DSLoading({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 32,
        height: 32,
        child: CircularProgressIndicator(
          strokeWidth: 2.4,
          color: DSColors.accentGold,
        ),
      ),
    );
  }
}
