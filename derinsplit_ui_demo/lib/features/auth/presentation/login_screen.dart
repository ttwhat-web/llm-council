import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_button.dart';
import '../../../core/widgets/ds_input.dart';
import '../../../core/widgets/ds_logo.dart';
import '../data/fake_auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

enum _Step { phone, otp }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController(text: '+90 555 000 0000');
  final _otp = TextEditingController();
  final _name = TextEditingController(text: 'Berke Ö.');
  _Step _step = _Step.phone;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await ref.read(authRepositoryProvider.notifier).requestOtp(_phone.text);
    setState(() {
      _loading = false;
      _step = _Step.otp;
    });
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await ref
        .read(authRepositoryProvider.notifier)
        .verifyOtp(_phone.text, _otp.text, name: _name.text);
    setState(() => _loading = false);
    if (!mounted) return;
    if (!ok) {
      setState(() => _error = 'Kod hatalı. 6 haneli kodu kontrol edin.');
    } else {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          child: Column(
            children: [
              GestureDetector(
                onLongPress: () => showDemoControlPanel(context),
                child: const Column(
                  children: [
                    DSEmblem(size: 80),
                    SizedBox(height: 16),
                    DSWordmark(fontSize: 22),
                  ],
                ),
              ),
              const SizedBox(height: 36),
              Text(
                _step == _Step.phone
                    ? 'Hesabına giriş yap'
                    : 'Doğrulama kodu',
                style: const TextStyle(
                  color: DSColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _step == _Step.phone
                    ? 'Telefon numaranı gir, sana 6 haneli bir kod yollayalım.'
                    : '${_phone.text} numarasına gönderilen kodu gir.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: DSColors.textSecondary,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 28),
              if (_step == _Step.phone) ...[
                DSInput(
                  controller: _name,
                  label: 'Ad Soyad',
                  hint: 'Berke Ö.',
                  prefixIcon: Icons.person_outline,
                ),
                const SizedBox(height: 16),
                DSInput(
                  controller: _phone,
                  label: 'Telefon',
                  hint: '+90 555 000 0000',
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icons.phone,
                ),
                const SizedBox(height: 24),
                DSPrimaryButton(
                  label: 'Kodu Gönder',
                  loading: _loading,
                  onPressed: _loading ? null : _requestOtp,
                ),
              ] else ...[
                DSInput(
                  controller: _otp,
                  label: 'OTP',
                  hint: '6 haneli kod',
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  errorText: _error,
                ),
                const SizedBox(height: 8),
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
                      style: TextStyle(color: DSColors.accentGold),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                DSPrimaryButton(
                  label: 'Doğrula',
                  loading: _loading,
                  onPressed: _loading ? null : _verifyOtp,
                ),
                const SizedBox(height: 12),
                DSGhostButton(
                  label: 'Numarayı değiştir',
                  onPressed: () => setState(() => _step = _Step.phone),
                ),
              ],
              const SizedBox(height: 32),
              const Text(
                'Devam ederek Kullanım Koşulları’nı ve KVKK Aydınlatma\nMetni’ni kabul ediyorsun.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: DSColors.textTertiary,
                  fontSize: 11,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
