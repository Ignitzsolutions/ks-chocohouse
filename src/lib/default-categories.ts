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
    imageSrc: "/images/products/cakes/dark-chocolate-brownie-cake.jpg",
    alt: "Dark chocolate brownie cake",
    category: "Brownies",
    sortOrder: 4,
  },
  {
    id: "cheesecake",
    label: "Cheesecake",
    imageSrc: "/images/products/cakes/milk-chocolate-truffle-cake.jpg",
    alt: "Creamy cake selection",
    category: "Cheesecake",
    sortOrder: 5,
  },
  {
    id: "cookies",
    label: "Cookies",
    imageSrc: "/images/products/chocolates/dark-chocolate-almond-rock.jpg",
    alt: "Chocolate bite selection",
    category: "Cookies",
    sortOrder: 6,
  },
  {
    id: "cupcakes",
    label: "Cupcakes",
    imageSrc: "/images/products/cakes/red-velvet-cake.jpg",
    alt: "Cupcake style selection",
    category: "Cupcakes",
    sortOrder: 7,
  },
  {
    id: "desserts",
    label: "Desserts",
    imageSrc: "/images/products/cakes/plum-cake.jpg",
    alt: "Dessert selection",
    category: "Desserts",
    sortOrder: 8,
  },
];
