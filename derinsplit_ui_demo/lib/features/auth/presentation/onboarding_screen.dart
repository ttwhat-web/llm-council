import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_button.dart';
import '../data/fake_auth_repository.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _ctrl = PageController();
  int _index = 0;

  static const _pages = [
    _Page(
      icon: Icons.science_outlined,
      title: 'Splitlerle Tanış',
      subtitle:
          'Premium niche parfümleri ml bazında, güvenli ve şeffaf bir şekilde paylaş.',
    ),
    _Page(
      icon: Icons.verified_user_outlined,
      title: 'Güven Odaklı',
      subtitle:
          'AI destekli orijinallik ön kontrolü, batch doğrulama ve trust score ile bilinçli al-sat.',
    ),
    _Page(
      icon: Icons.diamond_outlined,
      title: 'Topluluk',
      subtitle:
          'Pazar üzerinde diğer koleksiyonerlerle satış, takas ve mesajlaşma.',
    ),
  ];

  void _next() {
    if (_index == _pages.length - 1) {
      ref.read(authRepositoryProvider.notifier).completeOnboarding();
      context.go('/login');
    } else {
      _ctrl.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          DSGhostButton(
            label: 'Atla',
            onPressed: () {
              ref.read(authRepositoryProvider.notifier).completeOnboarding();
              context.go('/login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _ctrl,
                onPageChanged: (i) => setState(() => _index = i),
                itemCount: _pages.length,
                itemBuilder: (_, i) => _PageView(page: _pages[i]),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: active ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color:
                        active ? DSColors.accentGold : DSColors.surface,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: DSPrimaryButton(
                label: _index == _pages.length - 1 ? 'Başla' : 'Devam',
                onPressed: _next,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Page {
  final IconData icon;
  final String title;
  final String subtitle;
  const _Page({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

class _PageView extends StatelessWidget {
  final _Page page;
  const _PageView({required this.page});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const RadialGradient(
                colors: [Color(0xFF1E1E1E), Color(0xFF0A0A0A)],
              ),
              border: Border.all(color: DSColors.accentGold, width: 1.4),
              boxShadow: [
                BoxShadow(
                  color: DSColors.accentGold.withOpacity(0.18),
                  blurRadius: 40,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Icon(page.icon, color: DSColors.accentGold, size: 56),
          ),
          const SizedBox(height: 36),
          Text(
            page.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: DSColors.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            page.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: DSColors.textSecondary,
              fontSize: 15,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
