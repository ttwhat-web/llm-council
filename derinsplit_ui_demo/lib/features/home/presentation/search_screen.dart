import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_state.dart';
import '../../market/data/fake_listings_repository.dart';
import '../../splits/data/fake_splits_repository.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen>
    with SingleTickerProviderStateMixin {
  late final _tabs = TabController(length: 3, vsync: this);
  String _query = '';

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: true,
          onChanged: (v) => setState(() => _query = v.toLowerCase()),
          style: const TextStyle(color: DSColors.textPrimary),
          decoration: const InputDecoration(
            border: InputBorder.none,
            hintText: 'Marka, parfüm veya batch...',
            hintStyle: TextStyle(color: DSColors.textTertiary),
          ),
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: DSColors.accentGold,
          unselectedLabelColor: DSColors.textSecondary,
          indicatorColor: DSColors.accentGold,
          tabs: const [
            Tab(text: 'Splitler'),
            Tab(text: 'İlanlar'),
            Tab(text: 'Parfümler'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _SplitResults(query: _query),
          _ListingResults(query: _query),
          const DSEmptyState(
            icon: Icons.history,
            title: 'Parfüm araması yakında',
            subtitle: 'Şu an Splitler ve İlanlar üzerinden arama yapabilirsin.',
          ),
        ],
      ),
    );
  }
}

class _SplitResults extends ConsumerWidget {
  final String query;
  const _SplitResults({required this.query});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitsListProvider('open'));
    return async.when(
      loading: () => const DSLoading(),
      error: (e, _) => DSErrorState(message: e.toString()),
      data: (items) {
        final filtered = query.isEmpty
            ? items
            : items
                .where((s) =>
                    s.displayName.toLowerCase().contains(query) ||
                    s.batchCode.toLowerCase().contains(query))
                .toList();
        if (filtered.isEmpty) {
          return const DSEmptyState(
            icon: Icons.search_off,
            title: 'Sonuç yok',
            subtitle: 'Farklı bir kelime deneyebilirsin.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: filtered.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final s = filtered[i];
            return DSCard(
              leftAccent: DSColors.accentGold,
              onTap: () => context.push('/splits/${s.id}'),
              child: Row(
                children: [
                  DSBadge.split(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      s.displayName,
                      style: const TextStyle(
                        color: DSColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Text(
                    formatPricePerMl(s.pricePerMl),
                    style: const TextStyle(
                      color: DSColors.accentGold,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _ListingResults extends ConsumerWidget {
  final String query;
  const _ListingResults({required this.query});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingsListProvider('all'));
    return async.when(
      loading: () => const DSLoading(),
      error: (e, _) => DSErrorState(message: e.toString()),
      data: (items) {
        final filtered = query.isEmpty
            ? items
            : items
                .where((l) =>
                    l.displayName.toLowerCase().contains(query) ||
                    l.batchCode.toLowerCase().contains(query) ||
                    l.city.toLowerCase().contains(query))
                .toList();
        if (filtered.isEmpty) {
          return const DSEmptyState(
            icon: Icons.search_off,
            title: 'Sonuç yok',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: filtered.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final l = filtered[i];
            return DSCard(
              leftAccent: DSColors.info,
              onTap: () => context.push('/listings/${l.id}'),
              child: Row(
                children: [
                  if (l.isTrade) DSBadge.trade() else DSBadge.listing(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l.displayName,
                      style: const TextStyle(
                        color: DSColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
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
        );
      },
    );
  }
}
