import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/models/split.dart';

final _seed = <Split>[
  Split(
    id: 's_1',
    brand: 'Xerjoff',
    name: 'Fatal Charme 2021',
    concentration: 'Parfum',
    totalVolumeMl: 50,
    filledMl: 13,
    pricePerMl: 140,
    batchCode: 'XJ21A09',
    sourceInfo: 'Resmi Xerjoff bayi (İstanbul) - faturalı',
    aiRiskScore: 'low',
    closesAt: DateTime.now().add(const Duration(days: 2, hours: 4)),
    sellerName: 'Berke Ö.',
    sellerTrustScore: 92,
    allowedIncrements: [3, 5, 10, 15],
    participantCount: 3,
    notes: ['Mandalina', 'Damask Gül', 'Amber', 'Sandal Ağacı'],
    bottleSizeMl: 50,
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
  ),
  Split(
    id: 's_2',
    brand: 'Christian Dior',
    name: 'Oud Ispahan',
    concentration: 'EDP',
    totalVolumeMl: 250,
    filledMl: 31,
    pricePerMl: 48,
    batchCode: 'CD24F112',
    sourceInfo: 'Dior Boutique - kutulu',
    aiRiskScore: 'low',
    closesAt: DateTime.now().add(const Duration(days: 5)),
    sellerName: 'Görkem Y.',
    sellerTrustScore: 88,
    allowedIncrements: [5, 10, 15, 30],
    participantCount: 5,
    notes: ['Oud', 'Gül', 'Sandal', 'Reçine'],
    bottleSizeMl: 250,
    imageUrl: 'https://images.unsplash.com/photo-1557170334-a9086d21c61c?w=800',
  ),
  Split(
    id: 's_3',
    brand: 'Louis Vuitton',
    name: 'Ombre Nomade',
    concentration: 'EDP',
    totalVolumeMl: 100,
    filledMl: 50,
    pricePerMl: 160,
    batchCode: 'LV23B044',
    sourceInfo: 'LV İstinyePark - faturalı',
    aiRiskScore: 'low',
    closesAt: DateTime.now().add(const Duration(days: 1, hours: 12)),
    sellerName: 'Berke Ö.',
    sellerTrustScore: 92,
    allowedIncrements: [5, 10, 15, 25],
    participantCount: 3,
    notes: ['Bal Ağacı', 'Frenk Üzümü', 'Amber', 'Sandal'],
    hasBottleLeft: true,
    bottleSizeMl: 100,
    imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800',
  ),
  Split(
    id: 's_4',
    brand: 'Roja Parfums',
    name: 'Elysium Pour Homme Parfum',
    concentration: 'Parfum',
    totalVolumeMl: 100,
    filledMl: 22,
    pricePerMl: 220,
    batchCode: 'RJ25A001',
    sourceInfo: 'Harrods - kutulu',
    aiRiskScore: 'low_medium',
    closesAt: DateTime.now().add(const Duration(days: 7)),
    sellerName: 'Mustafa T. U.',
    sellerTrustScore: 86,
    allowedIncrements: [3, 5, 10],
    participantCount: 4,
    notes: ['Bergamot', 'Frenk Üzümü', 'Misk', 'Amber'],
    bottleSizeMl: 100,
    imageUrl: 'https://images.unsplash.com/photo-1615200044828-9e4ec3ce4d72?w=800',
  ),
  Split(
    id: 's_5',
    brand: 'SHL 777',
    name: 'Pink Boa',
    concentration: 'EDP',
    totalVolumeMl: 50,
    filledMl: 0,
    pricePerMl: 170,
    batchCode: 'SHL2024PB',
    sourceInfo: 'Stéphane Humbert Lucas resmi sitesi - kutulu',
    aiRiskScore: 'low',
    closesAt: DateTime.now().add(const Duration(days: 3)),
    sellerName: 'Hande A.',
    sellerTrustScore: 80,
    allowedIncrements: [3, 5, 10],
    participantCount: 0,
    notes: ['Frenk Üzümü', 'Gül', 'Patchouli', 'Misk'],
    bottleSizeMl: 50,
    imageUrl: 'https://images.unsplash.com/photo-1610461888750-10bfc601b874?w=800',
  ),
];

class FakeSplitsRepository {
  final Ref ref;
  FakeSplitsRepository(this.ref);

  Future<void> _delay() async {
    final ms = ref.read(demoSettingsProvider).delayMs;
    await Future.delayed(Duration(milliseconds: ms));
  }

  Future<List<Split>> listSplits({String filter = 'open'}) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('Splitler yüklenemedi.');
    if (demo.forceEmpty) return const [];
    if (filter == 'bottle_left') {
      return _seed.where((s) => s.hasBottleLeft).toList();
    }
    return List<Split>.from(_seed);
  }

  Future<Split> getSplit(String id) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('Detay yüklenemedi.');
    return _seed.firstWhere((s) => s.id == id);
  }

  Future<String> createReservation(String splitId, int amountMl) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('Rezervasyon oluşturulamadı.');
    return 'res_${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<String> createBottleRequest(String splitId) async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('Şişe talebi başarısız.');
    return 'btl_${DateTime.now().millisecondsSinceEpoch}';
  }
}

final splitsRepositoryProvider =
    Provider<FakeSplitsRepository>((ref) => FakeSplitsRepository(ref));

final splitsListProvider =
    FutureProvider.family<List<Split>, String>((ref, filter) async {
  return ref.watch(splitsRepositoryProvider).listSplits(filter: filter);
});

final splitDetailProvider =
    FutureProvider.family<Split, String>((ref, id) async {
  return ref.watch(splitsRepositoryProvider).getSplit(id);
});
