export type CartItem = {
  productId: string;
  qty: number;
  customizationNote?: string;
};

const CART_KEY = "bakery_cart_v1";

function hasWindow() {
  return typeof window !== "undefined";
}

export function getCart(): CartItem[] {
  if (!hasWindow()) return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return parsed
      .map((item) => ({
        productId: item.productId,
        qty: Number(item.qty ?? 0),
        customizationNote: item.customizationNote?.trimEnd() || undefined,
      }))
      .filter((i) => i.qty > 0 && Boolean(i.productId));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (!hasWindow()) return;
  localStorage.setItem(CART_KEY, JSON.stringify(items.filter((i) => i.qty > 0)));
}

export function addItem(productId: string, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, qty });
  }
  saveCart(cart);
  return cart;
}

export function updateQty(productId: string, qty: number) {
  const cart = getCart();
  const next = cart
    .map((item) =>
      item.productId === productId ? { ...item, qty: Math.max(0, qty) } : item
    )
    .filter((item) => item.qty > 0);
  saveCart(next);
  return next;
}

export function removeItem(productId: string) {
  const cart = getCart().filter((item) => item.productId !== productId);
  saveCart(cart);
  return cart;
}

export function setItemCustomizationNote(productId: string, note: string) {
  const trimmed = note.trimEnd();
  const cart = getCart().map((item) =>
    item.productId === productId
      ? {
          ...item,
          customizationNote: trimmed ? trimmed.slice(0, 240) : undefined,
        }
      : item
  );
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}
