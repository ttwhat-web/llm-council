import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/web_navbar.dart';
import '../../auth/data/fake_auth_repository.dart';

/// Cinematic luxury home page. Used when width >= tablet breakpoint.
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
              const SizedBox(height: 24),
              _Hero(name: user?.name, screenWidth: w),
              const SizedBox(height: 80),
              _ChapterDivider(),
              const SizedBox(height: 56),
              _CategoryRow(screenWidth: w),
              const SizedBox(height: 100),
              _ManifestoStrip(),
              const SizedBox(height: 60),
              _Footer(),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────

class _Hero extends StatefulWidget {
  final String? name;
  final double screenWidth;
  const _Hero({this.name, required this.screenWidth});

  @override
  State<_Hero> createState() => _HeroState();
}

class _HeroState extends State<_Hero> with TickerProviderStateMixin {
  late final AnimationController _entrance = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..forward();

  late final AnimationController _glow = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _entrance.dispose();
    _glow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wide = widget.screenWidth >= 1100;
    final padding = widget.screenWidth >= 1400 ? 96.0 : 56.0;

    final fade = CurvedAnimation(parent: _entrance, curve: Curves.easeOutCubic);
    final slide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(fade);

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 1480),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: padding, vertical: 60),
        child: wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 6,
                    child: SlideTransition(
                      position: slide,
                      child: FadeTransition(
                        opacity: fade,
                        child: _HeroCopy(name: widget.name),
                      ),
                    ),
                  ),
                  const SizedBox(width: 80),
                  Expanded(
                    flex: 5,
                    child: AnimatedBuilder(
                      animation: _glow,
                      builder: (context, _) =>
                          _HeroEmblem(pulse: _glow.value),
                    ),
                  ),
                ],
              )
            : Column(
                children: [
                  AnimatedBuilder(
                    animation: _glow,
                    builder: (context, _) => _HeroEmblem(pulse: _glow.value),
                  ),
                  const SizedBox(height: 48),
                  SlideTransition(
                    position: slide,
                    child: FadeTransition(
                      opacity: fade,
                      child: _HeroCopy(name: widget.name, alignCenter: true),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _HeroCopy extends StatelessWidget {
  final String? name;
  final bool alignCenter;
  const _HeroCopy({this.name, this.alignCenter = false});

  @override
  Widget build(BuildContext context) {
    final align = alignCenter ? CrossAxisAlignment.center : CrossAxisAlignment.start;
    final textAlign = alignCenter ? TextAlign.center : TextAlign.left;

    return Column(
      crossAxisAlignment: align,
      children: [
        // Eyebrow
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: DSColors.accentGold.withOpacity(0.45)),
            borderRadius: BorderRadius.circular(40),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: DSColors.accentGoldLight,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'PRIVATE COLLECTOR CLUB · DAVETLİ',
                style: TextStyle(
                  color: DSColors.accentGoldLight,
                  fontSize: 11,
                  letterSpacing: 3,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        // Massive hero
        ShaderMask(
          shaderCallback: (rect) => const LinearGradient(
            colors: [
              Color(0xFFF5F1E8),
              Color(0xFFE8C879),
              Color(0xFFF5F1E8),
            ],
            stops: [0.0, 0.5, 1.0],
          ).createShader(rect),
          child: Text(
            'TÜRKİYE’NİN\nEN SEÇKİN\nPARFÜM TOPLULUĞU',
            textAlign: textAlign,
            style: const TextStyle(
              color: DSColors.textPrimary,
              fontFamily: 'Georgia',
              fontSize: 58,
              fontWeight: FontWeight.w700,
              height: 1.05,
              letterSpacing: -0.5,
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Subtext
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Text(
            'Kokuların dünyasını keşfetmek, paylaşmak ve koleksiyonunu büyütmek '
            'için doğru yerdesin. Niche & rare şişeler küratör süzgecinden geçer.',
            textAlign: textAlign,
            style: const TextStyle(
              color: DSColors.textSecondary,
              fontSize: 16,
              height: 1.65,
              letterSpacing: 0.2,
            ),
          ),
        ),
        const SizedBox(height: 36),

        // CTA cluster
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _CinematicButton(
              label: 'HEMEN KEŞFET',
              gold: true,
              onTap: () => context.go('/splits'),
            ),
            const SizedBox(width: 16),
            _CinematicButton(
              label: 'KAYIT İSTEĞİ GÖNDER',
              gold: false,
              onTap: () => context.push('/request-access'),
            ),
          ],
        ),
        const SizedBox(height: 28),
        if (name != null)
          Text(
            'Hoş geldin, ${name!.toUpperCase()}.',
            style: const TextStyle(
              color: DSColors.textTertiary,
              fontSize: 12,
              letterSpacing: 2,
            ),
          ),
      ],
    );
  }
}

class _HeroEmblem extends StatelessWidget {
  final double pulse;
  const _HeroEmblem({required this.pulse});

  @override
  Widget build(BuildContext context) {
    final glow = 0.55 + 0.25 * pulse;
    return Center(
      child: SizedBox(
        height: 540,
        width: 540,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // outer ring glow
            Container(
              width: 480,
              height: 480,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    DSColors.accentGold.withOpacity(0.25 * glow),
                    DSColors.accentGold.withOpacity(0),
                  ],
                ),
              ),
            ),
            // outer crest ring
            Transform.rotate(
              angle: pulse * math.pi * 2 * 0.05,
              child: Container(
                width: 360,
                height: 360,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: DSColors.accentGold.withOpacity(0.35),
                    width: 1,
                  ),
                ),
              ),
            ),
            // mid ring
            Container(
              width: 290,
              height: 290,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  colors: [
                    Color(0xFF1A130F),
                    Color(0xFF06070A),
                  ],
                ),
                border: Border.all(
                  color: DSColors.accentGold.withOpacity(0.55),
                  width: 1.4,
                ),
                boxShadow: [
                  BoxShadow(
                    color: DSColors.accentGold.withOpacity(0.45 * glow),
                    blurRadius: 60,
                    spreadRadius: 4,
                  ),
                ],
              ),
            ),
            // inner emblem
            ShaderMask(
              shaderCallback: (b) => DSColors.goldGradient.createShader(b),
              child: const Icon(
                Icons.water_drop_outlined,
                size: 130,
                color: DSColors.accentGold,
              ),
            ),
            // vertical bottle silhouette behind emblem
            Positioned(
              bottom: 0,
              child: Opacity(
                opacity: 0.18,
                child: Container(
                  width: 90,
                  height: 220,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        DSColors.accentGold.withOpacity(0.35),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // subtle wordmark at bottom
            Positioned(
              bottom: 30,
              child: Text(
                'DERİN  SPLIT',
                style: TextStyle(
                  color: DSColors.accentGoldLight.withOpacity(0.5),
                  fontFamily: 'Georgia',
                  fontSize: 13,
                  letterSpacing: 5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
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
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
          transform: Matrix4.identity()..translate(0.0, _hover ? -2.0 : 0.0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            gradient: widget.gold ? DSColors.goldGradient : null,
            color: widget.gold ? null : Colors.transparent,
            border: widget.gold
                ? null
                : Border.all(
                    color: DSColors.accentGold.withOpacity(_hover ? 1 : 0.55),
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
              color: widget.gold ? DSColors.bgPrimary : DSColors.accentGoldLight,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 3,
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

class _ChapterDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 720,
        child: Row(
          children: [
            Expanded(
              child: Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      DSColors.accentGold.withOpacity(0),
                      DSColors.accentGold.withOpacity(0.5),
                    ],
                  ),
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                '◆',
                style: TextStyle(
                  color: DSColors.accentGold,
                  fontSize: 12,
                ),
              ),
            ),
            Expanded(
              child: Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      DSColors.accentGold.withOpacity(0.5),
                      DSColors.accentGold.withOpacity(0),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 LUXURY CATEGORY CARDS
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryRow extends StatelessWidget {
  final double screenWidth;
  const _CategoryRow({required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    final wide = screenWidth >= 1100;
    final padding = screenWidth >= 1400 ? 96.0 : 56.0;
    final cards = [
      _CategoryCard(
        eyebrow: '01 — KATEGORİ',
        kicker: 'AKTİF',
        kickerColor: DSColors.success,
        title: 'SPLIT',
        subtitle:
            'Parfümleri paylaşın, ml veya şişe taleplerini zaman sırasıyla yönetin.',
        cta: 'İNCELE',
        emblem: Icons.water_drop_outlined,
        bgGradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F1014), Color(0xFF06070A)],
        ),
        accent: DSColors.accentGold,
        onTap: () => context.go('/splits'),
      ),
      _CategoryCard(
        eyebrow: '02 — KATEGORİ',
        kicker: 'AKTİF',
        kickerColor: DSColors.success,
        title: 'ŞİŞE SATIŞLARI',
        subtitle:
            'Parfüm şişelerini inceleyin ve satın alma talebi gönderin. Takas & teklif.',
        cta: 'İNCELE',
        emblem: Icons.spa_outlined,
        bgGradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF111017), Color(0xFF06070A)],
        ),
        accent: DSColors.accentGoldLight,
        onTap: () => context.go('/market'),
      ),
      _CategoryCard(
        eyebrow: '03 — KATEGORİ',
        kicker: 'YAKINDA',
        kickerColor: DSColors.warning,
        title: 'DEKANT',
        subtitle:
            'Seçkin kokuların küçük keşifleri. Küratör kürasyonlu samples koleksiyonu.',
        cta: 'BİLDİRİMLER İÇİN KAYIT',
        emblem: Icons.science_outlined,
        bgGradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0E0D14), Color(0xFF06070A)],
        ),
        accent: DSColors.warning,
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
                  ]
                ],
              ),
      ),
    );
  }
}

