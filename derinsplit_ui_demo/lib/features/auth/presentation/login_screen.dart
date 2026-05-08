import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_glass.dart';
import '../../../core/widgets/ds_input.dart';
import '../../../core/widgets/ds_logo.dart';
import '../data/fake_auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

enum _Mode { credentials, otp }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController(text: '+90');
  final _otp = TextEditingController();
  _Mode _mode = _Mode.credentials;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await ref.read(authRepositoryProvider.notifier).requestOtp(_phone.text);
    if (!mounted) return;
    setState(() {
      _loading = false;
      _mode = _Mode.otp;
    });
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await ref
        .read(authRepositoryProvider.notifier)
        .verifyOtp(_phone.text, _otp.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (!ok) {
      setState(() => _error = 'Kod hatalı. 6 haneli kodu kontrol edin.');
    } else {
      context.go('/mode-select');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: AuroraBackdrop(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                children: [
                  const SizedBox(height: 24),
                  GestureDetector(
                    onLongPress: () => showDemoControlPanel(context),
                    child: Column(
                      children: const [
                        DSEmblem(size: 84),
                        SizedBox(height: 16),
                        DSWordmark(fontSize: 24),
                        SizedBox(height: 14),
                        Text(
                          '— PRIVATE COLLECTOR CLUB —',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: DSColors.accentGold,
                            fontSize: 10,
                            letterSpacing: 4,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  const _Tagline(),
                  const SizedBox(height: 36),
                  GlassCard(
                    padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
                    liftOnHover: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _mode == _Mode.credentials
                              ? 'Üye Girişi'
                              : 'Doğrulama Kodu',
                          style: const TextStyle(
                            color: DSColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _mode == _Mode.credentials
                              ? 'Kayıtlı koleksiyonerler için.'
                              : '${_phone.text} numarasına gönderilen kodu girin.',
                          style: const TextStyle(
                            color: DSColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 20),
                        if (_mode == _Mode.credentials) ...[
                          DSInput(
                            controller: _phone,
                            label: 'TELEFON',
                            hint: '+90 555 000 0000',
                            keyboardType: TextInputType.phone,
                            prefixIcon: Icons.phone_iphone,
                          ),
                          const SizedBox(height: 18),
                          DSPrimaryButton(
                            label: 'GİRİŞ KODU GÖNDER',
                            icon: Icons.arrow_forward,
                            loading: _loading,
                            onPressed: _loading ? null : _requestOtp,
                          ),
                        ] else ...[
                          DSInput(
                            controller: _otp,
                            label: 'KOD',
                            hint: '6 haneli',
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            errorText: _error,
                          ),
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _loading
                                  ? null
                                  : () {
                                      _otp.text = '123456';
                                      _verifyOtp();
                                    },
                              child: const Text(
                                'Demo: 123456 ile devam et',
                                style: TextStyle(
                                  color: DSColors.accentGold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          DSPrimaryButton(
                            label: 'DOĞRULA',
                            loading: _loading,
                            onPressed: _loading ? null : _verifyOtp,
                          ),
                          const SizedBox(height: 8),
                          DSGhostButton(
                            label: 'Numarayı değiştir',
                            onPressed: () =>
                                setState(() => _mode = _Mode.credentials),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  _Divider(),
                  const SizedBox(height: 22),
                  GlassCard(
                    padding: const EdgeInsets.fromLTRB(22, 18, 22, 20),
                    liftOnHover: false,
                    leftAccent: DSColors.accentGold,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: const [
                            Icon(
                              Icons.workspace_premium,
                              color: DSColors.accentGold,
                              size: 18,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'DAVETLİ ÜYELİK',
                              style: TextStyle(
                                color: DSColors.accentGold,
                                fontSize: 11,
                                letterSpacing: 1.4,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'DerinSplit kapalı bir koleksiyoner topluluğudur. '
                          'Kayıt olmak için talebinizi gönderin; küratör ekibimiz '
                          'inceleyip sizinle iletişime geçecektir.',
                          style: TextStyle(
                            color: DSColors.textSecondary,
                            fontSize: 12.5,
                            height: 1.55,
                          ),
                        ),
                        const SizedBox(height: 14),
                        DSSecondaryButton(
                          label: 'KAYIT OLMA İSTEĞİ GÖNDER',
                          icon: Icons.send_outlined,
                          onPressed: () => context.push('/request-access'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'Devam ederek Kullanım Koşulları’nı ve KVKK Aydınlatma\n'
                    'Metni’ni kabul ediyorsunuz.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: DSColors.textTertiary,
                      fontSize: 11,
                      height: 1.55,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Tagline extends StatelessWidget {
  const _Tagline();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (b) => DSColors.goldGradient.createShader(b),
          child: const Text(
            'Türkiye’nin En Derin\nParfüm Koleksiyonerleri',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: DSColors.accentGoldLight,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              fontFamily: 'Georgia',
              letterSpacing: 0.4,
              height: 1.3,
            ),
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'Niche & rare şişeleri ml bazında paylaşın, takas edin, sahibini bulun.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: DSColors.textSecondary,
            fontSize: 12.5,
            height: 1.55,
          ),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(height: 1, color: DSColors.glassBorder),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'YA DA',
            style: TextStyle(
              color: DSColors.textTertiary,
              fontSize: 10,
              letterSpacing: 3,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: Container(height: 1, color: DSColors.glassBorder),
        ),
      ],
    );
  }
}
