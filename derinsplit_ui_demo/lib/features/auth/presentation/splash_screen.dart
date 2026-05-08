import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_control_panel.dart';
import '../../../core/state/user_mode_provider.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ds_glass.dart';
import '../../../core/widgets/ds_logo.dart';
import '../data/fake_auth_repository.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _logoCtrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  late final AnimationController _shimmerCtrl = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat();

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 2200), _navigate);
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _shimmerCtrl.dispose();
    super.dispose();
  }

  void _navigate() {
    if (!mounted) return;
    final auth = ref.read(authRepositoryProvider);
    final mode = ref.read(userModeProvider);
    if (!auth.onboardingDone) {
      context.go('/onboarding');
    } else if (!auth.isAuthenticated) {
      context.go('/login');
    } else if (mode == null) {
      context.go('/mode-select');
    } else {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final scale = CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut);
    final fade = CurvedAnimation(parent: _logoCtrl, curve: Curves.easeOut);
    return Scaffold(
      backgroundColor: DSColors.bgPrimary,
      body: GestureDetector(
        onLongPress: () => showDemoControlPanel(context),
        child: AuroraBackdrop(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ScaleTransition(
                  scale: Tween<double>(begin: 0.7, end: 1.0).animate(scale),
                  child: const DSEmblem(size: 120),
                ),
                const SizedBox(height: 28),
                AnimatedBuilder(
                  animation: _shimmerCtrl,
                  builder: (context, child) {
                    return ShaderMask(
                      shaderCallback: (rect) {
                        return LinearGradient(
                          colors: const [
                            DSColors.textPrimary,
                            DSColors.accentGoldLight,
                            DSColors.textPrimary,
                          ],
                          stops: const [0.0, 0.5, 1.0],
                          begin: Alignment(-1 + 2 * _shimmerCtrl.value, 0),
                          end: Alignment(1 + 2 * _shimmerCtrl.value, 0),
                        ).createShader(rect);
                      },
                      child: child,
                    );
                  },
                  child: const DSWordmark(fontSize: 28),
                ),
                const SizedBox(height: 12),
                FadeTransition(
                  opacity: fade,
                  child: const Text(
                    'PREMIUM PARFÜM TOPLULUĞU',
                    style: TextStyle(
                      color: DSColors.textTertiary,
                      fontSize: 11,
                      letterSpacing: 4,
                    ),
                  ),
                ),
                const SizedBox(height: 36),
                FadeTransition(
                  opacity: fade,
                  child: const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: DSColors.accentGold,
                    ),
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
