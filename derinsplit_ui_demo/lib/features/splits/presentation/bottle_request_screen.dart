import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_input.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_splits_repository.dart';

class BottleRequestScreen extends ConsumerStatefulWidget {
  final String splitId;
  const BottleRequestScreen({super.key, required this.splitId});

  @override
  ConsumerState<BottleRequestScreen> createState() =>
      _BottleRequestScreenState();
}

class _BottleRequestScreenState extends ConsumerState<BottleRequestScreen> {
  final _confirm = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(splitDetailProvider(widget.splitId));
    return Scaffold(
      appBar: AppBar(title: const Text('ŞİŞELİ KALAN ONAY')),
      body: async.when(
        loading: () => const DSLoading(),
        error: (e, _) => DSErrorState(message: e.toString()),
        data: (s) {
          final total = s.remainingMl * s.pricePerMl;
          final confirmed = _confirm.text.trim().toUpperCase() == 'ŞİŞE';
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              DSCard(
                leftAccent: DSColors.success,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.displayName,
                      style: const TextStyle(
                        color: DSColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text('${s.remainingMl} ml • ${s.bottleSizeMl} ml şişe',
                        style: const TextStyle(color: DSColors.textSecondary)),
                    const Divider(height: 24),
                    Row(
                      children: [
                        const Text('Toplam',
                            style: TextStyle(color: DSColors.textSecondary)),
                        const Spacer(),
                        Text(
                          formatTl(total),
                          style: const TextStyle(
                            color: DSColors.success,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: DSColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: DSColors.warning.withOpacity(0.5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: DSColors.warning),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Şişeli kalan satın alımları iade edilemez. Lütfen detayları '
                        'kontrol et.',
                        style: TextStyle(
                          color: DSColors.warning.withOpacity(0.9),
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Onaylamak için aşağıya "ŞİŞE" yaz',
                style: TextStyle(
                  color: DSColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              DSInput(
                controller: _confirm,
                hint: 'ŞİŞE',
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 24),
              DSPrimaryButton(
                label: 'ONAYLA VE ÖDE',
                loading: _loading,
                onPressed: !confirmed || _loading
                    ? null
                    : () async {
                        setState(() => _loading = true);
                        try {
                          await ref
                              .read(splitsRepositoryProvider)
                              .createBottleRequest(s.id);
                          if (!mounted) return;
                          context.push('/payment', extra: {
                            'title': '${s.brand} ${s.name}',
                            'subtitle': 'Şişeli kalan • ${s.remainingMl} ml',
                            'amount': total,
                          });
                          setState(() => _loading = false);
                        } catch (e) {
                          if (!mounted) return;
                          setState(() => _loading = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(e.toString())),
                          );
                        }
                      },
              ),
            ],
          );
        },
      ),
    );
  }
}
