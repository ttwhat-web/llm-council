import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_input.dart';

class PaymentScreen extends StatefulWidget {
  final String title;
  final String? subtitle;
  final double amount;

  const PaymentScreen({
    super.key,
    required this.title,
    this.subtitle,
    required this.amount,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _processing = false;
  bool _done = false;
  bool _error = false;

  Future<void> _pay() async {
    setState(() => _processing = true);
    await Future.delayed(const Duration(milliseconds: 1600));
    setState(() {
      _processing = false;
      _done = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_done) return _SuccessView(title: widget.title, amount: widget.amount);
    return Scaffold(
      appBar: AppBar(title: const Text('ÖDEME')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DSCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SİPARİŞ ÖZETİ',
                  style: TextStyle(
                    color: DSColors.accentGold,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                Text(widget.title,
                    style: const TextStyle(
                      color: DSColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    )),
                if (widget.subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(widget.subtitle!,
                      style: const TextStyle(color: DSColors.textSecondary)),
                ],
                const Divider(height: 24),
                Row(
                  children: [
                    const Text('Toplam',
                        style: TextStyle(color: DSColors.textSecondary)),
                    const Spacer(),
                    Text(
                      formatTl(widget.amount),
                      style: const TextStyle(
                        color: DSColors.accentGold,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DSCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.credit_card, color: DSColors.accentGold),
                    SizedBox(width: 8),
                    Text(
                      'Kart Bilgileri',
                      style: TextStyle(
                        color: DSColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const DSInput(
                  label: 'Kart üzerindeki isim',
                  hint: 'Berke Ö.',
                  prefixIcon: Icons.person_outline,
                ),
                const SizedBox(height: 12),
                const DSInput(
                  label: 'Kart numarası',
                  hint: '4242 4242 4242 4242',
                  prefixIcon: Icons.credit_card,
                ),
                const SizedBox(height: 12),
                Row(
                  children: const [
                    Expanded(
                      child: DSInput(label: 'Son kullanma', hint: 'AA/YY'),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: DSInput(label: 'CVV', hint: '123'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: DSColors.bgTertiary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.shield_outlined,
                          size: 16, color: DSColors.success),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Ödeme 3D Secure ile yapılır. Demo modda gerçek ödeme alınmaz.',
                          style: TextStyle(
                              color: DSColors.textSecondary, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (_error)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                'Ödeme alınamadı, lütfen tekrar deneyin.',
                style: const TextStyle(color: DSColors.error),
              ),
            ),
          DSPrimaryButton(
            label: 'ÖDE • ${formatTl(widget.amount)}',
            loading: _processing,
            onPressed: _processing ? null : _pay,
          ),
        ],
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  final String title;
  final double amount;
  const _SuccessView({required this.title, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: DSColors.success.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: DSColors.success, width: 2),
                ),
                child: const Icon(Icons.check_rounded,
                    color: DSColors.success, size: 64),
              ),
              const SizedBox(height: 28),
              const Text(
                'Ödemeniz alındı',
                style: TextStyle(
                  color: DSColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(color: DSColors.textSecondary),
              ),
              const SizedBox(height: 6),
              Text(
                formatTl(amount),
                style: const TextStyle(
                  color: DSColors.accentGold,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 36),
              DSPrimaryButton(
                label: 'SİPARİŞLERİME GİT',
                onPressed: () => context.go('/orders'),
              ),
              const SizedBox(height: 12),
              DSSecondaryButton(
                label: 'ANA SAYFAYA DÖN',
                onPressed: () => context.go('/home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
