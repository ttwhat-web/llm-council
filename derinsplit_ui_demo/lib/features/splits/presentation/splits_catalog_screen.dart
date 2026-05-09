import 'package:flutter/material.dart' hide Split;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/split.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/light_panel.dart';
import '../../../core/widgets/perfume_image.dart';
import '../../../core/widgets/web_navbar.dart';
import '../data/fake_splits_repository.dart';

/// Desktop / web variant of the splits browser — luxury "AKTİF SPLİTLER"
/// catalog rendered on the same parchment glass panel used by ŞİŞE +
/// HESABIM. Mobile users see the existing dark `SplitListScreen`.
class SplitsCatalogScreen extends ConsumerWidget {
  const SplitsCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitsListProvider('open'));
    final w = context.screenWidth;
    final outerPad = w >= 1400 ? 56.0 : 32.0;

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: CinematicBackdrop(
        grainOpacity: 0.04,
        child: SingleChildScrollView(
          child: Column(
            children: [
              const WebPillNavbar(variant: NavbarVariant.light),
              const SizedBox(height: 28),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: outerPad),
                child: LightFrostedPanel(
                  padding: EdgeInsets.fromLTRB(
                    w >= 1400 ? 56 : 36,
                    w >= 1400 ? 48 : 36,
                    w >= 1400 ? 56 : 36,
                    56,
                  ),
                  child: async.when(
                    loading: () => const SizedBox(
                      height: 480,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: DSColors.lightInk,
                        ),
                      ),
                    ),
                    error: (e, _) => SizedBox(
                      height: 320,
                      child: Center(
                        child: Text(
                          e.toString(),
                          style: const TextStyle(color: DSColors.lightInk),
                        ),
                      ),
                    ),
                    data: (items) =>
                        _SplitsBody(items: items, screenWidth: w),
                  ),
                ),
              ),
              const SizedBox(height: 56),
            ],
          ),
        ),
      ),
    );
  }
}

class _SplitsBody extends StatelessWidget {
  final List<Split> items;
  final double screenWidth;
  const _SplitsBody({required this.items, required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final cols = screenWidth >= 1400
        ? 3
        : screenWidth >= 1100
            ? 2
            : 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SplitsHero(),
        const SizedBox(height: 30),
        // Grid of split cards
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            childAspectRatio: 1.05,
            mainAxisSpacing: 24,
            crossAxisSpacing: 24,
          ),
          itemBuilder: (_, i) => _SplitCard(split: items[i]),
        ),
      ],
    );
  }
}

class _SplitsHero extends StatelessWidget {
  const _SplitsHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF14110A),
            Color(0xFF06070A),
          ],
        ),
        border: Border.all(color: DSColors.glassBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.45),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            flex: 5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    border: Border.all(
                        color: DSColors.accentGold.withOpacity(0.5)),
                    borderRadius: BorderRadius.circular(40),
                  ),
                  child: const Text(
                    'KÜRATÖR ONAYLI · BATCH DOĞRULAMALI',
                    style: TextStyle(
                      color: DSColors.accentGoldLight,
                      fontSize: 9.5,
                      letterSpacing: 2.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                ShaderMask(
                  shaderCallback: (rect) => const LinearGradient(
                    colors: [
                      Color(0xFFF5F1E8),
                      Color(0xFFE8C879),
                      Color(0xFFF5F1E8),
                    ],
                  ).createShader(rect),
                  child: const Text(
                    'AKTİF SPLİTLER',
                    style: TextStyle(
                      color: DSColors.textPrimary,
                      fontFamily: 'Georgia',
                      fontSize: 42,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.8,
                      height: 1.0,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Premium niche şişeleri ml veya şişe bazında zaman sırasıyla '
                  'paylaşın. Her split, küratör süzgecinden geçer; AI risk '
                  'skoru, kaynak ve batch bilgisi şeffaf görüntülenir.',
                  style: TextStyle(
                    color: DSColors.textSecondary,
                    fontSize: 14,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 28),
        ],
      ),
    );
  }
}

class _SplitCard extends StatefulWidget {
  final Split split;
  const _SplitCard({required this.split});

  @override
  State<_SplitCard> createState() => _SplitCardState();
}

class _SplitCardState extends State<_SplitCard> {
  bool _hover = false;

