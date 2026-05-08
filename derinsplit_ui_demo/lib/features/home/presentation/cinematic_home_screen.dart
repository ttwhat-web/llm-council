import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/perfume_image.dart';
import '../../../core/widgets/web_navbar.dart';
import '../../auth/data/fake_auth_repository.dart';

/// Cinematic luxury home page (desktop / large tablet).
///
/// Layout:
///   [ floating glass pill navbar ]
///   [ massive editorial hero — dark perfume bg + Hoş geldiniz ]
///   [ 3 luxury feature cards: SPLIT · ŞİŞE SATIŞLARI · DEKANT ]
///   [ minimal footer ]
class CinematicHomeScreen extends ConsumerWidget {
  const CinematicHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authRepositoryProvider).user;
    final w = context.screenWidth;

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: CinematicBackdrop(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const WebPillNavbar(),
              const SizedBox(height: 28),
              _Hero(name: user?.name, screenWidth: w),
              const SizedBox(height: 64),
              _CategoryRow(screenWidth: w),
              const SizedBox(height: 80),
              _Footer(),
              const SizedBox(height: 36),
            ],
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
        onTap: () => context.go('/market'),
      ),
      _CategoryCard(
        title: 'DEKANT',
        subtitle: 'Dekant satış yakında.',
        cta: 'İNCELE',
        kicker: 'YAKINDA',
        kickerColor: DSColors.warning,
        mood: PerfumeMood.smoke,
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
  final bool comingSoon;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.kicker,
    required this.kickerColor,
    required this.mood,
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
