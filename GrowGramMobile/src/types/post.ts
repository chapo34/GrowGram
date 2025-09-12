// src/types/post.ts
export type MediaType = 'image' | 'video' | 'carousel' | 'growlog';

export interface Post {
  id: string;
  userId: string;
  mediaType: MediaType;
  mediaUrl: string;          // erstes Bild/Video
  thumbUrl?: string;         // kleines Vorschaubild
  aspectRatio?: number;      // z.B. 1, 0.75, 1.25 ...
  mediaCount?: number;       // für Carousel/Before-After
  strain?: string;           // z.B. "OG Kush"
  tags?: string[];           // ['sativa','harvest','macro']
  likeCount?: number;
  commentCount?: number;
  createdAt?: any;           // Firestore Timestamp
  location?: { lat: number; lng: number; name?: string } | null;
}