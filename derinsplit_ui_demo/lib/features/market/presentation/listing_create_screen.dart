import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_chip.dart';
import '../../../core/widgets/ds_input.dart';
import '../data/fake_listings_repository.dart';

class ListingCreateScreen extends ConsumerStatefulWidget {
  const ListingCreateScreen({super.key});

  @override
  ConsumerState<ListingCreateScreen> createState() =>
      _ListingCreateScreenState();
}

class _ListingCreateScreenState extends ConsumerState<ListingCreateScreen> {
  int _step = 0;
  bool _publishing = false;

  final _brand = TextEditingController();
  final _name = TextEditingController();
  final _conc = TextEditingController(text: 'EDP');
  final _bottleSize = TextEditingController(text: '100');
  final _remaining = TextEditingController(text: '90');
  final _batch = TextEditingController();
  final _price = TextEditingController();
  final _city = TextEditingController(text: 'İstanbul');

  String _type = 'sale';
  bool _hasBox = true;
  final List<int> _photosUploaded = [];
  String? _aiResult;
  bool _aiRunning = false;
  final List<String> _aiLog = [];
  bool _published = false;

  @override
  void dispose() {
    for (final c in [
      _brand,
      _name,
      _conc,
      _bottleSize,
      _remaining,
      _batch,
      _price,
      _city
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _stepValid {
    switch (_step) {
      case 0:
        return _brand.text.isNotEmpty && _name.text.isNotEmpty;
      case 1:
        return _bottleSize.text.isNotEmpty &&
            _remaining.text.isNotEmpty &&
            _batch.text.isNotEmpty;
      case 2:
        return _aiResult != null && _aiResult != 'high';
      case 3:
        return (_type == 'trade' || _price.text.isNotEmpty) &&
            _city.text.isNotEmpty;
      case 4:
        return true;
    }
    return false;
  }

  void _next() {
    if (_step < 4) {
      setState(() => _step += 1);
    } else {
      _publish();
    }
  }

  Future<void> _publish() async {
    setState(() => _publishing = true);
    try {
      await ref.read(listingsRepositoryProvider).publishListing(
            brand: _brand.text,
            name: _name.text,
          );
      if (!mounted) return;
      setState(() => _published = true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _publishing = false);
    }
  }

  Future<void> _runAi() async {
    setState(() {
      _aiRunning = true;
      _aiResult = null;
      _aiLog.clear();
    });
    final stream = ref
        .read(listingsRepositoryProvider)
        .runAiCheckStream(_photosUploaded.map((e) => e.toString()).toList());
    await for (final msg in stream) {
      if (!mounted) return;
      setState(() => _aiLog.add(msg));
      if (msg.startsWith('Risk score:')) {
        final lvl = msg.contains('HIGH')
            ? 'high'
            : msg.contains('MEDIUM')
                ? 'medium_high'
                : 'low';
        setState(() => _aiResult = lvl);
      }
    }
    if (!mounted) return;
    setState(() => _aiRunning = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_published) {
      return _PublishSuccessView(
        title: '${_brand.text} ${_name.text}',
        risk: _aiResult,
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('İLAN OLUŞTUR'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          _StepperBar(step: _step, total: 5),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_step == 0) ..._buildBasicStep(),
                if (_step == 1) ..._buildConditionStep(),
                if (_step == 2) ..._buildAiStep(),
                if (_step == 3) ..._buildPricingStep(),
                if (_step == 4) ..._buildReviewStep(),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (_step > 0)
                    Expanded(
                      child: DSSecondaryButton(
                        label: 'Geri',
                        onPressed: () => setState(() => _step -= 1),
                      ),
                    ),
                  if (_step > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: DSPrimaryButton(
                      label: _step == 4 ? 'YAYINLA' : 'DEVAM',
                      loading: _publishing,
                      onPressed: !_stepValid || _publishing ? null : _next,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildBasicStep() => [
        const _StepHeader(
          title: 'Temel Bilgiler',
          subtitle: 'Marka ve parfüm adını gir.',
        ),
        DSInput(
          controller: _brand,
          label: 'Marka',
          hint: 'Örn: Xerjoff',
          onChanged: (_) => setState(() {}),
          prefixIcon: Icons.brush_outlined,
        ),
        const SizedBox(height: 12),
        DSInput(
          controller: _name,
          label: 'Parfüm Adı',
          hint: 'Örn: Naxos',
          onChanged: (_) => setState(() {}),
          prefixIcon: Icons.spa_outlined,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: DSInput(
                controller: _conc,
                label: 'Konsantrasyon',
                hint: 'EDP / EDT / Parfum',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DSInput(
                controller: _bottleSize,
                label: 'Şişe Boyutu (ml)',
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
      ];

  List<Widget> _buildConditionStep() => [
        const _StepHeader(
          title: 'Durum',
          subtitle: 'Doluluk, kutu ve batch bilgisi.',
        ),
        DSInput(
          controller: _remaining,
          label: 'Kalan ml',
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
          prefixIcon: Icons.water_drop_outlined,
        ),
        const SizedBox(height: 12),
        DSInput(
          controller: _batch,
          label: 'Batch Kodu (zorunlu)',
          hint: 'Şişe altında basılı olan kod',
          onChanged: (_) => setState(() {}),
          prefixIcon: Icons.qr_code_2,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: DSFilterChip(
                label: 'Kutulu',
                selected: _hasBox,
                onTap: () => setState(() => _hasBox = true),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DSFilterChip(
                label: 'Kutusuz',
                selected: !_hasBox,
                onTap: () => setState(() => _hasBox = false),
              ),
            ),
          ],
        ),
      ];

  List<Widget> _buildAiStep() => [
        const _StepHeader(
          title: 'Görseller + AI Ön Kontrol',
          subtitle:
              'Şişe altı, ön/arka, yan, kapak, kutu görselleri zorunlu (6 adet).',
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 6,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1,
          ),
          itemBuilder: (_, i) {
            final uploaded = _photosUploaded.contains(i);
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (uploaded) {
                    _photosUploaded.remove(i);
                  } else {
                    _photosUploaded.add(i);
                  }
                });
              },
              child: Container(
                decoration: BoxDecoration(
                  color: DSColors.bgTertiary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: uploaded
                        ? DSColors.accentGold
                        : DSColors.surface,
                    width: uploaded ? 1.6 : 1,
                  ),
                ),
                child: Center(
                  child: Icon(
                    uploaded ? Icons.check_circle : Icons.add_a_photo_outlined,
                    color: uploaded
                        ? DSColors.accentGold
                        : DSColors.textTertiary,
                    size: 26,
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        DSCard(
          leftAccent: DSColors.info,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.auto_awesome, color: DSColors.accentGold),
                  SizedBox(width: 8),
                  Text(
                    'AI Ön Kontrol',
                    style: TextStyle(
                      color: DSColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _photosUploaded.length < 4
                    ? 'En az 4 görsel yükle, ardından AI analizini başlat.'
                    : 'Görseller hazır. Analizi başlatabilirsin.',
                style: const TextStyle(
                    color: DSColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 12),
              if (_aiRunning || _aiLog.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: DSColors.bgPrimary.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: DSColors.glassBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final m in _aiLog)
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 250),
                          style: TextStyle(
                            color: m.startsWith('Risk score:')
                                ? (_aiResult == 'high'
                                    ? DSColors.error
                                    : _aiResult == 'medium_high'
                                        ? DSColors.warning
                                        : DSColors.success)
                                : DSColors.textSecondary,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: m.startsWith('Risk score:')
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Text('› $m'),
                          ),
                        ),
                      if (_aiRunning)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            children: const [
                              SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: DSColors.accentGold,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text(
                                '...',
                                style: TextStyle(
                                  color: DSColors.textTertiary,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              if (_aiResult != null) ...[
                const SizedBox(height: 10),
                RiskBadge(level: _aiResult!),
                const SizedBox(height: 6),
                Text(
                  _aiResult == 'high'
                      ? 'AI yüksek risk tespit etti. İlan yayınlanamaz.'
                      : _aiResult == 'medium_high'
                          ? 'Orta-yüksek risk. Admin incelemesine gönderilecek.'
                          : 'Düşük risk. Hızlı yayın için uygun.',
                  style: const TextStyle(
                      color: DSColors.textSecondary, fontSize: 12),
                ),
              ],
              const SizedBox(height: 12),
              DSPrimaryButton(
                label: _aiResult == null ? 'AI ANALİZ ET' : 'YENİDEN ANALİZ ET',
                icon: Icons.auto_awesome,
                onPressed: _photosUploaded.length < 4 || _aiRunning
                    ? null
                    : _runAi,
              ),
            ],
          ),
        ),
      ];

  List<Widget> _buildPricingStep() => [
        const _StepHeader(
          title: 'Fiyat ve Teslimat',
          subtitle: 'Satılık, takaslık veya her ikisi.',
        ),
        Row(
          children: [
            Expanded(
              child: DSFilterChip(
                label: 'Satılık',
                selected: _type == 'sale',
                onTap: () => setState(() => _type = 'sale'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DSFilterChip(
                label: 'Takaslık',
                selected: _type == 'trade',
                onTap: () => setState(() => _type = 'trade'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DSFilterChip(
                label: 'Her İkisi',
                selected: _type == 'both',
                onTap: () => setState(() => _type = 'both'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_type != 'trade')
          DSInput(
            controller: _price,
            label: 'Fiyat (₺)',
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
            prefixIcon: Icons.attach_money,
          ),
        if (_type != 'trade') const SizedBox(height: 12),
        DSInput(
          controller: _city,
          label: 'Şehir',
          onChanged: (_) => setState(() {}),
          prefixIcon: Icons.location_on_outlined,
        ),
      ];

  List<Widget> _buildReviewStep() => [
        const _StepHeader(
          title: 'İncele ve Yayınla',
          subtitle: 'Bilgileri kontrol et, ardından yayınla.',
        ),
        DSCard(
          leftAccent: DSColors.accentGold,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ReviewRow(label: 'Marka', value: _brand.text),
              _ReviewRow(label: 'Ad', value: _name.text),
              _ReviewRow(
                  label: 'Konsantrasyon',
                  value: '${_conc.text} • ${_bottleSize.text}ml'),
              _ReviewRow(label: 'Kalan', value: '${_remaining.text} ml'),
              _ReviewRow(label: 'Batch', value: _batch.text),
              _ReviewRow(label: 'Kutu', value: _hasBox ? 'Kutulu' : 'Kutusuz'),
              _ReviewRow(
                  label: 'Tip',
                  value: {
                    'sale': 'Satılık',
                    'trade': 'Takaslık',
                    'both': 'Satılık + Takaslık',
                  }[_type]!),
              if (_type != 'trade')
                _ReviewRow(
                  label: 'Fiyat',
                  value: _price.text.isEmpty
                      ? '-'
                      : formatTl(num.parse(_price.text)),
                ),
              _ReviewRow(label: 'Şehir', value: _city.text),
              _ReviewRow(
                label: 'AI Risk',
                valueWidget: _aiResult == null
                    ? const Text('-',
                        style: TextStyle(color: DSColors.textPrimary))
                    : RiskBadge(level: _aiResult!),
              ),
            ],
          ),
        ),
      ];
}

class _StepperBar extends StatelessWidget {
  final int step;
  final int total;
  const _StepperBar({required this.step, required this.total});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: List.generate(total, (i) {
          final active = i <= step;
          return Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              height: 4,
              decoration: BoxDecoration(
                color: active ? DSColors.accentGold : DSColors.surface,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _StepHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  const _StepHeader({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: DSColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(color: DSColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _PublishSuccessView extends StatefulWidget {
  final String title;
  final String? risk;
  const _PublishSuccessView({required this.title, this.risk});

  @override
  State<_PublishSuccessView> createState() => _PublishSuccessViewState();
}

class _PublishSuccessViewState extends State<_PublishSuccessView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaleTransition(
                scale: CurvedAnimation(
                  parent: _ctrl,
                  curve: Curves.elasticOut,
                ),
                child: Container(
                  width: 130,
                  height: 130,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const RadialGradient(
                      colors: [Color(0xFF1E3A2C), Color(0xFF0B0B0F)],
                    ),
                    border: Border.all(color: DSColors.success, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: DSColors.success.withOpacity(0.4),
                        blurRadius: 32,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check_rounded,
                      color: DSColors.success, size: 72),
                ),
              ),
              const SizedBox(height: 32),
              FadeTransition(
                opacity: _ctrl,
                child: const Text(
                  'İlanın yayında!',
                  style: TextStyle(
                    color: DSColors.textPrimary,
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                widget.title,
                textAlign: TextAlign.center,
                style: const TextStyle(color: DSColors.textSecondary),
              ),
              if (widget.risk != null) ...[
                const SizedBox(height: 12),
                RiskBadge(level: widget.risk!),
              ],
              const SizedBox(height: 36),
              SizedBox(
                width: double.infinity,
                child: DSPrimaryButton(
                  label: 'İLANIMI GÖR',
                  onPressed: () => context.go('/dashboard/sales'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: DSSecondaryButton(
                  label: 'ANA SAYFA',
                  onPressed: () => context.go('/home'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? valueWidget;
  const _ReviewRow({required this.label, this.value, this.valueWidget});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: const TextStyle(
                  color: DSColors.textTertiary,
                  fontSize: 12,
                  letterSpacing: 0.6,
                )),
          ),
          Expanded(
            child: valueWidget ??
                Text(
                  value == null || value!.isEmpty ? '-' : value!,
                  style: const TextStyle(
                      color: DSColors.textPrimary,
                      fontWeight: FontWeight.w600),
                ),
          ),
        ],
      ),
    );
  }
}
