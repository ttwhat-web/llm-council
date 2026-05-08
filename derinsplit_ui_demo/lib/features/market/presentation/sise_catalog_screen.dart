import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/listing.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/light_panel.dart';
import '../../../core/widgets/perfume_image.dart';
import '../../../core/widgets/web_navbar.dart';
import '../data/fake_listings_repository.dart';

/// Desktop / web variant of the marketplace — luxury "ŞİŞE İLANLARI"
/// catalog rendered on a light parchment glass panel above the cinematic
/// backdrop. Mobile users see the existing dark `MarketListScreen`.
class SiseCatalogScreen extends ConsumerWidget {
  const SiseCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingsListProvider('all'));
    final w = context.screenWidth;
    final outerPad = w >= 1400 ? 56.0 : 32.0;

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: CinematicBackdrop(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const WebPillNavbar(variant: NavbarVariant.dark),
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
                    data: (items) => _Catalog(items: items, screenWidth: w),
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

class _Catalog extends StatelessWidget {
  final List<Listing> items;
  final double screenWidth;
  const _Catalog({required this.items, required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final cols = screenWidth >= 1400
        ? 4
        : screenWidth >= 1100
            ? 3
            : 2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        const _CatalogHero(),
        const SizedBox(height: 30),

        // Filter bar
        _FilterBar(totalCount: items.length),
        const SizedBox(height: 24),

        // Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            childAspectRatio: 0.62,
            mainAxisSpacing: 24,
            crossAxisSpacing: 24,
          ),
          itemBuilder: (_, i) => _ProductCard(listing: items[i]),
        ),
      ],
    );
  }
}

