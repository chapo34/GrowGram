import type { User } from '../../repositories/users.repo.js';
import * as Users from '../../repositories/users.repo.js';

export async function getPublicProfile(userId: string): Promise<User | null> {
  return Users.getUserById(userId);
}

export async function update(userId: string, patch: Partial<User>): Promise<User | null> {
  const safe: Partial<User> = {
    firstName: patch.firstName,
    lastName : patch.lastName,
    city     : patch.city,
    bio      : patch.bio,
    avatarUrl: patch.avatarUrl,
    privateProfile: patch.privateProfile,
    hideSensitive: patch.hideSensitive,
    pushOptIn: patch.pushOptIn,
  };
  await Users.updateUser(userId, safe);
  return Users.getUserById(userId);
}