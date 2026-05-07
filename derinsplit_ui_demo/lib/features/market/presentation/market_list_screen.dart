import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_chip.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_shimmer.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_listings_repository.dart';

class MarketListScreen extends ConsumerStatefulWidget {
  const MarketListScreen({super.key});

  @override
  ConsumerState<MarketListScreen> createState() => _MarketListScreenState();
}

class _MarketListScreenState extends ConsumerState<MarketListScreen> {
  String _type = 'all';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(listingsListProvider(_type));
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.tune),
          onPressed: () => showDemoControlPanel(context),
        ),
        title: const Text('PAZAR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push('/search'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                DSFilterChip(
                  label: 'Tümü',
                  selected: _type == 'all',
                  onTap: () => setState(() => _type = 'all'),
                ),
                const SizedBox(width: 8),
                DSFilterChip(
                  label: 'Satılık',
                  selected: _type == 'sale',
                  onTap: () => setState(() => _type = 'sale'),
                ),
                const SizedBox(width: 8),
                DSFilterChip(
                  label: 'Takaslık',
                  selected: _type == 'trade',
                  onTap: () => setState(() => _type = 'trade'),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: DSColors.accentGold,
              onRefresh: () async => ref.invalidate(listingsListProvider(_type)),
              child: async.when(
                loading: () => ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: 4,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, __) => const DSCardSkeleton(),
                ),
                error: (e, _) => DSErrorState(message: e.toString()),
                data: (items) {
                  if (items.isEmpty) {
                    return const DSEmptyState(
                      icon: Icons.storefront_outlined,
                      title: 'İlan yok',
                      subtitle: 'Filtrelerini değiştirip tekrar dene.',
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final l = items[i];
                      return DSCard(
                        leftAccent:
                            l.isTrade && !l.isSale ? DSColors.warning : DSColors.info,
                        onTap: () => context.push('/listings/${l.id}'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (l.isTrade) ...[
                                  DSBadge.trade(),
                                  const SizedBox(width: 6),
                                ],
                                if (l.isSale) DSBadge.listing(),
                                const Spacer(),
                                if (l.aiRiskScore != null)
                                  RiskBadge(level: l.aiRiskScore!),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(l.brand.toUpperCase(),
                                style: const TextStyle(
                                  color: DSColors.textTertiary,
                                  fontSize: 11,
                                  letterSpacing: 1.4,
                                )),
                            Text(l.name,
                                style: const TextStyle(
                                  color: DSColors.textPrimary,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                )),
                            const SizedBox(height: 4),
                            Text(
                              '${l.concentration} • ${l.bottleSizeMl}ml • ${l.city}',
                              style: const TextStyle(
                                color: DSColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 12),
                            DSProgressBar(value: l.fillPercent),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Text(
                                  '${l.remainingMl}/${l.bottleSizeMl} ml',
                                  style: const TextStyle(
                                    color: DSColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Icon(
                                  l.hasBox
                                      ? Icons.inventory_2_outlined
                                      : Icons.inventory_outlined,
                                  size: 14,
                                  color: DSColors.textSecondary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  l.hasBox ? 'Kutulu' : 'Kutusuz',
                                  style: const TextStyle(
                                    color: DSColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                                const Spacer(),
                                if (l.price != null)
                                  Text(
                                    formatTl(l.price!),
                                    style: const TextStyle(
                                      color: DSColors.accentGold,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  )
                                else
                                  const Text(
                                    'Takas',
                                    style: TextStyle(
                                      color: DSColors.warning,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
