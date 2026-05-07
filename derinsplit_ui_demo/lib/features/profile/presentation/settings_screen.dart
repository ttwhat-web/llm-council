import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_card.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _push = true;
  bool _email = false;
  bool _appLock = false;

  @override
  Widget build(BuildContext context) {
    final demo = ref.watch(demoSettingsProvider);
    final ctrl = ref.read(demoSettingsProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('AYARLAR')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionTitle(label: 'Bildirimler'),
          DSCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  activeColor: DSColors.accentGold,
                  title: const Text('Push bildirimleri'),
                  subtitle: const Text('Sipariş ve mesaj güncellemeleri'),
                  value: _push,
                  onChanged: (v) => setState(() => _push = v),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  activeColor: DSColors.accentGold,
                  title: const Text('E-posta bildirimleri'),
                  value: _email,
                  onChanged: (v) => setState(() => _email = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionTitle(label: 'Güvenlik'),
          DSCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  activeColor: DSColors.accentGold,
                  title: const Text('Uygulama kilidi'),
                  subtitle: const Text('Biometric / PIN'),
                  value: _appLock,
                  onChanged: (v) => setState(() => _appLock = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionTitle(label: 'Demo Ayarları'),
          DSCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  activeColor: DSColors.accentGold,
                  title: const Text('Trusted Seller'),
                  value: demo.isTrustedSeller,
                  onChanged: (_) => ctrl.toggleTrustedSeller(),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  activeColor: DSColors.accentGold,
                  title: const Text('İlan Verebilir'),
                  value: demo.canListItems,
                  onChanged: (_) => ctrl.toggleCanList(),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  activeColor: DSColors.error,
                  title: const Text('Force Error'),
                  value: demo.forceError,
                  onChanged: (_) => ctrl.toggleError(),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  activeColor: DSColors.warning,
                  title: const Text('Force Empty'),
                  value: demo.forceEmpty,
                  onChanged: (_) => ctrl.toggleEmpty(),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  activeColor: DSColors.info,
                  title: const Text('Yüksek Trafik Simülasyonu'),
                  subtitle: const Text('+900ms ek gecikme'),
                  value: demo.highTraffic,
                  onChanged: (_) => ctrl.toggleHighTraffic(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'DerinSplit UI Demo • v1.0',
              style: TextStyle(color: DSColors.textTertiary, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String label;
  const _SectionTitle({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: DSColors.accentGold,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.4,
        ),
      ),
    );
  }
}
