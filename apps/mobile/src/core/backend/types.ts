export type FeedPostAuthor = {
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
};

export type FeedPost = {
  id: string;
  text?: string;
  caption?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string | null;
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  score?: number;
  createdAt?: any;
  visibility?: 'public' | 'private';
  author?: FeedPostAuthor;
  location?: string;
  _liked?: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  text: string;
  author?: { id?: string; name?: string; avatarUrl?: string };
  likesCount?: number;
  liked?: boolean;
  createdAt: string;
};

export type UserMe = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  city?: string;
  birthDate?: string;
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;
};

export type Chat = {
  id: string;
  members: string[];
  membersKey?: string;
  lastMessage?: string;
  lastSender?: string;
  updatedAt?: any;
  unread?: Record<string, number>;
  peer?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
};

export type ChatMessage = {
  id: string;
  senderId: string;
  type: 'text';
  text: string;
  createdAt: any;
};

export type ApiChatMessage = ChatMessage;

export type MediaPart = { uri: string; name: string; type: string };
