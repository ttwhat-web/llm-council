import 'package:flutter_riverpod/flutter_riverpod.dart';

class DemoSettings {
  final bool forceError;
  final bool forceEmpty;
  final int delayMs;
  final bool isTrustedSeller;
  final bool canListItems;
  final bool highTraffic;

  const DemoSettings({
    this.forceError = false,
    this.forceEmpty = false,
    this.delayMs = 500,
    this.isTrustedSeller = false,
    this.canListItems = true,
    this.highTraffic = false,
  });

  int get effectiveDelayMs => highTraffic ? (delayMs + 900) : delayMs;

  DemoSettings copyWith({
    bool? forceError,
    bool? forceEmpty,
    int? delayMs,
    bool? isTrustedSeller,
    bool? canListItems,
    bool? highTraffic,
  }) {
    return DemoSettings(
      forceError: forceError ?? this.forceError,
      forceEmpty: forceEmpty ?? this.forceEmpty,
      delayMs: delayMs ?? this.delayMs,
      isTrustedSeller: isTrustedSeller ?? this.isTrustedSeller,
      canListItems: canListItems ?? this.canListItems,
      highTraffic: highTraffic ?? this.highTraffic,
    );
  }
}

class DemoSettingsNotifier extends StateNotifier<DemoSettings> {
  DemoSettingsNotifier() : super(const DemoSettings());

  void toggleError() => state = state.copyWith(forceError: !state.forceError);
  void toggleEmpty() => state = state.copyWith(forceEmpty: !state.forceEmpty);
  void toggleTrustedSeller() =>
      state = state.copyWith(isTrustedSeller: !state.isTrustedSeller);
  void toggleCanList() =>
      state = state.copyWith(canListItems: !state.canListItems);
  void toggleHighTraffic() =>
      state = state.copyWith(highTraffic: !state.highTraffic);
  void setDelay(int ms) => state = state.copyWith(delayMs: ms);
}

final demoSettingsProvider =
    StateNotifierProvider<DemoSettingsNotifier, DemoSettings>(
  (ref) => DemoSettingsNotifier(),
);
