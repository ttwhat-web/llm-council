import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/responsive.dart';
import '../../../core/widgets/cinematic_backdrop.dart';
import '../../../core/widgets/light_panel.dart';
import '../../../core/widgets/web_navbar.dart';
import '../../auth/data/fake_auth_repository.dart';

/// KULLANICI DASHBOARD — desktop / web account screen.
///
/// Layout:
///   [ pill navbar (light variant) ]
///   [ LightFrostedPanel ]
///       header: KULLANICI DASHBOARD
///       user: TUNÇ TUNÇEL · tunctuncel95@gmail.com
///       tabs:  PROFİLİM · SİPARİŞLERİM · ÖDEME
///       row:   [ Bilgi Güncelleme form ]   [ Onay Bekleyen Değişiklikler ]
class AccountDashboardScreen extends ConsumerStatefulWidget {
  const AccountDashboardScreen({super.key});

  @override
  ConsumerState<AccountDashboardScreen> createState() =>
      _AccountDashboardScreenState();
}

class _AccountDashboardScreenState
    extends ConsumerState<AccountDashboardScreen> {
  int _tab = 0; // 0 PROFİLİM · 1 SİPARİŞLERİM · 2 ÖDEME

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authRepositoryProvider).user;
    final w = context.screenWidth;
    final outerPad = w >= 1400 ? 56.0 : 32.0;
    final name = user?.name ?? 'TUNÇ TUNÇEL';
    final email =
        user?.phone.contains('@') == true ? user!.phone : 'tunctuncel95@gmail.com';

    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: CinematicBackdrop(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const WebPillNavbar(variant: NavbarVariant.dark),
              const SizedBox(height: 28),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: outerPad),
                child: LightFrostedPanel(
                  padding: EdgeInsets.fromLTRB(
                    w >= 1400 ? 56 : 36,
                    w >= 1400 ? 48 : 36,
                    w >= 1400 ? 56 : 36,
                    56,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      const Text(
                        'KULLANICI DASHBOARD',
                        style: TextStyle(
                          color: DSColors.lightInkTertiary,
                          fontSize: 11,
                          letterSpacing: 3,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name.toUpperCase(),
                        style: const TextStyle(
                          color: DSColors.lightInk,
                          fontFamily: 'Georgia',
                          fontSize: 38,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(
                          color: DSColors.lightInkSecondary,
                          fontSize: 13.5,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Tabs
                      _Tabs(selected: _tab, onChanged: (i) => setState(() => _tab = i)),

                      const SizedBox(height: 28),

                      // Body — 2-col on wide screens
                      if (_tab == 0)
                        w >= 1100
                            ? Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Expanded(flex: 5, child: _InfoUpdateCard()),
                                  SizedBox(width: 24),
                                  Expanded(flex: 4, child: _PendingChangesCard()),
                                ],
                              )
                            : Column(
                                children: const [
                                  _InfoUpdateCard(),
                                  SizedBox(height: 20),
                                  _PendingChangesCard(),
                                ],
                              )
                      else if (_tab == 1)
                        const _OrdersTabContent()
                      else
                        const _PaymentsTabContent(),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 56),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;
  const _Tabs({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    const labels = ['PROFİLİM', 'SİPARİŞLERİM', 'ÖDEME'];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: DSColors.lightInk.withOpacity(0.04),
        borderRadius: BorderRadius.circular(40),
        border: Border.all(color: DSColors.lightBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < labels.length; i++)
            _TabBtn(
              label: labels[i],
              active: i == selected,
              onTap: () => onChanged(i),
            ),
        ],
      ),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _TabBtn({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            color: active ? const Color(0xFF14140F) : Colors.transparent,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : DSColors.lightInkSecondary,
              fontSize: 11,
              letterSpacing: 2.2,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoUpdateCard extends StatefulWidget {
  const _InfoUpdateCard();

  @override
  State<_InfoUpdateCard> createState() => _InfoUpdateCardState();
}

class _InfoUpdateCardState extends State<_InfoUpdateCard> {
  final _phone = TextEditingController(text: '5333819200');
  final _newPhone = TextEditingController();
  final _newAddress = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    _newPhone.dispose();
    _newAddress.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LightCard(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
      borderRadius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BİLGİ GÜNCELLEME',
            style: TextStyle(
              color: DSColors.lightInk,
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Divider(height: 28),

          _Field(label: 'MEVCUT TELEFON', value: '5333819200'),
          const SizedBox(height: 16),
          _LightInput(
            controller: _newPhone,
            hint: 'Yeni Telefon No...',
          ),
          const SizedBox(height: 12),
          _PrimaryDarkButton(
            label: 'TELEFONU GÜNCELLEME TALEBİ GÖNDER',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Talep gönderildi.')),
            ),
          ),

          const SizedBox(height: 28),
          _Field(
            label: 'MEVCUT ADRES',
            value: 'Yeni mahalle hasan kalesi caddesi no 5 1/A ava villaları avanos Nevşehir',
          ),
          const SizedBox(height: 16),
          _LightInput(
            controller: _newAddress,
            hint: 'Yeni Adres...',
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          _PrimaryDarkButton(
            label: 'ADRESİ GÜNCELLEME TALEBİ GÖNDER',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Talep gönderildi.')),
            ),
          ),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final String value;
  const _Field({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: DSColors.lightInkTertiary,
            fontSize: 10.5,
            letterSpacing: 1.6,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            color: DSColors.lightInk,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _LightInput extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  const _LightInput({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(color: DSColors.lightInk),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: DSColors.lightInkTertiary),
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: DSColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: DSColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF14140F), width: 1.4),
        ),
      ),
    );
  }
}

class _PrimaryDarkButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _PrimaryDarkButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF14140F),
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 1.6,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _PendingChangesCard extends StatelessWidget {
  const _PendingChangesCard();

  @override
  Widget build(BuildContext context) {
    return LightCard(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
      borderRadius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ONAY BEKLEYEN DEĞİŞİKLİKLER',
            style: TextStyle(
              color: DSColors.lightInk,
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Divider(height: 28),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
            decoration: BoxDecoration(
              color: DSColors.lightInk.withOpacity(0.03),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: DSColors.lightBorder,
              ),
            ),
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(color: DSColors.lightBorder),
                  ),
                  child: const Icon(
                    Icons.inbox_outlined,
                    color: DSColors.lightInkSecondary,
                    size: 22,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Henüz bekleyen değişiklik talebiniz yok.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: DSColors.lightInkSecondary,
                    fontSize: 13,
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

class _OrdersTabContent extends StatelessWidget {
  const _OrdersTabContent();

  @override
  Widget build(BuildContext context) {
    return LightCard(
      padding: const EdgeInsets.all(40),
      child: const Center(
        child: Text(
          'Henüz sipariş geçmişiniz bulunmuyor.',
          style: TextStyle(
            color: DSColors.lightInkSecondary,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _PaymentsTabContent extends StatelessWidget {
  const _PaymentsTabContent();

  @override
  Widget build(BuildContext context) {
    return LightCard(
      padding: const EdgeInsets.all(40),
      child: const Center(
        child: Text(
          'Kayıtlı ödeme yöntemi bulunmuyor. Sipariş sırasında 3D Secure ile güvenli ödeme yapabilirsiniz.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: DSColors.lightInkSecondary,
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ),
    );
  }
}
