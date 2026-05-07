import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_badge.dart';
import '../../../core/widgets/ds_card.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  static final _splitOrders = [
    _Order(
      id: 'o_1',
      title: 'Xerjoff Fatal Charme 2021',
      subtitle: '5 ml • Split',
      amount: 760,
      status: 'Kargoda',
      color: DSColors.info,
      isSplit: true,
    ),
    _Order(
      id: 'o_2',
      title: 'LV Ombre Nomade',
      subtitle: '10 ml • Split',
      amount: 1660,
      status: 'Hazırlanıyor',
      color: DSColors.warning,
      isSplit: true,
    ),
  ];

  static final _marketOrders = [
    _Order(
      id: 'o_3',
      title: 'Tom Ford Oud Wood',
      subtitle: '100 ml • Pazar',
      amount: 8400,
      status: 'Teslim Edildi',
      color: DSColors.success,
      isSplit: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('SİPARİŞLERİM'),
          bottom: const TabBar(
            labelColor: DSColors.accentGold,
            unselectedLabelColor: DSColors.textSecondary,
            indicatorColor: DSColors.accentGold,
            tabs: [
              Tab(text: 'Split Siparişleri'),
              Tab(text: 'Pazar İşlemleri'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _OrderList(orders: _splitOrders),
            _OrderList(orders: _marketOrders),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  final List<_Order> orders;
  const _OrderList({required this.orders});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) {
        final o = orders[i];
        return DSCard(
          leftAccent: o.color,
          onTap: () => context.push('/orders/${o.id}'),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (o.isSplit) DSBadge.split() else DSBadge.listing(),
                        const SizedBox(width: 8),
                        DSBadge(label: o.status, color: o.color),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      o.title,
                      style: const TextStyle(
                        color: DSColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      o.subtitle,
                      style: const TextStyle(
                        color: DSColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                formatTl(o.amount),
                style: const TextStyle(
                  color: DSColors.accentGold,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Order {
  final String id;
  final String title;
  final String subtitle;
  final double amount;
  final String status;
  final Color color;
  final bool isSplit;
  _Order({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.status,
    required this.color,
    required this.isSplit,
  });
}
