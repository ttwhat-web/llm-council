import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/user_mode.dart';
import '../state/user_mode_provider.dart';
import '../theme/tokens.dart';

class MainShell extends ConsumerWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _tabs = [
    _Tab('/home', Icons.home_outlined, Icons.home, 'Ana Sayfa'),
    _Tab('/splits', Icons.science_outlined, Icons.science, 'Splitler'),
    _Tab('/market', Icons.storefront_outlined, Icons.storefront, 'Pazar'),
    _Tab('/messages', Icons.chat_bubble_outline, Icons.chat_bubble, 'Mesajlar'),
    _Tab('/profile', Icons.person_outline, Icons.person, 'Profil'),
  ];

  int _indexForLocation(String loc) {
    for (var i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loc = GoRouterState.of(context).matchedLocation;
    final idx = _indexForLocation(loc);
    final mode = ref.watch(userModeProvider) ?? UserMode.buyer;

    Widget? fab;
    if (idx == 1 && mode.canOpenSplit) {
      fab = _GoldFab(
        label: 'Split Aç',
        icon: Icons.add,
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Split açma akışı (V1.1)')),
          );
        },
      );
    } else if (idx == 2 && mode.canPostListing) {
      fab = _GoldFab(
        label: 'İlan Ver',
        icon: Icons.add,
        onPressed: () => context.push('/listings/new'),
      );
    } else if (idx == 1 && mode == UserMode.explore) {
      fab = _LockedFab(
        label: 'Giriş Yap',
        onPressed: () => context.go('/login'),
      );
    } else if (idx == 2 && mode == UserMode.explore) {
      fab = _LockedFab(
        label: 'Giriş Yap',
        onPressed: () => context.go('/login'),
      );
    } else if (idx == 1 &&
        (mode == UserMode.buyer || mode == UserMode.seller)) {
      fab = _LockedFab(
        label: 'Trusted Seller Başvur',
        onPressed: () => context.go('/mode-select'),
      );
    }

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: child,
      floatingActionButton: fab,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: idx,
        onTap: (i) => context.go(_tabs[i].path),
        items: [
          for (var i = 0; i < _tabs.length; i++)
            BottomNavigationBarItem(
              icon: Icon(_tabs[i].icon),
              activeIcon: Icon(_tabs[i].activeIcon),
              label: _tabs[i].label,
            ),
        ],
      ),
    );
  }
}

class _Tab {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _Tab(this.path, this.icon, this.activeIcon, this.label);
}

class _GoldFab extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  const _GoldFab({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: DSColors.goldGradient,
        boxShadow: [
          BoxShadow(
            color: DSColors.accentGold.withOpacity(0.4),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: FloatingActionButton.extended(
        backgroundColor: Colors.transparent,
        foregroundColor: DSColors.bgPrimary,
        elevation: 0,
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}

class _LockedFab extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const _LockedFab({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      backgroundColor: DSColors.bgSecondary,
      foregroundColor: DSColors.warning,
      onPressed: onPressed,
      elevation: 0,
      icon: const Icon(Icons.lock_outline, size: 18),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: BorderSide(color: DSColors.warning.withOpacity(0.5)),
      ),
    );
  }
}
