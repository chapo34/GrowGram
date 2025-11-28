export type Comment = {
  id: string;
  postId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string | null;
  text: string;
  createdAt: string;
  likes?: number;
};

export type FeedPost = {
  id: string;
  imageUrl: string;
  videoUrl?: string | null;
  caption?: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string | null;
  tags?: string[];
  likes: number;
  commentsCount: number;
  createdAt: string;
};