import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/split.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_chip.dart';
import '../../../core/widgets/ds_progress.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_splits_repository.dart';

class SplitDetailScreen extends ConsumerWidget {
  final String splitId;
  const SplitDetailScreen({super.key, required this.splitId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(splitDetailProvider(splitId));
    return Scaffold(
      body: async.when(
        loading: () => const Scaffold(body: DSLoading()),
        error: (e, _) => DSErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(splitDetailProvider(splitId)),
        ),
        data: (s) => _Content(split: s),
      ),
    );
  }
}

class _Content extends StatefulWidget {
  final Split split;
  const _Content({required this.split});

  @override
  State<_Content> createState() => _ContentState();
}

class _ContentState extends State<_Content> {
  int _selectedTab = 0; // 0 dekant, 1 şişeli kalan

  @override
  Widget build(BuildContext context) {
    final s = widget.split;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: DSColors.bgPrimary,
            iconTheme: const IconThemeData(color: DSColors.textPrimary),
            actions: [
              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.bookmark_border),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.share_outlined),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      gradient: DSColors.heroGradient,
                    ),
                  ),
                  Positioned.fill(
                    child: Center(
                      child: ShaderMask(
                        shaderCallback: (b) =>
                            DSColors.goldGradient.createShader(b),
                        child: const Icon(Icons.water_drop_outlined,
                            size: 140, color: DSColors.accentGold),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    bottom: 16,
                    right: 16,
                    child: Row(
                      children: [
                        DSBadge.split(),
                        const SizedBox(width: 8),
                        if (s.hasBottleLeft) DSBadge.bottle(),
                        const Spacer(),
                        RiskBadge(level: s.aiRiskScore),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s.brand.toUpperCase(),
                    style: const TextStyle(
                      color: DSColors.textTertiary,
                      letterSpacing: 1.4,
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    s.name,
                    style: const TextStyle(
                      color: DSColors.textPrimary,
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${s.concentration} • ${s.bottleSizeMl}ml • ${s.sellerName} (${s.sellerTrustScore}%)',
                    style: const TextStyle(
                      color: DSColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: s.notes
                        .map((n) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: DSColors.bgTertiary,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: DSColors.surface),
                              ),
                              child: Text(
                                n,
                                style: const TextStyle(
                                  color: DSColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 22),
                  _StatusCard(s: s),
                  const SizedBox(height: 22),
                  _TabSelector(
                    selected: _selectedTab,
                    onChanged: (i) => setState(() => _selectedTab = i),
                    showBottle: s.hasBottleLeft,
                  ),
                  const SizedBox(height: 16),
                  if (_selectedTab == 0)
                    _DecantTab(s: s)
                  else
                    _BottleTab(s: s),
                  const SizedBox(height: 22),
                  _TrustPanel(s: s),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: _selectedTab == 1 && s.hasBottleLeft
              ? DSPrimaryButton(
                  label: 'ŞİŞEYİ TALEP ET',
                  icon: Icons.local_drink,
                  onPressed: () => context.push('/splits/${s.id}/bottle'),
                )
              : DSPrimaryButton(
                  label: 'TALEP ET',
                  icon: Icons.science,
                  onPressed: () => _showRequestSheet(context, s),
                ),
        ),
      ),
    );
  }

  void _showRequestSheet(BuildContext context, Split s) {
    showModalBottomSheet(
      context: context,
      backgroundColor: DSColors.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _RequestSheet(split: s),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final Split s;
  const _StatusCard({required this.s});

  @override
  Widget build(BuildContext context) {
    return DSCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'SPLİT DURUMU',
                style: TextStyle(
                  color: DSColors.accentGold,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                ),
              ),
              const Spacer(),
              Icon(Icons.access_time, size: 14, color: DSColors.warning),
              const SizedBox(width: 4),
              Text(
                'Kalan ${countdown(s.closesAt)}',
                style: const TextStyle(
                  color: DSColors.warning,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DSProgressBar(value: s.progress, height: 10),
          const SizedBox(height: 10),
          Row(
            children: [
              _StatBlock(
                  label: 'Toplam', value: '${s.totalVolumeMl} ml'),
              _StatBlock(label: 'Dolan', value: '${s.filledMl} ml'),
              _StatBlock(
                label: 'Kalan',
                value: '${s.remainingMl} ml',
                color: DSColors.success,
              ),
            ],
          ),
          const Divider(height: 28),
          Row(
            children: [
              const Icon(Icons.attach_money, color: DSColors.accentGold),
              const SizedBox(width: 6),
              Text(
                formatPricePerMl(s.pricePerMl),
                style: const TextStyle(
                  color: DSColors.accentGold,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Icon(Icons.people_outline,
                  size: 16, color: DSColors.textSecondary),
              const SizedBox(width: 4),
              Text(
                '${s.participantCount} katılımcı',
                style: const TextStyle(
                  color: DSColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _StatBlock({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                color: DSColors.textTertiary,
                fontSize: 11,
                letterSpacing: 1,
              )),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                color: color ?? DSColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              )),
        ],
      ),
    );
  }
}

class _TabSelector extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;
  final bool showBottle;
  const _TabSelector({
    required this.selected,
    required this.onChanged,
    required this.showBottle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: DSColors.bgTertiary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SegBtn(
              label: 'Dekant',
              selected: selected == 0,
              onTap: () => onChanged(0),
            ),
          ),
          if (showBottle)
            Expanded(
              child: _SegBtn(
                label: 'Şişeli Kalan',
                selected: selected == 1,
                onTap: () => onChanged(1),
              ),
            ),
        ],
      ),
    );
  }
}

class _SegBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SegBtn({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? DSColors.bgPrimary : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: selected ? DSColors.accentGold : DSColors.textSecondary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _DecantTab extends StatelessWidget {
  final Split s;
  const _DecantTab({required this.s});

  @override
  Widget build(BuildContext context) {
    return DSCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'İZİN VERİLEN MİKTARLAR',
            style: TextStyle(
              color: DSColors.accentGold,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: s.allowedIncrements
                .map((ml) => DSMlChip(amountMl: ml))
                .toList(),
          ),
          const SizedBox(height: 12),
          const Text(
            'Talep oluşturma sırasında ml seçimi yapacaksın. Stok yetersiz '
            'olduğunda en yüksek mevcut miktar otomatik önerilir.',
            style: TextStyle(color: DSColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _BottleTab extends StatelessWidget {
  final Split s;
  const _BottleTab({required this.s});

  @override
  Widget build(BuildContext context) {
    final total = s.remainingMl * s.pricePerMl;
    return DSCard(
      leftAccent: DSColors.success,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DSBadge.bottle(),
          const SizedBox(height: 10),
          Text(
            'Şişede ${s.remainingMl} ml kaldı',
            style: const TextStyle(
              color: DSColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Şişeli kalan talebinde ml ${s.pricePerMl.toStringAsFixed(0)} ₺. '
            'Şişe ile birlikte teslim alırsın.',
            style: const TextStyle(color: DSColors.textSecondary),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: DSColors.bgTertiary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Text('Toplam',
                    style: TextStyle(color: DSColors.textSecondary)),
                const Spacer(),
                Text(
                  formatTl(total),
                  style: const TextStyle(
                    color: DSColors.success,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TrustPanel extends StatelessWidget {
  final Split s;
  const _TrustPanel({required this.s});

  @override
  Widget build(BuildContext context) {
    return DSCard(
      leftAccent: DSColors.accentGold,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.verified_user, color: DSColors.accentGold, size: 18),
              SizedBox(width: 6),
              Text(
                'GÜVEN PANELİ',
                style: TextStyle(
                  color: DSColors.accentGold,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Row(
            label: 'Batch',
            value: s.batchCode,
            trailing: IconButton(
              icon: const Icon(Icons.copy, size: 16, color: DSColors.textSecondary),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: s.batchCode));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Batch kopyalandı')),
                );
              },
            ),
          ),
          _Row(label: 'Kaynak', value: s.sourceInfo),
          _Row(
            label: 'AI Risk',
            valueWidget: RiskBadge(level: s.aiRiskScore),
          ),
          _Row(
            label: 'Satıcı',
            value: '${s.sellerName} • Trust ${s.sellerTrustScore}%',
          ),
          const SizedBox(height: 8),
          const Text(
            'AI risk değerlendirmesi yalnızca ön kontrol amaçlıdır; '
            '"orijinal" garantisi vermez.',
            style: TextStyle(
              color: DSColors.textTertiary,
              fontSize: 11,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? valueWidget;
  final Widget? trailing;
  const _Row({
    required this.label,
    this.value,
    this.valueWidget,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                color: DSColors.textTertiary,
                fontSize: 12,
                letterSpacing: 0.6,
              ),
            ),
          ),
          Expanded(
            child: valueWidget ??
                Text(
                  value ?? '-',
                  style: const TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 13,
                  ),
                ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class _RequestSheet extends ConsumerStatefulWidget {
  final Split split;
  const _RequestSheet({required this.split});

  @override
  ConsumerState<_RequestSheet> createState() => _RequestSheetState();
}

class _RequestSheetState extends ConsumerState<_RequestSheet> {
  int? _selected;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.split;
    final price = (_selected ?? 0) * s.pricePerMl;
    final cargo = 60.0;

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
            Text(
              'Dekant Talebi',
              style: const TextStyle(
                color: DSColors.accentGold,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              s.displayName,
              style: const TextStyle(color: DSColors.textSecondary),
            ),
            const SizedBox(height: 16),
            const Text('Miktar seç',
                style: TextStyle(
                    color: DSColors.textPrimary,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: s.allowedIncrements.map((ml) {
                final disabled = ml > s.remainingMl;
                return DSMlChip(
                  amountMl: ml,
                  selected: _selected == ml,
                  disabled: disabled,
                  onTap: () => setState(() => _selected = ml),
                );
              }).toList(),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: DSColors.bgTertiary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _SummaryRow(
                    label: 'Dekant ücreti',
                    value: formatTl(price),
                  ),
                  _SummaryRow(label: 'Kargo', value: formatTl(cargo)),
                  const Divider(height: 16),
                  _SummaryRow(
                    label: 'Toplam',
                    value: formatTl(price + cargo),
                    bold: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.timer_outlined,
                    size: 16, color: DSColors.warning),
                const SizedBox(width: 6),
                const Text(
                  '30 dk içinde ödeme yapılmalı',
                  style: TextStyle(color: DSColors.warning, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 16),
            DSPrimaryButton(
              label: 'REZERVASYON OLUŞTUR',
              loading: _loading,
              onPressed: _selected == null || _loading
                  ? null
                  : () async {
                      setState(() => _loading = true);
                      try {
                        await ref
                            .read(splitsRepositoryProvider)
                            .createReservation(s.id, _selected!);
                        if (!mounted) return;
                        Navigator.of(context).pop();
                        context.push('/payment', extra: {
                          'title': '${s.brand} ${s.name}',
                          'subtitle': '$_selected ml • Split',
                          'amount': price + cargo,
                        });
                      } catch (e) {
                        if (!mounted) return;
                        setState(() => _loading = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.toString())),
                        );
                      }
                    },
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _SummaryRow({
    required this.label,
    required this.value,
    this.bold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label,
              style: TextStyle(
                color: bold ? DSColors.textPrimary : DSColors.textSecondary,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              )),
          const Spacer(),
          Text(value,
              style: TextStyle(
                color: bold ? DSColors.accentGold : DSColors.textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: bold ? 16 : 13,
              )),
        ],
      ),
    );
  }
}
