import 'package:intl/intl.dart';

final _tlFormat = NumberFormat.currency(
  locale: 'tr_TR',
  symbol: '₺',
  decimalDigits: 0,
);

final _tlFormat2 = NumberFormat.currency(
  locale: 'tr_TR',
  symbol: '₺',
  decimalDigits: 2,
);

String formatTl(num value, {bool decimals = false}) {
  return decimals ? _tlFormat2.format(value) : _tlFormat.format(value);
}

String formatPricePerMl(double pricePerMl) {
  return '${_tlFormat.format(pricePerMl)}/ml';
}

String timeAgo(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 1) return 'şimdi';
  if (diff.inMinutes < 60) return '${diff.inMinutes} dk';
  if (diff.inHours < 24) return '${diff.inHours} sa';
  if (diff.inDays < 7) return '${diff.inDays} g';
  return DateFormat('dd MMM', 'tr_TR').format(dt);
}

String countdown(DateTime target) {
  final diff = target.difference(DateTime.now());
  if (diff.isNegative) return 'kapandı';
  if (diff.inDays > 0) return '${diff.inDays} gün';
  if (diff.inHours > 0) return '${diff.inHours} saat';
  return '${diff.inMinutes} dk';
}
