import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_card.dart';
import '../../../core/widgets/ds_state.dart';
import '../data/fake_conversations_repository.dart';

class MessagesListScreen extends ConsumerWidget {
  const MessagesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('MESAJLAR')),
      body: RefreshIndicator(
        color: DSColors.accentGold,
        onRefresh: () async => ref.invalidate(conversationsListProvider),
        child: async.when(
          loading: () => const DSLoading(),
          error: (e, _) => DSErrorState(message: e.toString()),
          data: (items) {
            if (items.isEmpty) {
              return const DSEmptyState(
                icon: Icons.chat_bubble_outline,
                title: 'Henüz mesaj yok',
                subtitle: 'Bir ilana mesaj göndererek konuşma başlat.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final c = items[i];
                return DSCard(
                  leftAccent: c.contextType == 'split'
                      ? DSColors.accentGold
                      : DSColors.info,
                  onTap: () => context.push('/messages/${c.id}'),
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: DSColors.bgTertiary,
                        child: Text(
                          c.otherUserName[0],
                          style: const TextStyle(
                            color: DSColors.accentGold,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    c.otherUserName,
                                    style: const TextStyle(
                                      color: DSColors.textPrimary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                Text(
                                  timeAgo(c.lastMessageAt),
                                  style: const TextStyle(
                                    color: DSColors.textTertiary,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              c.contextTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: c.contextType == 'split'
                                    ? DSColors.accentGold
                                    : DSColors.info,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              c.lastMessage,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: c.unreadCount > 0
                                    ? DSColors.textPrimary
                                    : DSColors.textSecondary,
                                fontWeight: c.unreadCount > 0
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (c.unreadCount > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: DSColors.accentGold,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${c.unreadCount}',
                            style: const TextStyle(
                              color: DSColors.bgPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
