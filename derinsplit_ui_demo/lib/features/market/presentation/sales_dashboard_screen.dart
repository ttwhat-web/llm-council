import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_listings_repository.dart';

class SalesDashboardScreen extends ConsumerWidget {
  const SalesDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingsListProvider('all'));
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('İLANLARIM'),
          bottom: const TabBar(
            labelColor: DSColors.accentGold,
            unselectedLabelColor: DSColors.textSecondary,
            indicatorColor: DSColors.accentGold,
            tabs: [
              Tab(text: 'İlanlar'),
              Tab(text: 'Mesajlar'),
              Tab(text: 'Teklifler'),
            ],
          ),
        ),
        body: async.when(
          loading: () => const DSLoading(),
          error: (e, _) => DSErrorState(message: e.toString()),
          data: (items) => TabBarView(
            children: [
              ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final l = items[i];
                  return DSCard(
                    leftAccent: DSColors.info,
                    onTap: () => context.push('/listings/${l.id}'),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l.displayName,
                                style: const TextStyle(
                                  color: DSColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              if (l.aiRiskScore != null)
                                RiskBadge(level: l.aiRiskScore!),
                            ],
                          ),
                        ),
                        if (l.price != null)
                          Text(
                            formatTl(l.price!),
                            style: const TextStyle(
                              color: DSColors.accentGold,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
              const DSEmptyState(
                icon: Icons.chat_bubble_outline,
                title: 'Mesajlar burada görünür',
                subtitle: 'Mesajlar sekmesi ana navigasyonda da var.',
              ),
              const DSEmptyState(
                icon: Icons.attach_money,
                title: 'Henüz teklif yok',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
