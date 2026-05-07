import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/demo/demo_state.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_glass.dart';
import '../../../core/widgets/ds_logo.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_shimmer.dart';
import '../../../core/widgets/ds_state.dart';
import '../../auth/data/fake_auth_repository.dart';
import '../../market/data/fake_listings_repository.dart';
import '../../splits/data/fake_splits_repository.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authRepositoryProvider).user;
    final demo = ref.watch(demoSettingsProvider);
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: DSColors.bgPrimary.withOpacity(0.4),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.tune),
          onPressed: () => showDemoControlPanel(context),
        ),
        title: GestureDetector(
          onLongPress: () => showDemoControlPanel(context),
          child: const DSWordmark(fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: AuroraBackdrop(
        child: RefreshIndicator(
        color: DSColors.accentGold,
        onRefresh: () async {
          ref.invalidate(splitsListProvider);
          ref.invalidate(listingsListProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 96, 16, 32),
          children: [
            if (demo.highTraffic) const _HighTrafficBanner(),
            if (demo.highTraffic) const SizedBox(height: 12),
            if (user != null) _Greeting(name: user.name),
            const SizedBox(height: 12),
            const _HeroDrop(),
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Yeni Splitler',
              onSeeAll: () => context.go('/splits'),
            ),
            const SizedBox(height: 12),
            const _SplitsCarousel(),
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Şişeli Kalan',
              onSeeAll: () => context.go('/splits'),
            ),
            const SizedBox(height: 12),
            const _BottleLeftCarousel(),
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Yeni İlanlar',
              onSeeAll: () => context.go('/market'),
            ),
            const SizedBox(height: 12),
            const _ListingsCarousel(),
            const SizedBox(height: 24),
            const _Announcement(),
          ],
        ),
        ),
      ),
    );
  }
}

