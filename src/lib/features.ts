export function isGiftCollectionEnabled() {
  const raw = process.env.NEXT_PUBLIC_ENABLE_GIFT_COLLECTION ?? process.env.ENABLE_GIFT_COLLECTION;
  if (!raw) return false;

  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
