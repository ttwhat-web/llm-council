import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/preview_flags.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/light_panel.dart';
import '../../../core/widgets/perfume_image.dart';
import '../../../core/widgets/web_navbar.dart';
import '../../auth/data/fake_auth_repository.dart';

/// Light luxury home page (desktop / large tablet).
///
/// Layout:
///   [ floating glass pill navbar — light variant ]
///   [ LightFrostedPanel containing the entire editorial spread ]
///       hero (dark perfume card on light surface)
///       3 feature cards (dark photo cards)
///       featured splits carousel
///       NASIL ÇALIŞIR triptych
///       curator's note
///       newsletter strip
///   [ Preview v2 footer stamp ]
class CinematicHomeScreen extends ConsumerWidget {
  const CinematicHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authRepositoryProvider).user;
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
                    w >= 1400 ? 40 : 24,
                    w >= 1400 ? 40 : 28,
                    w >= 1400 ? 40 : 24,
                    w >= 1400 ? 56 : 40,
                  ),
                  child: Column(
                    children: [
                      _Hero(name: user?.name, screenWidth: w),
                      const SizedBox(height: 56),
                      _CategoryRow(screenWidth: w),
                      const SizedBox(height: 80),
                      _FeaturedSplits(screenWidth: w),
                      const SizedBox(height: 80),
                      _HowItWorks(screenWidth: w),
                      const SizedBox(height: 80),
                      _CuratorsNote(screenWidth: w),
                      const SizedBox(height: 56),
                      _NewsletterStrip(screenWidth: w),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              _PreviewStamp(),
              const SizedBox(height: 24),
              _Footer(),
              const SizedBox(height: 36),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreviewStamp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(40),
          gradient: DSColors.goldGradient,
          boxShadow: [
            BoxShadow(
              color: DSColors.accentGold.withOpacity(0.4),
              blurRadius: 14,
            ),
          ],
        ),
        child: Text(
          kPreviewVersion.toUpperCase(),
          style: const TextStyle(
            color: DSColors.bgPrimary,
            fontSize: 11,
            letterSpacing: 2.4,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO  — large rounded rectangle with dark perfume bg + "Hoş geldiniz"
// ─────────────────────────────────────────────────────────────────────────────

class _Hero extends StatelessWidget {
  final String? name;
  final double screenWidth;
  const _Hero({this.name, required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final padding = screenWidth >= 1400 ? 56.0 : 32.0;
    final heroHeight = screenWidth >= 1400 ? 460.0 : 380.0;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1480),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding, vertical: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: SizedBox(
              height: heroHeight,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // 1) Dark perfume mood background
                  const _HeroBackdrop(),

                  // 2) Bottom-to-top dark gradient for legibility
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomLeft,
                        end: Alignment.topRight,
                        colors: [
                          Color(0xCC000000),
                          Color(0x88000000),
                          Color(0x44000000),
                        ],
                      ),
                    ),
                  ),

                  // 3) Editorial copy on the left
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      screenWidth >= 1100 ? 64 : 32,
                      40,
                      32,
                      40,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // eyebrow
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            border: Border.all(
                                color: DSColors.accentGold.withOpacity(0.4)),
                            borderRadius: BorderRadius.circular(40),
                          ),
                          child: const Text(
                            'PRIVATE COLLECTOR CLUB',
                            style: TextStyle(
                              color: DSColors.accentGoldLight,
                              fontSize: 10.5,
                              letterSpacing: 3,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 22),
                        // headline
                        ShaderMask(
                          shaderCallback: (rect) => const LinearGradient(
                            colors: [
                              Color(0xFFF5F1E8),
                              Color(0xFFE8C879),
                              Color(0xFFF5F1E8),
                            ],
                          ).createShader(rect),
                          child: Text(
                            'Hoş geldiniz',
                            style: TextStyle(
                              color: DSColors.textPrimary,
                              fontFamily: 'Georgia',
                              fontSize: screenWidth >= 1400 ? 88 : 68,
                              height: 1.0,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -1.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        // subtitle
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 600),
                          child: const Text(
                            'Türkiye’nin en seçkin parfüm topluluğuna adım atın. '
                            'Kokuların dünyasını keşfetmek için bölümleri inceleyin.',
                            style: TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 15.5,
                              height: 1.65,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 26),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _CinematicButton(
                              label: 'HEMEN KEŞFET',
                              gold: true,
                              onTap: () => context.go('/market'),
                            ),
                            const SizedBox(width: 14),
                            _CinematicButton(
                              label: 'SPLITLER',
                              gold: false,
                              onTap: () => context.go('/splits'),
                            ),
                          ],
                        ),
                        if (name != null) ...[
                          const SizedBox(height: 18),
                          Text(
                            'HOŞ GELDİN, ${name!.toUpperCase()}.',
                            style: const TextStyle(
                              color: DSColors.textTertiary,
                              fontSize: 11,
                              letterSpacing: 2,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // 4) Crest emblem on the right (only on wide screens)
                  if (screenWidth >= 1100)
                    const Positioned(
                      right: 60,
                      top: 0,
                      bottom: 0,
                      child: Center(child: _Crest()),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroBackdrop extends StatelessWidget {
  const _HeroBackdrop();

  @override
  Widget build(BuildContext context) {
    // Editorial dark fragrance backdrop. Supports a real bg drop-in
    // by replacing this with `Image.asset('assets/images/perfumes/hero.jpg')`.
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF14110A),
                Color(0xFF06070A),
                Color(0xFF130D14),
              ],
            ),
          ),
        ),
        // diffuse amber spotlight on the right
        Positioned(
          right: -120,
          top: -80,
          child: Container(
            width: 600,
            height: 600,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  DSColors.accentGold.withOpacity(0.22),
                  DSColors.accentGold.withOpacity(0),
                ],
              ),
            ),
          ),
        ),
        // smoky violet underglow
        Positioned(
          left: -100,
          bottom: -100,
          child: Container(
            width: 460,
            height: 460,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  Color(0x336B3E8E),
                  Color(0x006B3E8E),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Crest extends StatefulWidget {
  const _Crest();

  @override
  State<_Crest> createState() => _CrestState();
}

class _CrestState extends State<_Crest>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final glow = 0.55 + 0.25 * _ctrl.value;
        return SizedBox(
          width: 320,
          height: 320,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      DSColors.accentGold.withOpacity(0.20 * glow),
                      DSColors.accentGold.withOpacity(0),
                    ],
                  ),
                ),
              ),
              Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const RadialGradient(
                    colors: [Color(0xFF1A130F), Color(0xFF06070A)],
                  ),
                  border: Border.all(
                    color: DSColors.accentGold.withOpacity(0.55),
                    width: 1.4,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: DSColors.accentGold.withOpacity(0.40 * glow),
                      blurRadius: 60,
                      spreadRadius: 4,
                    ),
                  ],
                ),
              ),
              ShaderMask(
                shaderCallback: (b) => DSColors.goldGradient.createShader(b),
                child: const Icon(
                  Icons.water_drop_outlined,
                  size: 100,
                  color: DSColors.accentGold,
                ),
              ),
              Positioned(
                bottom: 38,
                child: Text(
                  'DERİN  SPLIT',
                  style: TextStyle(
                    color: DSColors.accentGoldLight.withOpacity(0.7),
                    fontFamily: 'Georgia',
                    fontSize: 11,
                    letterSpacing: 4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CinematicButton extends StatefulWidget {
  final String label;
  final bool gold;
  final VoidCallback onTap;
  const _CinematicButton({
    required this.label,
    required this.gold,
    required this.onTap,
  });

  @override
  State<_CinematicButton> createState() => _CinematicButtonState();
}

class _CinematicButtonState extends State<_CinematicButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          transform: Matrix4.identity()..translate(0.0, _hover ? -2.0 : 0.0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            gradient: widget.gold ? DSColors.goldGradient : null,
            color: widget.gold ? null : Colors.transparent,
            border: widget.gold
                ? null
                : Border.all(
                    color: DSColors.accentGoldLight.withOpacity(_hover ? 1 : 0.6),
                    width: 1.2,
                  ),
            boxShadow: widget.gold
                ? [
                    BoxShadow(
                      color: DSColors.accentGold.withOpacity(_hover ? 0.6 : 0.4),
                      blurRadius: _hover ? 28 : 18,
                      offset: const Offset(0, 6),
                    ),
                  ]
                : null,
          ),
          child: Text(
            widget.label,
            style: TextStyle(
              color:
                  widget.gold ? DSColors.bgPrimary : DSColors.accentGoldLight,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 2.6,
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY ROW — 3 luxury cards with perfume image bg + black gradient overlay
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryRow extends StatelessWidget {
  final double screenWidth;
  const _CategoryRow({required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final wide = screenWidth >= 1100;
    final padding = screenWidth >= 1400 ? 56.0 : 32.0;
    final cards = [
      _CategoryCard(
        title: 'SPLIT',
        subtitle:
            'Parfümleri paylaşın, ml veya şişe taleplerini zaman sırasıyla yönetin.',
        cta: 'İNCELE',
        kicker: 'AKTİF',
        kickerColor: DSColors.success,
        mood: PerfumeMood.amber,
        shape: BottleShape.flask,
        onTap: () => context.go('/splits'),
      ),
      _CategoryCard(
        title: 'ŞİŞE SATIŞLARI',
        subtitle:
            'Parfüm şişelerini inceleyin ve satın alma talebi gönderin.',
        cta: 'İNCELE',
        kicker: 'AKTİF',
        kickerColor: DSColors.success,
        mood: PerfumeMood.violet,
        shape: BottleShape.round,
        onTap: () => context.go('/market'),
      ),
      _CategoryCard(
        title: 'DEKANT',
        subtitle: 'Dekant satış yakında.',
        cta: 'İNCELE',
        kicker: 'YAKINDA',
        kickerColor: DSColors.warning,
        mood: PerfumeMood.smoke,
        shape: BottleShape.niche,
        comingSoon: true,
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'DEKANT bölümü yakında açılıyor.',
                style: TextStyle(
                  color: DSColors.bgPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              backgroundColor: DSColors.accentGoldLight,
            ),
          );
        },
      ),
    ];

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 1480),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: padding),
        child: wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 24),
                  Expanded(child: cards[1]),
                  const SizedBox(width: 24),
                  Expanded(child: cards[2]),
                ],
              )
            : Column(
                children: [
                  for (var i = 0; i < cards.length; i++) ...[
                    cards[i],
                    if (i < cards.length - 1) const SizedBox(height: 20),
                  ],
                ],
              ),
      ),
    );
  }
}