class _HighTrafficBanner extends StatelessWidget {
  const _HighTrafficBanner();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(14),
      leftAccent: DSColors.warning,
      child: Row(
        children: [
          const Icon(Icons.bolt, color: DSColors.warning),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Yoğun trafik – yanıtlar biraz gecikebilir.',
              style: TextStyle(color: DSColors.textPrimary),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: DSColors.warning.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'LIVE',
              style: TextStyle(
                color: DSColors.warning,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  final String name;
  const _Greeting({required this.name});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hoş geldin,',
                  style: TextStyle(
                    color: DSColors.textTertiary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  name,
                  style: const TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroDrop extends StatelessWidget {
  const _HeroDrop();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1A1A), Color(0xFF000000)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: DSColors.accentGold.withOpacity(0.5)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -20,
            child: ShaderMask(
              shaderCallback: (b) => DSColors.goldGradient.createShader(b),
              child: const Icon(
                Icons.diamond_outlined,
                size: 200,
                color: DSColors.accentGold,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: DSColors.accentGold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'YENİ DROP',
                    style: TextStyle(
                      color: DSColors.bgPrimary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Roja Elysium',
                      style: TextStyle(
                        color: DSColors.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '100ml • Düşük risk • 2 saat sonra açılıyor',
                      style: TextStyle(
                        color: DSColors.textSecondary.withOpacity(0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onSeeAll;
  const _SectionHeader({required this.title, required this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 3, height: 18, color: DSColors.accentGold),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: DSColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        const Spacer(),
        TextButton(
          onPressed: onSeeAll,
          child: const Text(
            'Tümü →',
            style: TextStyle(color: DSColors.accentGold, fontSize: 13),
          ),
        ),
      ],
    );
  }
}

class _SplitsCarousel extends ConsumerWidget {
  const _SplitsCarousel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitsListProvider('open'));
    return SizedBox(
      height: 220,
      child: async.when(
        loading: () => ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: 3,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, __) => SizedBox(
            width: 240,
            child: DSShimmer(
              height: 220,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        error: (e, _) =>
            DSErrorState(message: e.toString(), onRetry: () {
          ref.invalidate(splitsListProvider('open'));
        }),
        data: (items) {
          if (items.isEmpty) {
            return const DSEmptyState(
              icon: Icons.science_outlined,
              title: 'Henüz açık split yok',
              subtitle: 'Bildirimleri açarak yeni drop’ları kaçırma.',
            );
          }
          return ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final s = items[i];
              return SizedBox(
                width: 240,
                child: DSCard(
                  leftAccent: DSColors.accentGold,
                  onTap: () => context.push('/splits/${s.id}'),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          DSBadge.split(),
                          const Spacer(),
                          Icon(Icons.access_time,
                              size: 12,
                              color:
                                  DSColors.textSecondary.withOpacity(0.7)),
                          const SizedBox(width: 4),
                          Text(
                            countdown(s.closesAt),
                            style: const TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        s.brand,
                        style: const TextStyle(
                          color: DSColors.textTertiary,
                          fontSize: 11,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        s.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: DSColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      DSProgressBar(value: s.progress),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            '${s.filledMl}/${s.totalVolumeMl} ml',
                            style: const TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            formatPricePerMl(s.pricePerMl),
                            style: const TextStyle(
                              color: DSColors.accentGold,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _BottleLeftCarousel extends ConsumerWidget {
  const _BottleLeftCarousel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitsListProvider('bottle_left'));
    return SizedBox(
      height: 110,
      child: async.when(
        loading: () => DSShimmer(
          height: 110,
          borderRadius: BorderRadius.circular(16),
        ),
        error: (e, _) => DSErrorState(message: e.toString()),
        data: (items) {
          if (items.isEmpty) {
            return DSCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: const [
                  Icon(Icons.local_drink, color: DSColors.success),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Şu an şişeli kalan yok. Açılınca burada listelenecek.',
                      style: TextStyle(color: DSColors.textSecondary),
                    ),
                  ),
                ],
              ),
            );
          }
          return ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final s = items[i];
              return SizedBox(
                width: 240,
                child: DSCard(
                  leftAccent: DSColors.success,
                  onTap: () => context.push('/splits/${s.id}/bottle'),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      DSBadge.bottle(),
                      Text(
                        s.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: DSColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${s.remainingMl} ml kaldı',
                            style: const TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            formatTl(s.remainingMl * s.pricePerMl),
                            style: const TextStyle(
                              color: DSColors.success,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _ListingsCarousel extends ConsumerWidget {
  const _ListingsCarousel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingsListProvider('all'));
    return SizedBox(
      height: 200,
      child: async.when(
        loading: () => DSShimmer(
          height: 200,
          borderRadius: BorderRadius.circular(16),
        ),
        error: (e, _) => DSErrorState(message: e.toString()),
        data: (items) {
          if (items.isEmpty) {
            return const DSEmptyState(
              icon: Icons.storefront_outlined,
              title: 'Yeni ilan yok',
            );
          }
          return ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final l = items[i];
              return SizedBox(
                width: 220,
                child: DSCard(
                  leftAccent: DSColors.info,
                  onTap: () => context.push('/listings/${l.id}'),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          if (l.isTrade) DSBadge.trade(),
                          if (l.isSale) ...[
                            if (l.isTrade) const SizedBox(width: 6),
                            DSBadge.listing(),
                          ],
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l.brand,
                            style: const TextStyle(
                              color: DSColors.textTertiary,
                              fontSize: 11,
                              letterSpacing: 1,
                            ),
                          ),
                          Text(
                            l.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: DSColors.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${l.remainingMl}/${l.bottleSizeMl}ml • ${l.city}',
                            style: const TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (l.aiRiskScore != null)
                            RiskBadge(level: l.aiRiskScore!),
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
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _Announcement extends StatelessWidget {
  const _Announcement();

  @override
  Widget build(BuildContext context) {
    return DSCard(
      leftAccent: DSColors.info,
      child: Row(
        children: const [
          Icon(Icons.campaign_outlined, color: DSColors.info),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Yeni: AI orijinallik ön kontrolü artık ilan oluşturma akışında. '
              'Risk seviyesi düşük ilanlar daha hızlı yayınlanır.',
              style: TextStyle(color: DSColors.textSecondary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
