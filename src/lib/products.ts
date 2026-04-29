import productsJson from "../../data/products.json";

export type ProductCategory = string;
export type ProductPricingMode = "kg" | "pcs";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  subCategoryId?: string;
  pricingMode: ProductPricingMode;
  priceInr: number;
  basePricePerKgInr?: number | null;
  pieceLabel?: string;
  imageSrc: string;
  imageGallery: string[];
  sizeOptions?: string[];
  flavors?: string[];
  flavorSelectionEnabled?: boolean;
  eggless: boolean;
  available: boolean;
};

type RawProduct = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  subCategoryId?: string;
  pricingMode?: string;
  priceInr: number;
  basePricePerKgInr?: number | null;
  pieceLabel?: string;
  imageSrc: string;
  imageGallery?: string[];
  sizeOptions?: string[];
  flavors?: string[];
  flavorSelectionEnabled?: boolean;
  eggless: boolean;
  available: boolean;
};

const DEFAULT_CAKE_SIZE_OPTIONS = [
  "Small (500gm)",
  "Medium (1000gm)",
  "Medium Plus (1500gm)",
  "Large (2000gm)",
];

const DEFAULT_CUPCAKE_COUNT_OPTIONS = ["2 cupcakes", "4 cupcakes", "6 cupcakes", "12 cupcakes"];
const DEFAULT_CHOCOLATE_COUNT_OPTIONS = ["6 pieces", "12 pieces", "24 pieces"];

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

function inferPricingMode(raw: RawProduct): ProductPricingMode {
  const normalized = String(raw.pricingMode ?? "").trim().toLowerCase();
  if (normalized === "kg" || normalized === "pcs") {
    return normalized;
  }

  const haystack = `${raw.category} ${raw.name} ${raw.subCategory}`.toLowerCase();
  if (/cupcake|chocolate|cookies?|brownie|dessert|jar|cup/.test(haystack)) {
    return "pcs";
  }
  return "kg";
}

function inferPieceLabel(raw: RawProduct, pricingMode: ProductPricingMode) {
  if (pricingMode !== "pcs") return "";
  const explicit = String(raw.pieceLabel ?? "").trim();
  if (explicit) return explicit;
  if (/cupcake/i.test(raw.category)) return "cupcakes";
  if (/cookie/i.test(raw.category)) return "cookies";
  if (/brownie/i.test(raw.category)) return "brownies";
  return "pieces";
}

function normalizeGallery(raw: RawProduct) {
  const gallery = Array.isArray(raw.imageGallery)
    ? raw.imageGallery.map((value) => String(value).trim()).filter(Boolean)
    : [];
  return Array.from(new Set([raw.imageSrc, ...gallery].filter(Boolean)));
}

function toProduct(raw: RawProduct): Product {
  const pricingMode = inferPricingMode(raw);
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    subCategory: raw.subCategory,
    subCategoryId: raw.subCategoryId,
    pricingMode,
    priceInr: Number(raw.priceInr),
    basePricePerKgInr:
      pricingMode === "kg"
        ? Number(raw.basePricePerKgInr ?? raw.priceInr) || Number(raw.priceInr)
        : null,
    pieceLabel: inferPieceLabel(raw, pricingMode),
    imageSrc: raw.imageSrc,
    imageGallery: normalizeGallery(raw),
    sizeOptions: raw.sizeOptions?.map((value) => value.trim()).filter(Boolean),
    flavors: Array.isArray(raw.flavors)
      ? raw.flavors.map((value) => String(value).trim()).filter(Boolean)
      : [],
    flavorSelectionEnabled: raw.flavorSelectionEnabled === true,
    eggless: raw.eggless,
    available: raw.available,
  };
}

const products = (productsJson as RawProduct[]).map(toProduct);

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseWeightKg(sizeLabel?: string) {
  const raw = String(sizeLabel ?? "").trim().toLowerCase();
  const gmMatch = raw.match(/(\d+(?:\.\d+)?)\s*gm\b/);
  if (gmMatch) return Number(gmMatch[1]) / 1000;
  const kgMatch = raw.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kgMatch) return Number(kgMatch[1]);
  return null;
}

export function getDisplaySizeOptions(product: Product): string[] {
  if (product.sizeOptions?.length) {
    return product.sizeOptions.map((value) => value.trim()).filter(Boolean);
  }

  if (product.pricingMode === "pcs") {
    if (/cupcake/i.test(product.category)) return DEFAULT_CUPCAKE_COUNT_OPTIONS;
    if (/chocolate/i.test(product.category)) return DEFAULT_CHOCOLATE_COUNT_OPTIONS;
    return [];
  }

  return DEFAULT_CAKE_SIZE_OPTIONS;
}

export function getProductOptionLabel(product: Product) {
  if (product.pricingMode === "pcs") {
    return product.pieceLabel || "Pieces";
  }
  return "Sizes";
}

export function getProductPriceForOption(product: Product, optionLabel?: string) {
  const toMoney = (value: number) => Math.max(0, Number(value.toFixed(2)));
  if (product.pricingMode === "kg") {
    const weightKg = parseWeightKg(optionLabel);
    const base = Number(product.basePricePerKgInr ?? product.priceInr ?? 0);
    if (weightKg && base > 0) {
      return toMoney(base * weightKg);
    }
    return toMoney(product.priceInr);
  }

  return toMoney(product.priceInr);
}

export function getPriceDisplayMeta(product: Product, optionLabel?: string) {
  const finalPrice = getProductPriceForOption(product, optionLabel);
  return {
    finalPrice,
    finalPriceLabel: formatInr(finalPrice),
    pricePerKgLabel:
      product.pricingMode === "kg" && Number(product.basePricePerKgInr ?? 0) > 0
        ? `${formatInr(Number(product.basePricePerKgInr))} / kg`
        : null,
  };
}

function inferFlavorLabels(product: Product) {
  const haystack = `${product.name} ${product.description}`.toLowerCase();
  return FLAVOR_PATTERNS.filter((entry) => entry.test.test(haystack)).map((entry) => entry.label);
}

export function getDisplayFlavorOptions(
  product: Product,
  availableProducts: Product[] = products
): string[] {
  const explicitFlavors = Array.isArray(product.flavors)
    ? product.flavors.map((value) => String(value).trim()).filter(Boolean)
    : [];
  if (explicitFlavors.length > 0) {
    return Array.from(new Set(explicitFlavors));
  }

  const sameCategory = availableProducts.filter((item) => item.category === product.category);
  const preferred = inferFlavorLabels(product);
  const categoryFlavors = sameCategory.flatMap((item) => inferFlavorLabels(item));
  const fallback = [product.subCategory, product.category]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set([...preferred, ...categoryFlavors, ...fallback])).slice(0, 8);
}