class _CategoryCard extends StatefulWidget {
  final String title;
  final String subtitle;
  final String cta;
  final String kicker;
  final Color kickerColor;
  final PerfumeMood mood;
  final BottleShape shape;
  final bool comingSoon;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.kicker,
    required this.kickerColor,
    required this.mood,
    required this.shape,
    required this.onTap,
    this.comingSoon = false,
  });

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeOutCubic,
          height: 460,
          transform: Matrix4.identity()..translate(0.0, _hover ? -8.0 : 0.0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_hover ? 0.7 : 0.5),
                blurRadius: _hover ? 60 : 36,
                offset: const Offset(0, 18),
              ),
              if (_hover)
                BoxShadow(
                  color: DSColors.accentGold.withOpacity(0.22),
                  blurRadius: 48,
                  spreadRadius: 1,
                ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 1) Perfume photo backdrop — replaceable via assetPath
                PerfumeImage(
                  mood: widget.mood,
                  shape: widget.shape,
                  borderRadius: BorderRadius.circular(28),
                  aspectRatio: 100 / 460,
                ),
                // 2) Black gradient overlay for legibility
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x55000000),
                        Color(0xCC000000),
                        Color(0xEE000000),
                      ],
                      stops: [0.0, 0.55, 1.0],
                    ),
                  ),
                ),
                // 3) Animated gold border on hover
                AnimatedContainer(
                  duration: const Duration(milliseconds: 320),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: _hover
                          ? DSColors.accentGold.withOpacity(0.6)
                          : DSColors.glassBorder,
                      width: _hover ? 1.4 : 1,
                    ),
                  ),
                ),
                // 4) Content
                Padding(
                  padding: const EdgeInsets.fromLTRB(28, 26, 28, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Spacer(),
                          // Kicker badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: widget.kickerColor.withOpacity(0.16),
                              border: Border.all(
                                color: widget.kickerColor.withOpacity(0.55),
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              widget.kicker,
                              style: TextStyle(
                                color: widget.kickerColor,
                                fontSize: 10,
                                letterSpacing: 1.8,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 260),
                        style: TextStyle(
                          color: _hover
                              ? DSColors.accentGoldLight
                              : DSColors.textPrimary,
                          fontFamily: 'Georgia',
                          fontWeight: FontWeight.w800,
                          fontSize: 36,
                          height: 1.0,
                          letterSpacing: -0.5,
                        ),
                        child: Text(widget.title),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        widget.subtitle,
                        style: const TextStyle(
                          color: DSColors.textSecondary,
                          fontSize: 13.5,
                          height: 1.55,
                        ),
                      ),
                      const SizedBox(height: 22),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 240),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 9),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(40),
                          border: Border.all(
                            color: DSColors.accentGoldLight.withOpacity(
                              _hover ? 1 : 0.55,
                            ),
                          ),
                          color: _hover
                              ? DSColors.accentGold.withOpacity(0.12)
                              : Colors.transparent,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.cta,
                              style: const TextStyle(
                                color: DSColors.accentGoldLight,
                                fontSize: 11,
                                letterSpacing: 2.4,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.arrow_forward,
                              color: DSColors.accentGoldLight,
                              size: 14,
                            ),
                            if (widget.comingSoon) ...[
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.lock_outline,
                                color: DSColors.textTertiary,
                                size: 13,
                              ),
                            ],
                          ],
                        ),
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

