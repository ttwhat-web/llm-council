import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_glass.dart';
import '../../../core/widgets/ds_input.dart';
import '../../../core/widgets/ds_logo.dart';

class RequestAccessScreen extends ConsumerStatefulWidget {
  const RequestAccessScreen({super.key});

  @override
  ConsumerState<RequestAccessScreen> createState() =>
      _RequestAccessScreenState();
}

class _RequestAccessScreenState extends ConsumerState<RequestAccessScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController(text: '+90');
  final _city = TextEditingController();
  final _instagram = TextEditingController();
  final _bio = TextEditingController();
  String _interest = 'buyer';
  bool _submitting = false;
  bool _submitted = false;

  @override
  void dispose() {
    for (final c in [_name, _phone, _city, _instagram, _bio]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final delay = ref.read(demoSettingsProvider).effectiveDelayMs;
    await Future.delayed(Duration(milliseconds: 600 + delay ~/ 2));
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _submitted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('KAYIT İSTEĞİ'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: AuroraBackdrop(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: _submitted ? const _SuccessView() : _form(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _form() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        Center(child: const DSEmblem(size: 64)),
        const SizedBox(height: 18),
        const Text(
          'Topluluğa Katılım Talebi',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: DSColors.textPrimary,
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Küratör ekibimiz koleksiyonunu ve ilgilerini gözden geçirip '
          'sizinle iletişime geçecektir. Lütfen sizi en iyi tanıtacak bilgileri '
          'paylaşın.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: DSColors.textSecondary,
            fontSize: 13,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 24),
        GlassCard(
          liftOnHover: false,
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DSInput(
                controller: _name,
                label: 'AD SOYAD',
                hint: 'Berke Ö.',
                prefixIcon: Icons.person_outline,
              ),
              const SizedBox(height: 14),
              DSInput(
                controller: _phone,
                label: 'TELEFON',
                hint: '+90 555 000 0000',
                keyboardType: TextInputType.phone,
                prefixIcon: Icons.phone_iphone,
              ),
              const SizedBox(height: 14),
              DSInput(
                controller: _city,
                label: 'ŞEHİR',
                hint: 'İstanbul',
                prefixIcon: Icons.location_on_outlined,
              ),
              const SizedBox(height: 14),
              DSInput(
                controller: _instagram,
                label: 'INSTAGRAM (opsiyonel)',
                hint: '@kullanici',
                prefixIcon: Icons.alternate_email,
              ),
              const SizedBox(height: 14),
              const Text(
                'İLGİ ALANI',
                style: TextStyle(
                  color: DSColors.textTertiary,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _interestPill('buyer', 'Alıcı / Koleksiyoner'),
                  _interestPill('seller', 'Satıcı / İlan Veren'),
                  _interestPill('trusted', 'Split Açan'),
                ],
              ),
              const SizedBox(height: 14),
              DSInput(
                controller: _bio,
                label: 'KISA TANITIM',
                hint:
                    'Koleksiyonunuz, niche ilgi alanlarınız, topluluğa nasıl '
                    'katkı sunabilirsiniz...',
                maxLines: 4,
              ),
              const SizedBox(height: 22),
              DSPrimaryButton(
                label: 'TALEBİMİ GÖNDER',
                icon: Icons.send,
                loading: _submitting,
                onPressed:
                    _submitting || _name.text.isEmpty || _phone.text.length < 6
                        ? null
                        : _submit,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'Yanıt süresi: ortalama 2-5 iş günü.',
          textAlign: TextAlign.center,
          style: TextStyle(color: DSColors.textTertiary, fontSize: 11),
        ),
      ],
    );
  }

  Widget _interestPill(String key, String label) {
    final selected = _interest == key;
    return Material(
      color: selected ? DSColors.accentGold : DSColors.bgTertiary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: selected ? DSColors.accentGold : DSColors.glassBorder,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => setState(() => _interest = key),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? DSColors.bgPrimary : DSColors.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 20),
        Container(
          width: 130,
          height: 130,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const RadialGradient(
              colors: [Color(0xFF2A1F38), Color(0xFF0B0B0F)],
            ),
            border: Border.all(color: DSColors.accentGold, width: 1.6),
            boxShadow: [
              BoxShadow(
                color: DSColors.accentGold.withOpacity(0.35),
                blurRadius: 40,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const Icon(
            Icons.check_rounded,
            color: DSColors.accentGold,
            size: 64,
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Talebiniz alındı',
          style: TextStyle(
            color: DSColors.textPrimary,
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'Küratör ekibimiz koleksiyonunuzu inceleyip 2-5 iş günü içinde '
          'sizinle iletişime geçecek. Onaylanan üyeler SMS ile davet alacak.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: DSColors.textSecondary,
            fontSize: 13,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: DSPrimaryButton(
            label: 'GİRİŞ EKRANINA DÖN',
            onPressed: () => context.go('/login'),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: DSSecondaryButton(
            label: 'KEŞFET MODUNDA İLERLE',
            icon: Icons.visibility_outlined,
            onPressed: () => context.go('/mode-select?explore=1'),
          ),
        ),
      ],
    );
  }
}