  PerfumeMood get _mood {
    final brand = widget.split.brand.toLowerCase();
    if (brand.contains('xerjoff')) return PerfumeMood.amber;
    if (brand.contains('clive')) return PerfumeMood.oud;
    if (brand.contains('roja')) return PerfumeMood.ivory;
    if (brand.contains('amouage')) return PerfumeMood.smoke;
    if (brand.contains('marly')) return PerfumeMood.violet;
    if (brand.contains('louis')) return PerfumeMood.violet;
    if (brand.contains('nishane')) return PerfumeMood.citrus;
    if (brand.contains('dior')) return PerfumeMood.oud;
    return PerfumeMood.amber;
  }

  BottleShape get _shape {
    final brand = widget.split.brand.toLowerCase();
    if (brand.contains('xerjoff')) return BottleShape.niche;
    if (brand.contains('clive')) return BottleShape.tall;
    if (brand.contains('roja')) return BottleShape.round;
    if (brand.contains('amouage')) return BottleShape.tall;
    if (brand.contains('nishane')) return BottleShape.dome;
    if (brand.contains('louis')) return BottleShape.flask;
    return BottleShape.flask;
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.split;
    final progress = s.progress;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: () => context.push('/splits/${s.id}'),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
          transform: Matrix4.identity()..translate(0.0, _hover ? -4.0 : 0.0),
          child: LightCard(
            padding: EdgeInsets.zero,
            borderRadius: 20,
            child: Row(
              children: [
                // Photo column
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    bottomLeft: Radius.circular(20),
                  ),
                  child: SizedBox(
                    width: 200,
                    height: 280,
                    child: PerfumeImage(
                      mood: _mood,
                      shape: _shape,
                      aspectRatio: 200 / 280,
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                ),
                // Body column
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 22, 22, 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                gradient: DSColors.goldGradient,
                                borderRadius: BorderRadius.circular(40),
                              ),
                              child: const Text(
                                'SPLIT',
                                style: TextStyle(
                                  color: DSColors.bgPrimary,
                                  fontSize: 9.5,
                                  letterSpacing: 1.6,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            if (s.hasBottleLeft) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: DSColors.success.withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(40),
                                  border: Border.all(
                                      color:
                                          DSColors.success.withOpacity(0.5)),
                                ),
                                child: const Text(
                                  'ŞİŞELİ KALDI',
                                  style: TextStyle(
                                    color: DSColors.success,
                                    fontSize: 9.5,
                                    letterSpacing: 1.4,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                            const Spacer(),
                            const Icon(
                              Icons.access_time,
                              size: 12,
                              color: DSColors.lightInkTertiary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              countdown(s.closesAt),
                              style: const TextStyle(
                                color: DSColors.lightInkSecondary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          s.brand.toUpperCase(),
                          style: const TextStyle(
                            color: DSColors.lightInkTertiary,
                            fontSize: 10,
                            letterSpacing: 1.6,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          s.name,
                          style: const TextStyle(
                            color: DSColors.lightInk,
                            fontFamily: 'Georgia',
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            height: 1.1,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${s.concentration} · ${s.bottleSizeMl}ml · ${s.sellerName}',
                          style: const TextStyle(
                            color: DSColors.lightInkSecondary,
                            fontSize: 12,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const Spacer(),
                        // ml progress
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            height: 6,
                            child: Stack(
                              children: [
                                Container(
                                  color:
                                      DSColors.lightInk.withOpacity(0.06),
                                ),
                                FractionallySizedBox(
                                  widthFactor: progress,
                                  child: const DecoratedBox(
                                    decoration: BoxDecoration(
                                      gradient: DSColors.goldGradient,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              '${s.filledMl}/${s.totalVolumeMl} ml',
                              style: const TextStyle(
                                color: DSColors.lightInkSecondary,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Icon(
                              Icons.people_outline,
                              size: 12,
                              color: DSColors.lightInkTertiary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${s.participantCount} kişi',
                              style: const TextStyle(
                                color: DSColors.lightInkSecondary,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              formatPricePerMl(s.pricePerMl),
                              style: const TextStyle(
                                color: DSColors.lightInk,
                                fontFamily: 'Georgia',
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(40),
                            color: const Color(0xFF14140F),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'KATIL',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  letterSpacing: 1.6,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(
                                Icons.arrow_forward,
                                color: Colors.white,
                                size: 12,
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
        ),
      ),
    );
  }
}
