import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_chip.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_shimmer.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_splits_repository.dart';
import 'splits_catalog_screen.dart';

class SplitListScreen extends ConsumerStatefulWidget {
  const SplitListScreen({super.key});

  @override
  ConsumerState<SplitListScreen> createState() => _SplitListScreenState();
}

class _SplitListScreenState extends ConsumerState<SplitListScreen> {
  String _filter = 'open';

  @override
  Widget build(BuildContext context) {
    if (context.isDesktop) return const SplitsCatalogScreen();
    return _buildMobile(context);
  }

  Widget _buildMobile(BuildContext context) {
    final async = ref.watch(splitsListProvider(_filter));
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.tune),
          onPressed: () => showDemoControlPanel(context),
        ),
        title: const Text('SPLİTLER'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilters,
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
                  label: 'Açık Splitler',
                  selected: _filter == 'open',
                  onTap: () => setState(() => _filter = 'open'),
                ),
                const SizedBox(width: 8),
                DSFilterChip(
                  label: 'Şişeli Kalan',
                  selected: _filter == 'bottle_left',
                  onTap: () => setState(() => _filter = 'bottle_left'),
                ),
                const SizedBox(width: 8),
                DSFilterChip(label: 'Yakında', selected: false, onTap: () {}),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: DSColors.accentGold,
              onRefresh: () async => ref.invalidate(splitsListProvider(_filter)),
              child: async.when(
                loading: () => ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: 4,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, __) => const DSCardSkeleton(),
                ),
                error: (e, _) => DSErrorState(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(splitsListProvider(_filter)),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return const DSEmptyState(
                      icon: Icons.science_outlined,
                      title: 'Açık split yok',
                      subtitle:
                          'Bildirimleri açarak yeni drop’ları kaçırmayın.',
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final s = items[i];
                      return DSCard(
                        leftAccent: DSColors.accentGold,
                        onTap: () => context.push('/splits/${s.id}'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                DSBadge.split(),
                                const SizedBox(width: 8),
                                if (s.hasBottleLeft) DSBadge.bottle(),
                                const Spacer(),
                                RiskBadge(level: s.aiRiskScore),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              s.brand.toUpperCase(),
                              style: const TextStyle(
                                color: DSColors.textTertiary,
                                fontSize: 11,
                                letterSpacing: 1.4,
                              ),
                            ),
                            Text(
                              s.name,
                              style: const TextStyle(
                                color: DSColors.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${s.concentration} • ${s.bottleSizeMl}ml • ${s.sellerName}',
                              style: const TextStyle(
                                color: DSColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 14),
                            DSProgressBar(value: s.progress),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(Icons.people_outline,
                                    size: 14,
                                    color: DSColors.textSecondary
                                        .withOpacity(0.8)),
                                const SizedBox(width: 4),
                                Text(
                                  '${s.participantCount} katılımcı',
                                  style: const TextStyle(
                                      color: DSColors.textSecondary,
                                      fontSize: 12),
                                ),
                                const SizedBox(width: 12),
                                Icon(Icons.access_time,
                                    size: 14,
                                    color: DSColors.textSecondary
                                        .withOpacity(0.8)),
                                const SizedBox(width: 4),
                                Text(
                                  countdown(s.closesAt),
                                  style: const TextStyle(
                                      color: DSColors.textSecondary,
                                      fontSize: 12),
                                ),
                                const Spacer(),
                                Text(
                                  formatPricePerMl(s.pricePerMl),
                                  style: const TextStyle(
                                    color: DSColors.accentGold,
                                    fontSize: 14,
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

  void _showFilters() {
    showModalBottomSheet(
      context: context,
      backgroundColor: DSColors.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Filtreler',
                style: TextStyle(
                    color: DSColors.accentGold,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            SizedBox(height: 16),
            Text('Marka, ₺/ml aralığı, teslimat, AI risk seviyesi, kapanış zamanı.',
                style: TextStyle(color: DSColors.textSecondary)),
            SizedBox(height: 16),
            Text('(Demo: filtre UI hazırdır, gerçek filtreleme MVP backend ile)',
                style: TextStyle(color: DSColors.textTertiary, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