class _CategoryCard extends StatefulWidget {
  final String eyebrow;
  final String kicker;
  final Color kickerColor;
  final String title;
  final String subtitle;
  final String cta;
  final IconData emblem;
  final Gradient bgGradient;
  final Color accent;
  final bool comingSoon;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.eyebrow,
    required this.kicker,
    required this.kickerColor,
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.emblem,
    required this.bgGradient,
    required this.accent,
    required this.onTap,
    this.comingSoon = false,
  });

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard>
    with SingleTickerProviderStateMixin {
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
                  color: widget.accent.withOpacity(0.22),
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
                // base gradient
                DecoratedBox(decoration: BoxDecoration(gradient: widget.bgGradient)),

                // editorial diagonal lines
                CustomPaint(painter: _DiagonalLinesPainter()),

                // big translucent emblem behind content
                Positioned(
                  right: -50,
                  bottom: -40,
                  child: Opacity(
                    opacity: _hover ? 0.18 : 0.12,
                    child: Icon(
                      widget.emblem,
                      size: 360,
                      color: widget.accent,
                    ),
                  ),
                ),

                // animated glow border on hover
                AnimatedContainer(
                  duration: const Duration(milliseconds: 320),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: _hover
                          ? widget.accent.withOpacity(0.55)
                          : DSColors.glassBorder,
                      width: _hover ? 1.4 : 1,
                    ),
                  ),
                ),

                // ── content ───────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(28, 26, 28, 26),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // eyebrow + kicker
                      Row(
                        children: [
                          Text(
                            widget.eyebrow,
                            style: const TextStyle(
                              color: DSColors.textTertiary,
                              fontSize: 10,
                              letterSpacing: 2.8,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: widget.kickerColor.withOpacity(0.16),
                              border: Border.all(
                                color: widget.kickerColor.withOpacity(0.5),
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              widget.kicker,
                              style: TextStyle(
                                color: widget.kickerColor,
                                fontSize: 9.5,
                                letterSpacing: 1.6,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      // title — massive
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 260),
                        style: TextStyle(
                          color: _hover ? widget.accent : DSColors.textPrimary,
                          fontFamily: 'Georgia',
                          fontWeight: FontWeight.w800,
                          fontSize: 36,
                          height: 1,
                          letterSpacing: -0.5,
                        ),
                        child: Text(widget.title),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        widget.subtitle,
                        style: const TextStyle(
                          color: DSColors.textSecondary,
                          fontSize: 13.5,
                          height: 1.55,
                        ),
                      ),
                      const SizedBox(height: 22),
                      // CTA
                      Row(
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 240),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(40),
                              border: Border.all(
                                color: widget.accent.withOpacity(_hover ? 1 : 0.5),
                              ),
                              color: _hover
                                  ? widget.accent.withOpacity(0.12)
                                  : Colors.transparent,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  widget.cta,
                                  style: TextStyle(
                                    color: widget.accent,
                                    fontSize: 10.5,
                                    letterSpacing: 2.2,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.arrow_forward,
                                  color: widget.accent,
                                  size: 14,
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          if (widget.comingSoon)
                            const Icon(
                              Icons.lock_outline,
                              color: DSColors.textTertiary,
                              size: 16,
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

class _DiagonalLinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = DSColors.accentGold.withOpacity(0.05)
      ..strokeWidth = 0.6
      ..style = PaintingStyle.stroke;
    const step = 28.0;
    for (double x = -size.height; x < size.width; x += step) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x + size.height, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DiagonalLinesPainter old) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANIFESTO STRIP + FOOTER
// ─────────────────────────────────────────────────────────────────────────────

class _ManifestoStrip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final w = context.screenWidth;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1280),
        child: Padding(
          padding:
              EdgeInsets.symmetric(horizontal: w >= 1400 ? 96 : 56),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 56, vertical: 56),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white.withOpacity(0.04),
                      Colors.white.withOpacity(0.01),
                    ],
                  ),
                  border: Border.all(color: DSColors.glassBorder),
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  runSpacing: 32,
                  children: const [
                    _StatBlock(
                      number: '142+',
                      label: 'AKTİF SPLİT',
                    ),
                    _StatBlock(
                      number: '38',
                      label: 'ÜLKE BAYİSİ DOĞRULANDI',
                    ),
                    _StatBlock(
                      number: '%99.4',
                      label: 'AI ORİJİNALLİK ÖN GEÇİŞ',
                    ),
                    _StatBlock(
                      number: '< 2s',
                      label: 'ORTALAMA EŞLEŞME SÜRESİ',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  final String number;
  final String label;
  const _StatBlock({required this.number, required this.label});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShaderMask(
            shaderCallback: (b) => DSColors.goldGradient.createShader(b),
            child: Text(
              number,
              style: const TextStyle(
                color: DSColors.accentGold,
                fontFamily: 'Georgia',
                fontSize: 44,
                fontWeight: FontWeight.w700,
                height: 1,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: DSColors.textTertiary,
              fontSize: 10.5,
              letterSpacing: 1.8,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final w = context.screenWidth;
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: w >= 1400 ? 96 : 56),
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
          const SizedBox(height: 24),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 24,
            runSpacing: 16,
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
                  Text(
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
              Text(
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
