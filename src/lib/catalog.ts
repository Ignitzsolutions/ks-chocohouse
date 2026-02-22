export type CakeProduct = {
  id: string;
  name: string;
  description: string;
  priceInr: number;
  tags: string[];
  serves: string;
  imageSrc: string;
};

export const CAKE_PRODUCTS: CakeProduct[] = [
  {
    id: "lily-rose",
    name: "Lily Rose",
    description: "Rose buttercream, almond chiffon, berry heart.",
    priceInr: 2200,
    tags: ["Birthday", "Floral"],
    serves: "8-12",
    imageSrc: "/cakes/lily-rose.svg",
  },
  {
    id: "noir-velvet",
    name: "Noir Velvet",
    description: "Dark cocoa sponge, cherry compote, silk ganache.",
    priceInr: 2600,
    tags: ["Signature", "Dark"],
    serves: "10-14",
    imageSrc: "/cakes/noir-velvet.svg",
  },
  {
    id: "citrus-halo",
    name: "Citrus Halo",
    description: "Yuzu glaze, vegan sponge, candied zest.",
    priceInr: 1950,
    tags: ["Vegan", "Fresh"],
    serves: "8-10",
    imageSrc: "/cakes/citrus-halo.svg",
  },
  {
    id: "saffron-silk",
    name: "Saffron Silk",
    description: "Saffron milk soak, pistachio crumble, silk cream.",
    priceInr: 2900,
    tags: ["Premium", "Indian"],
    serves: "10-16",
    imageSrc: "/cakes/saffron-silk.svg",
  },
  {
    id: "garden-chiffon",
    name: "Garden Chiffon",
    description: "Eggless vanilla chiffon, jasmine syrup, berry glaze.",
    priceInr: 2100,
    tags: ["Eggless", "Soft"],
    serves: "8-12",
    imageSrc: "/cakes/garden-chiffon.svg",
  },
  {
    id: "midnight-tiramisu",
    name: "Midnight Tiramisu",
    description: "Coffee soak, mascarpone mousse, cocoa finish.",
    priceInr: 2500,
    tags: ["Coffee", "Bestseller"],
    serves: "10-14",
    imageSrc: "/cakes/midnight-tiramisu.svg",
  },
];

export const CAKE_CATEGORIES = [
  "All",
  "Birthday",
  "Wedding",
  "Anniversary",
  "Custom",
  "Eggless",
  "Vegan",
  "Sugar-free",
] as const;

export function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

