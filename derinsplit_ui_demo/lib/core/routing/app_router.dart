import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/fake_auth_repository.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/onboarding_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/home/presentation/notifications_screen.dart';
import '../../features/home/presentation/search_screen.dart';
import '../../features/market/presentation/listing_create_screen.dart';
import '../../features/market/presentation/listing_detail_screen.dart';
import '../../features/market/presentation/market_list_screen.dart';
import '../../features/market/presentation/sales_dashboard_screen.dart';
import '../../features/messages/presentation/message_detail_screen.dart';
import '../../features/messages/presentation/messages_list_screen.dart';
import '../../features/profile/presentation/order_detail_screen.dart';
import '../../features/profile/presentation/orders_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/settings_screen.dart';
import '../../features/splits/presentation/bottle_request_screen.dart';
import '../../features/splits/presentation/payment_screen.dart';
import '../../features/splits/presentation/split_dashboard_screen.dart';
import '../../features/splits/presentation/split_detail_screen.dart';
import '../../features/splits/presentation/split_list_screen.dart';
import '../widgets/main_shell.dart';
import 'page_transition.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login' || loc == '/splash';
      final onboarding = loc.startsWith('/onboarding');

      if (loc == '/splash') return null;
      if (!auth.onboardingDone && !onboarding && !loggingIn) {
        return '/onboarding';
      }
      if (auth.onboardingDone && !auth.isAuthenticated && !loggingIn && !onboarding) {
        return '/login';
      }
      if (auth.isAuthenticated && (loc == '/login' || onboarding)) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (_, __) => fadeSlidePage(child: const SplashScreen()),
      ),
      GoRoute(
        path: '/onboarding',
        pageBuilder: (_, __) => fadeSlidePage(child: const OnboardingScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (_, __) => fadeSlidePage(child: const LoginScreen()),
      ),
      GoRoute(
        path: '/search',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) => fadeSlidePage(child: const SearchScreen()),
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) =>
            fadeSlidePage(child: const NotificationsScreen()),
      ),
      GoRoute(
        path: '/splits/:id',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) => fadeSlidePage(
          child: SplitDetailScreen(splitId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/splits/:id/bottle',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) => fadeSlidePage(
          child: BottleRequestScreen(splitId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/payment',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) {
          final extra = s.extra as Map<String, dynamic>?;
          return fadeSlidePage(
            child: PaymentScreen(
              title: extra?['title'] as String? ?? 'Ödeme',
              amount: (extra?['amount'] as num?)?.toDouble() ?? 0,
              subtitle: extra?['subtitle'] as String?,
            ),
          );
        },
      ),
      GoRoute(
        path: '/listings/:id',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) => fadeSlidePage(
          child: ListingDetailScreen(listingId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/listings/new',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) =>
            fadeSlidePage(child: const ListingCreateScreen()),
      ),
      GoRoute(
        path: '/messages/:id',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) => fadeSlidePage(
          child: MessageDetailScreen(conversationId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/orders',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) => fadeSlidePage(child: const OrdersScreen()),
      ),
      GoRoute(
        path: '/orders/:id',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, s) => fadeSlidePage(
          child: OrderDetailScreen(orderId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) => fadeSlidePage(child: const SettingsScreen()),
      ),
      GoRoute(
        path: '/dashboard/splits',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) =>
            fadeSlidePage(child: const SplitDashboardScreen()),
      ),
      GoRoute(
        path: '/dashboard/sales',
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, __) =>
            fadeSlidePage(child: const SalesDashboardScreen()),
      ),
      ShellRoute(
        navigatorKey: _shellKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (_, __) => fadeSlidePage(child: const HomeScreen()),
          ),
          GoRoute(
            path: '/splits',
            pageBuilder: (_, __) =>
                fadeSlidePage(child: const SplitListScreen()),
          ),
          GoRoute(
            path: '/market',
            pageBuilder: (_, __) =>
                fadeSlidePage(child: const MarketListScreen()),
          ),
          GoRoute(
            path: '/messages',
            pageBuilder: (_, __) =>
                fadeSlidePage(child: const MessagesListScreen()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (_, __) =>
                fadeSlidePage(child: const ProfileScreen()),
          ),
        ],
      ),
    ],
  );
});

class _AuthListenable extends ChangeNotifier {
  final Ref ref;
  _AuthListenable(this.ref) {
    ref.listen(authRepositoryProvider, (_, __) => notifyListeners());
  }
}
