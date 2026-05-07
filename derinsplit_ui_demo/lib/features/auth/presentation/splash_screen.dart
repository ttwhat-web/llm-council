import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_logo.dart';
import '../data/fake_auth_repository.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1800), _navigate);
  }

  void _navigate() {
    if (!mounted) return;
    final auth = ref.read(authRepositoryProvider);
    if (!auth.onboardingDone) {
      context.go('/onboarding');
    } else if (!auth.isAuthenticated) {
      context.go('/login');
    } else {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: GestureDetector(
        onLongPress: () => showDemoControlPanel(context),
        child: Container(
          decoration: const BoxDecoration(gradient: DSColors.heroGradient),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                DSEmblem(size: 110),
                SizedBox(height: 28),
                DSWordmark(fontSize: 28),
                SizedBox(height: 12),
                Text(
                  'PREMIUM PARFÜM TOPLULUĞU',
                  style: TextStyle(
                    color: DSColors.textTertiary,
                    fontSize: 11,
                    letterSpacing: 4,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
