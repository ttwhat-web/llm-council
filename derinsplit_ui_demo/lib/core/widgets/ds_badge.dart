import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final bool gold;

  const DSBadge({
    super.key,
    required this.label,
    this.color = DSColors.info,
    this.icon,
    this.gold = false,
  });

  factory DSBadge.split() => const DSBadge(
        label: 'SPLIT',
        color: DSColors.accentGold,
        icon: Icons.science,
        gold: true,
      );

  factory DSBadge.listing() => const DSBadge(
        label: 'İLAN',
        color: DSColors.info,
        icon: Icons.storefront,
      );

  factory DSBadge.trade() => const DSBadge(
        label: 'TAKAS',
        color: DSColors.warning,
        icon: Icons.swap_horiz,
      );

  factory DSBadge.bottle() => const DSBadge(
        label: 'ŞİŞELİ',
        color: DSColors.success,
        icon: Icons.local_drink,
      );

  @override
  Widget build(BuildContext context) {
    final bg = gold ? null : color.withOpacity(0.15);
    final fg = gold ? DSColors.bgPrimary : color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        gradient: gold ? DSColors.goldGradient : null,
        borderRadius: BorderRadius.circular(8),
        border: gold ? null : Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: fg, size: 12),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

class RiskBadge extends StatelessWidget {
  final String level; // low, low_medium, medium_high, high, manual
  const RiskBadge({super.key, required this.level});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    IconData icon;
    switch (level) {
      case 'low':
        color = DSColors.success;
        label = 'Düşük Risk';
        icon = Icons.verified;
        break;
      case 'low_medium':
        color = DSColors.success;
        label = 'Düşük-Orta';
        icon = Icons.shield;
        break;
      case 'medium_high':
        color = DSColors.warning;
        label = 'Orta-Yüksek';
        icon = Icons.warning_amber;
        break;
      case 'high':
        color = DSColors.error;
        label = 'Yüksek Risk';
        icon = Icons.error;
        break;
      default:
        color = DSColors.textTertiary;
        label = 'Manuel İnceleme';
        icon = Icons.search;
    }
    return DSBadge(label: label, color: color, icon: icon);
  }
}
