import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_state.dart';
import '../../../core/models/message.dart';

final List<Conversation> _convs = [
  Conversation(
    id: 'c_1',
    contextType: 'listing',
    contextId: 'l_2',
    contextTitle: 'Parfums de Marly Layton Exclusif',
    contextSubtitle: '75 ml • Ankara',
    otherUserName: 'Ali K.',
    unreadCount: 2,
    lastMessage: 'Takas için Naxos uygun olur mu?',
    lastMessageAt: DateTime.now().subtract(const Duration(minutes: 7)),
  ),
  Conversation(
    id: 'c_2',
    contextType: 'split',
    contextId: 's_1',
    contextTitle: 'Xerjoff Fatal Charme 2021',
    contextSubtitle: '⚗️ SPLIT • 5 ml',
    otherUserName: 'Berke Ö.',
    lastMessage: 'Kargoya bugün veriyorum.',
    lastMessageAt: DateTime.now().subtract(const Duration(hours: 1)),
  ),
  Conversation(
    id: 'c_3',
    contextType: 'listing',
    contextId: 'l_3',
    contextTitle: 'Initio Side Effect',
    contextSubtitle: '90 ml • Takas',
    otherUserName: 'Uğur E.',
    lastMessage: 'Şişeli kalan kontrol edebilir misin?',
    lastMessageAt: DateTime.now().subtract(const Duration(hours: 4)),
  ),
];

final Map<String, List<ChatMessage>> _msgs = {
  'c_1': [
    ChatMessage(
      id: 'm1',
      conversationId: 'c_1',
      senderId: 'other',
      isMine: false,
      content: 'Merhaba, ilanınız hala aktif mi?',
      createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
    ),
    ChatMessage(
      id: 'm2',
      conversationId: 'c_1',
      senderId: 'me',
      isMine: true,
      content: 'Aktif, hangi soru aklınızda?',
      createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
    ),
    ChatMessage(
      id: 'm3',
      conversationId: 'c_1',
      senderId: 'other',
      isMine: false,
      content: 'Takas için Naxos uygun olur mu?',
      createdAt: DateTime.now().subtract(const Duration(minutes: 7)),
    ),
  ],
  'c_2': [
    ChatMessage(
      id: 'm1',
      conversationId: 'c_2',
      senderId: 'other',
      isMine: false,
      content: 'Selam, kargo durumu hakkında bilgi alabilir miyim?',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    ChatMessage(
      id: 'm2',
      conversationId: 'c_2',
      senderId: 'me',
      isMine: true,
      content: 'Kargoya bugün veriyorum, akşam takip numarası geçerim.',
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    ),
  ],
  'c_3': [
    ChatMessage(
      id: 'm1',
      conversationId: 'c_3',
      senderId: 'other',
      isMine: false,
      content: 'Şişeli kalan kontrol edebilir misin?',
      createdAt: DateTime.now().subtract(const Duration(hours: 4)),
    ),
  ],
};

class FakeConversationsRepository {
  final Ref ref;
  FakeConversationsRepository(this.ref);

  Future<void> _delay() async {
    final ms = ref.read(demoSettingsProvider).delayMs;
    await Future.delayed(Duration(milliseconds: ms));
  }

  Future<List<Conversation>> listConversations() async {
    await _delay();
    final demo = ref.read(demoSettingsProvider);
    if (demo.forceError) throw Exception('Konuşmalar yüklenemedi.');
    if (demo.forceEmpty) return const [];
    return List<Conversation>.from(_convs)
      ..sort((a, b) => b.lastMessageAt.compareTo(a.lastMessageAt));
  }

  Future<Conversation> getConversation(String id) async {
    await _delay();
    return _convs.firstWhere((c) => c.id == id);
  }

  Future<List<ChatMessage>> getMessages(String conversationId) async {
    await _delay();
    return List<ChatMessage>.from(_msgs[conversationId] ?? const []);
  }

  Future<ChatMessage> sendMessage(String conversationId, String content) async {
    await _delay();
    final msg = ChatMessage(
      id: 'm_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: 'me',
      isMine: true,
      content: content,
      createdAt: DateTime.now(),
    );
    _msgs.putIfAbsent(conversationId, () => []).add(msg);
    return msg;
  }
}

final conversationsRepositoryProvider =
    Provider<FakeConversationsRepository>(
  (ref) => FakeConversationsRepository(ref),
);

final conversationsListProvider =
    FutureProvider<List<Conversation>>((ref) async {
  return ref.watch(conversationsRepositoryProvider).listConversations();
});

final conversationDetailProvider =
    FutureProvider.family<Conversation, String>((ref, id) async {
  return ref.watch(conversationsRepositoryProvider).getConversation(id);
});

final messagesProvider =
    FutureProvider.family<List<ChatMessage>, String>((ref, id) async {
  return ref.watch(conversationsRepositoryProvider).getMessages(id);
});
