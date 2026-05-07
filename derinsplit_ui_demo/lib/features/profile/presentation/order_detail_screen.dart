import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';

class OrderDetailScreen extends StatelessWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SİPARİŞ DETAY')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DSCard(
            leftAccent: DSColors.accentGold,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sipariş #$orderId',
                    style: const TextStyle(
                      color: DSColors.textTertiary,
                      fontSize: 12,
                    )),
                const SizedBox(height: 4),
                const Text(
                  'Xerjoff Fatal Charme 2021',
                  style: TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  '5 ml • Split',
                  style: TextStyle(color: DSColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DSCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'KARGO TAKİBİ',
                  style: TextStyle(
                    color: DSColors.accentGold,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                SizedBox(height: 12),
                _Step(label: 'Ödeme alındı', done: true),
                _Step(label: 'Hazırlanıyor', done: true),
                _Step(label: 'Kargoda', active: true),
                _Step(label: 'Teslim edildi', done: false),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DSCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'TESLİMAT',
                  style: TextStyle(
                    color: DSColors.accentGold,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Yurtiçi Kargo • Takip: 1Z9999W99999999999',
                    style: TextStyle(color: DSColors.textPrimary)),
                const SizedBox(height: 8),
                const Text(
                  'Bağlarbaşı Mah. ... No: 12 D:5\nMaltepe / İstanbul',
                  style: TextStyle(color: DSColors.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 12),
                DSSecondaryButton(
                  label: 'Takip Numarasını Kopyala',
                  icon: Icons.copy,
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Kopyalandı')),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DSCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ÖDEME ÖZETİ',
                  style: TextStyle(
                    color: DSColors.accentGold,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                _SumRow(label: 'Ürün', value: formatTl(700)),
                _SumRow(label: 'Kargo', value: formatTl(60)),
                const Divider(height: 18),
                _SumRow(label: 'Toplam', value: formatTl(760), bold: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final String label;
  final bool done;
  final bool active;
  const _Step({required this.label, this.done = false, this.active = false});

  @override
  Widget build(BuildContext context) {
    final color = done || active ? DSColors.accentGold : DSColors.surface;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              color: done
                  ? DSColors.accentGold
                  : active
                      ? DSColors.bgPrimary
                      : DSColors.bgTertiary,
              shape: BoxShape.circle,
              border: Border.all(color: color, width: 2),
            ),
            child: done
                ? const Icon(Icons.check, size: 12, color: DSColors.bgPrimary)
                : null,
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              color: done || active
                  ? DSColors.textPrimary
                  : DSColors.textTertiary,
              fontWeight: active ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

class _SumRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _SumRow({
    required this.label,
    required this.value,
    this.bold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: bold ? DSColors.textPrimary : DSColors.textSecondary,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: bold ? DSColors.accentGold : DSColors.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: bold ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }
}
