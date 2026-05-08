class Listing {
  final String id;
  final String brand;
  final String name;
  final String concentration;
  final String listingType; // sale | trade | both
  final double? price;
  final int bottleSizeMl;
  final int remainingMl;
  final String batchCode;
  final String city;
  final String? aiRiskScore;
  final String moderationStatus; // pending, approved, rejected
  final String status; // active, reserved, sold, removed
  final String sellerName;
  final int sellerTrustScore;
  final bool hasBox;
  final List<String> images;
  final String? tradeExpectations;
  final DateTime createdAt;

  /// Display label for stock state — e.g. "STOKTA", "STOKTA YOK
  /// (SİPARİŞ ÜSÜLÜ 7-10 GÜN)". Used by the Şişe catalog grid.
  final String stockLabel;
  final bool inStock;

  /// "TESTER" / "BOXED" / "TRAVEL". Renders as a small uppercase
  /// chip on the product card.
  final String? variantLabel;

  /// Mood key for `PerfumeImage` placeholder until a real photo is
  /// dropped into `assets/images/perfumes/`.
  final String moodKey;

  const Listing({
    required this.id,
    required this.brand,
    required this.name,
    required this.concentration,
    required this.listingType,
    this.price,
    required this.bottleSizeMl,
    required this.remainingMl,
    required this.batchCode,
    required this.city,
    this.aiRiskScore,
    this.moderationStatus = 'approved',
    this.status = 'active',
    required this.sellerName,
    this.sellerTrustScore = 50,
    this.hasBox = true,
    this.images = const [],
    this.tradeExpectations,
    required this.createdAt,
    this.stockLabel = 'STOKTA',
    this.inStock = true,
    this.variantLabel,
    this.moodKey = 'amber',
  });

  String get displayName => '$brand $name';
  double get fillPercent =>
      bottleSizeMl == 0 ? 0 : (remainingMl / bottleSizeMl).clamp(0.0, 1.0);

  bool get isSale => listingType == 'sale' || listingType == 'both';
  bool get isTrade => listingType == 'trade' || listingType == 'both';
}
