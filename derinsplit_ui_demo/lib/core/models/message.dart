class Conversation {
  final String id;
  final String contextType; // listing | split
  final String contextId;
  final String contextTitle;
  final String? contextSubtitle;
  final String otherUserName;
  final int unreadCount;
  final String lastMessage;
  final DateTime lastMessageAt;

  const Conversation({
    required this.id,
    required this.contextType,
    required this.contextId,
    required this.contextTitle,
    this.contextSubtitle,
    required this.otherUserName,
    this.unreadCount = 0,
    required this.lastMessage,
    required this.lastMessageAt,
  });
}

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final bool isMine;
  final String content;
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.isMine,
    required this.content,
    required this.createdAt,
  });
}
