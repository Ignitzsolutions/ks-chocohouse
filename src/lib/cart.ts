export type CartItem = {
  productId: string;
  qty: number;
  sizeLabel?: string;
  customizationNote?: string;
};

const CART_KEY = "bakery_cart_v1";
const CART_EVENT = "bakery-cart-updated";

function hasWindow() {
  return typeof window !== "undefined";
}

export function getCartItemKey(productId: string, sizeLabel?: string) {
  return `${productId}::${sizeLabel?.trim() || ""}`;
}

function matchesCartItem(item: CartItem, productId: string, sizeLabel?: string) {
  return getCartItemKey(item.productId, item.sizeLabel) === getCartItemKey(productId, sizeLabel);
}

export function getCart(): CartItem[] {
  return parseCartStorageSnapshot(getCartStorageSnapshot());
}

export function getCartStorageSnapshot() {
  if (!hasWindow()) return "[]";
  return localStorage.getItem(CART_KEY) ?? "[]";
}

export function parseCartStorageSnapshot(raw: string): CartItem[] {
  if (!hasWindow()) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return parsed
      .map((item) => ({
        productId: item.productId,
        qty: Number(item.qty ?? 0),
        sizeLabel: item.sizeLabel?.trim() || undefined,
        customizationNote:
          typeof item.customizationNote === "string" && item.customizationNote.length > 0
            ? item.customizationNote.slice(0, 240)
            : undefined,
      }))
      .filter((i) => i.qty > 0 && Boolean(i.productId));
  } catch {
    return [];
  }
}

export function subscribeCart(listener: () => void) {
  if (!hasWindow()) return () => undefined;

  const onCartChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY) {
      listener();
    }
  };

  window.addEventListener(CART_EVENT, onCartChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CART_EVENT, onCartChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveCart(items: CartItem[]) {
  if (!hasWindow()) return;
  localStorage.setItem(CART_KEY, JSON.stringify(items.filter((i) => i.qty > 0)));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addItem(productId: string, qty = 1, sizeLabel?: string) {
  const cart = getCart();
  const existing = cart.find((item) => matchesCartItem(item, productId, sizeLabel));
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, qty, sizeLabel: sizeLabel?.trim() || undefined });
  }
  saveCart(cart);
  return cart;
}

export function updateQty(productId: string, qty: number, sizeLabel?: string) {
  const cart = getCart();
  const next = cart
    .map((item) =>
      matchesCartItem(item, productId, sizeLabel)
        ? { ...item, qty: Math.max(0, qty) }
        : item
    )
    .filter((item) => item.qty > 0);
  saveCart(next);
  return next;
}

export function removeItem(productId: string, sizeLabel?: string) {
  const cart = getCart().filter((item) => !matchesCartItem(item, productId, sizeLabel));
  saveCart(cart);
  return cart;
}

export function setItemCustomizationNote(productId: string, note: string, sizeLabel?: string) {
  const normalized = note.replace(/\r\n/g, "\n").slice(0, 240);
  const cart = getCart().map((item) =>
    matchesCartItem(item, productId, sizeLabel)
      ? {
          ...item,
          customizationNote: normalized.length > 0 ? normalized : undefined,
        }
      : item
  );
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}
