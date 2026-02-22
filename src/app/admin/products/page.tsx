"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { formatInr, type ProductCategory } from "@/lib/products";

type AdminProduct = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  subCategory: string;
  priceInr: number;
  imageSrc: string;
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
  priceInr: string;
  imageSrc: string;
  eggless: boolean;
  available: boolean;
};

type AdminCategory = {
  id: string;
  name: string;
  imageSrc: string;
  sortOrder: number;
};

function buildEmptyForm(defaultCategory: string): ProductForm {
  return {
    name: "",
    description: "",
    category: defaultCategory,
    subCategory: "",
    priceInr: "",
    imageSrc: "",
    eggless: true,
    available: true,
  };
}

const EMPTY_CATEGORY_FORM = {
  name: "",
  imageSrc: "",
};

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(buildEmptyForm("Chocolates"));
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    void (async () => {
      await loadCategories();
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

  const resetForm = () => {
    setForm(buildEmptyForm(categories[0]?.name ?? "Chocolates"));
    setEditingId(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      const response = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as { imageSrc?: string; error?: string };
      if (!response.ok || !data.imageSrc) {
        throw new Error(data.error ?? "Upload failed");
      }
      setForm((prev) => ({ ...prev, imageSrc: data.imageSrc ?? prev.imageSrc }));
      setMessage("Image uploaded.");
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
        priceInr: Number(form.priceInr),
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

  const handleEdit = (product: AdminProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      subCategory: product.subCategory,
      priceInr: String(product.priceInr),
      imageSrc: product.imageSrc,
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

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge tone="gold">Admin Dashboard</Badge>
              <h1 className="text-3xl">Products</h1>
              <p className="text-sm text-black/60">
                Add, edit, and delete products. Changes reflect on frontend menu.
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Go to Orders
            </Link>
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
              Sub Category
              <input
                value={form.subCategory}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, subCategory: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Price (INR)
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
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              Image URL
              <input
                value={form.imageSrc}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageSrc: event.target.value }))
                }
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                placeholder="/images/uploads/your-file.jpg"
              />
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              Upload Image
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {uploading && <p className="mt-2 text-xs text-black/60">Uploading...</p>}
            </label>
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
            onSubmit={handleCreateCategory}
            className="mt-6 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-[1fr_1fr_auto]"
          >
            <h2 className="md:col-span-3 text-2xl">{categoryHeading}</h2>
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
            <div className="self-end">
              <button
                type="submit"
                disabled={categorySaving}
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
              <div className="md:col-span-3">
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
                      <p className="text-sm font-semibold text-[color:var(--berry)]">
                        {formatInr(product.priceInr)}
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
