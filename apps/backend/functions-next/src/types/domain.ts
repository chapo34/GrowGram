// Domain-Typen für User & Feed

export type Compliance = {
  agreed: boolean;
  over18: boolean;
  version?: string;
};

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  city?: string;
  birthDate?: string;
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;

  // ✅ neu hinzugefügt
  isVerified?: boolean;
  compliance?: Compliance;

  createdAt?: string;
  updatedAt?: string;
}

export type Visibility = 'public' | 'followers' | 'private';

export interface FeedPost {
  id: string;
  text: string;
  tags: string[];
  mediaUrls: string[];
  visibility: Visibility;
  createdAt?: string;
  updatedAt?: string;
  // (absichtlich KEIN authorId hier – der Autor wird i.d.R. separat geführt)
}