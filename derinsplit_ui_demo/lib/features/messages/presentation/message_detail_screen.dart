import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/ds_chip.dart';
import '../../../core/widgets/ds_state.dart';
import '../../../core/widgets/ds_typing.dart';
import '../data/fake_conversations_repository.dart';

class MessageDetailScreen extends ConsumerStatefulWidget {
  final String conversationId;
  const MessageDetailScreen({super.key, required this.conversationId});

  @override
  ConsumerState<MessageDetailScreen> createState() =>
      _MessageDetailScreenState();
}

class _MessageDetailScreenState extends ConsumerState<MessageDetailScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;
  bool _otherTyping = false;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    await ref
        .read(conversationsRepositoryProvider)
        .sendMessage(widget.conversationId, text);
    _input.clear();
    ref.invalidate(messagesProvider(widget.conversationId));
    if (!mounted) return;
    setState(() {
      _sending = false;
      _otherTyping = true;
    });
    Future.delayed(const Duration(milliseconds: 2400), () {
      if (mounted) setState(() => _otherTyping = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final convAsync = ref.watch(conversationDetailProvider(widget.conversationId));
    final msgsAsync = ref.watch(messagesProvider(widget.conversationId));

    return Scaffold(
      appBar: AppBar(
        title: convAsync.when(
          loading: () => const Text('...'),
          error: (_, __) => const Text('Konuşma'),
          data: (c) => Text(
            c.otherUserName,
            style: const TextStyle(letterSpacing: 0.5),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.flag_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Raporla / Engelle (demo)')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          convAsync.maybeWhen(
            data: (c) => Container(
              color: DSColors.bgSecondary,
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 10),
              child: GestureDetector(
                onTap: () {
                  if (c.contextType == 'listing') {
                    context.push('/listings/${c.contextId}');
                  } else {
                    context.push('/splits/${c.contextId}');
                  }
                },
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: DSColors.bgTertiary,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: DSColors.surface),
                      ),
                      child: Icon(
                        c.contextType == 'split'
                            ? Icons.science
                            : Icons.storefront,
                        color: DSColors.accentGold,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.contextTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: DSColors.textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (c.contextSubtitle != null)
                            Text(
                              c.contextSubtitle!,
                              style: const TextStyle(
                                color: DSColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right,
                        color: DSColors.textTertiary),
                  ],
                ),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          Expanded(
            child: msgsAsync.when(
              loading: () => const DSLoading(),
              error: (e, _) => DSErrorState(message: e.toString()),
              data: (items) {
                if (items.isEmpty) {
                  return const DSEmptyState(
                    icon: Icons.chat_bubble_outline,
                    title: 'Konuşmaya başla',
                    subtitle: 'Aşağıdan ilk mesajını gönder.',
                  );
                }
                return ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.all(12),
                  itemCount: items.length + (_otherTyping ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == items.length && _otherTyping) {
                      return Align(
                        alignment: Alignment.centerLeft,
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 220),
                          child: DSTypingIndicator(
                            key: const ValueKey('typing'),
                            name: 'Karşı taraf',
                          ),
                        ),
                      );
                    }
                    final m = items[i];
                    return Align(
                      alignment: m.isMine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.78,
                        ),
                        decoration: BoxDecoration(
                          color: m.isMine
                              ? DSColors.accentGold
                              : DSColors.bgSecondary,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(14),
                            topRight: const Radius.circular(14),
                            bottomLeft: Radius.circular(m.isMine ? 14 : 4),
                            bottomRight: Radius.circular(m.isMine ? 4 : 14),
                          ),
                          border: m.isMine
                              ? null
                              : Border.all(color: DSColors.surface),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              m.content,
                              style: TextStyle(
                                color: m.isMine
                                    ? DSColors.bgPrimary
                                    : DSColors.textPrimary,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              timeAgo(m.createdAt),
                              style: TextStyle(
                                color: m.isMine
                                    ? DSColors.bgPrimary.withOpacity(0.6)
                                    : DSColors.textTertiary,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            color: DSColors.bgSecondary,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  DSFilterChip(
                    label: 'Kutusu mevcut mu?',
                    onTap: () {
                      _input.text = 'Kutusu mevcut mu?';
                    },
                  ),
                  const SizedBox(width: 6),
                  DSFilterChip(
                    label: 'Kalan ml net kaç?',
                    onTap: () {
                      _input.text = 'Kalan ml net kaç?';
                    },
                  ),
                  const SizedBox(width: 6),
                  DSFilterChip(
                    label: 'Fiyat son mudur?',
                    onTap: () {
                      _input.text = 'Fiyat son mudur?';
                    },
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              color: DSColors.bgSecondary,
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      style: const TextStyle(color: DSColors.textPrimary),
                      decoration: InputDecoration(
                        fillColor: DSColors.bgTertiary,
                        filled: true,
                        hintText: 'Mesaj yaz...',
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: DSColors.accentGold,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _send,
                      child: const Padding(
                        padding: EdgeInsets.all(12),
                        child: Icon(Icons.send,
                            color: DSColors.bgPrimary, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