class _CatalogHero extends StatelessWidget {
  const _CatalogHero();

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
                      color: DSColors.accentGold.withOpacity(0.5),
                    ),
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
                    'ŞİŞE İLANLARI',
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
                  'Satışa sunulan parfüm şişelerini inceleyin ve satın alma '
                  'talebi gönderin. Tüm ilanlar küratör süzgecinden geçer.',
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
          Expanded(
            flex: 3,
            child: Wrap(
              alignment: WrapAlignment.end,
              spacing: 10,
              runSpacing: 10,
              children: const [
                _StatPill(value: '142+', label: 'AKTİF İLAN'),
                _StatPill(value: '38', label: 'ONAYLI BAYİ'),
                _StatPill(value: '%99.4', label: 'AI GEÇİŞ'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String value;
  final String label;
  const _StatPill({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 18, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.08),
            Colors.white.withOpacity(0.02),
          ],
        ),
        border: Border.all(color: DSColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShaderMask(
            shaderCallback: (b) => DSColors.goldGradient.createShader(b),
            child: Text(
              value,
              style: const TextStyle(
                color: DSColors.accentGoldLight,
                fontFamily: 'Georgia',
                fontSize: 22,
                fontWeight: FontWeight.w800,
                height: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: DSColors.textTertiary,
              fontSize: 9,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterBar extends StatefulWidget {
  final int totalCount;
  const _FilterBar({required this.totalCount});

  @override
  State<_FilterBar> createState() => _FilterBarState();
}

class _FilterBarState extends State<_FilterBar> {
  String _stock = 'TÜMÜ';
  String _format = 'TÜMÜ';

  @override
  Widget build(BuildContext context) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 10,
      runSpacing: 10,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: DSColors.lightInk,
            borderRadius: BorderRadius.circular(40),
          ),
          child: Text(
            '${widget.totalCount} ŞİŞE',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10.5,
              letterSpacing: 1.6,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 8),
        for (final s in const ['TÜMÜ', 'STOKTA', 'ÖN SİPARİŞ'])
          _LightChip(
            label: s,
            selected: _stock == s,
            onTap: () => setState(() => _stock = s),
          ),
        Container(
          width: 1,
          height: 18,
          color: DSColors.lightInk.withOpacity(0.15),
          margin: const EdgeInsets.symmetric(horizontal: 8),
        ),
        for (final s in const ['TÜMÜ', 'TESTER', 'BOXED'])
          _LightChip(
            label: s,
            selected: _format == s,
            onTap: () => setState(() => _format = s),
          ),
        const Spacer(),
        _LightChip(
          label: 'BRANDS  ▾',
          selected: false,
          onTap: () {},
        ),
        _LightChip(
          label: 'FİYAT  ▾',
          selected: false,
          onTap: () {},
        ),
        _LightChip(
          label: 'ŞEHİR  ▾',
          selected: false,
          onTap: () {},
        ),
      ],
    );
  }
}

class _LightChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _LightChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            color: selected ? DSColors.lightInk : Colors.transparent,
            border: Border.all(
              color: selected
                  ? DSColors.lightInk
                  : DSColors.lightInk.withOpacity(0.18),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : DSColors.lightInk,
              fontSize: 10.5,
              letterSpacing: 1.6,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatefulWidget {
  final Listing listing;
  const _ProductCard({required this.listing});

  @override
  State<_ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<_ProductCard> {
  bool _hover = false;

  PerfumeMood get _mood => switch (widget.listing.moodKey) {
        'oud' => PerfumeMood.oud,
        'citrus' => PerfumeMood.citrus,
        'violet' => PerfumeMood.violet,
        'smoke' => PerfumeMood.smoke,
        'ivory' => PerfumeMood.ivory,
        _ => PerfumeMood.amber,
      };

  BottleShape get _shape => switch (widget.listing.brand.toLowerCase()) {
        var b when b.contains('xerjoff') => BottleShape.niche,
        var b when b.contains('clive') => BottleShape.tall,
        var b when b.contains('roja') => BottleShape.round,
        var b when b.contains('amouage') => BottleShape.tall,
        var b when b.contains('nishane') => BottleShape.dome,
        var b when b.contains('marly') => BottleShape.flask,
        var b when b.contains('initio') => BottleShape.dome,
        _ => BottleShape.flask,
      };

  @override
  Widget build(BuildContext context) {
    final l = widget.listing;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: () => context.push('/listings/${l.id}'),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
          transform: Matrix4.identity()..translate(0.0, _hover ? -4.0 : 0.0),
          child: LightCard(
            padding: EdgeInsets.zero,
            borderRadius: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Photo
                Stack(
                  children: [
                    PerfumeImage(
                      mood: _mood,
                      shape: _shape,
                      aspectRatio: 1,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(18),
                        topRight: Radius.circular(18),
                      ),
                    ),
                    // status & variant chips
                    Positioned(
                      left: 12,
                      top: 12,
                      right: 12,
                      child: Row(
                        children: [
                          if (l.variantLabel != null)
                            _Chip(
                              label: l.variantLabel!,
                              fg: DSColors.bgPrimary,
                              bg: DSColors.accentGoldLight,
                            ),
                          const Spacer(),
                          _Chip(
                            label: l.inStock ? 'STOKTA' : 'STOKTA YOK',
                            fg: l.inStock
                                ? DSColors.success
                                : DSColors.error,
                            bg: Colors.black.withOpacity(0.55),
                            border: l.inStock
                                ? DSColors.success.withOpacity(0.55)
                                : DSColors.error.withOpacity(0.55),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                // Body
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l.brand.toUpperCase(),
                        style: const TextStyle(
                          color: DSColors.lightInkTertiary,
                          fontSize: 10,
                          letterSpacing: 1.6,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: DSColors.lightInk,
                          fontFamily: 'Georgia',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l.variantLabel ?? l.concentration,
                        style: const TextStyle(
                          color: DSColors.lightInkSecondary,
                          fontSize: 11.5,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 14),
                      // ml progress
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${l.remainingMl}/${l.bottleSizeMl} ml',
                            style: const TextStyle(
                              color: DSColors.lightInkSecondary,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (!l.inStock)
                            const Text(
                              'SİPARİŞ',
                              style: TextStyle(
                                color: DSColors.warning,
                                fontSize: 9,
                                letterSpacing: 1.2,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          height: 5,
                          child: Stack(
                            children: [
                              Container(color: DSColors.lightInk.withOpacity(0.06)),
                              FractionallySizedBox(
                                widthFactor: l.fillPercent,
                                child: Container(
                                  decoration: const BoxDecoration(
                                    gradient: DSColors.goldGradient,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // stock label
                      Text(
                        l.stockLabel,
                        style: TextStyle(
                          color: l.inStock
                              ? DSColors.success
                              : DSColors.warning,
                          fontSize: 10.5,
                          letterSpacing: 1.4,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Price + CTA row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (l.price != null)
                            Text(
                              '${formatTl(l.price!).replaceAll(' ', ' ')}',
                              style: const TextStyle(
                                color: DSColors.lightInk,
                                fontFamily: 'Georgia',
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                              ),
                            )
                          else
                            const Text(
                              'TAKAS',
                              style: TextStyle(
                                color: DSColors.lightInk,
                                fontSize: 14,
                                letterSpacing: 1.4,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(40),
                              color: const Color(0xFF14140F),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'İNCELE',
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
                    ],
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

class _Chip extends StatelessWidget {
  final String label;
  final Color fg;
  final Color bg;
  final Color? border;
  const _Chip({
    required this.label,
    required this.fg,
    required this.bg,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: border == null ? null : Border.all(color: border!),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 9.5,
          letterSpacing: 1.4,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
