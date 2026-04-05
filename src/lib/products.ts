import productsJson from "../../data/products.json";

export type ProductCategory = string;

export type Product = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  priceInr: number;
  imageSrc: string;
  sizeOptions?: string[];
  eggless: boolean;
  available: boolean;
};

const products = productsJson as Product[];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Chocolates",
  "Cakes",
  "Bento Cakes",
  "Brownies",
  "Cheesecake",
  "Cookies",
  "Cupcakes",
  "Desserts",
];

export function getProducts(): Product[] {
  return products;
}

export function getCategories(): ProductCategory[] {
  return PRODUCT_CATEGORIES;
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((item) => item.category === category);
}

export function getProductById(id: string): Product | undefined {
  return products.find((item) => item.id === id);
}

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getProductSlug(product: Product) {
  return `${slugifySegment(product.name)}--${product.id}`;
}

export function getProductHref(product: Product) {
  return `/products/${getProductSlug(product)}`;
}

export function getProductIdFromSlug(slug: string) {
  const parts = slug.split("--");
  return parts.length > 1 ? parts.at(-1) ?? "" : slug;
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const DEFAULT_CAKE_SIZE_OPTIONS = [
  "Small (500gm)",
  "Medium (1000gm)",
  "Medium Plus (1500gm)",
  "Large (2000gm)",
  "Large Plus (2500gm)",
  "Extra Large (3000gm)",
];

const DEFAULT_CUPCAKE_COUNT_OPTIONS = [
  "2 cupcakes",
  "4 cupcakes",
  "6 cupcakes",
  "12 cupcakes",
];

const DEFAULT_CHOCOLATE_COUNT_OPTIONS = [
  "6 pieces",
  "12 pieces",
  "24 pieces",
];

const FLAVOR_PATTERNS = [
  { label: "Dark Chocolate", test: /dark chocolate/i },
  { label: "Milk Chocolate", test: /milk chocolate/i },
  { label: "Chocolate", test: /\bchoco(?:late)?\b/i },
  { label: "Truffle", test: /truffle/i },
  { label: "Vanilla", test: /vanilla/i },
  { label: "Strawberry", test: /strawberry/i },
  { label: "Blueberry", test: /blueberry/i },
  { label: "Pineapple", test: /pineapple/i },
  { label: "Red Velvet", test: /red velvet/i },
  { label: "Mango", test: /mango/i },
  { label: "Lotus Biscoff", test: /biscoff|lotus/i },
  { label: "Butter", test: /butter/i },
  { label: "Almond", test: /almond/i },
  { label: "Walnut", test: /walnut/i },
  { label: "Cherry", test: /cherry/i },
  { label: "Fudge", test: /fudge/i },
  { label: "Cream", test: /cream/i },
];

function inferFlavorLabels(product: Product) {
  const haystack = `${product.name} ${product.description}`.toLowerCase();
  return FLAVOR_PATTERNS.filter((entry) => entry.test.test(haystack)).map((entry) => entry.label);
}

export function getDisplaySizeOptions(product: Product): string[] {
  if (product.sizeOptions?.length) {
    return product.sizeOptions.map((value) => value.trim()).filter(Boolean);
  }

  if (/cupcake/i.test(product.category)) {
    return DEFAULT_CUPCAKE_COUNT_OPTIONS;
  }

  if (/chocolate/i.test(product.category)) {
    return DEFAULT_CHOCOLATE_COUNT_OPTIONS;
  }

  if (/(^| )cakes?$/i.test(product.category) || /cake/i.test(product.category)) {
    return DEFAULT_CAKE_SIZE_OPTIONS;
  }

  return [];
}

export function getProductOptionLabel(product: Product) {
  if (/cupcake/i.test(product.category)) return "Count";
  if (/chocolate/i.test(product.category)) return "Count";
  return "Sizes";
}

export function getDisplayFlavorOptions(
  product: Product,
  availableProducts: Product[] = products
): string[] {
  const sameCategory = availableProducts.filter((item) => item.category === product.category);
  const preferred = inferFlavorLabels(product);
  const categoryFlavors = sameCategory.flatMap((item) => inferFlavorLabels(item));
  const fallback = [product.subCategory, product.category]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set([...preferred, ...categoryFlavors, ...fallback])).slice(0, 8);
}
