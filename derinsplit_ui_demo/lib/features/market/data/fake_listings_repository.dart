import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/models/listing.dart';

final _seed = <Listing>[
  Listing(
    id: 'l_clive_hedonistic',
    brand: 'Clive Christian',
    name: 'Hedonistic',
    concentration: 'Parfum',
    listingType: 'sale',
    price: 14900,
    bottleSizeMl: 50,
    remainingMl: 50,
    batchCode: 'CC24A11',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Tunç T.',
    sellerTrustScore: 92,
    hasBox: true,
    variantLabel: 'TESTER',
    moodKey: 'oud',
    stockLabel: 'STOKTA YOK (SİPARİŞ ÜSÜLÜ 7-10 GÜN)',
    inStock: false,
    createdAt: DateTime.now().subtract(const Duration(hours: 6)),
  ),
  Listing(
    id: 'l_xerjoff_alex2',
    brand: 'Xerjoff',
    name: 'Alexandria 2',
    concentration: 'Parfum',
    listingType: 'sale',
    price: 12900,
    bottleSizeMl: 100,
    remainingMl: 100,
    batchCode: 'XJ24C04',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Tunç T.',
    sellerTrustScore: 92,
    hasBox: true,
    variantLabel: 'TESTER',
    moodKey: 'amber',
    stockLabel: 'STOKTA',
    inStock: true,
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
  ),
  Listing(
    id: 'l_nishane_hacivat',
    brand: 'Nishane',
    name: 'Hacivat',
    concentration: 'EDP',
    listingType: 'sale',
    price: 7500,
    bottleSizeMl: 100,
    remainingMl: 100,
    batchCode: 'NS24B12',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Tunç T.',
    sellerTrustScore: 92,
    hasBox: true,
    variantLabel: 'TESTER',
    moodKey: 'citrus',
    stockLabel: 'STOKTA',
    inStock: true,
    createdAt: DateTime.now().subtract(const Duration(hours: 1)),
  ),
  Listing(
    id: 'l_pdm_layton',
    brand: 'Parfums de Marly',
    name: 'Layton Exclusif',
    concentration: 'Parfum',
    listingType: 'both',
    price: 9800,
    bottleSizeMl: 75,
    remainingMl: 75,
    batchCode: 'PDM23B07',
    city: 'Ankara',
    aiRiskScore: 'low_medium',
    sellerName: 'Ali K.',
    sellerTrustScore: 82,
    hasBox: false,
    variantLabel: 'TESTER',
    moodKey: 'violet',
    stockLabel: 'STOKTA',
    inStock: true,
    tradeExpectations: 'Xerjoff Naxos / Roja Elysium ile takas',
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
  ),
  Listing(
    id: 'l_roja_elysium',
    brand: 'Roja Parfums',
    name: 'Elysium Pour Homme',
    concentration: 'Parfum',
    listingType: 'sale',
    price: 18500,
    bottleSizeMl: 100,
    remainingMl: 100,
    batchCode: 'RJ25A001',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Tunç T.',
    sellerTrustScore: 92,
    hasBox: true,
    variantLabel: 'BOXED',
    moodKey: 'ivory',
    stockLabel: 'STOKTA',
    inStock: true,
    createdAt: DateTime.now().subtract(const Duration(hours: 3)),
  ),
  Listing(
    id: 'l_amouage_interlude',
    brand: 'Amouage',
    name: 'Interlude Black Iris',
    concentration: 'EDP',
    listingType: 'sale',
    price: 7200,
    bottleSizeMl: 100,
    remainingMl: 100,
    batchCode: 'AM23H06',
    city: 'Bursa',
    aiRiskScore: 'low',
    sellerName: 'Mustafa T. U.',
    sellerTrustScore: 64,
    hasBox: false,
    variantLabel: 'TESTER',
    moodKey: 'smoke',
    stockLabel: 'STOKTA YOK (SİPARİŞ ÜSÜLÜ 7-10 GÜN)',
    inStock: false,
    createdAt: DateTime.now().subtract(const Duration(days: 3)),
  ),
];

class FakeListingsRepository {
  final Ref ref;
  FakeListingsRepository(this.ref);

  Future<void> _delay() async {
    final ms = ref.read(demoSettingsProvider).effectiveDelayMs;
    await Future.delayed(Duration(milliseconds: ms));
  }

  Future<List<Listing>> listListings({String type = 'all', String? city}) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('İlanlar yüklenemedi.');
    if (demo.forceEmpty) return const [];
    Iterable<Listing> result = _seed;
    if (type == 'sale') {
      result = result.where((l) => l.isSale);
    } else if (type == 'trade') {
      result = result.where((l) => l.isTrade);
    }
    if (city != null && city.isNotEmpty) {
      result = result.where((l) => l.city == city);
    }
    return result.toList();
  }

  Future<Listing> getListing(String id) async {
    await _delay();
    return _seed.firstWhere((l) => l.id == id);
  }

  Future<String> publishListing({
    required String brand,
    required String name,
  }) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('İlan oluşturulamadı.');
    return 'l_new_${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<String> runAiCheck(List<String> images) async {
    await _delay();
    await Future.delayed(const Duration(milliseconds: 1200));
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) return 'high';
    if (images.length < 4) return 'medium_high';
    return 'low';
  }

  Stream<String> runAiCheckStream(List<String> images) async* {
    final demo = ref.read(demoSettingsProvider);
    final base = demo.effectiveDelayMs;
    yield 'AI authenticity check running...';
    await Future.delayed(Duration(milliseconds: 700 + base ~/ 2));
    yield 'OCR ile batch kodu okunuyor...';
    await Future.delayed(Duration(milliseconds: 600 + base ~/ 2));
    yield 'Batch code verified (simulated)';
    await Future.delayed(Duration(milliseconds: 500 + base ~/ 2));
    yield 'Görsel kalitesi ve şişe uyumu analiz ediliyor...';
    await Future.delayed(Duration(milliseconds: 700 + base ~/ 2));
    if (demo.forceError) {
      yield 'Risk score: HIGH';
    } else if (images.length < 4) {
      yield 'Risk score: MEDIUM';
    } else {
      yield 'Risk score: LOW';
    }
  }
}

final listingsRepositoryProvider =
    Provider<FakeListingsRepository>((ref) => FakeListingsRepository(ref));

final listingsListProvider =
    FutureProvider.family<List<Listing>, String>((ref, type) async {
  return ref.watch(listingsRepositoryProvider).listListings(type: type);
});

final listingDetailProvider =
    FutureProvider.family<Listing, String>((ref, id) async {
  return ref.watch(listingsRepositoryProvider).getListing(id);
});
