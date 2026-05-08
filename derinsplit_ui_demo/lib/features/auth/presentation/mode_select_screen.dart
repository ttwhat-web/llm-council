import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/user_mode.dart';
import '../../../core/state/user_mode_provider.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_glass.dart';
import '../../../core/widgets/ds_logo.dart';
import '../data/fake_auth_repository.dart';

class ModeSelectScreen extends ConsumerStatefulWidget {
  final bool exploreOnly;
  const ModeSelectScreen({super.key, this.exploreOnly = false});

  @override
  ConsumerState<ModeSelectScreen> createState() => _ModeSelectScreenState();
}

class _ModeSelectScreenState extends ConsumerState<ModeSelectScreen> {
  UserMode? _hover;

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(userModeProvider);
    final isAuthed = ref.watch(authRepositoryProvider).isAuthenticated;

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: AuroraBackdrop(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Column(
                  children: [
                    const DSEmblem(size: 64),
                    const SizedBox(height: 14),
                    const DSWordmark(fontSize: 18),
                    const SizedBox(height: 8),
                    const Text(
                      '— PRIVATE COLLECTOR CLUB —',
                      style: TextStyle(
                        color: DSColors.accentGold,
                        fontSize: 10,
                        letterSpacing: 4,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Kullanım Modunu Seç',
                      style: TextStyle(
                        color: DSColors.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.exploreOnly
                          ? 'Talep değerlendirmesi sırasında keşfet modunda devam edebilirsin.'
                          : 'DerinSplit deneyimi seçtiğin moda göre kişiselleşir. İstediğin zaman değiştirebilirsin.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: DSColors.textSecondary,
                        fontSize: 13,
                        height: 1.55,
                      ),
                    ),
                    const SizedBox(height: 28),
                    for (final m in UserMode.values)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _ModeCard(
                          mode: m,
                          selected: selected == m,
                          hovered: _hover == m,
                          locked: m == UserMode.trustedSeller,
                          forcedExplore:
                              widget.exploreOnly && m != UserMode.explore,
                          onHover: (v) =>
                              setState(() => _hover = v ? m : null),
                          onTap: () => _select(m, isAuthed),
                        ),
                      ),
                    const SizedBox(height: 16),
                    if (selected != null)
                      DSPrimaryButton(
                        label: 'BU MODLA DEVAM ET',
                        icon: Icons.arrow_forward,
                        onPressed: () => context.go('/home'),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      'Modunu Profil ekranından her zaman değiştirebilirsin.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: DSColors.textTertiary.withOpacity(0.8),
                        fontSize: 11,
                        letterSpacing: 0.4,
                      ),
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

  void _select(UserMode mode, bool isAuthed) {
    if (mode == UserMode.trustedSeller) {
      _showTrustedDialog();
      return;
    }
    if (widget.exploreOnly && mode != UserMode.explore) return;
    ref.read(userModeProvider.notifier).select(mode);
  }

  void _showTrustedDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: DSColors.bgSecondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DSColors.accentGold),
        ),
        title: Row(
          children: const [
            Icon(Icons.workspace_premium, color: DSColors.accentGold),
            SizedBox(width: 8),
            Text(
              'TRUSTED SELLER',
              style: TextStyle(
                color: DSColors.accentGold,
                fontSize: 14,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: const Text(
          'Trusted Seller statüsü; kanıtlanmış koleksiyon, faturalı kaynak ve '
          'minimum trust score gerektirir. Topluluk küratörü başvurunu '
          'inceledikten sonra yetkilendirilirsin.',
          style: TextStyle(color: DSColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Vazgeç',
              style: TextStyle(color: DSColors.textTertiary),
            ),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Başvurun küratör ekibine iletildi.'),
                  backgroundColor: DSColors.bgTertiary,
                ),
              );
            },
            icon: const Icon(Icons.send, size: 16),
            label: const Text('BAŞVURU YAP'),
            style: ElevatedButton.styleFrom(
              backgroundColor: DSColors.accentGold,
              foregroundColor: DSColors.bgPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final UserMode mode;
  final bool selected;
  final bool hovered;
  final bool locked;
  final bool forcedExplore;
  final ValueChanged<bool> onHover;
  final VoidCallback onTap;

  const _ModeCard({
    required this.mode,
    required this.selected,
    required this.hovered,
    required this.locked,
    required this.forcedExplore,
    required this.onHover,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final accent = mode.accent;
    final disabled = forcedExplore;
    return MouseRegion(
      onEnter: (_) => onHover(true),
      onExit: (_) => onHover(false),
      child: GestureDetector(
        onTap: disabled ? null : onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? accent
                  : hovered
                      ? accent.withOpacity(0.6)
                      : DSColors.glassBorder,
              width: selected ? 1.6 : 1,
            ),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(selected ? 0.05 : 0.02),
                Colors.white.withOpacity(0.005),
              ],
            ),
            color: selected
                ? accent.withOpacity(0.07)
                : DSColors.bgSecondary.withOpacity(0.7),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: accent.withOpacity(0.35),
                      blurRadius: 24,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Opacity(
            opacity: disabled ? 0.4 : 1.0,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: accent.withOpacity(selected ? 0.18 : 0.08),
                    border: Border.all(color: accent.withOpacity(0.5)),
                  ),
                  child: Icon(mode.icon, color: accent),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              mode.title,
                              style: const TextStyle(
                                color: DSColors.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (locked)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: DSColors.warning.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: DSColors.warning.withOpacity(0.5),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Icon(
                                    Icons.lock_outline,
                                    size: 11,
                                    color: DSColors.warning,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'KİLİTLİ',
                                    style: TextStyle(
                                      color: DSColors.warning,
                                      fontSize: 10,
                                      letterSpacing: 1,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        mode.subtitle,
                        style: const TextStyle(
                          color: DSColors.textSecondary,
                          fontSize: 12.5,
                          height: 1.5,
                        ),
                      ),
                      if (locked) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            gradient: DSColors.goldGradient,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'BAŞVURU YAP →',
                            style: TextStyle(
                              color: DSColors.bgPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (selected) ...[
                  const SizedBox(width: 10),
                  Icon(Icons.check_circle, color: accent),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