class _Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final w = context.screenWidth;
    return Padding(
      padding:
          EdgeInsets.symmetric(horizontal: w >= 1400 ? 56 : 32, vertical: 8),
      child: Column(
        children: [
          Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  DSColors.accentGold.withOpacity(0),
                  DSColors.accentGold.withOpacity(0.35),
                  DSColors.accentGold.withOpacity(0),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 24,
            runSpacing: 12,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: DSColors.accentGold.withOpacity(0.7),
                      ),
                    ),
                    child: const Icon(
                      Icons.water_drop_outlined,
                      color: DSColors.accentGold,
                      size: 12,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'DERİN  SPLIT  ·  PRIVATE COLLECTOR CLUB  ·  EST. 2026',
                    style: TextStyle(
                      color: DSColors.textTertiary,
                      fontSize: 10.5,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Georgia',
                    ),
                  ),
                ],
              ),
              const Text(
                'KVKK  ·  KULLANIM KOŞULLARI  ·  İLETİŞİM',
                style: TextStyle(
                  color: DSColors.textTertiary,
                  fontSize: 10.5,
                  letterSpacing: 2,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED SPLITS — horizontal editorial carousel of curated picks
// ─────────────────────────────────────────────────────────────────────────────

class _FeaturedSplits extends StatelessWidget {
  final double screenWidth;
  const _FeaturedSplits({required this.screenWidth});

  static const _picks = [
    _FeaturedPick(
      brand: 'XERJOFF',
      name: 'Naxos',
      price: '180 ₺/ml',
      mood: PerfumeMood.amber,
      shape: BottleShape.niche,
      filledMl: 32,
      totalMl: 100,
      tag: 'YENİ DROP',
    ),
    _FeaturedPick(
      brand: 'CLIVE CHRISTIAN',
      name: 'Hedonistic',
      price: '14.900 ₺',
      mood: PerfumeMood.oud,
      shape: BottleShape.tall,
      filledMl: 50,
      totalMl: 50,
      tag: 'ÖN SİPARİŞ',
    ),
    _FeaturedPick(
      brand: 'ROJA',
      name: 'Elysium Parfum',
      price: '220 ₺/ml',
      mood: PerfumeMood.ivory,
      shape: BottleShape.round,
      filledMl: 22,
      totalMl: 100,
      tag: 'KÜRATÖR SEÇİMİ',
    ),
    _FeaturedPick(
      brand: 'AMOUAGE',
      name: 'Interlude Black Iris',
      price: '7.200 ₺',
      mood: PerfumeMood.smoke,
      shape: BottleShape.tall,
      filledMl: 100,
      totalMl: 100,
      tag: 'SINIRLI STOK',
    ),
    _FeaturedPick(
      brand: 'PARFUMS DE MARLY',
      name: 'Layton Exclusif',
      price: '160 ₺/ml',
      mood: PerfumeMood.violet,
      shape: BottleShape.flask,
      filledMl: 18,
      totalMl: 75,
      tag: 'SINIRLI',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final padding = screenWidth >= 1400 ? 56.0 : 32.0;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1480),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(width: 4, height: 28, color: DSColors.accentGold),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'KÜRATÖR SEÇİMİ',
                          style: TextStyle(
                            color: DSColors.accentGoldLight,
                            fontSize: 10.5,
                            letterSpacing: 3,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Bu hafta sahnede',
                          style: TextStyle(
                            color: DSColors.textPrimary,
                            fontFamily: 'Georgia',
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            height: 1.05,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(40),
                      border: Border.all(
                        color: DSColors.accentGold.withOpacity(0.4),
                      ),
                    ),
                    child: const Text(
                      'TÜMÜNÜ GÖR  →',
                      style: TextStyle(
                        color: DSColors.accentGoldLight,
                        fontSize: 10.5,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 420,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _picks.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 18),
                  itemBuilder: (_, i) => _FeaturedCard(pick: _picks[i]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeaturedPick {
  final String brand;
  final String name;
  final String price;
  final PerfumeMood mood;
  final BottleShape shape;
  final int filledMl;
  final int totalMl;
  final String tag;
  const _FeaturedPick({
    required this.brand,
    required this.name,
    required this.price,
    required this.mood,
    required this.shape,
    required this.filledMl,
    required this.totalMl,
    required this.tag,
  });
}

class _FeaturedCard extends StatefulWidget {
  final _FeaturedPick pick;
  const _FeaturedCard({required this.pick});

  @override
  State<_FeaturedCard> createState() => _FeaturedCardState();
}

class _FeaturedCardState extends State<_FeaturedCard> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.pick;
    final progress = p.filledMl / p.totalMl;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: () => Navigator.of(context).maybePop(),
        child: AnimatedContainer(
          width: 280,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
          transform: Matrix4.identity()..translate(0.0, _hover ? -6.0 : 0.0),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Stack(
              children: [
                // photo
                Positioned.fill(
                  child: PerfumeImage(
                    mood: p.mood,
                    shape: p.shape,
                    aspectRatio: 280 / 420,
                    borderRadius: BorderRadius.zero,
                  ),
                ),
                // legibility overlay
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x00000000),
                          Color(0x33000000),
                          Color(0xCC000000),
                        ],
                        stops: [0.0, 0.55, 1.0],
                      ),
                    ),
                  ),
                ),
                // tag
                Positioned(
                  top: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: DSColors.goldGradient,
                      borderRadius: BorderRadius.circular(40),
                    ),
                    child: Text(
                      p.tag,
                      style: const TextStyle(
                        color: DSColors.bgPrimary,
                        fontSize: 9.5,
                        letterSpacing: 1.4,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                // bottom content
                Positioned(
                  left: 18,
                  right: 18,
                  bottom: 18,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.brand,
                        style: const TextStyle(
                          color: DSColors.accentGoldLight,
                          fontSize: 10,
                          letterSpacing: 2.4,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        p.name,
                        style: const TextStyle(
                          color: DSColors.textPrimary,
                          fontFamily: 'Georgia',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          height: 1.05,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 12),
                      // mini progress
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          height: 4,
                          child: Stack(
                            children: [
                              Container(color: Colors.white.withOpacity(0.18)),
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
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text(
                            '${p.filledMl}/${p.totalMl} ml',
                            style: const TextStyle(
                              color: DSColors.textSecondary,
                              fontSize: 11.5,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            p.price,
                            style: const TextStyle(
                              color: DSColors.accentGoldLight,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
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

// ─────────────────────────────────────────────────────────────────────────────
// HOW IT WORKS — 3 step process
// ─────────────────────────────────────────────────────────────────────────────

class _HowItWorks extends StatelessWidget {
  final double screenWidth;
  const _HowItWorks({required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final padding = screenWidth >= 1400 ? 56.0 : 32.0;
    final wide = screenWidth >= 1100;
    final steps = [
      const _Step(
        no: '01',
        title: 'KAYIT İSTEĞİ',
        body:
            'Talebinizi gönderin. Küratör ekibimiz koleksiyonunuzu inceler ve 2-5 iş günü içinde geri döner.',
        icon: Icons.send_outlined,
      ),
      const _Step(
        no: '02',
        title: 'KEŞFEDİN',
        body:
            'Splitlere ml bazında katılın, takas teklifi gönderin, küratör seçkilerinden ilham alın.',
        icon: Icons.diamond_outlined,
      ),
      const _Step(
        no: '03',
        title: 'GÜVENLE TESLİM',
        body:
            'AI destekli orijinallik ön kontrolü, batch doğrulama, sigortalı kargo ile kapınıza.',
        icon: Icons.shield_outlined,
      ),
    ];

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1480),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding),
          child: Column(
            children: [
              Column(
                children: const [
                  Text(
                    'NASIL ÇALIŞIR',
                    style: TextStyle(
                      color: DSColors.accentGoldDark,
                      fontSize: 10.5,
                      letterSpacing: 3,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Üç adımda topluluğa katılın',
                    style: TextStyle(
                      color: DSColors.lightInk,
                      fontFamily: 'Georgia',
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 36),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (var i = 0; i < steps.length; i++) ...[
                          Expanded(child: steps[i]),
                          if (i < steps.length - 1) const SizedBox(width: 22),
                        ],
                      ],
                    )
                  : Column(
                      children: [
                        for (var i = 0; i < steps.length; i++) ...[
                          steps[i],
                          if (i < steps.length - 1) const SizedBox(height: 20),
                        ],
                      ],
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final String no;
  final String title;
  final String body;
  final IconData icon;
  const _Step({
    required this.no,
    required this.title,
    required this.body,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(26, 28, 26, 30),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: Colors.white,
        border: Border.all(color: DSColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: DSColors.goldGradient,
                  boxShadow: [
                    BoxShadow(
                      color: DSColors.accentGold.withOpacity(0.4),
                      blurRadius: 14,
                    ),
                  ],
                ),
                child: Icon(icon, color: DSColors.bgPrimary, size: 20),
              ),
              const Spacer(),
              ShaderMask(
                shaderCallback: (b) =>
                    DSColors.goldGradient.createShader(b),
                child: Text(
                  no,
                  style: const TextStyle(
                    color: DSColors.accentGoldDark,
                    fontFamily: 'Georgia',
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            title,
            style: const TextStyle(
              color: DSColors.lightInk,
              fontSize: 14,
              letterSpacing: 2,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: const TextStyle(
              color: DSColors.lightInkSecondary,
              fontSize: 13.5,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CURATOR'S NOTE — full-bleed editorial quote with image
// ─────────────────────────────────────────────────────────────────────────────

class _CuratorsNote extends StatelessWidget {
  final double screenWidth;
  const _CuratorsNote({required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final wide = screenWidth >= 1100;
    final padding = screenWidth >= 1400 ? 56.0 : 32.0;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1480),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF14110A),
                    Color(0xFF06070A),
                  ],
                ),
                border: Border.all(color: DSColors.glassBorder),
              ),
              child: wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(flex: 5, child: _quoteSide()),
                        const SizedBox(width: 48),
                        Expanded(
                          flex: 4,
                          child: Center(
                            child: SizedBox(
                              width: 280,
                              child: PerfumeImage(
                                mood: PerfumeMood.ivory,
                                shape: BottleShape.round,
                                aspectRatio: 4 / 5,
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        SizedBox(
                          width: 220,
                          child: PerfumeImage(
                            mood: PerfumeMood.ivory,
                            shape: BottleShape.round,
                            aspectRatio: 4 / 5,
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        const SizedBox(height: 24),
                        _quoteSide(),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _quoteSide() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'KÜRATÖR NOTU',
          style: TextStyle(
            color: DSColors.accentGoldLight,
            fontSize: 10.5,
            letterSpacing: 3,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 18),
        ShaderMask(
          shaderCallback: (rect) => const LinearGradient(
            colors: [
              Color(0xFFF5F1E8),
              Color(0xFFE8C879),
              Color(0xFFF5F1E8),
            ],
          ).createShader(rect),
          child: const Text(
            '“Bir parfüm hatıralarla başlar.\nBiz hatırayı güvenle paylaşırız.”',
            style: TextStyle(
              color: DSColors.textPrimary,
              fontFamily: 'Georgia',
              fontSize: 30,
              fontWeight: FontWeight.w600,
              fontStyle: FontStyle.italic,
              height: 1.25,
              letterSpacing: -0.3,
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Topluluğumuza her hafta yeni splitler eklenir; küratör ekibimiz batch doğrulama, '
          'kaynağı kanıtlanmış faturalı bayilik ve AI destekli risk skorunu zorunlu kılar. '
          'Burada bulduğunuz her şişe, koleksiyonunuza güvenle eklenebilir.',
          style: TextStyle(
            color: DSColors.textSecondary,
            fontSize: 14,
            height: 1.7,
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: DSColors.goldGradient,
              ),
              child: const Icon(
                Icons.diamond_outlined,
                color: DSColors.bgPrimary,
                size: 16,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'DERIN SPLIT KÜRATÖR EKİBİ',
                  style: TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 11,
                    letterSpacing: 2,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'EST. 2026 · İSTANBUL',
                  style: TextStyle(
                    color: DSColors.textTertiary,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NEWSLETTER STRIP
// ─────────────────────────────────────────────────────────────────────────────

class _NewsletterStrip extends StatefulWidget {
  final double screenWidth;
  const _NewsletterStrip({required this.screenWidth});

  @override
  State<_NewsletterStrip> createState() => _NewsletterStripState();
}

class _NewsletterStripState extends State<_NewsletterStrip> {
  final _email = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final padding = widget.screenWidth >= 1400 ? 56.0 : 32.0;
    final wide = widget.screenWidth >= 1100;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1480),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding),
          child: Container(
            padding: const EdgeInsets.all(36),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  DSColors.accentGoldDark.withOpacity(0.18),
                  Colors.white.withOpacity(0.02),
                ],
              ),
              border: Border.all(color: DSColors.accentGold.withOpacity(0.4)),
            ),
            child: wide
                ? Row(
                    children: [
                      Expanded(child: _copy()),
                      const SizedBox(width: 24),
                      Expanded(child: _form()),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _copy(),
                      const SizedBox(height: 20),
                      _form(),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _copy() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        Text(
          'YENİ DROP BİLDİRİMİ',
          style: TextStyle(
            color: DSColors.accentGoldLight,
            fontSize: 10.5,
            letterSpacing: 3,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: 10),
        Text(
          'Sınırlı stok dropları kaçırmayın',
          style: TextStyle(
            color: DSColors.textPrimary,
            fontFamily: 'Georgia',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            height: 1.1,
          ),
        ),
        SizedBox(height: 10),
        Text(
          'Yeni splitler, küratör seçimleri ve nadir şişe satışları için '
          'haftalık küratör bültenimize katılın.',
          style: TextStyle(
            color: DSColors.textSecondary,
            fontSize: 13.5,
            height: 1.55,
          ),
        ),
      ],
    );
  }

  Widget _form() {
    if (_submitted) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: DSColors.success.withOpacity(0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: DSColors.success.withOpacity(0.5)),
        ),
        child: Row(
          children: const [
            Icon(Icons.check_circle, color: DSColors.success),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Listeye eklendiniz. Sıradaki drop için mailinizi kontrol edin.',
                style: TextStyle(
                  color: DSColors.textPrimary,
                  fontSize: 13.5,
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.45),
        borderRadius: BorderRadius.circular(40),
        border: Border.all(color: DSColors.accentGold.withOpacity(0.4)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 6, 6, 6),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _email,
              style: const TextStyle(color: DSColors.textPrimary),
              decoration: const InputDecoration(
                hintText: 'e-posta adresiniz',
                hintStyle: TextStyle(color: DSColors.textTertiary),
                border: InputBorder.none,
                isDense: true,
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              if (_email.text.isEmpty) return;
              setState(() => _submitted = true);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(40),
                gradient: DSColors.goldGradient,
              ),
              child: const Text(
                'KATIL',
                style: TextStyle(
                  color: DSColors.bgPrimary,
                  fontSize: 11,
                  letterSpacing: 2,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
