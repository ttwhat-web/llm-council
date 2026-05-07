import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/models/listing.dart';

final _seed = <Listing>[
  Listing(
    id: 'l_1',
    brand: 'Tom Ford',
    name: 'Oud Wood',
    concentration: 'EDP',
    listingType: 'sale',
    price: 8400,
    bottleSizeMl: 100,
    remainingMl: 92,
    batchCode: 'TF24A12',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Ata Y.',
    sellerTrustScore: 88,
    hasBox: true,
    images: const [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800'
    ],
    createdAt: DateTime.now().subtract(const Duration(hours: 6)),
  ),
  Listing(
    id: 'l_2',
    brand: 'Parfums de Marly',
    name: 'Layton Exclusif',
    concentration: 'Parfum',
    listingType: 'both',
    price: 9800,
    bottleSizeMl: 75,
    remainingMl: 65,
    batchCode: 'PDM23B07',
    city: 'Ankara',
    aiRiskScore: 'low_medium',
    sellerName: 'Ali K.',
    sellerTrustScore: 82,
    hasBox: false,
    images: const [
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800'
    ],
    tradeExpectations: 'Xerjoff Naxos / Roja Elysium ile takas',
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
  ),
  Listing(
    id: 'l_3',
    brand: 'Initio',
    name: 'Side Effect',
    concentration: 'EDP',
    listingType: 'trade',
    bottleSizeMl: 90,
    remainingMl: 78,
    batchCode: 'IN24C32',
    city: 'İzmir',
    aiRiskScore: 'low',
    sellerName: 'Uğur E.',
    sellerTrustScore: 95,
    hasBox: true,
    images: const [
      'https://images.unsplash.com/photo-1557170334-a9086d21c61c?w=800'
    ],
    tradeExpectations: 'Xerjoff Erba Pura, Memo Marfa, Carlisle ile takas',
    createdAt: DateTime.now().subtract(const Duration(days: 2)),
  ),
  Listing(
    id: 'l_4',
    brand: 'Creed',
    name: 'Aventus 2024',
    concentration: 'EDP',
    listingType: 'sale',
    price: 12500,
    bottleSizeMl: 100,
    remainingMl: 100,
    batchCode: 'CR24C15A',
    city: 'İstanbul',
    aiRiskScore: 'low',
    sellerName: 'Hande A.',
    sellerTrustScore: 78,
    hasBox: true,
    images: const [
      'https://images.unsplash.com/photo-1610461888750-10bfc601b874?w=800'
    ],
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
  ),
  Listing(
    id: 'l_5',
    brand: 'Amouage',
    name: 'Interlude Black Iris',
    concentration: 'EDP',
    listingType: 'sale',
    price: 7200,
    bottleSizeMl: 100,
    remainingMl: 70,
    batchCode: 'AM23H06',
    city: 'Bursa',
    aiRiskScore: 'medium_high',
    sellerName: 'Mustafa T. U.',
    sellerTrustScore: 64,
    hasBox: false,
    images: const [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800'
    ],
    createdAt: DateTime.now().subtract(const Duration(days: 3)),
  ),
];

class FakeListingsRepository {
  final Ref ref;
  FakeListingsRepository(this.ref);

  Future<void> _delay() async {
    final ms = ref.read(demoSettingsProvider).delayMs;
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
