export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
