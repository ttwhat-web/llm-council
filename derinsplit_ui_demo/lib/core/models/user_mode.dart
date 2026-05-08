import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Active interaction mode the user has selected for this session.
///
/// The mode is set after login (or skipped via Explore) and gates which
/// FABs / CTAs / Home sections are visible. It can be changed any time
/// from Profile → "Kullanım Modunu Değiştir" or from the demo panel.
enum UserMode {
  buyer,
  seller,
  trustedSeller,
  explore,
}

extension UserModeX on UserMode {
  String get key {
    switch (this) {
      case UserMode.buyer:
        return 'buyer';
      case UserMode.seller:
        return 'seller';
      case UserMode.trustedSeller:
        return 'trusted_seller';
      case UserMode.explore:
        return 'explore';
    }
  }

  String get title {
    switch (this) {
      case UserMode.buyer:
        return 'Alıcı / Koleksiyoner';
      case UserMode.seller:
        return 'Satıcı / İlan Veren';
      case UserMode.trustedSeller:
        return 'Split Açan • Trusted Seller';
      case UserMode.explore:
        return 'Sadece Keşfet';
    }
  }

  String get subtitle {
    switch (this) {
      case UserMode.buyer:
        return 'Niche şişeleri ml bazında topla, takas et, mesaj gönder.';
      case UserMode.seller:
        return 'Şişelerini listele, teklifleri yönet, takas yap.';
      case UserMode.trustedSeller:
        return 'Split aç, katılımcıları yönet, kargo ve şişeli kalanı takip et.';
      case UserMode.explore:
        return 'Sınırlı vitrin görür; mesaj/teklif/split talebi kilitli.';
    }
  }

  IconData get icon {
    switch (this) {
      case UserMode.buyer:
        return Icons.local_drink_outlined;
      case UserMode.seller:
        return Icons.storefront_outlined;
      case UserMode.trustedSeller:
        return Icons.workspace_premium_outlined;
      case UserMode.explore:
        return Icons.visibility_outlined;
    }
  }

  Color get accent {
    switch (this) {
      case UserMode.buyer:
        return DSColors.accentGold;
      case UserMode.seller:
        return DSColors.info;
      case UserMode.trustedSeller:
        return DSColors.accentGoldLight;
      case UserMode.explore:
        return DSColors.textTertiary;
    }
  }

  /// True if this mode currently has no granted users (gated behind apply flow).
  bool get isLocked => this == UserMode.trustedSeller;

  /// True if mode is restricted to read-only browsing.
  bool get isExplore => this == UserMode.explore;

  bool get canPostListing =>
      this == UserMode.seller || this == UserMode.trustedSeller;
  bool get canOpenSplit => this == UserMode.trustedSeller;
  bool get canSendMessage =>
      this == UserMode.buyer ||
      this == UserMode.seller ||
      this == UserMode.trustedSeller;
  bool get canMakeOffer =>
      this == UserMode.buyer || this == UserMode.seller;
  bool get canJoinSplit =>
      this == UserMode.buyer || this == UserMode.trustedSeller;
}
