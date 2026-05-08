import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/models/user_mode.dart';
import '../../../core/state/user_mode_provider.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/ds_card.dart';
import '../../auth/data/fake_auth_repository.dart';
import 'account_dashboard_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (context.isDesktop) return const AccountDashboardScreen();
    final user = ref.watch(authRepositoryProvider).user;
    final mode = ref.watch(userModeProvider);
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      appBar: AppBar(
        title: const Text('PROFİL'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            onPressed: () => showDemoControlPanel(context),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DSCard(
            leftAccent: DSColors.accentGold,
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: DSColors.bgTertiary,
                  child: Text(
                    (user?.name.substring(0, 1) ?? 'D'),
                    style: const TextStyle(
                      color: DSColors.accentGold,
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.name ?? 'Misafir',
                  style: const TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  user?.phone ?? '',
                  style: const TextStyle(color: DSColors.textSecondary),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: DSColors.goldGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.verified,
                          color: DSColors.bgPrimary, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'Trust Score ${user?.trustScore ?? 0}',
                        style: const TextStyle(
                          color: DSColors.bgPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _MenuTile(
            icon: mode?.icon ?? Icons.tune,
            label: 'Kullanım Modunu Değiştir',
            badge: mode == null ? null : _modeShortLabel(mode),
            onTap: () => context.push('/mode-select'),
          ),
          _MenuTile(
            icon: Icons.receipt_long_outlined,
            label: 'Siparişlerim',
            onTap: () => context.push('/orders'),
          ),
          _MenuTile(
            icon: Icons.dashboard_customize_outlined,
            label: 'İlanlarım',
            onTap: () => context.push('/dashboard/sales'),
          ),
          _MenuTile(
            icon: Icons.science_outlined,
            label: 'Split Yönetimim',
            onTap: () => context.push('/dashboard/splits'),
          ),
          _MenuTile(
            icon: Icons.location_on_outlined,
            label: 'Adreslerim',
            onTap: () {},
          ),
          _MenuTile(
            icon: Icons.shield_outlined,
            label: 'Trust Center',
            badge: 'V1.1',
            onTap: () {},
          ),
          _MenuTile(
            icon: Icons.help_outline,
            label: 'Destek',
            onTap: () {},
          ),
          const SizedBox(height: 16),
          _MenuTile(
            icon: Icons.logout,
            label: 'Çıkış Yap',
            destructive: true,
            onTap: () {
              ref.read(authRepositoryProvider.notifier).logout();
              ref.read(userModeProvider.notifier).clear();
              context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}

String _modeShortLabel(UserMode m) {
  switch (m) {
    case UserMode.buyer:
      return 'ALICI';
    case UserMode.seller:
      return 'SATICI';
    case UserMode.trustedSeller:
      return 'TRUSTED';
    case UserMode.explore:
      return 'KEŞFET';
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? badge;
  final bool destructive;

  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DSCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(
              icon,
              color: destructive ? DSColors.error : DSColors.accentGold,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: destructive ? DSColors.error : DSColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (badge != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: DSColors.warning.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  badge!,
                  style: const TextStyle(
                    color: DSColors.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            if (!destructive)
              const Icon(Icons.chevron_right, color: DSColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
