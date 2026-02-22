export type CategoryCard = {
  id: string;
  label: string;
  imageSrc: string;
  alt: string;
  category: string;
  sortOrder: number;
};

export const DEFAULT_CATEGORY_CARDS: CategoryCard[] = [
  {
    id: "chocolates",
    label: "Chocolates",
    imageSrc: "/images/products/chocolates/dark-chocolate-almond-rock.jpg",
    alt: "Dark chocolate almond rock",
    category: "Chocolates",
    sortOrder: 1,
  },
  {
    id: "cakes",
    label: "Cakes",
    imageSrc: "/images/products/cakes/dark-chocolate-truffle-cake.jpg",
    alt: "Dark chocolate truffle cake",
    category: "Cakes",
    sortOrder: 2,
  },
  {
    id: "bento-cakes",
    label: "Bento Cakes",
    imageSrc: "/images/products/cakes/theme-cake-boss-baby-half-birthday.jpg",
    alt: "Boss baby half birthday cake",
    category: "Bento Cakes",
    sortOrder: 3,
  },
  {
    id: "brownies",
    label: "Brownies",
    imageSrc: "/images/categories/cakes.svg",
    alt: "Brownie category image",
    category: "Brownies",
    sortOrder: 4,
  },
  {
    id: "cheesecake",
    label: "Cheesecake",
    imageSrc: "/images/categories/cakes.svg",
    alt: "Cheesecake category image",
    category: "Cheesecake",
    sortOrder: 5,
  },
  {
    id: "cookies",
    label: "Cookies",
    imageSrc: "/images/categories/chocolates.svg",
    alt: "Cookies category image",
    category: "Cookies",
    sortOrder: 6,
  },
  {
    id: "cupcakes",
    label: "Cupcakes",
    imageSrc: "/images/categories/bento.svg",
    alt: "Cupcake category image",
    category: "Cupcakes",
    sortOrder: 7,
  },
  {
    id: "desserts",
    label: "Desserts",
    imageSrc: "/images/categories/cakes.svg",
    alt: "Desserts category image",
    category: "Desserts",
    sortOrder: 8,
  },
];
