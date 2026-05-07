import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/fake_auth_repository.dart';
import '../demo/demo_state.dart';
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

    final demo = ref.watch(demoSettingsProvider);
    final user = ref.watch(authRepositoryProvider).user;
    final canShowFab = (idx == 1 && demo.isTrustedSeller) ||
        (idx == 2 && (user?.canListItems ?? demo.canListItems));

    return Scaffold(
      body: child,
      floatingActionButton: canShowFab
          ? FloatingActionButton.extended(
              backgroundColor: DSColors.accentGold,
              foregroundColor: DSColors.bgPrimary,
              onPressed: () {
                if (idx == 1) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Split açma akışı (MVP P1)')),
                  );
                } else {
                  context.push('/listings/new');
                }
              },
              icon: const Icon(Icons.add),
              label: Text(
                idx == 1 ? 'Split Aç' : 'İlan Ver',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            )
          : null,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: idx,
        onTap: (i) => context.go(_tabs[i].path),
        items: [
          for (final t in _tabs)
            BottomNavigationBarItem(
              icon: Icon(t.icon),
              activeIcon: Icon(t.activeIcon),
              label: t.label,
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
