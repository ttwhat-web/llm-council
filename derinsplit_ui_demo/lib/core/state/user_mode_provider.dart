import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_mode.dart';
import '../preview_flags.dart';

class UserModeNotifier extends StateNotifier<UserMode?> {
  UserModeNotifier() : super(kPreviewMode ? UserMode.buyer : null);

  void select(UserMode mode) => state = mode;
  void clear() => state = null;
}

/// Global selected mode. `null` = no choice yet → router redirects to /mode-select.
final userModeProvider =
    StateNotifierProvider<UserModeNotifier, UserMode?>((_) => UserModeNotifier());
