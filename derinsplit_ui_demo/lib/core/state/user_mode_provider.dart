import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_mode.dart';

class UserModeNotifier extends StateNotifier<UserMode?> {
  UserModeNotifier() : super(null);

  void select(UserMode mode) => state = mode;
  void clear() => state = null;
}

/// Global selected mode. `null` = no choice yet → router redirects to /mode-select.
final userModeProvider =
    StateNotifierProvider<UserModeNotifier, UserMode?>((_) => UserModeNotifier());
