"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import {
  formatInr,
  getPriceDisplayMeta,
  type ProductCategory,
  type ProductPricingMode,
} from "@/lib/products";

type AdminProduct = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  subCategoryId?: string | null;
  pricingMode: ProductPricingMode;
  priceInr: number;
  basePricePerKgInr?: number | null;
  pieceLabel?: string | null;
  imageSrc: string;
  imageGallery?: string[];
  sizeOptions?: string[];
  flavorSelectionEnabled?: boolean;
  flavorIds?: string[];
  flavors?: string[];
  eggless: boolean;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ProductForm = {
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  subCategoryId: string;
  pricingMode: ProductPricingMode;
  priceInr: string;
  basePricePerKgInr: string;
  pieceLabel: string;
  imageSrc: string;
  imageGallery: string[];
  sizeOptions: string;
  flavorSelectionEnabled: boolean;
  flavorIds: string[];
  eggless: boolean;
  available: boolean;
};

type AdminCategory = {
  id: string;
  name: string;
  imageSrc: string;
  sortOrder: number;
};

type AdminSubCategory = {
  id: string;
  categoryName: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

type AdminFlavor = {
  id: string;
  name: string;
  active: boolean;
};

function buildEmptyForm(defaultCategory: string): ProductForm {
  return {
    name: "",
    description: "",
    category: defaultCategory,
    subCategory: "",
    subCategoryId: "",
    pricingMode: "kg",
    priceInr: "",
    basePricePerKgInr: "",
    pieceLabel: "",
    imageSrc: "",
    imageGallery: [],
    sizeOptions: "",
    flavorSelectionEnabled: false,
    flavorIds: [],
    eggless: true,
    available: true,
  };
}

const EMPTY_CATEGORY_FORM = {
  name: "",
  imageSrc: "",
};

const EMPTY_SUBCATEGORY_FORM = {
  categoryName: "",
  name: "",
};

const EMPTY_FLAVOR_FORM = {
  name: "",
};

function normalizeImageSrc(value: string) {
  const cleaned = value.trim().replaceAll("\\", "/");
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `/${cleaned.replace(/^\/+/, "")}`;
}

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [flavors, setFlavors] = useState<AdminFlavor[]>([]);
  const [form, setForm] = useState<ProductForm>(buildEmptyForm("Chocolates"));
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [subcategoryForm, setSubcategoryForm] = useState(EMPTY_SUBCATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingFlavorId, setEditingFlavorId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [subcategorySaving, setSubcategorySaving] = useState(false);
  const [flavorForm, setFlavorForm] = useState(EMPTY_FLAVOR_FORM);
  const [flavorSaving, setFlavorSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryUploading, setCategoryUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const heading = useMemo(
    () => (editingId ? "Edit Product" : "Add Product"),
    [editingId]
  );
  const categoryHeading = useMemo(
    () => (editingCategoryId ? "Edit Category" : "Add Category"),
    [editingCategoryId]
  );
  const subcategoryHeading = useMemo(
    () => (editingSubcategoryId ? "Edit Subcategory" : "Add Subcategory"),
    [editingSubcategoryId]
  );
  const flavorHeading = useMemo(
    () => (editingFlavorId ? "Edit Flavor" : "Add Flavor"),
    [editingFlavorId]
  );

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = (await response.json()) as { products?: AdminProduct[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load products");
      setProducts(data.products ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const response = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = (await response.json()) as {
      categories?: AdminCategory[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error ?? "Failed to load categories");
    const rows = data.categories ?? [];
    setCategories(rows);
    setForm((prev) => {
      if (prev.category) return prev;
      return {
        ...prev,
        category: rows[0]?.name ?? "Chocolates",
      };
    });
  };

  const loadSubCategories = async () => {
    const response = await fetch("/api/admin/subcategories", { cache: "no-store" });
    const data = (await response.json()) as {
      subcategories?: AdminSubCategory[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error ?? "Failed to load subcategories");
    setSubCategories(data.subcategories ?? []);
  };

  const loadFlavors = async () => {
    const response = await fetch("/api/admin/flavors", { cache: "no-store" });
    const data = (await response.json()) as {
      flavors?: AdminFlavor[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error ?? "Failed to load flavors");
    setFlavors(data.flavors ?? []);
  };

  useEffect(() => {
    void (async () => {
      await loadCategories();
      await loadSubCategories();
      await loadFlavors();
      await loadProducts();
    })();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    setForm((prev) => {
      if (categories.some((category) => category.name === prev.category)) return prev;
      return {
        ...prev,
        category: categories[0].name,
      };
    });
  }, [categories]);

  useEffect(() => {
    setSubcategoryForm((prev) =>
      prev.categoryName ? prev : { ...prev, categoryName: form.category || categories[0]?.name || "" }
    );
  }, [categories, form.category]);

  const subCategoriesForSelectedCategory = useMemo(
    () =>
      subCategories.filter(
        (subcategory) => subcategory.categoryName === form.category && subcategory.active
      ),
    [form.category, subCategories]
  );

  const parsedSizeOptions = useMemo(
    () =>
      form.sizeOptions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [form.sizeOptions]
  );

  const pricingPreview = useMemo(
    () =>
      getPriceDisplayMeta(
        {
          id: "preview",
          name: form.name || "Preview",
          description: form.description || "Preview",
          category: form.category,
          subCategory: form.subCategory,
          subCategoryId: form.subCategoryId || undefined,
          pricingMode: form.pricingMode,
          priceInr: Number(form.priceInr || 0),
          basePricePerKgInr:
            form.pricingMode === "kg" ? Number(form.basePricePerKgInr || form.priceInr || 0) : null,
          pieceLabel: form.pieceLabel || undefined,
          imageSrc: form.imageSrc || "/images/categories/cakes.svg",
          imageGallery: form.imageGallery,
          sizeOptions: parsedSizeOptions,
          eggless: form.eggless,
          available: form.available,
        },
        parsedSizeOptions[0]
      ),
    [form, parsedSizeOptions]
  );

  useEffect(() => {
    if (subCategoriesForSelectedCategory.length === 0) {
      setForm((prev) => ({ ...prev, subCategoryId: "", subCategory: "" }));
      return;
    }

    setForm((prev) => {
      const current = subCategoriesForSelectedCategory.find((item) => item.id === prev.subCategoryId);
      if (current) {
        return { ...prev, subCategory: current.name };
      }
      const first = subCategoriesForSelectedCategory[0];
      return {
        ...prev,
        subCategoryId: first.id,
        subCategory: first.name,
      };
    });
  }, [subCategoriesForSelectedCategory]);

  const resetForm = () => {
    setForm(buildEmptyForm(categories[0]?.name ?? "Chocolates"));
    setEditingId(null);
  };

  const resetSubcategoryForm = () => {
    setEditingSubcategoryId(null);
    setSubcategoryForm({
      ...EMPTY_SUBCATEGORY_FORM,
      categoryName: form.category,
    });
  };

  const handleUpload = async (files: FileList | File[]) => {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      Array.from(files).forEach((file) => payload.append("files", file));
      const response = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as {
        imageSrc?: string;
        images?: string[];
        error?: string;
      };
      if (!response.ok || !data.imageSrc) {
        throw new Error(data.error ?? "Upload failed");
      }
      const uploadedImages = (data.images ?? [data.imageSrc]).map((value) =>
        normalizeImageSrc(value)
      );
      setForm((prev) => ({
        ...prev,
        imageSrc: normalizeImageSrc(data.imageSrc ?? prev.imageSrc),
        imageGallery: Array.from(new Set([...prev.imageGallery, ...uploadedImages])),
      }));
      setMessage(
        uploadedImages.length > 1 ? `${uploadedImages.length} images uploaded.` : "Image uploaded."
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        imageSrc: normalizeImageSrc(form.imageSrc),
        imageGallery: form.imageGallery.map(normalizeImageSrc),
        priceInr: Number(form.priceInr),
        basePricePerKgInr: Number(form.basePricePerKgInr || 0),
        sizeOptions: form.sizeOptions,
        flavorSelectionEnabled: form.flavorSelectionEnabled,
        flavorIds: form.flavorIds,
      };

      const response = await fetch("/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Save failed");

      setMessage(editingId ? "Product updated." : "Product created.");
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryUpload = async (files: FileList | File[]) => {
    setCategoryUploading(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      Array.from(files).forEach((file) => payload.append("files", file));
      const response = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as {
        imageSrc?: string;
        error?: string;
      };
      if (!response.ok || !data.imageSrc) {
        throw new Error(data.error ?? "Category image upload failed");
      }
      setCategoryForm((prev) => ({
        ...prev,
        imageSrc: normalizeImageSrc(data.imageSrc ?? prev.imageSrc),
      }));
      setMessage("Category image uploaded.");
    } catch (err) {
      setError(String(err));
    } finally {
      setCategoryUploading(false);
    }
  };

  const handleEdit = (product: AdminProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      subCategory: product.subCategory,
      subCategoryId: product.subCategoryId ?? "",
      pricingMode: product.pricingMode,
      priceInr: String(product.priceInr),
      basePricePerKgInr: String(product.basePricePerKgInr ?? ""),
      pieceLabel: product.pieceLabel ?? "",
      imageSrc: product.imageSrc,
      imageGallery: product.imageGallery ?? [product.imageSrc],
      sizeOptions: (product.sizeOptions ?? []).join(", "),
      flavorSelectionEnabled: product.flavorSelectionEnabled === true,
      flavorIds: product.flavorIds ?? [],
      eggless: product.eggless,
      available: product.available,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Delete failed");

      setMessage("Product deleted.");
      if (editingId === id) resetForm();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setCategorySaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: editingCategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingCategoryId
            ? {
                id: editingCategoryId,
                name: categoryForm.name,
                imageSrc: categoryForm.imageSrc,
              }
            : {
                name: categoryForm.name,
                imageSrc: categoryForm.imageSrc,
              }
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error ??
            (editingCategoryId ? "Failed to update category" : "Failed to create category")
        );
      }

      setCategoryForm(EMPTY_CATEGORY_FORM);
      setEditingCategoryId(null);
      setMessage(editingCategoryId ? "Category updated." : "Category created.");
      await loadCategories();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleEditCategory = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      imageSrc: category.imageSrc,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = window.confirm(
      "Delete this category? It can only be deleted if no products use it."
    );
    if (!ok) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete category");

      if (editingCategoryId === id) resetCategoryForm();
      setMessage("Category deleted.");
      await loadCategories();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCreateSubcategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubcategorySaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/subcategories", {
        method: editingSubcategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingSubcategoryId
            ? {
                id: editingSubcategoryId,
                categoryName: subcategoryForm.categoryName,
                name: subcategoryForm.name,
              }
            : {
                categoryName: subcategoryForm.categoryName,
                name: subcategoryForm.name,
              }
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error ??
            (editingSubcategoryId
              ? "Failed to update subcategory"
              : "Failed to create subcategory")
        );
      }

      resetSubcategoryForm();
      setMessage(editingSubcategoryId ? "Subcategory updated." : "Subcategory created.");
      await loadSubCategories();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubcategorySaving(false);
    }
  };

  const handleEditSubcategory = (subcategory: AdminSubCategory) => {
    setEditingSubcategoryId(subcategory.id);
    setSubcategoryForm({
      categoryName: subcategory.categoryName,
      name: subcategory.name,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSubcategory = async (id: string) => {
    const ok = window.confirm(
      "Delete this subcategory? It can only be deleted if no products use it."
    );
    if (!ok) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/subcategories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete subcategory");

      if (editingSubcategoryId === id) resetSubcategoryForm();
      setMessage("Subcategory deleted.");
      await loadSubCategories();
      await loadProducts();
    } catch (err) {
      setError(String(err));
    }
  };

  const resetFlavorForm = () => {
    setEditingFlavorId(null);
    setFlavorForm(EMPTY_FLAVOR_FORM);
  };

  const handleCreateFlavor = async (event: React.FormEvent) => {
    event.preventDefault();
    setFlavorSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/flavors", {
        method: editingFlavorId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingFlavorId
            ? { id: editingFlavorId, name: flavorForm.name }
            : { name: flavorForm.name }
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to save flavor");
      resetFlavorForm();
      setMessage(editingFlavorId ? "Flavor updated." : "Flavor created.");
      await loadFlavors();
    } catch (err) {
      setError(String(err));
    } finally {
      setFlavorSaving(false);
    }
  };

  const handleEditFlavor = (flavor: AdminFlavor) => {
    setEditingFlavorId(flavor.id);
    setFlavorForm({ name: flavor.name });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleFlavor = async (flavor: AdminFlavor) => {
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/flavors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flavor.id, active: !flavor.active }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to update flavor");
      setMessage(`Flavor ${!flavor.active ? "enabled" : "disabled"}.`);
      await loadFlavors();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDeleteFlavor = async (id: string) => {
    const ok = window.confirm("Delete this flavor?");
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/flavors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete flavor");
      if (editingFlavorId === id) resetFlavorForm();
      setForm((prev) => ({
        ...prev,
        flavorIds: prev.flavorIds.filter((value) => value !== id),
      }));
      setMessage("Flavor deleted.");
      await loadFlavors();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge tone="gold">Admin Dashboard</Badge>
              <h1 className="text-3xl">Products</h1>
              <p className="text-sm text-black/60">
                Add, edit, and delete products. Changes reflect on frontend menu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/sales"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
              >
                Sales Dashboard
              </Link>
              <Link
                href="/admin/orders"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Go to Orders
              </Link>
              <Link
                href="/admin/coupons"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Coupons
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Settings
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-2"
          >
            <h2 className="md:col-span-2 text-2xl">{heading}</h2>
            <label className="text-sm font-semibold text-black/70">
              Product Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value as ProductCategory,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Subcategory
              <select
                value={form.subCategoryId}
                onChange={(event) => {
                  const selected = subCategoriesForSelectedCategory.find(
                    (item) => item.id === event.target.value
                  );
                  setForm((prev) => ({
                    ...prev,
                    subCategoryId: event.target.value,
                    subCategory: selected?.name ?? "",
                  }));
                }}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                <option value="">General</option>
                {subCategoriesForSelectedCategory.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs font-normal text-black/55">
                Admin-managed subcategories appear here for the selected category.
              </p>
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                required
                rows={3}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Pricing Mode
              <select
                value={form.pricingMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pricingMode: event.target.value as ProductPricingMode,
                    pieceLabel:
                      event.target.value === "pcs" ? prev.pieceLabel || "pieces" : "",
                    basePricePerKgInr:
                      event.target.value === "kg"
                        ? prev.basePricePerKgInr || prev.priceInr
                        : "",
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                <option value="kg">By weight (kg)</option>
                <option value="pcs">By pieces / pack</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              {form.pricingMode === "kg" ? "Default Selling Price (INR)" : "Unit Price (INR)"}
              <input
                type="number"
                value={form.priceInr}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priceInr: event.target.value }))
                }
                required
                min={0}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs font-normal text-black/55">
                {form.pricingMode === "kg"
                  ? "Fallback price used when a size does not contain a weight."
                  : "Per pack / piece-group selling price."}
              </p>
            </label>
            <label className="text-sm font-semibold text-black/70">
              {form.pricingMode === "kg" ? "Base Price per Kg (INR)" : "Piece Label"}
              {form.pricingMode === "kg" ? (
                <input
                  type="number"
                  value={form.basePricePerKgInr}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, basePricePerKgInr: event.target.value }))
                  }
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                />
              ) : (
                <input
                  value={form.pieceLabel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pieceLabel: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  placeholder="pieces / cupcakes / brownies"
                />
              )}
              <p className="mt-1 text-xs font-normal text-black/55">
                {form.pricingMode === "kg"
                  ? "Used to auto-calculate the displayed selling price from the selected weight."
                  : "Used as the option label across menu, product page, cart, and invoices."}
              </p>
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              {form.pricingMode === "kg" ? "Weight Options" : "Piece / Pack Options"}
              <input
                value={form.sizeOptions}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sizeOptions: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                placeholder={
                  form.pricingMode === "kg"
                    ? "500gm, 1000gm, 1500gm, 2000gm"
                    : "6 pieces, 12 pieces, 24 pieces"
                }
              />
              <p className="mt-1 text-xs font-normal text-black/55">
                Enter comma-separated options. The first option is used for price preview.
              </p>
            </label>
            <div className="md:col-span-2 rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70">
                <input
                  type="checkbox"
                  checked={form.flavorSelectionEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      flavorSelectionEnabled: event.target.checked,
                    }))
                  }
                />
                Enable flavour selection for this product
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {flavors.map((flavor) => {
                  const checked = form.flavorIds.includes(flavor.id);
                  return (
                    <label
                      key={flavor.id}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                        flavor.active ? "border-black/10 bg-white" : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            flavorIds: event.target.checked
                              ? Array.from(new Set([...prev.flavorIds, flavor.id]))
                              : prev.flavorIds.filter((value) => value !== flavor.id),
                          }))
                        }
                      />
                      <span>
                        {flavor.name}
                        {!flavor.active ? " (inactive)" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-black/55">
                Assigned flavors appear on the product page. If none are assigned, legacy inferred flavors remain as fallback.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-4 text-sm md:col-span-2">
              <p className="font-semibold text-black/75">Pricing Preview</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-black/65">
                <span>Display Price: <strong className="text-black">{pricingPreview.finalPriceLabel}</strong></span>
                {pricingPreview.pricePerKgLabel ? (
                  <span>Price / kg: <strong className="text-black">{pricingPreview.pricePerKgLabel}</strong></span>
                ) : null}
                {parsedSizeOptions[0] ? (
                  <span>Preview Option: <strong className="text-black">{parsedSizeOptions[0]}</strong></span>
                ) : null}
              </div>
            </div>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              Image URL
              <input
                value={form.imageSrc}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    imageSrc: normalizeImageSrc(event.target.value),
                  }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                placeholder="/images/uploads/your-file.jpg"
              />
              <p className="mt-1 text-xs text-black/55">
                Use uploaded images or a full `https://` URL. Unsupported formats like HEIC will
                be rejected.
              </p>
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              Upload Images
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                multiple
                className="mt-2 block w-full text-sm"
                onChange={(event) => {
                  const files = event.target.files;
                  if (files && files.length > 0) void handleUpload(files);
                }}
              />
              {uploading && <p className="mt-2 text-xs text-black/60">Uploading...</p>}
            </label>
            {form.imageGallery.length > 0 ? (
              <div className="md:col-span-2 space-y-3">
                <p className="text-sm font-semibold text-black/70">Gallery Images</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {form.imageGallery.map((image) => {
                    const isPrimary = image === form.imageSrc;
                    return (
                      <article
                        key={image}
                        className="rounded-2xl border border-black/10 bg-[color:var(--cream)] p-3"
                      >
                        <img
                          src={image}
                          alt="Product gallery preview"
                          className="h-32 w-full rounded-xl border border-black/10 object-cover"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                imageSrc: image,
                              }))
                            }
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isPrimary
                                ? "bg-[color:var(--berry)] text-white"
                                : "border border-black/10 bg-white"
                            }`}
                          >
                            {isPrimary ? "Primary" : "Set Primary"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const nextGallery = prev.imageGallery.filter((value) => value !== image);
                                const nextPrimary =
                                  prev.imageSrc === image ? nextGallery[0] ?? "" : prev.imageSrc;
                                return {
                                  ...prev,
                                  imageSrc: nextPrimary,
                                  imageGallery: nextGallery,
                                };
                              })
                            }
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70">
              <input
                type="checkbox"
                checked={form.eggless}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, eggless: event.target.checked }))
                }
              />
              Eggless
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, available: event.target.checked }))
                }
              />
              Available
            </label>

            {error && (
              <p className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-full bg-[color:var(--berry)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <form
            onSubmit={handleCreateFlavor}
            className="mt-6 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-[1fr_auto]"
          >
            <h2 className="md:col-span-2 text-2xl">{flavorHeading}</h2>
            <label className="text-sm font-semibold text-black/70">
              Flavor Name
              <input
                value={flavorForm.name}
                onChange={(event) =>
                  setFlavorForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <div className="self-end">
              <button
                type="submit"
                disabled={flavorSaving}
                className="rounded-full bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {flavorSaving
                  ? editingFlavorId
                    ? "Updating..."
                    : "Adding..."
                  : editingFlavorId
                    ? "Update Flavor"
                    : "Add Flavor"}
              </button>
            </div>
            {editingFlavorId ? (
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={resetFlavorForm}
                  className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold"
                >
                  Cancel Flavor Edit
                </button>
              </div>
            ) : null}
          </form>

          <form
            onSubmit={handleCreateCategory}
            className="mt-6 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_auto]"
          >
            <h2 className="md:col-span-2 lg:col-span-3 text-2xl">{categoryHeading}</h2>
            <label className="text-sm font-semibold text-black/70">
              Category Name
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Category Image URL (optional)
              <input
                value={categoryForm.imageSrc}
                onChange={(event) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    imageSrc: event.target.value,
                  }))
                }
                placeholder="/images/categories/cakes.svg"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <div className="rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-4 text-sm md:col-span-2 lg:col-span-1">
              <p className="font-semibold text-black/75">Upload Category Image</p>
              <label className="mt-3 inline-flex cursor-pointer rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/70">
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const files = event.target.files;
                    if (files && files.length > 0) {
                      void handleCategoryUpload(files);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
              {categoryUploading ? (
                <p className="mt-2 text-xs text-black/60">Uploading category image...</p>
              ) : null}
              {categoryForm.imageSrc ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={normalizeImageSrc(categoryForm.imageSrc)}
                    alt="Category preview"
                    className="h-14 w-14 rounded-xl border border-black/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        imageSrc: "",
                      }))
                    }
                    className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                  >
                    Clear Image
                  </button>
                </div>
              ) : null}
            </div>
            <div className="self-end md:col-span-2 lg:col-span-1">
              <button
                type="submit"
                disabled={categorySaving || categoryUploading}
                className="rounded-full bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {categorySaving
                  ? editingCategoryId
                    ? "Updating..."
                    : "Adding..."
                  : editingCategoryId
                  ? "Update Category"
                  : "Add Category"}
              </button>
            </div>
            {editingCategoryId && (
              <div className="md:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold"
                >
                  Cancel Category Edit
                </button>
              </div>
            )}
          </form>

          <form
            onSubmit={handleCreateSubcategory}
            className="mt-6 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-[1fr_1fr_auto]"
          >
            <h2 className="md:col-span-3 text-2xl">{subcategoryHeading}</h2>
            <label className="text-sm font-semibold text-black/70">
              Parent Category
              <select
                value={subcategoryForm.categoryName}
                onChange={(event) =>
                  setSubcategoryForm((prev) => ({
                    ...prev,
                    categoryName: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Subcategory Name
              <input
                value={subcategoryForm.name}
                onChange={(event) =>
                  setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <div className="self-end">
              <button
                type="submit"
                disabled={subcategorySaving}
                className="rounded-full bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {subcategorySaving
                  ? editingSubcategoryId
                    ? "Updating..."
                    : "Adding..."
                  : editingSubcategoryId
                  ? "Update Subcategory"
                  : "Add Subcategory"}
              </button>
            </div>
            {editingSubcategoryId && (
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={resetSubcategoryForm}
                  className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold"
                >
                  Cancel Subcategory Edit
                </button>
              </div>
            )}
          </form>

          <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="text-2xl">All Categories</h2>
            {categories.length === 0 && (
              <p className="mt-3 text-sm text-black/60">No categories found.</p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-2xl border border-black/10 bg-[color:var(--cream)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={category.imageSrc}
                      alt={category.name}
                      className="h-12 w-12 rounded-xl border border-black/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{category.name}</p>
                      <p className="text-xs text-black/50">Sort: {category.sortOrder}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditCategory(category)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="text-2xl">All Subcategories</h2>
            {subCategories.length === 0 && (
              <p className="mt-3 text-sm text-black/60">No subcategories found.</p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {subCategories.map((subcategory) => (
                <article
                  key={subcategory.id}
                  className="rounded-2xl border border-black/10 bg-[color:var(--cream)] p-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">
                      {subcategory.categoryName}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">{subcategory.name}</p>
                    <p className="text-xs text-black/50">Sort: {subcategory.sortOrder}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSubcategory(subcategory)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubcategory(subcategory.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="text-2xl">All Flavors</h2>
            {flavors.length === 0 && (
              <p className="mt-3 text-sm text-black/60">No flavors found.</p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {flavors.map((flavor) => (
                <article
                  key={flavor.id}
                  className="rounded-2xl border border-black/10 bg-[color:var(--cream)] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{flavor.name}</p>
                    <p className="text-xs text-black/50">
                      {flavor.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditFlavor(flavor)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFlavor(flavor)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                    >
                      {flavor.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFlavor(flavor.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="text-2xl">All Products</h2>
            {loading && <p className="mt-3 text-sm text-black/60">Loading products...</p>}
            {!loading && products.length === 0 && (
              <p className="mt-3 text-sm text-black/60">No products found.</p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-black/10 bg-[color:var(--cream)] p-4"
                >
                  <div className="flex gap-3">
                    <img
                      src={product.imageSrc}
                      alt={product.name}
                      className="h-16 w-16 rounded-xl border border-black/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{product.name}</p>
                      <p className="text-xs text-black/60">
                        {product.category} · {product.subCategory || "General"}
                      </p>
                      <p className="mt-1 text-xs text-black/55">
                        {product.pricingMode === "kg"
                          ? `Weight pricing${product.basePricePerKgInr ? ` · ${formatInr(product.basePricePerKgInr)} / kg` : ""}`
                          : `${product.pieceLabel || "pieces"} pricing`}
                      </p>
                      {(product.sizeOptions ?? []).length > 0 ? (
                        <p className="mt-1 text-xs text-black/55">
                          {(product.sizeOptions ?? []).join(" · ")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-black/55">
                        Gallery images: {product.imageGallery?.length ?? 1}
                      </p>
                      {product.flavors && product.flavors.length > 0 ? (
                        <p className="mt-1 text-xs text-black/55">
                          Flavors: {product.flavors.join(" · ")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-black/55">
                        Flavor selection: {product.flavorSelectionEnabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-sm font-semibold text-[color:var(--berry)]">
                        {getPriceDisplayMeta(
                          {
                            ...product,
                            imageGallery: product.imageGallery ?? [product.imageSrc],
                            pieceLabel: product.pieceLabel ?? undefined,
                            subCategoryId: product.subCategoryId ?? undefined,
                          },
                          product.sizeOptions?.[0]
                        ).finalPriceLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-black/70">
                    {product.description}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
