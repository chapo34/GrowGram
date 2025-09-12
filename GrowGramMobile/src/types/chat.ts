// Basis für Nutzerobjekte (z. B. für Suche, Gruppen etc.)
export type UserLite = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
};

// Chat-Typ für Direktnachrichten und Gruppen
export type Chat = {
  id: string;
  peer?: UserLite;              // Bei Direktnachricht
  lastMessage?: string;
  updatedAt?: any;              // Timestamp oder Date-kompatibel
  unread?: { [userId: string]: number };

  // Gruppen-spezifisch:
  isGroup?: boolean;
  groupName?: string;
  groupPhotoUrl?: string;

  // Extra-Status
  archived?: boolean;
  muted?: boolean;
  title?: string;               // optional überschreibbarer Titel
  photoUrl?: string;           // optional Gruppenbild/Avatar
};