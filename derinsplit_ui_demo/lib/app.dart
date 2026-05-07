import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/routing/app_router.dart';
import 'core/theme/theme.dart';

class DerinSplitApp extends ConsumerWidget {
  const DerinSplitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'DerinSplit',
      debugShowCheckedModeBanner: false,
      theme: buildDerinSplitTheme(),
      routerConfig: router,
    );
  }
}
