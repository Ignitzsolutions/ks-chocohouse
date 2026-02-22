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

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
