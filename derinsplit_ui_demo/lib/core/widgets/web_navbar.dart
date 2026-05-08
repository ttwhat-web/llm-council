import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/fake_auth_repository.dart';
import '../demo/demo_control_panel.dart';
import '../theme/tokens.dart';

class _NavItem {
  final String label;
  final String? path;
  final bool comingSoon;
  const _NavItem(this.label, this.path, {this.comingSoon = false});
}

class WebPillNavbar extends ConsumerWidget {
  const WebPillNavbar({super.key});

  static const _height = 64.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loc = GoRouterState.of(context).matchedLocation;
    final user = ref.watch(authRepositoryProvider).user;

    final items = <_NavItem>[
      const _NavItem('ANA SAYFA', '/home'),
      const _NavItem('SPLIT', '/splits'),
      const _NavItem('İLANLAR', '/market'),
      const _NavItem('ŞİŞE', '/splits?bottle=1'),
      const _NavItem('DEKANT', null, comingSoon: true),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_height),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            height: _height,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(_height),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withOpacity(0.05),
                  Colors.white.withOpacity(0.015),
                ],
              ),
              border: Border.all(color: DSColors.glassBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.45),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  // Logo
                  GestureDetector(
                    onLongPress: () => showDemoControlPanel(context),
                    onTap: () => context.go('/home'),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: _Wordmark(),
                    ),
                  ),
                  const Spacer(),
                  // Center nav items
                  for (final item in items)
                    _NavLink(
                      label: item.label,
                      active: item.path != null && loc.startsWith(item.path!.split('?').first) &&
                          (item.path!.contains('bottle=1')
                              ? false
                              : true),
                      onTap: item.comingSoon
                          ? () => _comingSoonSnack(context)
                          : () => context.go(item.path!),
                      comingSoon: item.comingSoon,
                    ),
                  const Spacer(),
                  // Right cluster
                  IconButton(
                    icon: const Icon(Icons.search,
                        color: DSColors.textPrimary, size: 20),
                    onPressed: () => context.push('/search'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined,
                        color: DSColors.textPrimary, size: 20),
                    onPressed: () => context.push('/notifications'),
                  ),
                  const SizedBox(width: 4),
                  _ProfileChip(name: user?.name),
                  const SizedBox(width: 6),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static void _comingSoonSnack(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'DEKANT bölümü yakında açılıyor.',
          style: TextStyle(color: DSColors.bgPrimary, fontWeight: FontWeight.w600),
        ),
        backgroundColor: DSColors.accentGoldLight,
        duration: Duration(seconds: 2),
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: DSColors.accentGold, width: 1),
            boxShadow: [
              BoxShadow(
                color: DSColors.accentGold.withOpacity(0.4),
                blurRadius: 12,
              ),
            ],
          ),
          child: const Icon(Icons.water_drop_outlined,
              color: DSColors.accentGold, size: 14),
        ),
        const SizedBox(width: 12),
        ShaderMask(
          shaderCallback: (b) => DSColors.goldGradient.createShader(b),
          child: const Text(
            'DERİN  SPLIT',
            style: TextStyle(
              color: DSColors.accentGold,
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

class _NavLink extends StatefulWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final bool comingSoon;
  const _NavLink({
    required this.label,
    required this.active,
    required this.onTap,
    required this.comingSoon,
  });

  @override
  State<_NavLink> createState() => _NavLinkState();
}

class _NavLinkState extends State<_NavLink> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final color = widget.active
        ? DSColors.accentGoldLight
        : _hover
            ? DSColors.textPrimary
            : DSColors.textSecondary;
    return MouseRegion(
      cursor: widget.comingSoon
          ? SystemMouseCursors.help
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            color: widget.active
                ? DSColors.accentGold.withOpacity(0.10)
                : Colors.transparent,
            boxShadow: widget.active
                ? [
                    BoxShadow(
                      color: DSColors.accentGold.withOpacity(0.18),
                      blurRadius: 14,
                    ),
                  ]
                : null,
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
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: DSColors.accentGoldLight.withOpacity(0.16),
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

class _ProfileChip extends StatelessWidget {
  final String? name;
  const _ProfileChip({required this.name});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/profile'),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Container(
          padding: const EdgeInsets.fromLTRB(8, 6, 14, 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: DSColors.glassBorder),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: DSColors.bgTertiary,
                ),
                child: Center(
                  child: Text(
                    (name?.isNotEmpty ?? false) ? name![0] : '·',
                    style: const TextStyle(
                      color: DSColors.accentGold,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                name ?? 'PROFİL',
                style: const TextStyle(
                  color: DSColors.textSecondary,
                  fontSize: 11.5,
                  letterSpacing: 1.6,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
