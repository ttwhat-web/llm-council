import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/models/user.dart';

class AuthState {
  final AppUser? user;
  final bool onboardingDone;
  const AuthState({this.user, this.onboardingDone = false});

  bool get isAuthenticated => user != null;

  AuthState copyWith({AppUser? user, bool? onboardingDone, bool clearUser = false}) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      onboardingDone: onboardingDone ?? this.onboardingDone,
    );
  }
}

class FakeAuthRepository extends StateNotifier<AuthState> {
  final Ref ref;
  FakeAuthRepository(this.ref) : super(const AuthState());

  Future<void> _delay() async {
    final ms = ref.read(demoSettingsProvider).delayMs;
    await Future.delayed(Duration(milliseconds: ms));
  }

  void completeOnboarding() {
    state = state.copyWith(onboardingDone: true);
  }

  Future<String> requestOtp(String phone) async {
    await _delay();
    return 'otp_${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<bool> verifyOtp(String phone, String code, {String? name}) async {
    await _delay();
    if (code.length != 6) return false;
    final demo = ref.read(demoSettingsProvider);
    final user = AppUser(
      id: 'u_demo',
      name: name ?? 'Berke Ö.',
      phone: phone,
      role: demo.isTrustedSeller ? 'trusted_seller' : 'user',
      canListItems: demo.canListItems,
      phoneVerified: true,
      trustScore: 78,
      city: 'İstanbul',
    );
    state = state.copyWith(user: user, onboardingDone: true);
    return true;
  }

  void logout() {
    state = state.copyWith(clearUser: true);
  }

  void syncWithDemo() {
    if (state.user == null) return;
    final demo = ref.read(demoSettingsProvider);
    state = state.copyWith(
      user: state.user!.copyWith(
        role: demo.isTrustedSeller ? 'trusted_seller' : 'user',
        canListItems: demo.canListItems,
      ),
    );
  }
}

final authRepositoryProvider =
    StateNotifierProvider<FakeAuthRepository, AuthState>(
  (ref) {
    final repo = FakeAuthRepository(ref);
    ref.listen(demoSettingsProvider, (_, __) => repo.syncWithDemo());
    return repo;
  },
);
