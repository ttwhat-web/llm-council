import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static final _items = [
    _Notif(
      icon: Icons.local_shipping_outlined,
      title: 'Sipariş kargoya verildi',
      subtitle: 'Xerjoff Fatal Charme — takip no: 1Z999...',
      color: DSColors.info,
      time: DateTime.now().subtract(const Duration(minutes: 12)),
      read: false,
    ),
    _Notif(
      icon: Icons.attach_money,
      title: 'Yeni teklif',
      subtitle: 'Layton Exclusif ilanına 9.200 ₺ teklif geldi',
      color: DSColors.success,
      time: DateTime.now().subtract(const Duration(hours: 2)),
      read: false,
    ),
    _Notif(
      icon: Icons.science_outlined,
      title: 'Split %50 doldu',
      subtitle: 'Ombre Nomade splitinde son 5 ml',
      color: DSColors.accentGold,
      time: DateTime.now().subtract(const Duration(hours: 5)),
      read: true,
    ),
    _Notif(
      icon: Icons.chat_bubble_outline,
      title: 'Yeni mesaj',
      subtitle: 'Ali K.: "Takas için Naxos uygun olur mu?"',
      color: DSColors.warning,
      time: DateTime.now().subtract(const Duration(days: 1)),
      read: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BİLDİRİMLER')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final n = _items[i];
          return DSCard(
            leftAccent: n.read ? null : n.color,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: n.color.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(n.icon, color: n.color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        n.title,
                        style: TextStyle(
                          color: DSColors.textPrimary,
                          fontWeight: n.read ? FontWeight.w500 : FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        n.subtitle,
                        style: const TextStyle(
                          color: DSColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        timeAgo(n.time),
                        style: const TextStyle(
                          color: DSColors.textTertiary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Notif {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final DateTime time;
  final bool read;
  _Notif({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.time,
    required this.read,
  });
}
