class AppUser {
  final String id;
  final String name;
  final String phone;
  final String role; // 'user' | 'trusted_seller'
  final bool canListItems;
  final bool phoneVerified;
  final int trustScore;
  final String? city;

  const AppUser({
    required this.id,
    required this.name,
    required this.phone,
    this.role = 'user',
    this.canListItems = false,
    this.phoneVerified = false,
    this.trustScore = 0,
    this.city,
  });

  AppUser copyWith({
    String? name,
    String? role,
    bool? canListItems,
    bool? phoneVerified,
    int? trustScore,
    String? city,
  }) {
    return AppUser(
      id: id,
      name: name ?? this.name,
      phone: phone,
      role: role ?? this.role,
      canListItems: canListItems ?? this.canListItems,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      trustScore: trustScore ?? this.trustScore,
      city: city ?? this.city,
    );
  }

  bool get isTrustedSeller => role == 'trusted_seller';
}
