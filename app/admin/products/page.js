"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ProductCard from "./components/ProductCard";

export default function ProductsListPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!brand) return;
    (async () => {
      setLoading(true);
      try {
        const [productsRes, statsRes] = await Promise.all([
          fetch(`/api/admin/products?brand=${encodeURIComponent(brand)}`, {
            credentials: "include",
          }),
          fetch(`/api/admin/products/stats?brand=${encodeURIComponent(brand)}`, {
            credentials: "include",
          }),
        ]);
        const productsData = await productsRes.json();
        const statsData = await statsRes.json();
        setProducts(productsRes.ok ? (productsData.products ?? []) : []);
        setStats(statsRes.ok ? (statsData.stats ?? {}) : {});
      } catch {
        setProducts([]);
        setStats({});
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    setDeletingId(product._id);
    try {
      const res = await fetch(`/api/admin/products/${product._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p._id !== product._id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-8">
        <h1 className="mb-6 text-xl font-bold text-foreground">Store</h1>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-bold text-highlight">Store</h1>

      {products.length === 0 ? (
        <p className="text-sm text-muted">No store items yet.</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const s = stats[product._id] || { orders: 0, revenue: 0 };
            return (
              <ProductCard
                key={product._id}
                product={product}
                onDelete={handleDelete}
                brand={brand}
                deleting={deletingId === product._id}
                orders={s.orders}
                revenue={s.revenue}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
