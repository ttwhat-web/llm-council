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
        const Text(
          'ŞİŞE İLANLARI',
          style: TextStyle(
            color: DSColors.lightInk,
            fontFamily: 'Georgia',
            fontSize: 36,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Satışa sunulan parfüm şişelerini inceleyin ve satın alma talebi gönderin.',
          style: TextStyle(
            color: DSColors.lightInkSecondary,
            fontSize: 14.5,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 30),
        Container(
          height: 1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                DSColors.lightInk.withOpacity(0.18),
                DSColors.lightInk.withOpacity(0.0),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),

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
