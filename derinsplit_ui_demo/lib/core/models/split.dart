class Split {
  final String id;
  final String brand;
  final String name;
  final String concentration; // EDP, EDT, Parfum
  final int totalVolumeMl;
  final int filledMl; // already requested
  final double pricePerMl;
  final String batchCode;
  final String sourceInfo;
  final String aiRiskScore; // low, low_medium, medium_high, high, manual
  final DateTime closesAt;
  final String sellerName;
  final int sellerTrustScore;
  final List<int> allowedIncrements;
  final int participantCount;
  final List<String> notes;
  final bool hasBottleLeft;
  final int? bottleSizeMl;
  final String? imageUrl;

  const Split({
    required this.id,
    required this.brand,
    required this.name,
    required this.concentration,
    required this.totalVolumeMl,
    required this.filledMl,
    required this.pricePerMl,
    required this.batchCode,
    required this.sourceInfo,
    required this.aiRiskScore,
    required this.closesAt,
    required this.sellerName,
    required this.sellerTrustScore,
    required this.allowedIncrements,
    required this.participantCount,
    required this.notes,
    this.hasBottleLeft = false,
    this.bottleSizeMl,
    this.imageUrl,
  });

  int get remainingMl => totalVolumeMl - filledMl;
  double get progress => totalVolumeMl == 0 ? 0 : filledMl / totalVolumeMl;
  String get displayName => '$brand $name';
}
