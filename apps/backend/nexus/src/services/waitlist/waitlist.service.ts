import * as Repo from '../../repositories/waitlist.repo.js';

export async function join(email: string) {
  const saved = await Repo.addToWaitlist(email);
  await Repo.bumpMetrics('waitlist_join');
  return saved;
}
export async function count() {
  return Repo.countWaitlist();
}