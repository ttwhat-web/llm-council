import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_mode.dart';
import '../state/user_mode_provider.dart';
import '../theme/tokens.dart';
import 'demo_state.dart';

void showDemoControlPanel(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: DSColors.bgSecondary,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => const _DemoPanel(),
  );
}

class _DemoPanel extends ConsumerWidget {
  const _DemoPanel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final demo = ref.watch(demoSettingsProvider);
    final ctrl = ref.read(demoSettingsProvider.notifier);
    final mode = ref.watch(userModeProvider);
    final modeCtrl = ref.read(userModeProvider.notifier);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: DSColors.surface,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Demo Kontrol Paneli',
              style: TextStyle(
                color: DSColors.accentGold,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Logo’ya basılı tutarak bu paneli açabilirsin.',
              style: TextStyle(color: DSColors.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  const Icon(
                    Icons.swap_horiz,
                    color: DSColors.accentGold,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Kullanım Modu',
                    style: TextStyle(
                      color: DSColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  DropdownButton<UserMode?>(
                    value: mode,
                    dropdownColor: DSColors.bgTertiary,
                    underline: const SizedBox.shrink(),
                    iconEnabledColor: DSColors.accentGold,
                    items: [
                      const DropdownMenuItem<UserMode?>(
                        value: null,
                        child: Text(
                          'Seçilmedi',
                          style: TextStyle(color: DSColors.textTertiary),
                        ),
                      ),
                      for (final m in UserMode.values)
                        DropdownMenuItem<UserMode?>(
                          value: m,
                          child: Text(
                            m.title,
                            style: const TextStyle(
                              color: DSColors.textPrimary,
                            ),
                          ),
                        ),
                    ],
                    onChanged: (m) {
                      if (m == null) {
                        modeCtrl.clear();
                      } else {
                        modeCtrl.select(m);
                      }
                    },
                  ),
                ],
              ),
            ),
            const Divider(color: DSColors.surface, height: 24),
            SwitchListTile(
              activeColor: DSColors.accentGold,
              title: const Text('Trusted Seller (Split Aç)'),
              subtitle: const Text('Split FAB için gerekli'),
              value: demo.isTrustedSeller,
              onChanged: (_) => ctrl.toggleTrustedSeller(),
            ),
            SwitchListTile(
              activeColor: DSColors.accentGold,
              title: const Text('İlan Verebilir'),
              subtitle: const Text('İlan Ver FAB için gerekli'),
              value: demo.canListItems,
              onChanged: (_) => ctrl.toggleCanList(),
            ),
            SwitchListTile(
              activeColor: DSColors.error,
              title: const Text('Force Error'),
              subtitle: const Text('Tüm repo çağrılarında hata fırlat'),
              value: demo.forceError,
              onChanged: (_) => ctrl.toggleError(),
            ),
            SwitchListTile(
              activeColor: DSColors.warning,
              title: const Text('Force Empty'),
              subtitle: const Text('Listeleri boş döndür'),
              value: demo.forceEmpty,
              onChanged: (_) => ctrl.toggleEmpty(),
            ),
            SwitchListTile(
              activeColor: DSColors.info,
              title: const Text('Yüksek Trafik Simülasyonu'),
              subtitle: const Text('+900ms ek gecikme + spike efekti'),
              value: demo.highTraffic,
              onChanged: (_) => ctrl.toggleHighTraffic(),
            ),
            const SizedBox(height: 8),
            Text(
              'Network gecikmesi: ${demo.delayMs} ms',
              style: const TextStyle(color: DSColors.textSecondary),
            ),
            Slider(
              activeColor: DSColors.accentGold,
              inactiveColor: DSColors.surface,
              value: demo.delayMs.toDouble(),
              min: 0,
              max: 2000,
              divisions: 20,
              label: '${demo.delayMs} ms',
              onChanged: (v) => ctrl.setDelay(v.round()),
            ),
          ],
        ),
      ),
    );
  }
}
