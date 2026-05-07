import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_splits_repository.dart';

class SplitDashboardScreen extends ConsumerWidget {
  const SplitDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitsListProvider('open'));
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('SPLİT YÖNETİMİM'),
          bottom: const TabBar(
            labelColor: DSColors.accentGold,
            unselectedLabelColor: DSColors.textSecondary,
            indicatorColor: DSColors.accentGold,
            tabs: [
              Tab(text: 'Aktif'),
              Tab(text: 'Şişeli Kalan'),
              Tab(text: 'Tamamlanan'),
            ],
          ),
        ),
        body: async.when(
          loading: () => const DSLoading(),
          error: (e, _) => DSErrorState(message: e.toString()),
          data: (splits) {
            return TabBarView(
              children: [
                _SplitGrid(splits: splits.where((s) => !s.hasBottleLeft).toList()),
                _SplitGrid(splits: splits.where((s) => s.hasBottleLeft).toList()),
                const DSEmptyState(
                  icon: Icons.check_circle_outline,
                  title: 'Henüz tamamlanan split yok',
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SplitGrid extends StatelessWidget {
  final List splits;
  const _SplitGrid({required this.splits});

  @override
  Widget build(BuildContext context) {
    if (splits.isEmpty) {
      return const DSEmptyState(
        icon: Icons.science_outlined,
        title: 'Bu sekmede split yok',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: splits.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) {
        final s = splits[i];
        return DSCard(
          leftAccent: DSColors.accentGold,
          onTap: () => context.push('/splits/${s.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  DSBadge.split(),
                  const Spacer(),
                  Text('${s.participantCount} talep',
                      style: const TextStyle(
                          color: DSColors.textSecondary, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 10),
              Text(s.displayName,
                  style: const TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  )),
              const SizedBox(height: 12),
              DSProgressBar(value: s.progress),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('${s.filledMl}/${s.totalVolumeMl} ml',
                      style: const TextStyle(
                          color: DSColors.textSecondary, fontSize: 12)),
                  const Spacer(),
                  Text(formatPricePerMl(s.pricePerMl),
                      style: const TextStyle(
                        color: DSColors.accentGold,
                        fontWeight: FontWeight.w700,
                      )),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
