import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/fake_auth_repository.dart';
import '../demo/demo_control_panel.dart';
import '../state/user_mode_provider.dart';
import '../theme/tokens.dart';

class _NavItem {
  final String label;
  final String path;
  final bool comingSoon;
  const _NavItem(this.label, this.path, {this.comingSoon = false});
}

/// Top floating navbar used on every desktop screen.
///
/// Layout (left → right):
///   1. IG + WhatsApp icons
///   2. DERIN SPLIT wordmark
///   3. Pill nav (ANA SAYFA · SPLIT · HESABIM · ŞİŞE · DEKANT)
///        active item = solid black pill, white text
///        inactive  = transparent, ink secondary text
///   4. Settings icon
///   5. OTURUMU KAPAT button
///
/// Two visual variants for the surrounding chrome — `dark` (default) sits
/// on the cinematic home, `light` is used over the parchment dashboard /
/// catalog pages so contrast stays readable.
class WebPillNavbar extends ConsumerWidget {
  final NavbarVariant variant;
  const WebPillNavbar({super.key, this.variant = NavbarVariant.dark});

  static const _height = 64.0;

  static const _items = [
    _NavItem('ANA SAYFA', '/home'),
    _NavItem('SPLIT', '/splits'),
    _NavItem('HESABIM', '/profile'),
    _NavItem('ŞİŞE', '/market'),
    _NavItem('DEKANT', '/dekant', comingSoon: true),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loc = GoRouterState.of(context).matchedLocation;
    final isLight = variant == NavbarVariant.light;
    final navFill = isLight
        ? Colors.white.withOpacity(0.62)
        : Colors.white.withOpacity(0.04);
    final navBorder = isLight
        ? DSColors.lightBorder
        : DSColors.glassBorder;
    final iconColor = isLight ? DSColors.lightInk : DSColors.textPrimary;

    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 22, 28, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_height),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            height: _height,
            decoration: BoxDecoration(
              color: navFill,
              borderRadius: BorderRadius.circular(_height),
              border: Border.all(color: navBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isLight ? 0.18 : 0.4),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  // 1) Social icons
                  _SocialIcon(
                    icon: Icons.camera_alt_outlined,
                    semanticLabel: 'Instagram',
                    color: iconColor,
                  ),
                  const SizedBox(width: 6),
                  _SocialIcon(
                    icon: Icons.chat_outlined,
                    semanticLabel: 'WhatsApp',
                    color: iconColor,
                  ),
                  const SizedBox(width: 18),

                  // 2) Logo / wordmark
                  GestureDetector(
                    onLongPress: () => showDemoControlPanel(context),
                    onTap: () => context.go('/home'),
                    child: _Wordmark(light: isLight),
                  ),

                  const SizedBox(width: 28),

                  // 3) Pill nav (centered using Spacers)
                  Expanded(
                    child: Center(
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          for (final item in _items)
                            _NavLink(
                              label: item.label,
                              active: !item.comingSoon &&
                                  loc.startsWith(item.path),
                              comingSoon: item.comingSoon,
                              isLight: isLight,
                              onTap: () {
                                if (item.comingSoon) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(const SnackBar(
                                    content: Text(
                                      'DEKANT bölümü yakında açılıyor.',
                                      style: TextStyle(
                                        color: DSColors.bgPrimary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    backgroundColor:
                                        DSColors.accentGoldLight,
                                  ));
                                  return;
                                }
                                context.go(item.path);
                              },
                            ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  // 4) Settings
                  IconButton(
                    icon: Icon(Icons.settings_outlined,
                        color: iconColor, size: 20),
                    onPressed: () => context.push('/settings'),
                    tooltip: 'Ayarlar',
                  ),
                  const SizedBox(width: 4),

                  // 5) OTURUMU KAPAT
                  _LogoutButton(
                    isLight: isLight,
                    onTap: () {
                      ref.read(authRepositoryProvider.notifier).logout();
                      ref.read(userModeProvider.notifier).clear();
                      context.go('/login');
                    },
                  ),
                  const SizedBox(width: 6),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum NavbarVariant { dark, light }

class _Wordmark extends StatelessWidget {
  final bool light;
  const _Wordmark({required this.light});

  @override
  Widget build(BuildContext context) {
    final accent = DSColors.accentGold;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: accent, width: 1),
            boxShadow: [
              BoxShadow(
                color: accent.withOpacity(0.4),
                blurRadius: 12,
              ),
            ],
          ),
          child: Icon(Icons.water_drop_outlined,
              color: accent, size: 14),
        ),
        const SizedBox(width: 10),
        ShaderMask(
          shaderCallback: (b) => DSColors.goldGradient.createShader(b),
          child: Text(
            'DERİN  SPLIT',
            style: TextStyle(
              color: accent,
              fontSize: 14,
              letterSpacing: 4,
              fontWeight: FontWeight.w800,
              fontFamily: 'Georgia',
            ),
          ),
        ),
      ],
    );
  }
}

class _SocialIcon extends StatelessWidget {
  final IconData icon;
  final String semanticLabel;
  final Color color;
  const _SocialIcon({
    required this.icon,
    required this.semanticLabel,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: Semantics(
        label: semanticLabel,
        button: true,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color.withOpacity(0.18)),
          ),
          child: Icon(icon, color: color.withOpacity(0.85), size: 16),
        ),
      ),
    );
  }
}

class _NavLink extends StatefulWidget {
  final String label;
  final bool active;
  final bool comingSoon;
  final bool isLight;
  final VoidCallback onTap;
  const _NavLink({
    required this.label,
    required this.active,
    required this.comingSoon,
    required this.isLight,
    required this.onTap,
  });

  @override
  State<_NavLink> createState() => _NavLinkState();
}

class _NavLinkState extends State<_NavLink> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    // Spec: active = solid BLACK pill with WHITE text on both variants.
    final activeBg = const Color(0xFF14140F);
    final inkBase = widget.isLight ? DSColors.lightInk : DSColors.textPrimary;
    final inkSecondary =
        widget.isLight ? DSColors.lightInkSecondary : DSColors.textSecondary;

    final color = widget.active
        ? Colors.white
        : _hover
            ? inkBase
            : inkSecondary;

    return MouseRegion(
      cursor: widget.comingSoon
          ? SystemMouseCursors.help
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            color: widget.active
                ? activeBg
                : _hover
                    ? (widget.isLight
                        ? Colors.white.withOpacity(0.55)
                        : Colors.white.withOpacity(0.04))
                    : Colors.transparent,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.label,
                style: TextStyle(
                  color: color,
                  fontSize: 11.5,
                  letterSpacing: 2.4,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (widget.comingSoon) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: DSColors.accentGoldLight.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'YAKINDA',
                    style: TextStyle(
                      color: DSColors.accentGoldLight,
                      fontSize: 8,
                      letterSpacing: 1,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LogoutButton extends StatefulWidget {
  final bool isLight;
  final VoidCallback onTap;
  const _LogoutButton({required this.isLight, required this.onTap});

  @override
  State<_LogoutButton> createState() => _LogoutButtonState();
}

class _LogoutButtonState extends State<_LogoutButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final ink = widget.isLight ? DSColors.lightInk : DSColors.textPrimary;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: ink.withOpacity(_hover ? 0.7 : 0.22)),
            color: _hover
                ? ink.withOpacity(widget.isLight ? 0.05 : 0.06)
                : Colors.transparent,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.logout, size: 13, color: ink),
              const SizedBox(width: 8),
              Text(
                'OTURUMU KAPAT',
                style: TextStyle(
                  color: ink,
                  fontSize: 10.5,
                  letterSpacing: 1.8,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
