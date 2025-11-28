export type UserLite = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
};

export type Chat = {
  id: string;
  title?: string | null;
  isGroup: boolean;
  lastMessage?: Message | null;
  updatedAt: string;
  unreadCount?: number;
  users: UserLite[];
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string | null;
};

export type ChatListItem = Chat;