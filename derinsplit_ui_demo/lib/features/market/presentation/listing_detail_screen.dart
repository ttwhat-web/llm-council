import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_input.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_listings_repository.dart';

class ListingDetailScreen extends ConsumerWidget {
  final String listingId;
  const ListingDetailScreen({super.key, required this.listingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingDetailProvider(listingId));
    return Scaffold(
      body: async.when(
        loading: () => const DSLoading(),
        error: (e, _) => DSErrorState(message: e.toString()),
        data: (l) => CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 240,
              pinned: true,
              backgroundColor: DSColors.bgPrimary,
              actions: [
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.bookmark_border),
                ),
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.share_outlined),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: DSColors.heroGradient,
                  ),
                  child: Center(
                    child: ShaderMask(
                      shaderCallback: (b) =>
                          DSColors.goldGradient.createShader(b),
                      child: const Icon(Icons.spa_outlined,
                          size: 140, color: DSColors.accentGold),
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (l.isTrade) DSBadge.trade(),
                        if (l.isSale) ...[
                          if (l.isTrade) const SizedBox(width: 6),
                          DSBadge.listing(),
                        ],
                        const Spacer(),
                        if (l.aiRiskScore != null)
                          RiskBadge(level: l.aiRiskScore!),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      l.brand.toUpperCase(),
                      style: const TextStyle(
                          color: DSColors.textTertiary,
                          letterSpacing: 1.4,
                          fontSize: 12),
                    ),
                    Text(
                      l.name,
                      style: const TextStyle(
                        color: DSColors.textPrimary,
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${l.concentration} • ${l.bottleSizeMl}ml',
                      style: const TextStyle(color: DSColors.textSecondary),
                    ),
                    const SizedBox(height: 18),
                    DSCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                '${l.remainingMl}/${l.bottleSizeMl} ml',
                                style: const TextStyle(
                                  color: DSColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '%${(l.fillPercent * 100).round()} dolu',
                                style: const TextStyle(
                                  color: DSColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          DSProgressBar(value: l.fillPercent, height: 10),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(
                                l.hasBox
                                    ? Icons.inventory_2_outlined
                                    : Icons.inventory_outlined,
                                size: 16,
                                color: DSColors.textSecondary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                l.hasBox ? 'Kutulu' : 'Kutusuz',
                                style: const TextStyle(
                                  color: DSColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Icon(Icons.location_on_outlined,
                                  size: 16, color: DSColors.textSecondary),
                              const SizedBox(width: 6),
                              Text(l.city,
                                  style: const TextStyle(
                                      color: DSColors.textSecondary)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    DSCard(
                      leftAccent: DSColors.accentGold,
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: DSColors.bgTertiary,
                            child: Text(
                              l.sellerName.substring(0, 1),
                              style: const TextStyle(
                                color: DSColors.accentGold,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.sellerName,
                                  style: const TextStyle(
                                    color: DSColors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.verified,
                                        size: 14,
                                        color: DSColors.accentGold),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Trust ${l.sellerTrustScore}%',
                                      style: const TextStyle(
                                        color: DSColors.textSecondary,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.flag_outlined,
                                color: DSColors.textTertiary),
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ),
                    if (l.tradeExpectations != null) ...[
                      const SizedBox(height: 16),
                      DSCard(
                        leftAccent: DSColors.warning,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'TAKAS BEKLENTİSİ',
                              style: TextStyle(
                                color: DSColors.warning,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.4,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              l.tradeExpectations!,
                              style: const TextStyle(
                                color: DSColors.textPrimary,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    DSCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'GÜVEN BİLGİLERİ',
                            style: TextStyle(
                              color: DSColors.accentGold,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _Row(label: 'Batch', value: l.batchCode),
                          _Row(
                            label: 'AI Risk',
                            valueWidget: l.aiRiskScore == null
                                ? const Text('-',
                                    style: TextStyle(color: DSColors.textPrimary))
                                : RiskBadge(level: l.aiRiskScore!),
                          ),
                          _Row(
                            label: 'Şehir',
                            value: l.city,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'AI risk değerlendirmesi yalnızca ön kontrol amaçlıdır; '
                            '"orijinal" garantisi vermez.',
                            style: TextStyle(
                              color: DSColors.textTertiary,
                              fontSize: 11,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: async.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (l) => Row(
              children: [
                Expanded(
                  flex: 2,
                  child: DSPrimaryButton(
                    label: 'MESAJ GÖNDER',
                    icon: Icons.chat_bubble_outline,
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Yeni konuşma açılıyor...')),
                      );
                      Future.delayed(const Duration(milliseconds: 400), () {
                        if (context.mounted) context.push('/messages/c_1');
                      });
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DSSecondaryButton(
                    label: l.isTrade ? 'TAKAS' : 'TEKLİF',
                    icon: l.isTrade ? Icons.swap_horiz : Icons.attach_money,
                    onPressed: () => _showOfferModal(context, l.isTrade),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showOfferModal(BuildContext context, bool isTrade) {
    showModalBottomSheet(
      context: context,
      backgroundColor: DSColors.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: DSColors.surface,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isTrade ? 'Takas Teklifi' : 'Teklif Ver',
              style: const TextStyle(
                color: DSColors.accentGold,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            if (!isTrade)
              const DSInput(
                label: 'Teklif tutarı (₺)',
                hint: '8000',
                keyboardType: TextInputType.number,
                prefixIcon: Icons.attach_money,
              )
            else
              const DSInput(
                label: 'Takasta sunduğun ürün',
                hint: 'Örn: Xerjoff Naxos 100ml',
                prefixIcon: Icons.swap_horiz,
              ),
            const SizedBox(height: 12),
            const DSInput(
              label: 'Not (opsiyonel)',
              hint: 'Eklemek istediğin not...',
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            DSPrimaryButton(
              label: 'GÖNDER',
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Teklif gönderildi')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? valueWidget;
  const _Row({required this.label, this.value, this.valueWidget});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: const TextStyle(
                  color: DSColors.textTertiary,
                  fontSize: 12,
                  letterSpacing: 0.6,
                )),
          ),
          Expanded(
            child: valueWidget ??
                Text(
                  value ?? '-',
                  style: const TextStyle(color: DSColors.textPrimary),
                ),
          ),
        ],
      ),
    );
  }
}
